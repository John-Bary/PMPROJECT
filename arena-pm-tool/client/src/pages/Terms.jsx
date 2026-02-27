import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 text-muted-foreground hover:text-muted-foreground rounded-lg transition-all" aria-label="Back to home">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-10 prose prose-neutral prose-sm max-w-none">
        <p className="text-sm text-muted-foreground">Last updated: February 7, 2026</p>

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
          Todoria offers a Free plan and a paid Pro plan. The Free plan includes up to 3 members, 50 tasks per workspace, and 1 workspace. The Pro plan is billed at &euro;3 per seat per month and includes a 14-day free trial.
        </p>
        <p>
          All payments are processed securely by Stripe. You may cancel your subscription at any time from your account settings or through the Stripe Customer Portal. Upon cancellation, your Pro features remain active until the end of the current billing period. No refunds are provided for partial billing periods.
        </p>
        <p>
          We reserve the right to change pricing with 30 days&rsquo; notice to existing subscribers. Seat count is based on the number of members in your workspace. Adding members to a paid workspace will adjust your next invoice accordingly.
        </p>

        <h2>6. Data and Privacy</h2>
        <p>
          Your use of the Service is also governed by our <Link to="/privacy" className="text-foreground hover:text-foreground">Privacy Policy</Link>. We collect only the data necessary to provide the Service and do not sell personal data to third parties.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          You retain ownership of all content you create within the Service. By using the Service, you grant us a limited license to store and display your content as necessary to provide the Service. Todoria and its branding are the property of Todoria.
        </p>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the Service will be uninterrupted, error-free, or secure at all times.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Todoria shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, revenue, or business opportunities. Our total aggregate liability shall not exceed the amount you have paid us in the 12 months prior to the claim.
        </p>

        <h2>10. Termination</h2>
        <p>
          We may suspend or terminate your account if you violate these Terms or if your account is inactive for more than 12 months. You may delete your account at any time from your account settings. Upon termination, your data will be deleted within 30 days in accordance with our <Link to="/privacy" className="text-foreground hover:text-foreground">Privacy Policy</Link>. Any outstanding charges remain payable.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify registered users of material changes via email at least 30 days before changes take effect. Continued use after changes constitutes acceptance.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the European Union. Any disputes shall be resolved in the competent courts of the service provider&rsquo;s jurisdiction.
        </p>

        <h2>13. Contact</h2>
        <p>
          For questions about these Terms, contact us at <a href="mailto:support@todoria.app" className="text-foreground hover:text-foreground">support@todoria.app</a>.
        </p>
      </main>
    </div>
  );
}

export default Terms;
