// pages/privacy-policy.js
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/login" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Link>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 lg:p-12 shadow-2xl border border-gray-700">
          <div className="flex items-center mb-4">
            <Shield className="h-10 w-10 text-green-400 mr-4" />
            <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-blue-300 mb-3 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Our Privacy-First Commitment
            </h3>
            <p className="text-gray-300">
              <strong className="text-white">NestEgg never stores your banking credentials.</strong> We believe in manual data entry
              as a feature, not a limitation. You maintain complete control over your data, and we never connect to your financial
              institutions on your behalf.
            </p>
          </div>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Account Information</h3>
              <p className="mb-4">When you create an account, we collect:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Email address</li>
                <li>Name (if provided)</li>
                <li>Password (encrypted and hashed)</li>
                <li>Account preferences and settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Financial Data You Enter</h3>
              <p className="mb-4">You manually provide investment data, which may include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account names and types</li>
                <li>Investment holdings and quantities</li>
                <li>Transaction history</li>
                <li>Account values and balances</li>
                <li>Asset allocation information</li>
              </ul>
              <p className="mt-4 text-yellow-400">
                <strong>Important:</strong> We never collect or store banking passwords, login credentials, or direct access to your
                financial accounts.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Usage Information</h3>
              <p className="mb-4">We automatically collect certain information when you use the Service:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information</li>
                <li>Usage patterns and feature interactions</li>
                <li>Performance and error data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Calculate portfolio analytics and generate reports</li>
                <li>Authenticate your identity and manage your account</li>
                <li>Send you important updates about the Service</li>
                <li>Respond to your support requests</li>
                <li>Monitor and analyze usage patterns to improve user experience</li>
                <li>Protect against fraud and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Data Storage and Security</h2>
              <p className="mb-4">
                We take data security seriously and implement industry-standard measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All data is encrypted in transit using SSL/TLS</li>
                <li>Data is encrypted at rest using AES-256 encryption</li>
                <li>Passwords are hashed using bcrypt with strong salt</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication requirements</li>
                <li>Secure cloud infrastructure with redundancy and backups</li>
              </ul>
              <p className="mt-4">
                <strong className="text-white">Data Retention:</strong> We retain your data for as long as your account is active
                or as needed to provide the Service. You may request deletion of your data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
              <p className="mb-4">
                <strong className="text-white">We do not sell your personal information to third parties.</strong>
              </p>
              <p className="mb-4">We may share your information only in these limited circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Service Providers:</strong> With trusted third-party service providers who assist
                  in operating our Service (e.g., hosting, authentication, analytics), under strict confidentiality agreements</li>
                <li><strong className="text-white">Legal Requirements:</strong> When required by law, court order, or government
                  request</li>
                <li><strong className="text-white">Protection:</strong> To protect the rights, property, or safety of NestEgg, our
                  users, or others</li>
                <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale
                  of assets, with notice to users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Your Privacy Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong className="text-white">Correction:</strong> Request correction of inaccurate information</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong className="text-white">Export:</strong> Request an export of your data in a portable format</li>
                <li><strong className="text-white">Object:</strong> Object to certain processing of your data</li>
                <li><strong className="text-white">Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us through the Service's support channels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies and Tracking</h2>
              <p className="mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve Service performance</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Note that disabling cookies may affect Service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Third-Party Services</h2>
              <p className="mb-4">
                The Service may use third-party services for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Authentication (Clerk)</li>
                <li>Analytics and monitoring</li>
                <li>Cloud hosting and infrastructure</li>
              </ul>
              <p className="mt-4">
                These third parties have their own privacy policies. We recommend reviewing their policies to understand how they
                handle your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Children's Privacy</h2>
              <p className="mb-4">
                The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information
                from children. If we become aware that a child has provided us with personal information, we will take steps to
                delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. International Data Transfers</h2>
              <p className="mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These
                countries may have different data protection laws. By using the Service, you consent to such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Privacy Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new
                Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy
                periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us through the Service's
                support channels.
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
