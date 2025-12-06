# backend/services/email_service.py
"""
Email service for sending transactional emails and newsletters.
Uses Resend as the email provider.
"""
import os
import logging
from typing import Optional, Dict, Any, List
import resend

logger = logging.getLogger(__name__)

# Initialize Resend with API key
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "NestEgg <noreply@nestegg.com>")
RESEND_ENABLED = os.getenv("RESEND_ENABLED", "true").lower() == "true"

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


class EmailService:
    """Service for sending emails via Resend."""

    def __init__(self):
        self.enabled = RESEND_ENABLED and bool(RESEND_API_KEY)
        if not self.enabled:
            logger.warning("Email service is disabled. Set RESEND_API_KEY and RESEND_ENABLED=true to enable.")

    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send a single email.

        Args:
            to: Recipient email address
            subject: Email subject line
            html: HTML content of the email
            text: Optional plain text version
            from_email: Optional override for sender address
            reply_to: Optional reply-to address
            tags: Optional list of tags for tracking

        Returns:
            Dict with send result or error info
        """
        if not self.enabled:
            logger.info(f"Email service disabled. Would have sent email to {to}: {subject}")
            return {"status": "disabled", "to": to, "subject": subject}

        try:
            params = {
                "from": from_email or RESEND_FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
            }

            if text:
                params["text"] = text
            if reply_to:
                params["reply_to"] = reply_to
            if tags:
                params["tags"] = tags

            # Resend is sync, but we wrap it for async compatibility
            result = resend.Emails.send(params)

            logger.info(f"Email sent successfully to {to}: {subject}")
            return {"status": "sent", "id": result.get("id"), "to": to}

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return {"status": "error", "error": str(e), "to": to}

    async def send_bulk_emails(
        self,
        emails: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Send multiple emails in batch.

        Args:
            emails: List of email dicts with 'to', 'subject', 'html' keys

        Returns:
            Dict with batch results
        """
        if not self.enabled:
            logger.info(f"Email service disabled. Would have sent {len(emails)} emails")
            return {"status": "disabled", "count": len(emails)}

        results = []
        for email in emails:
            result = await self.send_email(
                to=email["to"],
                subject=email["subject"],
                html=email["html"],
                text=email.get("text"),
                tags=email.get("tags")
            )
            results.append(result)

        sent_count = sum(1 for r in results if r.get("status") == "sent")
        error_count = sum(1 for r in results if r.get("status") == "error")

        return {
            "status": "completed",
            "total": len(emails),
            "sent": sent_count,
            "errors": error_count,
            "results": results
        }


# Singleton instance
email_service = EmailService()
