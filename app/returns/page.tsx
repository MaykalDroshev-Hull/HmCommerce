'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PublicPageLayout from '@/components/PublicPageLayout';
import {
  RotateCcw,
  ShieldCheck,
  PackageCheck,
  Clock,
  Truck,
  Mail,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

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
      {/* Editorial Header */}
      <header className="bg-neutral-50/70 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 block mb-2">
            Customer Care &amp; Guarantees
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight mb-3">
            30-Day Returns &amp; Refund Policy
          </h1>
          <p className="text-xs text-neutral-500">
            Last updated: <span className="font-semibold text-neutral-800">{lastUpdated}</span> · UK Consumer Contracts Regulations 2013 Compliant
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <article className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-10 text-neutral-700 text-xs sm:text-sm leading-relaxed">
          
          {/* Reassurance Banner */}
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs text-neutral-600">
            <div className="flex items-center gap-2 font-bold text-neutral-950 text-sm">
              <ShieldCheck size={18} className="text-neutral-900" />
              <span>Pet Parent Peace of Mind Guarantee</span>
            </div>
            <p>
              We want you and your furbaby to be completely thrilled with every piece of gear you receive from MB-Paws. Under the UK Consumer Contracts Regulations 2013, your statutory right to cancel is 14 calendar days. At MB-Paws, we extend this to a generous <strong>30 calendar days</strong> from the date of delivery.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50/50">
              <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                <Clock size={16} className="text-neutral-800" />
                <span>30 Days Window</span>
              </div>
              <p className="text-xs text-neutral-500">
                Cancel or initiate a return within 30 days of parcel arrival.
              </p>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50/50">
              <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                <PackageCheck size={16} className="text-neutral-800" />
                <span>Easy Exchanges</span>
              </div>
              <p className="text-xs text-neutral-500">
                Need a different size or colour? We will gladly swap it for you.
              </p>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50/50">
              <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                <RotateCcw size={16} className="text-neutral-800" />
                <span>5–10 Day Refunds</span>
              </div>
              <p className="text-xs text-neutral-500">
                Funds returned swiftly to your original payment method.
              </p>
            </div>
          </div>

          {/* Section 1: How to Return */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              1. How to Return or Exchange an Item
            </h2>
            <p>
              Returning an item is simple and fuss-free. Follow these four quick steps:
            </p>
            <div className="space-y-3">
              <div className="flex gap-3 items-start p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-neutral-950 block mb-0.5">Contact Support</strong>
                  <p className="text-xs text-neutral-600">
                    Email us at{' '}
                    <a href="mailto:support@mb-paws.co.uk" className="font-semibold text-neutral-900 underline underline-offset-2">
                      support@mb-paws.co.uk
                    </a>{' '}
                    with your order number, the item you wish to return, and whether you prefer a refund or an exchange.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-neutral-950 block mb-0.5">Receive Returns Authorisation</strong>
                  <p className="text-xs text-neutral-600">
                    Our team will reply within 24 hours with your unique Return Merchandise Authorisation (RMA) reference and the correct UK returns depot address.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-neutral-950 block mb-0.5">Pack &amp; Post Safely</strong>
                  <p className="text-xs text-neutral-600">
                    Package the item securely in its original packaging with all product labels attached. We strongly recommend using a tracked service (such as Royal Mail Tracked) and retaining proof of postage.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-neutral-950 block mb-0.5">Inspection &amp; Refund</strong>
                  <p className="text-xs text-neutral-600">
                    Once received and inspected at our returns facility, your refund will be issued within 5 to 10 business days directly to your original payment method (Credit card, PayPal, or Klarna).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Return Eligibility */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              2. Return Eligibility &amp; Condition Criteria
            </h2>
            <p>
              To maintain the highest hygiene and safety standards for all dogs and pet parents, items returned for a change of mind must be in resalable condition:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-700" />
                  <span>Eligible for Return</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-emerald-800">
                  <li>Unused, unwashed, and odour-free</li>
                  <li>Free of pet hair, dander, and outdoor dirt</li>
                  <li>Original tags and branded packaging intact</li>
                  <li>Returned within 30 days of delivery</li>
                </ul>
              </div>

              <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-red-900 text-xs">
                  <AlertCircle size={15} className="text-red-700" />
                  <span>Not Eligible for Return</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
                  <li>Shows signs of outdoor wear or muddy trails</li>
                  <li>Pet hair or animal odours present</li>
                  <li>Damage from chewing, scratching, or gnawing</li>
                  <li>Missing original hardware or tags</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Return Postage */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              3. Return Shipping Postage
            </h2>
            <p>
              <strong>Change of Mind / Sizing Exchanges:</strong> Customers are responsible for the return shipping postage when returning an item due to preference, change of mind, or size exchange.
            </p>
            <p>
              <strong>Damaged, Defective, or Incorrect Items:</strong> If an item arrives defective, faulty, or if you received an incorrect item, MB-Paws covers 100% of the return shipping costs. We will provide a pre-paid return label or reimburse your postage cost immediately upon validation.
            </p>
          </section>

          {/* Section 4: Faulty Goods & Warranty */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              4. Damaged, Defective Goods &amp; Mechanical Warranty
            </h2>
            <p>
              Under the UK Consumer Rights Act 2015, you are entitled to goods that are as described, fit for purpose, and of satisfactory quality.
            </p>
            <p>
              If your item suffers structural failure under normal walking conditions (such as a hardware weld failure), please email{' '}
              <a href="mailto:support@mb-paws.co.uk" className="font-semibold text-neutral-900 underline underline-offset-2">
                support@mb-paws.co.uk
              </a>{' '}
              with photos showing the defect. If verified, we will dispatch an expedited replacement at zero cost or issue a complete refund.
            </p>
          </section>

          {/* Section 5: Exchanges */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              5. Size &amp; Colour Exchanges
            </h2>
            <p>
              We know that every canine is unique in build and stature! If you ordered a size that is slightly too snug or loose, let us know right away. When you contact us for an exchange, we will place the desired replacement size on temporary hold so it does not sell out before your return reaches us.
            </p>
            <p className="text-xs text-neutral-500">
              For sizing assistance, refer to our comprehensive{' '}
              <Link href="/size-guide" className="font-semibold text-neutral-900 underline underline-offset-2">
                Size Guide
              </Link>{' '}
              prior to purchasing.
            </p>
          </section>

          {/* Section 6: Refund Processing */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              6. Refund Method &amp; Processing Times
            </h2>
            <p>
              Refunds will always be credited back to the original method of payment:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-xs text-neutral-600">
              <li><strong>Credit / Debit Cards:</strong> Typically reflect on your bank statement within 3 to 5 business days after our bank processes the refund.</li>
              <li><strong>PayPal:</strong> Instantly credited to your PayPal balance or linked funding source.</li>
              <li><strong>Klarna:</strong> Any future scheduled payments are cancelled immediately, and installments already paid are refunded back to your account within 5 to 7 business days.</li>
            </ul>
          </section>

          {/* Help Box */}
          <div className="p-5 bg-neutral-950 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <HelpCircle size={16} className="text-neutral-300" />
                <span>Need help with an order or return?</span>
              </div>
              <p className="text-xs text-neutral-400">
                Our UK-based pet care support team is on hand 7 days a week.
              </p>
            </div>
            <a
              href="mailto:support@mb-paws.co.uk"
              className="inline-flex items-center gap-2 bg-white text-neutral-950 px-4 py-2 rounded-lg text-xs font-bold hover:bg-neutral-100 transition-colors shrink-0"
            >
              <Mail size={14} />
              <span>Contact Support</span>
            </a>
          </div>

        </article>
      </main>
    </PublicPageLayout>
  );
}
