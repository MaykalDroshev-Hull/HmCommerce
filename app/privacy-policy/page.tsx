'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PublicPageLayout from '@/components/PublicPageLayout';

export default function PrivacyPolicyPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
    document.title = 'Privacy Policy | MB-Paws';
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const lastUpdated = '7 September 2026';

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="bg-white min-h-screen">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Header */}
          <div className="mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
              Legal &amp; Data Governance
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-950 tracking-tight mb-3">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Last updated &amp; effective date: <span className="font-semibold text-neutral-800">{lastUpdated}</span> · UK GDPR &amp; Data Protection Act 2018 Compliant
            </p>
          </div>

          {/* Editorial Content Flow */}
          <article className="space-y-10 text-neutral-900 text-sm leading-relaxed">
            
            {/* Notice / Executive Statement */}
            <div className="space-y-2">
              <p className="font-bold text-neutral-950 uppercase tracking-wide">
                Our Commitment to Your Privacy
              </p>
              <p>
                MB-Paws (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to safeguarding the personal data of all visitors and customers across the United Kingdom. This Privacy Policy details the strict standards under which we collect, process, store, and protect your information in full compliance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
              </p>
            </div>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                1. Data Controller Information
              </h2>
              <p>
                For the purposes of the UK General Data Protection Regulation (UK GDPR), the data controller responsible for your personal information is MB-Paws.
              </p>
              <p>
                If you have any questions regarding this Privacy Policy, your statutory data subject rights, or how your personal data is handled, please contact our Data Privacy Lead:
              </p>
              <div className="space-y-1 pt-1">
                <p><strong className="text-neutral-950">Entity:</strong> MB-Paws Online Commerce</p>
                <p><strong className="text-neutral-950">Email:</strong> <a href="mailto:support@mb-paws.co.uk" className="underline text-neutral-950">support@mb-paws.co.uk</a></p>
                <p><strong className="text-neutral-950">Operating Jurisdiction:</strong> England and Wales, United Kingdom</p>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                2. Personal Data We Collect
              </h2>
              <p>
                We only collect data strictly necessary to fulfill your orders, provide customer support, and operate a secure, functioning e-commerce platform:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1.5 text-neutral-900">
                <li><strong className="text-neutral-950">Identity &amp; Contact Information:</strong> Full name, email address, telephone number, billing address, and UK delivery address.</li>
                <li><strong className="text-neutral-950">Order &amp; Transaction Records:</strong> Details of products purchased, quantities, sizes, colour choices, discounts applied, order timestamps, and delivery notes.</li>
                <li><strong className="text-neutral-950">Communication Records:</strong> Records of customer care correspondence, inquiries submitted via our contact forms, and support emails.</li>
                <li><strong className="text-neutral-950">Technical &amp; Usage Information:</strong> IP address, browser type, operating system, device identifiers, referral URLs, and pages accessed, collected via essential cookies and aggregated analytics.</li>
              </ul>
              <div className="pt-2 space-y-1">
                <p>
                  <strong>Important Financial Disclaimer:</strong> We do NOT collect, hold, or process credit card numbers, debit card numbers, or security codes (CVV) on our servers. All financial transactions are tokenised and executed directly through PCI-DSS Level 1 compliant gateway providers, including Stripe, PayPal, Apple Pay, and Klarna.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                3. Lawful Bases for Processing
              </h2>
              <p>
                Under UK GDPR Article 6, we process your personal information strictly in reliance upon the following legal bases:
              </p>
              <div className="space-y-3 pt-1">
                <div>
                  <strong className="text-neutral-950 block font-semibold">a. Performance of a Contract (Article 6(1)(b))</strong>
                  <p>Processing is necessary to fulfill our purchase agreement with you—specifically processing transactions, generating shipping manifests, and delivering products to your specified UK address.</p>
                </div>
                <div>
                  <strong className="text-neutral-950 block font-semibold">b. Compliance with Legal Obligations (Article 6(1)(c))</strong>
                  <p>Retaining financial invoices and transaction records to comply with UK statutory accounting, value-added tax (VAT), and HM Revenue &amp; Customs (HMRC) regulatory requirements.</p>
                </div>
                <div>
                  <strong className="text-neutral-950 block font-semibold">c. Legitimate Business Interests (Article 6(1)(f))</strong>
                  <p>Operating our storefront securely, monitoring site integrity, preventing fraudulent transactions, addressing customer disputes, and defending against unauthorized chargebacks.</p>
                </div>
                <div>
                  <strong className="text-neutral-950 block font-semibold">d. Consent (Article 6(1)(a))</strong>
                  <p>Where you have explicitly opted in to receive promotional newsletters or optional marketing updates. You retain the absolute right to revoke consent at any moment via the unsubscribe link or by emailing support@mb-paws.co.uk.</p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                4. Sharing of Data with Third Parties &amp; Fulfilment Partners
              </h2>
              <p>
                We do not sell, rent, or lease your personal information under any circumstances. In order to operate our dropshipping and direct-fulfilment supply chain, your data is shared only with verified third-party service providers bound by strict contractual data processing agreements:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1.5 text-neutral-900">
                <li><strong className="text-neutral-950">Fulfilment &amp; Manufacturing Hubs:</strong> Names, delivery addresses, telephone numbers, and order items are securely transmitted to verified manufacturing and dispatch hubs strictly to pack and label your package.</li>
                <li><strong className="text-neutral-950">Postal Carriers &amp; Couriers:</strong> Delivery data is shared with postal and courier services (including Royal Mail, DPD, Evri, or tracked courier partners) solely to execute delivery to your door.</li>
                <li><strong className="text-neutral-950">Cloud Infrastructure &amp; Database Hosting:</strong> Encrypted databases hosted securely on Supabase (AWS eu-west-2 London region) and Vercel hosting infrastructure.</li>
                <li><strong className="text-neutral-950">Transactional Email Service:</strong> Resend for automated transactional order confirmations, dispatch notices, and tracking links.</li>
                <li><strong className="text-neutral-950">Legal &amp; Regulatory Authorities:</strong> We may disclose data where strictly compelled by UK court orders, law enforcement bodies, or legal processes to protect against fraud or defend our legal rights.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                5. International Data Transfers
              </h2>
              <p>
                Because our supply chain utilizes direct manufacturing and global dispatch networks, certain order fulfillment data may be transferred to and processed by partners located outside the United Kingdom or European Economic Area (EEA).
              </p>
              <p>
                In all such circumstances, we enforce legally binding safeguards recognised under UK law—including the UK International Data Transfer Agreement (IDTA) or European Commission Standard Contractual Clauses with the UK Addendum—ensuring your personal data receives a level of protection essentially equivalent to that guaranteed within the United Kingdom.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                6. Data Retention Periods
              </h2>
              <p>
                We retain personal data strictly for as long as necessary to satisfy the specific purposes for which it was gathered:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1.5 text-neutral-900">
                <li><strong className="text-neutral-950">Order &amp; Invoicing Records:</strong> Kept for 6 years following the end of the relevant financial year in compliance with UK tax law and statutory HMRC audit guidelines.</li>
                <li><strong className="text-neutral-950">Customer Support Inquiries:</strong> Retained for up to 2 years after resolution to handle any follow-up warranty claims or return queries.</li>
                <li><strong className="text-neutral-950">Marketing Consent Records:</strong> Retained until such time as you withdraw consent or request erasure.</li>
              </ul>
              <p className="pt-1">
                Upon expiration of statutory retention windows, records are irreversibly anonymised or securely deleted.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                7. Your Legal Rights Under UK GDPR
              </h2>
              <p>
                As a resident of the United Kingdom, you possess clear statutory rights under Chapter III of the UK GDPR:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 text-neutral-900">
                <li>
                  <strong className="text-neutral-950">Right of Access (Subject Access Request):</strong> You may request a copy of the personal data we hold about you.
                </li>
                <li>
                  <strong className="text-neutral-950">Right to Rectification:</strong> You may request the immediate correction of inaccurate or incomplete records.
                </li>
                <li>
                  <strong className="text-neutral-950">Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You may request deletion of your data where statutory retention obligations do not apply.
                </li>
                <li>
                  <strong className="text-neutral-950">Right to Restriction of Processing:</strong> You may request the suspension of data processing under certain contested circumstances.
                </li>
                <li>
                  <strong className="text-neutral-950">Right to Data Portability:</strong> You may receive your data in a structured, commonly used, machine-readable format.
                </li>
                <li>
                  <strong className="text-neutral-950">Right to Object:</strong> You may object at any time to processing based on legitimate interests or direct marketing.
                </li>
              </ul>
              <p className="pt-2">
                To exercise any of these rights, contact us at <a href="mailto:support@mb-paws.co.uk" className="font-semibold text-neutral-950 underline">support@mb-paws.co.uk</a>. We respond to verified requests within one calendar month without fee, subject to statutory identity verification.
              </p>
              <p className="text-neutral-600">
                You also have the right to lodge a complaint with the UK data protection supervisory authority: Information Commissioner&apos;s Office (ICO), Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF (<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk</a>).
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                8. Cookies &amp; Tracking Technologies
              </h2>
              <p>
                Our website uses small text files called cookies to facilitate basic site navigation, remember your cart items across sessions, and collect anonymous aggregate traffic metrics. You may configure your browser to decline non-essential cookies at any time, though some interactive checkout capabilities may be affected.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                9. Amendments to this Policy
              </h2>
              <p>
                We reserve the right to amend this Privacy Policy periodically to reflect changes in our operational procedures or UK statutory regulations. Any revisions will be published on this page with an updated effective date. Continued usage of our website following any modification indicates your acknowledgment of the updated terms.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3 pt-6 border-t border-neutral-200">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                10. Contact Us
              </h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy, please write to:
              </p>
              <p className="font-medium text-neutral-950">
                MB-Paws Customer Support &amp; Data Privacy<br />
                Email: <a href="mailto:support@mb-paws.co.uk" className="underline text-neutral-950">support@mb-paws.co.uk</a><br />
                United Kingdom
              </p>
            </section>

          </article>
        </main>
      </div>
    </PublicPageLayout>
  );
}
