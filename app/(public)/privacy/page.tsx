import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Simple Church Tools",
  description: "Privacy Policy for Simple Church Tools",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: January 22, 2026
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to Simple Church Tools (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed
              to protecting your privacy and ensuring the security of your personal
              information. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our church
              management software and services (the &quot;Service&quot;).
            </p>
            <p>
              Simple Church Tools acts as a <strong>data processor</strong> on behalf
              of church organizations that use the Service. Each church organization
              is the <strong>data controller</strong> and retains ownership and
              responsibility for the personal data it enters into the Service.
            </p>
            <p>
              By using our Service, you agree to the collection and use of
              information in accordance with this policy. If you do not agree with
              our policies and practices, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Church Account Information</h3>
            <p>When a church organization creates an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Church name, address, city, state, zip code, and country</li>
              <li>Denomination and affiliation information</li>
              <li>Contact information (phone number, email address)</li>
              <li>Subdomain and custom domain (if applicable)</li>
              <li>Logo and branding preferences</li>
            </ul>

            <p className="mt-3">
              Some of the information processed through the Service may constitute
              <strong> sensitive personal data</strong>, including religious
              affiliation and participation in religious activities. This
              information is processed solely at the direction of the church and
              only for church administration and ministry purposes.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.2 Member Information</h3>
            <p>For church members, we collect and store:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal identification (first name, middle name, last name, suffix, preferred name, maiden name)</li>
              <li>Demographic information (sex, date of birth, title)</li>
              <li>Contact information (email addresses, phone numbers)</li>
              <li>Household information (address, household type, relationships)</li>
              <li>Membership information (baptism date, confirmation date, membership status, participation status)</li>
              <li>Membership history and changes</li>
              <li>Envelope numbers for giving tracking</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.3 Giving and Financial Information</h3>
            <p>We collect and store giving records including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Donation amounts</li>
              <li>Date of contributions</li>
              <li>Notes related to giving</li>
              <li>Envelope numbers associated with contributions</li>
            </ul>
            <p className="mt-3">
              <strong>Note:</strong> We do not process payment card information
              directly. All subscription payments are processed securely through
              Stripe, and we do not have access to full payment card details.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.4 Subscription and Payment Information</h3>
            <p>For subscription management, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Stripe customer ID and subscription ID</li>
              <li>Subscription plan type</li>
              <li>Subscription status and billing period information</li>
              <li>Trial period information</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.5 User Account Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Password (stored in encrypted/hashed form)</li>
              <li>Account creation and last login timestamps</li>
              <li>Invitation and access records</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.6 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage patterns and log data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve the Service</li>
              <li>To manage church membership and giving records</li>
              <li>To process subscriptions and manage billing</li>
              <li>To communicate service-related notices</li>
              <li>To provide customer support</li>
              <li>To detect and prevent security issues</li>
              <li>To comply with legal obligations</li>
              <li>To enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell or rent personal information. We may share data only
              with trusted service providers (subprocessors) who support operation
              of the Service, including payment processing, hosting, email delivery,
              and analytics.
            </p>
            <p>
              We may also disclose information where required by law or as part of a
              business transfer such as a merger or acquisition.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement reasonable technical and organizational measures designed
              to protect personal information, including encryption in transit,
              access controls, and secure authentication practices.
            </p>
            <p>
              While we strive to protect your data, no system can be guaranteed to
              be 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p>
              Requests to access, correct, or delete personal data may be submitted
              by contacting us. We will respond to such requests within
              <strong> 30 days</strong>, unless a longer period is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Retention</h2>
            <p>
              We retain data as long as necessary to provide the Service and comply
              with legal obligations. Giving and membership records may be retained
              for historical or reporting purposes at the direction of the church.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children’s Privacy</h2>
            <p>
              Churches are responsible for obtaining any required parental or
              guardian consent before entering information about minors into the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Data Breach Notification</h2>
            <p>
              In the event of a data breach affecting personal information, we will
              notify affected customers in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes
              will be communicated via email or within the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@simplechurchtools.com" className="text-primary hover:underline">
                privacy@simplechurchtools.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
