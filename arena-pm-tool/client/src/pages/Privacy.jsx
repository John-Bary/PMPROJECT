import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 text-muted-foreground hover:text-muted-foreground rounded-lg transition-all" aria-label="Back to home">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-10 prose prose-neutral prose-sm max-w-none">
        <p className="text-sm text-muted-foreground">Last updated: February 7, 2026</p>

        <h2>1. Introduction</h2>
        <p>
          Todoria ("we", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal data when you use our service, in compliance with the General Data Protection Regulation (GDPR).
        </p>

        <h2>2. Data Controller</h2>
        <p>
          Todoria is the data controller for your personal data. For any privacy inquiries, contact us at <a href="mailto:privacy@todoria.app" className="text-foreground hover:text-foreground">privacy@todoria.app</a>.
        </p>

        <h2>3. Data We Collect</h2>
        <p>We collect the following categories of personal data:</p>
        <ul>
          <li><strong>Account data:</strong> Email address, name, and password (hashed)</li>
          <li><strong>Usage data:</strong> Tasks, workspaces, categories, and comments you create</li>
          <li><strong>Technical data:</strong> IP address, browser type, and access logs for security purposes</li>
          <li><strong>Billing data:</strong> Payment information is processed by Stripe and not stored on our servers</li>
        </ul>

        <h2>4. Legal Basis for Processing</h2>
        <p>We process your data based on:</p>
        <ul>
          <li><strong>Contract performance:</strong> To provide the Service you signed up for</li>
          <li><strong>Legitimate interest:</strong> To maintain security and improve the Service</li>
          <li><strong>Consent:</strong> For optional communications like marketing emails</li>
        </ul>

        <h2>5. How We Use Your Data</h2>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To authenticate your identity and secure your account</li>
          <li>To send transactional emails (password resets, verification, task reminders)</li>
          <li>To process payments via Stripe</li>
          <li>To monitor and improve Service performance and security</li>
        </ul>

        <h2>6. Data Sharing</h2>
        <p>We share data only with:</p>
        <ul>
          <li><strong>Stripe:</strong> For payment processing</li>
          <li><strong>Resend:</strong> For transactional email delivery</li>
          <li><strong>Vercel:</strong> For hosting infrastructure</li>
          <li><strong>Supabase:</strong> For database hosting</li>
          <li><strong>Sentry:</strong> For error monitoring and performance tracking (anonymized error reports)</li>
        </ul>
        <p>We do not sell your personal data to any third party. For a full list of sub-processors, see our <Link to="/dpa" className="text-foreground hover:text-foreground">Data Processing Agreement</Link>.</p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your personal data for as long as your account is active. When you delete your account, we delete all associated personal data within 30 days, except where retention is required by law. Billing records may be retained for up to 7 years for tax compliance.
        </p>

        <h2>8. Your Rights (GDPR)</h2>
        <p>Under the GDPR, you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Rectification:</strong> Correct inaccurate data via your account settings</li>
          <li><strong>Erasure:</strong> Delete your account and all data from account settings</li>
          <li><strong>Data portability:</strong> Export your tasks as CSV from account settings</li>
          <li><strong>Restriction:</strong> Request we limit processing of your data</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
        </ul>
        <p>
          To exercise any of these rights, contact <a href="mailto:privacy@todoria.app" className="text-foreground hover:text-foreground">privacy@todoria.app</a>. We will respond within 30 days.
        </p>

        <h2>9. Cookies</h2>
        <p>
          We use the following cookies:
        </p>
        <ul>
          <li><strong>Authentication token</strong> (essential): HttpOnly session cookie for login, expires after 15 minutes</li>
          <li><strong>Refresh token</strong> (essential): HttpOnly cookie for session renewal, expires after 7 days</li>
          <li><strong>CSRF token</strong> (essential): HttpOnly cookie for cross-site request forgery protection</li>
        </ul>
        <p>
          We do not use tracking cookies, advertising cookies, or third-party analytics cookies. All cookies listed above are strictly necessary for the Service to function and do not require consent under GDPR.
        </p>

        <h2>10. Security</h2>
        <p>
          We protect your data using industry-standard security measures including: encrypted connections (HTTPS/TLS), hashed passwords (bcrypt), rate limiting, CSRF protection, and regular security audits.
        </p>

        <h2>11. International Transfers</h2>
        <p>
          Your data may be processed in regions where our hosting providers operate. All transfers comply with GDPR requirements through Standard Contractual Clauses or equivalent safeguards.
        </p>

        <h2>12. Children's Privacy</h2>
        <p>
          The Service is not intended for children under 16. We do not knowingly collect personal data from children under 16.
        </p>

        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will notify registered users of material changes via email. The "Last updated" date reflects the most recent revision.
        </p>

        <h2>14. Contact</h2>
        <p>
          For privacy-related questions or to exercise your rights, contact:<br />
          <a href="mailto:privacy@todoria.app" className="text-foreground hover:text-foreground">privacy@todoria.app</a>
        </p>
      </main>
    </div>
  );
}

export default Privacy;
