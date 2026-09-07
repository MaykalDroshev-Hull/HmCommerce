'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PublicPageLayout from '@/components/PublicPageLayout';
import { ShieldAlert, ShieldCheck, Scale, FileText, AlertTriangle } from 'lucide-react';

export default function TermsOfServicePage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
    document.title = 'Terms of Service | MB-Paws';
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const lastUpdated = '7 September 2026';

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      {/* Header */}
      <div className="bg-neutral-50/70 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 block mb-2">
            Legal Terms &amp; Conditions
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-xs text-neutral-500">
            Last updated: <span className="font-semibold text-neutral-800">{lastUpdated}</span> · Governed by the Laws of England &amp; Wales
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-10 text-neutral-700 text-xs sm:text-sm leading-relaxed">
          
          {/* Notice Box */}
          <div className="p-4 sm:p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs text-neutral-600">
            <div className="flex items-center gap-2 font-bold text-neutral-950">
              <Scale size={16} className="text-neutral-900" />
              <span>Binding Agreement</span>
            </div>
            <p>
              Please read these Terms of Service carefully before browsing our website or placing an order. By accessing, browsing, or purchasing from MB-Paws (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you acknowledge that you have read, understood, and agree without limitation to be legally bound by these Terms. If you do not agree to all terms and conditions, you must not access this website or purchase our products.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              1. General Information &amp; Website Operation
            </h2>
            <p>
              MB-Paws operates as an online retail storefront providing canine lifestyle gear and accessories across the United Kingdom. All references to &quot;buyer&quot;, &quot;customer&quot;, &quot;you&quot;, and &quot;your&quot; refer to the individual browsing this website or placing an order.
            </p>
            <p>
              To place an order on this website, you must be at least 18 years of age and legally capable of entering into binding contracts under English law.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              2. Order Formation, Acceptance &amp; Cancellation Rights
            </h2>
            <p>
              The display of goods on our website constitutes an invitation to treat and does not constitute a legally binding contractual offer.
            </p>
            <p>
              When you place an order, you make an offer to purchase the specified goods. A binding contract of sale is formed strictly when your order is packed and dispatched from our fulfilment facility, evidenced by our formal Dispatch Confirmation email containing tracking information.
            </p>
            <p>
              We reserve the absolute unilateral right to decline, cancel, or restrict any order, at our sole discretion, without liability, for reasons including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-neutral-600 text-xs">
              <li>Unavailability of stock or discontinued items;</li>
              <li>Identification of an obvious typographical or pricing error on the website;</li>
              <li>Inability to obtain payment authorisation or suspicion of fraudulent transaction activity;</li>
              <li>Orders placed with addresses deemed unserviceable by reputable postal carriers.</li>
            </ul>
            <p>
              In any event where an order is cancelled prior to dispatch, any funds captured will be promptly refunded in full to your original payment method.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              3. Pricing, Currency &amp; Payment Terms
            </h2>
            <p>
              All prices displayed on the website are quoted in British Pounds Sterling (£ / GBP) and include applicable United Kingdom taxes unless expressly stated otherwise. Delivery charges are calculated and clearly displayed during checkout prior to final payment submission.
            </p>
            <p>
              While we endeavour to ensure all product pricing is accurate, errors may occasionally occur. If we identify an error in the price of any item you have ordered, we will inform you as soon as possible and give you the option of reconfirming your order at the correct price or cancelling it for a full refund.
            </p>
            <p>
              Payment must be tendered at the point of order via our approved payment gateways: Visa, Mastercard, American Express, Apple Pay, PayPal, or Klarna. Payment processing terms are governed additionally by the respective payment providers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              4. Fulfilment, Direct Dispatch &amp; Delivery Disclaimer
            </h2>
            <p>
              MB-Paws operates a streamlined direct-fulfilment and dropshipping model. Products are dispatched directly from verified specialist manufacturing facilities and global logistics partners to provide optimal pricing and tracked door-to-door delivery.
            </p>
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-2 text-neutral-700">
              <strong className="text-neutral-950 block font-semibold">Estimated Delivery Windows:</strong>
              <p>
                All delivery timeframes stated on the site (typically 3 to 7 business days for UK destinations) are <strong>estimates only</strong> and are not binding delivery deadlines. Time shall not be of the essence in respect of delivery.
              </p>
              <p>
                MB-Paws shall have no liability whatsoever for any delivery delay or failure resulting from circumstances beyond our reasonable control, including but not limited to postal strikes, severe weather, courier network disruptions, customs inspections, or force majeure events.
              </p>
            </div>
            <p className="text-xs">
              <strong>Passing of Risk &amp; Title:</strong> Risk of loss or damage to the products passes to you immediately upon the carrier confirming delivery to the address provided during checkout. Title to the products passes once full cleared payment has been received and goods are dispatched.
            </p>
          </section>

          {/* Section 5 - CRITICAL PET SAFETY & LIABILITY */}
          <section className="space-y-4 pt-2" id="pet-safety">
            <div className="p-5 bg-neutral-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-white">
                <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                <span>5. Mandatory Pet Gear Safety Notice &amp; Owner Responsibility</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                CANINE SAFETY NOTICE: As a dog owner or handler, you are solely and exclusively responsible for the safety, supervision, and control of your animal at all times.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-xs text-neutral-300">
                <li><strong>Pre-Use Inspection:</strong> You must thoroughly inspect all collars, leads, buckles, and hardware prior to every single use. Do not use any equipment showing signs of fraying, chewing, cracking, or hardware fatigue.</li>
                <li><strong>Proper Sizing:</strong> You must ensure proper fit according to our sizing guidelines. A collar that is too loose can slip over a dog&apos;s head; a collar that is too tight can cause discomfort or respiratory restriction.</li>
                <li><strong>No Tie-Out Use:</strong> Our collars and equipment are designed exclusively for supervised everyday walking. They are <strong>NEVER</strong> to be used as a tie-out cable, tether, or stake leash. Leaving an animal tethered with a collar or lead presents severe risk of strangulation and is strictly prohibited.</li>
                <li><strong>Chew Resistance Disclaimer:</strong> High-density nylon webbing and alloy hardware are strong under tensile walking pull forces, but are <strong>NOT chew-proof</strong>. Canine teeth exert severe focal pressure that can compromise textile fibres within seconds. Damage resulting from chewing, scratching, or animal altercation is entirely the responsibility of the owner and is not covered under any guarantee.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 - LIMITATION OF LIABILITY */}
          <section className="space-y-3" id="limitation-of-liability">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              6. Limitation of Liability &amp; Exclusion of Damages
            </h2>
            <div className="p-4 border-2 border-neutral-300 rounded-xl space-y-2 bg-neutral-50/50 text-xs text-neutral-800">
              <p className="font-bold uppercase tracking-wider text-neutral-950">
                PLEASE READ THIS SECTION CAREFULLY AS IT LIMITS OUR LIABILITY TO YOU
              </p>
              <p>
                To the maximum extent permitted by applicable English law:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>
                  <strong>Total Financial Cap:</strong> MB-Paws&apos; total cumulative liability to you for any and all claims, losses, damages, or causes of action arising out of or in connection with these Terms, our website, or any product purchased, whether in contract, tort (including negligence), breach of statutory duty, restitution, or otherwise, shall be strictly capped at and limited to the <strong>total purchase price actually paid by you</strong> for the specific product giving rise to the claim.
                </li>
                <li>
                  <strong>Exclusion of Consequential &amp; Indirect Losses:</strong> In no event shall MB-Paws, its directors, employees, affiliates, or fulfilment partners be liable for any indirect, special, incidental, punitive, or consequential damages whatsoever.
                </li>
                <li>
                  <strong>Veterinary &amp; Animal Damage Exclusion:</strong> We expressly disclaim all liability for any veterinary expenses, medical treatment, pet injury, loss of pet, behavioral incidents, third-party personal injury, or third-party property damage resulting from the use, misuse, improper fitting, dog pulling, chewing, gear failure, or escape of an animal while wearing or attached to our products.
                </li>
              </ul>
              <p className="text-[11px] text-neutral-600 pt-1">
                Nothing in these Terms shall limit or exclude our liability for death or personal injury resulting from proven manufacturer negligence, fraudulent misrepresentation, or any other statutory liability that cannot be excluded or limited under the UK Consumer Rights Act 2015.
              </p>
            </div>
          </section>

          {/* Section 7 - 1-YEAR HARDWARE GUARANTEE */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              7. 1-Year Limited Hardware Guarantee
            </h2>
            <p>
              We warrant that the alloy quick-release buckle and welded stainless steel D-ring hardware on Daydrift collar products shall be free from mechanical failure for a period of one (1) year from the date of purchase.
            </p>
            <p>
              This guarantee covers structural failure of the metal buckle or D-ring weld under normal walking conditions. It explicitly excludes:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-xs text-neutral-600">
              <li>Damage caused by chewing, scratching, gnawing, or animal bites;</li>
              <li>Cosmetic wear, paint chipping, surface scratching, or normal patina;</li>
              <li>Damage resulting from improper tie-out, motor vehicle restraint, or misuse;</li>
              <li>Failure to rinse hardware after saltwater immersion.</li>
            </ul>
            <p className="text-xs">
              To submit a claim under this guarantee, email support@mb-paws.co.uk with your order number and clear photographic evidence of the mechanical defect. If validated, we will supply a replacement component or replacement collar at our discretion.
            </p>
          </section>

          {/* Section 8 - RETURNS & CANCELLATIONS */}
          <section className="space-y-3" id="returns">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              8. 30-Day Returns &amp; Statutory Cancellation Rights
            </h2>
            <p>
              Under the UK Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, you have a statutory right to cancel your purchase within 14 calendar days of receiving your goods. MB-Paws extends this window to <strong>30 calendar days</strong> from delivery.
            </p>
            <div className="space-y-2 text-xs">
              <p><strong>Conditions for Return:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-neutral-600">
                <li>Products must be completely unused, clean, odor-free, and devoid of any dog hair or dirt;</li>
                <li>All original product packaging, tags, and inserts must be intact and returned;</li>
                <li>Returns that show signs of outdoor wear, dirt, washing, or pet hair will be rejected and returned to the customer.</li>
              </ul>
              <p><strong>Return Postage:</strong></p>
              <p className="text-neutral-600">
                Unless an item is proven defective upon arrival, the customer is responsible for all return shipping postage. We strongly recommend using a tracked postal service as we cannot issue refunds for items lost in return transit.
              </p>
              <p><strong>Refund Timeline:</strong></p>
              <p className="text-neutral-600">
                Once returned items are received and inspected at our returns facility, refunds are processed within 5 to 10 business days back to your original payment method.
              </p>
            </div>
          </section>

          {/* Section 9 - INTELLECTUAL PROPERTY */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              9. Intellectual Property
            </h2>
            <p>
              All content on this website—including but not limited to brand names, logos, graphics, text, product photography, designs, and code—is the proprietary property of MB-Paws or its licensors and is protected by UK and international copyright and trademark laws. No portion of this site may be reproduced, copied, or exploited for commercial purposes without our prior written consent.
            </p>
          </section>

          {/* Section 10 - GOVERNING LAW & SEVERABILITY */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              10. Governing Law, Jurisdiction &amp; Severability
            </h2>
            <p>
              These Terms of Service and any dispute, controversy, or claim arising out of or relating to them, their subject matter, or their formation (including non-contractual disputes) shall be strictly governed by and construed in accordance with the <strong>laws of England and Wales</strong>.
            </p>
            <p>
              You irrevocably agree that the <strong>Courts of England and Wales</strong> shall have exclusive jurisdiction to settle any dispute or claim that arises out of or in connection with these Terms or the purchase of our products.
            </p>
            <p>
              If any provision or part-provision of these Terms is found by any court or competent authority to be invalid, illegal, or unenforceable, that provision or part-provision shall, to the extent required, be deemed severed, and the validity and enforceability of the other provisions of these Terms shall not be affected.
            </p>
          </section>

          {/* Section 11 - CONTACT */}
          <section className="space-y-3 pt-4 border-t border-neutral-200">
            <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
              11. Contact Details
            </h2>
            <p>
              For legal notices, terms inquiries, or warranty communications:
            </p>
            <p className="font-medium text-neutral-950">
              MB-Paws Customer &amp; Legal Operations<br />
              Email: <a href="mailto:support@mb-paws.co.uk" className="underline text-neutral-950">support@mb-paws.co.uk</a><br />
              United Kingdom
            </p>
          </section>
        </div>
      </div>
    </PublicPageLayout>
  );
}
