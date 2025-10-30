// pages/terms-of-service.js
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/login" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Link>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 lg:p-12 shadow-2xl border border-gray-700">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using NestEgg ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement.
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="mb-4">
                NestEgg is a privacy-first investment tracking platform that allows users to manually enter and track their investment
                portfolio data across multiple accounts and asset types. The Service provides analytics, reporting, and portfolio
                management tools based on the data you provide.
              </p>
              <p className="mb-4">
                <strong className="text-white">Important:</strong> NestEgg does not connect directly to your financial institutions
                and does not store your banking credentials. All investment data is manually entered by you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
              <p className="mb-4">
                To use the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>The accuracy of the financial data you enter</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Accuracy and Responsibility</h2>
              <p className="mb-4">
                NestEgg relies on data that you manually enter. We do not verify the accuracy of this data. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You are solely responsible for the accuracy and completeness of the data you enter</li>
                <li>The Service's analytics and reports are only as accurate as the data you provide</li>
                <li>We are not liable for any decisions you make based on data in the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Not Financial Advice</h2>
              <p className="mb-4">
                NestEgg provides tools for tracking and analyzing your investments. <strong className="text-white">The Service does not
                provide financial, investment, tax, or legal advice.</strong> You should consult with qualified professionals before
                making any financial decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Prohibited Uses</h2>
              <p className="mb-4">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use any automated means to access the Service without our permission</li>
                <li>Enter false or misleading information</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
              <p className="mb-4">
                The Service and its original content, features, and functionality are owned by NestEgg and are protected by
                international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Termination</h2>
              <p className="mb-4">
                We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice,
                for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for
                any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
              <p className="mb-4">
                To the maximum extent permitted by law, NestEgg shall not be liable for any indirect, incidental, special, consequential,
                or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data,
                use, goodwill, or other intangible losses resulting from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your use or inability to use the Service</li>
                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
                <li>Any errors or omissions in any content or for any loss or damage incurred as a result of your use of any content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to Terms</h2>
              <p className="mb-4">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least
                30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole
                discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Governing Law</h2>
              <p className="mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its
                conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms, please contact us through the Service's support channels.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <Link href="/login" className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
