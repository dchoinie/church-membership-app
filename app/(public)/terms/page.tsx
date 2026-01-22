import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Simple Church Tools",
  description: "Terms of Service for Simple Church Tools",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using Simple Church Tools ("Service," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, then you may not access the Service.
            </p>
            <p className="mt-3">
              These Terms apply to all visitors, users, and others who access or use the Service. Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p>
              Simple Church Tools is a cloud-based church management software that provides churches with tools to manage:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Church membership records and information</li>
              <li>Household and family relationships</li>
              <li>Giving and contribution tracking</li>
              <li>Service attendance records</li>
              <li>Membership history and changes</li>
              <li>Other church administration functions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Account Registration and Eligibility</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Eligibility</h3>
            <p>To use our Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 18 years of age or have the authority to bind your organization</li>
              <li>Be a legitimate church or religious organization</li>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Subscriptions and Payment Terms</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Subscription Plans</h3>
            <p>
              We offer subscription plans (e.g., Basic and Premium) with different features and member limits. Subscription fees are billed on a recurring basis (monthly or annually) as selected during checkout.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Free Trial</h3>
            <p>
              We may offer a free trial period for new accounts. During the trial period, you have full access to the Service. At the end of the trial period, your subscription will automatically convert to a paid subscription unless you cancel before the trial ends.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Payment Processing</h3>
            <p>
              All subscription payments are processed securely through Stripe, our third-party payment processor. By subscribing, you agree to Stripe's Terms of Service and Privacy Policy. We do not store or have access to your full payment card information.
            </p>
            <p className="mt-3">
              You agree to provide current, complete, and accurate purchase and account information for all purchases made through the Service. You agree to promptly update your account and payment information, including email address, payment method, and payment card expiration date, so we can complete your transactions and contact you as needed.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.4 Billing and Renewal</h3>
            <p>
              Subscription fees are charged in advance on a recurring basis. Your subscription will automatically renew at the end of each billing period unless you cancel your subscription before the renewal date. You authorize us to charge your payment method for the renewal fees.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.5 Price Changes</h3>
            <p>
              We reserve the right to modify subscription fees at any time. We will provide at least 30 days' notice of any price changes. Price changes will apply to subsequent billing periods. If you do not agree to the price change, you may cancel your subscription before the change takes effect.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.6 Refunds</h3>
            <p>
              Subscription fees are generally non-refundable. However, we may provide refunds or credits at our sole discretion in exceptional circumstances. Refund requests must be submitted within 30 days of the charge date.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4.7 Cancellation</h3>
            <p>
              You may cancel your subscription at any time through your account settings or by contacting us. Cancellation will take effect at the end of your current billing period. You will continue to have access to the Service until the end of your paid period.
            </p>
            <p className="mt-3">
              Upon cancellation, your data will be retained for a period as specified in our Privacy Policy. After this retention period, your data may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Use of Service and Acceptable Use</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">5.1 Permitted Use</h3>
            <p>You may use the Service only for lawful purposes and in accordance with these Terms. You agree to use the Service solely for managing your church's membership, giving, and administrative records.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5.2 Prohibited Activities</h3>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any local, state, national, or international law</li>
              <li>Violate or infringe upon the rights of others, including intellectual property rights</li>
              <li>Transmit any malicious code, viruses, or harmful data</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
              <li>Collect or store personal data about other users without authorization</li>
              <li>Use the Service to send spam, unsolicited messages, or harassing communications</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data and Content</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">6.1 Your Data</h3>
            <p>
              You retain all rights, title, and interest in and to the data you upload or enter into the Service ("Your Data"). You are solely responsible for the accuracy, quality, and legality of Your Data.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.2 License to Use Your Data</h3>
            <p>
              By using the Service, you grant us a limited, non-exclusive license to use, store, and process Your Data solely for the purpose of providing and improving the Service. This license terminates when you delete Your Data or cancel your account, except as necessary to comply with legal obligations.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.3 Data Backup</h3>
            <p>
              While we implement backup and disaster recovery procedures, you are responsible for maintaining your own backups of important data. We are not liable for any loss or corruption of Your Data.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6.4 Data Privacy</h3>
            <p>
              Your use of the Service is subject to our Privacy Policy, which explains how we collect, use, and protect your information. You are responsible for ensuring that you have the necessary permissions and legal basis to collect and store member information in compliance with applicable privacy laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by Simple Church Tools and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="mt-3">
              You may not copy, modify, distribute, sell, or lease any part of the Service or included software, nor may you reverse engineer or attempt to extract the source code of that software, unless laws prohibit those restrictions or you have our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Service Availability and Modifications</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">8.1 Availability</h3>
            <p>
              We strive to maintain high availability of the Service but do not guarantee uninterrupted, secure, or error-free operation. The Service may be unavailable due to maintenance, updates, technical issues, or circumstances beyond our control.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">8.2 Modifications to Service</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Termination</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">9.1 Termination by You</h3>
            <p>You may terminate your account at any time by canceling your subscription and contacting us to delete your account.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.2 Termination by Us</h3>
            <p>We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">9.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
            </p>
            <p className="mt-3">
              We do not warrant that the Service will be uninterrupted, timely, secure, or error-free, or that defects will be corrected. We do not warrant or make any representations regarding the use or results of the Service in terms of accuracy, reliability, or otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SIMPLE CHURCH TOOLS, ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
            </p>
            <p className="mt-3">
              OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRIOR TO THE ACTION GIVING RISE TO THE LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Simple Church Tools and its affiliates, officers, agents, employees, and licensors from and against any claims, liabilities, damages, losses, and expenses, including without limitation reasonable legal and accounting fees, arising out of or in any way connected with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party right, including privacy rights or intellectual property rights</li>
              <li>Your Data or any content you submit, post, or transmit through the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Minnesota, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association (AAA), except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">14. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after any changes constitutes your acceptance of the new Terms.
            </p>
            <p className="mt-3">
              If you do not agree to the modified Terms, you must stop using the Service and cancel your subscription.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">15. Miscellaneous</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">15.1 Entire Agreement</h3>
            <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and Simple Church Tools regarding the Service.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">15.2 Severability</h3>
            <p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">15.3 Waiver</h3>
            <p>No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">15.4 Assignment</h3>
            <p>You may not assign or transfer these Terms or your account without our prior written consent. We may assign these Terms without restriction.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">16. Contact Information</h2>
            <p>If you have any questions about these Terms of Service, please contact us:</p>
            <ul className="list-none pl-0 space-y-2 mt-4">
              <li>
                <strong>Email:</strong>{" "}
                <a href="mailto:legal@simplechurchtools.com" className="text-primary hover:underline">
                  legal@simplechurchtools.com
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
