import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-all" aria-label="Back to home">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-neutral-900">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-10 prose prose-neutral prose-sm max-w-none">
        <p className="text-sm text-neutral-400">Last updated: February 7, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Todoria ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Todoria is a web-based project management tool that allows users to create workspaces, manage tasks, and collaborate with team members. The Service is provided "as is" and may be updated at any time.
        </p>

        <h2>3. Accounts</h2>
        <p>
          You must create an account to use the Service. You are responsible for maintaining the security of your account credentials. You must provide accurate information during registration and keep your account information up to date.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Upload malicious content or attempt to access other users' data</li>
          <li>Interfere with the operation of the Service</li>
          <li>Resell or redistribute the Service without authorization</li>
          <li>Use automated tools to scrape or extract data from the Service</li>
        </ul>

        <h2>5. Subscription and Billing</h2>
        <p>
          Todoria offers a free tier and paid plans. Paid subscriptions are billed per seat per month via Stripe. You may cancel at any time; access continues until the end of the current billing period. Refunds are not provided for partial billing periods.
        </p>

        <h2>6. Data and Privacy</h2>
        <p>
          Your use of the Service is also governed by our <Link to="/privacy" className="text-neutral-900 hover:text-neutral-700">Privacy Policy</Link>. We collect only the data necessary to provide the Service and do not sell personal data to third parties.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          You retain ownership of all content you create within the Service. By using the Service, you grant us a limited license to store and display your content as necessary to provide the Service. Todoria and its branding are the property of Todoria.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Todoria shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid us in the 12 months prior to the claim.
        </p>

        <h2>9. Termination</h2>
        <p>
          We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from your account settings. Upon termination, your data will be deleted in accordance with our Privacy Policy.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify registered users of material changes via email or in-app notification. Continued use after changes constitutes acceptance.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the European Union. Any disputes shall be resolved in the competent courts of the service provider's jurisdiction.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms, contact us at <a href="mailto:support@todoria.app" className="text-neutral-900 hover:text-neutral-700">support@todoria.app</a>.
        </p>
      </main>
    </div>
  );
}

export default Terms;
