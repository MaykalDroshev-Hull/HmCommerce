'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PublicPageLayout from '@/components/PublicPageLayout';

export default function ReturnsPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
    document.title = '30-Day Returns & Refund Policy | MB-Paws';
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const lastUpdated = '14 September 2026';

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="bg-white min-h-screen">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Header */}
          <div className="mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
              Customer Care &amp; Guarantees
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-950 tracking-tight mb-3">
              30-Day Returns &amp; Refund Policy
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Last updated: <span className="font-semibold text-neutral-800">{lastUpdated}</span> · UK Consumer Contracts Regulations 2013 Compliant
            </p>
          </div>

          {/* Editorial Content Flow */}
          <article className="space-y-10 text-neutral-900 text-sm leading-relaxed">
            
            {/* Reassurance Statement */}
            <div className="space-y-2">
              <p className="font-bold text-neutral-950 uppercase tracking-wide">
                Pet Parent Peace of Mind Guarantee
              </p>
              <p>
                We want you and your furbaby to be completely thrilled with every piece of gear you receive from MB-Paws. Under the UK Consumer Contracts Regulations 2013, your statutory right to cancel is 14 calendar days. At MB-Paws, we extend this to a generous <strong>30 calendar days</strong> from the date of delivery.
              </p>
            </div>

            {/* Overview Points */}
            <div className="space-y-2 text-neutral-900">
              <p>• <strong>30 Days Window:</strong> Cancel or initiate a return within 30 days of parcel arrival.</p>
              <p>• <strong>Easy Exchanges:</strong> Need a different size or colour? We will gladly swap it for you.</p>
              <p>• <strong>5–10 Day Refunds:</strong> Funds returned swiftly to your original payment method.</p>
            </div>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                1. How to Return or Exchange an Item
              </h2>
              <p>
                Returning an item is simple and fuss-free. Follow these four quick steps:
              </p>
              <div className="space-y-3 pt-1">
                <p>
                  <strong>1. Contact Support:</strong> Email us at{' '}
                  <a href="mailto:support@mb-paws.co.uk" className="underline font-semibold text-neutral-950">
                    support@mb-paws.co.uk
                  </a>{' '}
                  with your order number, the item you wish to return, and whether you prefer a refund or an exchange.
                </p>
                <p>
                  <strong>2. Receive Returns Authorisation:</strong> Our team will reply within 24 hours with your unique Return Merchandise Authorisation (RMA) reference and the correct UK returns depot address.
                </p>
                <p>
                  <strong>3. Pack &amp; Post Safely:</strong> Package the item securely in its original packaging with all product labels attached. We strongly recommend using a tracked service (such as Royal Mail Tracked) and retaining proof of postage.
                </p>
                <p>
                  <strong>4. Inspection &amp; Refund:</strong> Once received and inspected at our returns facility, your refund will be issued within 5 to 10 business days directly to your original payment method (Credit card, PayPal, or Klarna).
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                2. Return Eligibility &amp; Condition Criteria
              </h2>
              <p>
                To maintain the highest hygiene and safety standards for all dogs and pet parents, items returned for a change of mind must be in resalable condition:
              </p>
              <div className="space-y-4 pt-1">
                <div>
                  <p className="font-bold text-neutral-950 mb-1">Eligible for Return:</p>
                  <ul className="list-disc list-outside ml-5 space-y-1 text-neutral-900">
                    <li>Unused, unwashed, and odour-free</li>
                    <li>Free of pet hair, dander, and outdoor dirt</li>
                    <li>Original tags and branded packaging intact</li>
                    <li>Returned within 30 days of delivery</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-neutral-950 mb-1">Not Eligible for Return:</p>
                  <ul className="list-disc list-outside ml-5 space-y-1 text-neutral-900">
                    <li>Shows signs of outdoor wear or muddy trails</li>
                    <li>Pet hair or animal odours present</li>
                    <li>Damage from chewing, scratching, or gnawing</li>
                    <li>Missing original hardware or tags</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                3. Return Shipping Postage
              </h2>
              <p>
                <strong>Change of Mind / Sizing Exchanges:</strong> Customers are responsible for the return shipping postage when returning an item due to preference, change of mind, or size exchange.
              </p>
              <p>
                <strong>Damaged, Defective, or Incorrect Items:</strong> If an item arrives defective, faulty, or if you received an incorrect item, MB-Paws covers 100% of the return shipping costs. We will provide a pre-paid return label or reimburse your postage cost immediately upon validation.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                4. Damaged, Defective Goods &amp; Mechanical Warranty
              </h2>
              <p>
                Under the UK Consumer Rights Act 2015, you are entitled to goods that are as described, fit for purpose, and of satisfactory quality.
              </p>
              <p>
                If your item suffers structural failure under normal walking conditions (such as a hardware weld failure), please email{' '}
                <a href="mailto:support@mb-paws.co.uk" className="underline font-semibold text-neutral-950">
                  support@mb-paws.co.uk
                </a>{' '}
                with photos showing the defect. If verified, we will dispatch an expedited replacement at zero cost or issue a complete refund.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                5. Size &amp; Colour Exchanges
              </h2>
              <p>
                We know that every canine is unique in build and stature! If you ordered a size that is slightly too snug or loose, let us know right away. When you contact us for an exchange, we will place the desired replacement size on temporary hold so it does not sell out before your return reaches us.
              </p>
              <p className="text-neutral-600">
                For sizing assistance, refer to our comprehensive{' '}
                <Link href="/size-guide" className="underline font-semibold text-neutral-950">
                  Size Guide
                </Link>{' '}
                prior to purchasing.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                6. Refund Method &amp; Processing Times
              </h2>
              <p>
                Refunds will always be credited back to the original method of payment:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1 text-neutral-900">
                <li><strong>Credit / Debit Cards:</strong> Typically reflect on your bank statement within 3 to 5 business days after our bank processes the refund.</li>
                <li><strong>PayPal:</strong> Instantly credited to your PayPal balance or linked funding source.</li>
                <li><strong>Klarna:</strong> Any future scheduled payments are cancelled immediately, and installments already paid are refunded back to your account within 5 to 7 business days.</li>
              </ul>
            </section>

            {/* Section 7 - Support */}
            <section className="space-y-3 pt-6 border-t border-neutral-200">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight uppercase underline underline-offset-4">
                7. Contact &amp; Support
              </h2>
              <p className="font-semibold text-neutral-950">
                Need help with an order or return?
              </p>
              <p>
                Our UK-based pet care support team is on hand 7 days a week.
              </p>
              <p className="font-medium text-neutral-950">
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
