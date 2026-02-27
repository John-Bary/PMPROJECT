import { Link } from 'react-router-dom';

function DPA() {
  return (
    <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-sm border border-border p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Data Processing Agreement</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-neutral max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Parties</h2>
            <p className="text-muted-foreground">This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the Terms of Service between you (&ldquo;Controller&rdquo;) and Todoria (&ldquo;Processor&rdquo;) for the use of the Todoria task management platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Scope and Purpose</h2>
            <p className="text-muted-foreground">The Processor processes personal data on behalf of the Controller for the purpose of providing the Todoria task management service, including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>User account management (names, email addresses)</li>
              <li>Task and project data storage and retrieval</li>
              <li>Email notifications and reminders</li>
              <li>Workspace collaboration features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Data Categories</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Identity data:</strong> Names, email addresses, avatar images</li>
              <li><strong>Usage data:</strong> Tasks, comments, categories, workspace membership</li>
              <li><strong>Technical data:</strong> IP addresses, browser information, login timestamps</li>
              <li><strong>Billing data:</strong> Processed by Stripe as a sub-processor</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Security Measures</h2>
            <p className="text-muted-foreground">The Processor implements appropriate technical and organizational measures including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Encryption in transit (TLS/HTTPS) and at rest</li>
              <li>Password hashing with bcrypt</li>
              <li>JWT-based authentication with short-lived access tokens</li>
              <li>CSRF protection and rate limiting</li>
              <li>Role-based access control within workspaces</li>
              <li>Regular security updates and dependency audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Sub-processors</h2>
            <p className="text-muted-foreground mb-3">The Processor uses the following sub-processors to deliver the service:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Supabase, Inc.</strong> (US/EU) &mdash; Database hosting, file storage (PostgreSQL, Storage)</li>
              <li><strong>Vercel, Inc.</strong> (Global) &mdash; Application hosting, CDN, serverless compute</li>
              <li><strong>Stripe, Inc.</strong> (US) &mdash; Payment processing, subscription management</li>
              <li><strong>Resend, Inc.</strong> (US) &mdash; Transactional email delivery</li>
              <li><strong>Sentry (Functional Software, Inc.)</strong> (US) &mdash; Error monitoring and performance tracking (anonymized data)</li>
            </ul>
            <p className="text-muted-foreground mt-3">The Controller will be notified of any changes to sub-processors with at least 30 days&rsquo; notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Data Subject Rights</h2>
            <p className="text-muted-foreground">The Processor assists the Controller in fulfilling data subject requests including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Right of access (data export via account settings)</li>
              <li>Right to rectification (profile editing)</li>
              <li>Right to erasure (account deletion with anonymization)</li>
              <li>Right to data portability (JSON/CSV export)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
            <p className="text-muted-foreground">Personal data is retained for the duration of the service agreement. Upon account deletion, personal data is anonymized within 30 days. Audit logs are anonymized after 2 years. Billing records are retained for 7 years per legal requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Data Breach Notification</h2>
            <p className="text-muted-foreground">The Processor will notify the Controller of any personal data breach without undue delay, and in any event within 72 hours of becoming aware of the breach.</p>
          </section>

          <div className="pt-6 border-t border-border">
            <Link to="/privacy" className="text-foreground hover:text-foreground font-medium">
              View Privacy Policy
            </Link>
            <span className="mx-3 text-muted-foreground">|</span>
            <Link to="/terms" className="text-foreground hover:text-foreground font-medium">
              View Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DPA;
