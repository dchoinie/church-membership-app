import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service | Simple Church Tools",
  description: "Terms of Service for Simple Church Tools",
  path: "/terms",
  keywords: ["terms of service", "terms", "legal"],
});

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: January 22, 2026
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using Simple Church Tools (&quot;Service,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If
              you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p className="mt-3">
              Your use of the Service is also governed by our Privacy Policy, which
              is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p>
              Simple Church Tools is a cloud-based church management platform
              designed to assist churches with administrative and organizational
              tasks, including membership records, attendance tracking, and giving
              records.
            </p>
            <p>
              The Service is provided as a general administrative tool and is not
              intended to provide legal, financial, or tax advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Account Registration and Eligibility</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Eligibility</h3>
            <p>
              You must be at least 18 years old and have authority to bind your
              organization to these Terms. You represent that you are a legitimate
              church or religious organization and that all information you provide
              is accurate and complete.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity that occurs under your
              account. You agree to notify us immediately of any unauthorized use or
              security breach.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Subscriptions and Payments</h2>

            <p>
              Subscription fees are billed on a recurring basis and processed
              through Stripe. All fees are exclusive of applicable taxes unless
              stated otherwise.
            </p>

            <p>
              Subscriptions automatically renew unless canceled before the end of
              the current billing period. Fees are generally non-refundable except
              where required by law or explicitly stated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Acceptable Use</h2>
            <p>
              You agree to use the Service only for lawful church administrative
              purposes and in compliance with all applicable laws.
            </p>
            <p>
              You may not misuse the Service, attempt unauthorized access, transmit
              malicious code, or interfere with system integrity or performance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data and Content</h2>

            <p>
              You retain ownership of all data entered into the Service (&quot;Your
              Data&quot;). You are solely responsible for the legality, accuracy, and
              content of Your Data.
            </p>

            <p>
              You represent and warrant that you have all necessary rights,
              permissions, and lawful bases — including parental or guardian consent
              where applicable — to collect, store, and process personal data of
              members and minors.
            </p>

            <p>
              We act solely as a data processor on your behalf, as described in our
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Service Availability</h2>
            <p>
              The Service is provided on an &quot;as available&quot; basis. We do not
              guarantee uptime, availability, or uninterrupted operation, and no
              service level agreement (SLA) is provided unless expressly agreed in
              writing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Termination</h2>
            <p>
              You may terminate your account at any time by canceling your
              subscription. We may suspend or terminate access immediately if you
              violate these Terms or misuse the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
              OF ANY KIND, EXPRESS OR IMPLIED.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SIMPLE CHURCH TOOLS SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR SPECIAL
              DAMAGES.
            </p>
            <p>
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF ONE HUNDRED
              DOLLARS ($100) OR THE AMOUNT PAID BY YOU IN THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Simple Church Tools from any
              claims arising from your use of the Service or violation of these
              Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Governing Law and Disputes</h2>
            <p>
              These Terms are governed by the laws of the State of Minnesota.
              Disputes shall be resolved through binding arbitration, except where
              prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Force Majeure</h2>
            <p>
              We are not liable for delays or failures caused by events beyond our
              reasonable control, including acts of God, internet outages, or third
              party service failures.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">14. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">15. Contact</h2>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:legal@simplechurchtools.com" className="text-primary hover:underline">
                legal@simplechurchtools.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
