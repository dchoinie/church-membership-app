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
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to Simple Church Tools ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our church management software and services (the "Service").
            </p>
            <p>
              By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Church Account Information</h3>
            <p>When a church organization creates an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Church name, address, city, state, zip code, and country</li>
              <li>Denomination information</li>
              <li>Contact information (phone number, email address)</li>
              <li>Subdomain and custom domain (if applicable)</li>
              <li>Logo and branding preferences</li>
            </ul>

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
              <li>Donation amounts (current, mission, memorials, debt, school, miscellaneous)</li>
              <li>Date of contributions</li>
              <li>Notes related to giving</li>
              <li>Envelope numbers associated with contributions</li>
            </ul>
            <p className="mt-3">
              <strong>Note:</strong> We do not process payment card information directly. All subscription payments are processed securely through Stripe, and we do not have access to your full payment card details.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.4 Subscription and Payment Information</h3>
            <p>For subscription management, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Stripe customer ID and subscription ID</li>
              <li>Subscription plan type (basic or premium)</li>
              <li>Subscription status and billing period information</li>
              <li>Trial period information</li>
            </ul>
            <p className="mt-3">
              Payment processing is handled entirely by Stripe. We do not store or have access to your credit card numbers, bank account information, or other sensitive payment details. Stripe's use of your personal information is governed by their Privacy Policy, available at{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://stripe.com/privacy
              </a>.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.5 Attendance and Service Information</h3>
            <p>We collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service dates, types, and times</li>
              <li>Member attendance records</li>
              <li>Communion participation records</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.6 User Account Information</h3>
            <p>For users who access the Service, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Password (stored in encrypted form)</li>
              <li>Account creation and last login timestamps</li>
              <li>Invitation codes and acceptance status</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">2.7 Automatically Collected Information</h3>
            <p>We may automatically collect certain information when you use our Service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage patterns and preferences</li>
              <li>Log files and error reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve our Service</li>
              <li>To manage church membership records and relationships</li>
              <li>To track and report on giving and contributions</li>
              <li>To manage attendance and service records</li>
              <li>To process subscription payments and manage billing</li>
              <li>To send you important notices regarding your account or subscription</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations</li>
              <li>To enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing and Disclosure</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Service Providers</h3>
            <p>We may share information with third-party service providers who perform services on our behalf:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Stripe:</strong> For payment processing and subscription management. Stripe's privacy policy governs their use of your payment information.
              </li>
              <li>
                <strong>Database Hosting:</strong> Your data is stored securely in our database infrastructure.
              </li>
              <li>
                <strong>Email Services:</strong> For sending transactional and service-related emails.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Legal Requirements</h3>
            <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.4 With Your Consent</h3>
            <p>We may share your information with your explicit consent or at your direction.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit using SSL/TLS</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Secure password storage using industry-standard hashing algorithms</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights and Choices</h2>
            <p>Depending on your location, you may have certain rights regarding your personal information:</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.1 Access and Portability</h3>
            <p>You have the right to access and receive a copy of your personal information that we hold.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.2 Correction</h3>
            <p>You have the right to request correction of inaccurate or incomplete personal information.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.3 Deletion</h3>
            <p>You have the right to request deletion of your personal information, subject to certain exceptions (e.g., legal obligations, legitimate business interests).</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.4 Objection and Restriction</h3>
            <p>You have the right to object to certain processing of your personal information or request restriction of processing.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.5 Data Portability</h3>
            <p>You have the right to receive your personal information in a structured, commonly used, and machine-readable format.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.6 Withdraw Consent</h3>
            <p>If we rely on your consent to process your information, you have the right to withdraw that consent at any time.</p>

            <p className="mt-4">
              To exercise these rights, please contact us using the information provided in the "Contact Us" section below. We will respond to your request within a reasonable timeframe and in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When you cancel your subscription or delete your account, we will retain certain information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
            <p className="mt-3">
              Giving records and membership history may be retained for historical and tax reporting purposes, even after a member is removed from active membership.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children's Privacy</h2>
            <p>
              Our Service is intended for use by churches and their authorized administrators. While churches may enter information about minors (children) in their membership records, we do not knowingly collect personal information directly from children under the age of 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using our Service, you consent to the transfer of your information to these countries.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
            <p className="mt-3">
              Material changes to this Privacy Policy will be communicated to you via email or through a prominent notice on our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:</p>
            <ul className="list-none pl-0 space-y-2 mt-4">
              <li>
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@simplechurchtools.com" className="text-primary hover:underline">
                  privacy@simplechurchtools.com
                </a>
              </li>
              <li>
                <strong>Website:</strong>{" "}
                <a href="/#contact" className="text-primary hover:underline">
                  Contact Form
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
