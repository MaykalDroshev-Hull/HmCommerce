'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PublicPageLayout from '@/components/PublicPageLayout';
import { 
  Mail, 
  Clock, 
  RotateCcw, 
  Truck, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  CheckCircle2, 
  HelpCircle,
  Package,
  Ruler
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'How long does delivery take and how do I track my order?',
    answer:
      'All orders are processed promptly and dispatched with end-to-end tracking. Delivery across the United Kingdom typically arrives within 3 to 7 business days. As soon as your order has been dispatched from our fulfilment facility, you will receive a confirmation email containing your personal tracking link.',
  },
  {
    question: 'What is your 30-Day Return & Exchange policy?',
    answer:
      'We want you and your dog to be completely satisfied with your gear. We offer a 30-day return window for items in clean, unworn, original condition with all product tags and packaging intact. To initiate an exchange or return, please email our support team at support@mb-paws.co.uk with your 5-character order ID.',
  },
  {
    question: 'How do I ensure I select the right size collar or harness?',
    answer:
      'We recommend measuring your dog’s neck and chest circumference using a soft measuring tape. For collars, ensure you can comfortably slide two fingers between the collar and your dog’s neck for an optimal, safe fit. You can consult our full Size Guide with breed recommendations anytime.',
    link: { href: '/size-guide', label: 'View Size Guide' },
  },
  {
    question: 'What payment options do you accept?',
    answer:
      'We accept all major debit and credit cards (Visa, Mastercard, American Express), Apple Pay, PayPal, and Klarna Pay in 3 (spread the cost across three interest-free monthly payments, subject to status, 18+ UK residents only).',
  },
  {
    question: 'What is covered under your 1-Year Hardware Guarantee?',
    answer:
      'Our Daydrift collection is engineered with anodised alloy quick-release buckles and welded stainless steel D-rings. We guarantee the structural integrity of all mechanical hardware against defects or breakage for 1 full year from date of purchase. Please note normal cosmetic scratching, chewing, or improper tie-out use is not covered.',
  },
  {
    question: 'Can I amend or cancel my order after placing it?',
    answer:
      'To provide the fastest possible dispatch, orders enter automated fulfilment shortly after placement. If you need to update an address or cancel an order, please email support@mb-paws.co.uk within 2 hours of checkout and our team will do our best to accommodate your request.',
  },
];

export default function SupportPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderId: '',
    subject: 'order_status',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
    document.title = 'Customer Support & Help Centre | MB-Paws';
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate sending enquiry or logging support request
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFormData({
      name: '',
      email: '',
      orderId: '',
      subject: 'order_status',
      message: '',
    });
  };

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="bg-neutral-50/70 border-b border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 block mb-2">
            Help &amp; Customer Care
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight mb-4">
            How Can We Assist You?
          </h1>
          <p className="max-w-2xl mx-auto text-sm text-neutral-600 leading-relaxed">
            Our UK-based customer care team is dedicated to providing prompt, personal support for all order, sizing, delivery, and product queries.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Support Highlights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <Mail size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-950 text-base mb-1">Direct Email Care</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                Send your inquiry directly to our dedicated support inbox anytime.
              </p>
              <a
                href="mailto:support@mb-paws.co.uk"
                className="text-xs font-semibold text-neutral-950 hover:underline"
              >
                support@mb-paws.co.uk
              </a>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <Clock size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-950 text-base mb-1">Operating Hours</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                Monday to Friday: 9:00am – 5:00pm GMT. Inquiries answered within 24 business hours.
              </p>
              <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                UK Support Team
              </span>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <RotateCcw size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-950 text-base mb-1">Hassle-Free Returns</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                30-day return and exchange window for all unused gear in original packaging.
              </p>
              <Link
                href="/terms-of-service#returns"
                className="text-xs font-semibold text-neutral-950 hover:underline"
              >
                Read Return Terms &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Form & Quick Links Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Contact Form */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-neutral-950 mb-2">Send an Inquiry</h2>
            <p className="text-xs text-neutral-600 mb-6">
              Complete the details below and a member of our team will respond via email.
            </p>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-bold block">Thank you for reaching out!</span>
                  <span>Your message has been received. Our team will get back to you shortly at your email address.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="eleanor@example.co.uk"
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Order ID (if applicable)
                  </label>
                  <input
                    type="text"
                    name="orderId"
                    value={formData.orderId}
                    onChange={handleInputChange}
                    placeholder="e.g. 7K4R2"
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 uppercase transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Inquiry Topic *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all bg-white"
                  >
                    <option value="order_status">Order Status &amp; Tracking</option>
                    <option value="sizing">Sizing &amp; Fitting Advice</option>
                    <option value="returns">Returns &amp; Exchanges</option>
                    <option value="product_question">Product &amp; Materials Query</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                  Your Message *
                </label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Please describe how we can assist you..."
                  className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Inquiry</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Help & Self Service */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-neutral-100/70 border border-neutral-200/80 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-neutral-950 text-sm tracking-tight flex items-center gap-2">
                <HelpCircle size={16} />
                <span>Self-Service Resources</span>
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Save time with our dedicated guides and instant self-service resources.
              </p>

              <div className="space-y-3 pt-1">
                <Link
                  href="/size-guide"
                  className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-900 transition-all text-xs font-semibold text-neutral-950 group"
                >
                  <div className="flex items-center gap-2.5">
                    <Ruler size={16} className="text-neutral-500 group-hover:text-neutral-950 transition-colors" />
                    <span>Collar &amp; Breed Size Guide</span>
                  </div>
                  <span className="text-neutral-400 group-hover:text-neutral-950 transition-colors">&rarr;</span>
                </Link>

                <Link
                  href="/#product"
                  className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-900 transition-all text-xs font-semibold text-neutral-950 group"
                >
                  <div className="flex items-center gap-2.5">
                    <Package size={16} className="text-neutral-500 group-hover:text-neutral-950 transition-colors" />
                    <span>View Daydrift Collection</span>
                  </div>
                  <span className="text-neutral-400 group-hover:text-neutral-950 transition-colors">&rarr;</span>
                </Link>

                <Link
                  href="/terms-of-service"
                  className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-900 transition-all text-xs font-semibold text-neutral-950 group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-neutral-500 group-hover:text-neutral-950 transition-colors" />
                    <span>Terms &amp; 1-Year Guarantee</span>
                  </div>
                  <span className="text-neutral-400 group-hover:text-neutral-950 transition-colors">&rarr;</span>
                </Link>
              </div>
            </div>

            <div className="p-5 border border-neutral-200 rounded-2xl bg-white text-xs text-neutral-600 space-y-2">
              <span className="font-bold text-neutral-900 block">Dispatch Note</span>
              <p className="leading-relaxed text-[11px]">
                Orders are fulfilled directly through verified dispatch hubs to guarantee direct-to-door tracking across the United Kingdom. If your package has not updated within 48 hours of dispatch, our support team will gladly trace it with the courier.
              </p>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div id="faq" className="scroll-mt-20 pt-8 border-t border-neutral-200">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 block mb-1">
              Common Questions
            </span>
            <h2 className="text-2xl font-bold text-neutral-950 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div key={item.question} className="py-4">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left py-2 font-bold text-sm text-neutral-950 hover:text-neutral-700 transition-colors"
                  >
                    <span>{item.question}</span>
                    {isOpen ? (
                      <ChevronUp size={18} className="text-neutral-400 shrink-0 ml-4" />
                    ) : (
                      <ChevronDown size={18} className="text-neutral-400 shrink-0 ml-4" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="pt-2 pb-4 text-xs text-neutral-600 leading-relaxed space-y-3">
                      <p>{item.answer}</p>
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="inline-block font-semibold text-neutral-950 underline hover:no-underline"
                        >
                          {item.link.label} &rarr;
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
}
