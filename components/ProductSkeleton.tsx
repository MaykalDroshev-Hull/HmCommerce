'use client';

export default function ProductSkeleton() {
  return (
    <div className="bg-white min-h-screen text-neutral-900 selection:bg-neutral-900 selection:text-white animate-pulse">
      {/* Main Product Section: 2-Column Grid Matching ProductView */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: Media Gallery Skeleton (7 cols on desktop) */}
          <div className="md:col-span-7 space-y-4">
            {/* Desktop 2x2 Image Grid / Mobile Aspect-Square Hero */}
            <div className="hidden sm:grid grid-cols-2 gap-3 sm:gap-4">
              <div className="aspect-square bg-neutral-100 rounded-2xl border border-neutral-200/60" />
              <div className="aspect-square bg-neutral-100 rounded-2xl border border-neutral-200/60" />
              <div className="aspect-square bg-neutral-100 rounded-2xl border border-neutral-200/60" />
              <div className="aspect-square bg-neutral-100 rounded-2xl border border-neutral-200/60" />
            </div>

            {/* Mobile View: Single Image Hero with Dots Indicator Skeleton */}
            <div className="sm:hidden space-y-3">
              <div className="aspect-square w-full bg-neutral-100 rounded-2xl border border-neutral-200/60" />
              <div className="flex justify-center gap-1.5 pt-1">
                <div className="w-6 h-1.5 rounded-full bg-neutral-300" />
                <div className="w-2 h-1.5 rounded-full bg-neutral-200" />
                <div className="w-2 h-1.5 rounded-full bg-neutral-200" />
                <div className="w-2 h-1.5 rounded-full bg-neutral-200" />
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Purchase Details Skeleton (5 cols on desktop) */}
          <div className="md:col-span-5 space-y-6 md:sticky md:top-24 self-start">
            {/* Brand / Kicker */}
            <div className="h-3.5 w-28 bg-neutral-100 rounded-full" />

            {/* Product Title (2 Lines) */}
            <div className="space-y-2.5">
              <div className="h-7 sm:h-8 w-4/5 bg-neutral-200 rounded-lg" />
              <div className="h-7 sm:h-8 w-3/5 bg-neutral-200 rounded-lg" />
            </div>

            {/* Price & Klarna 3-Pay Skeleton */}
            <div className="space-y-2 pt-1">
              <div className="h-7 w-32 bg-neutral-200 rounded-md" />
              <div className="h-4 w-60 bg-neutral-100 rounded-md" />
            </div>

            <div className="h-px w-full bg-neutral-100 my-4" />

            {/* Colour Selector Skeleton */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-neutral-100 rounded-full" />
                <div className="h-3.5 w-16 bg-neutral-100 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 ring-2 ring-neutral-300" />
                <div className="w-10 h-10 rounded-full bg-neutral-100" />
                <div className="w-10 h-10 rounded-full bg-neutral-100" />
              </div>
            </div>

            {/* Size Selector Skeleton */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-20 bg-neutral-100 rounded-full" />
                <div className="h-3.5 w-20 bg-neutral-100 rounded-full" />
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['XXS', 'XS', 'S', 'M', 'L', 'XL'].map((_, idx) => (
                  <div key={idx} className="h-11 rounded-xl bg-neutral-100 border border-neutral-200/60" />
                ))}
              </div>
            </div>

            {/* Primary Add to Bag Button Skeleton */}
            <div className="pt-3 space-y-3">
              <div className="h-14 w-full bg-neutral-900/10 rounded-xl" />
              <div className="h-12 w-full bg-neutral-100 rounded-xl border border-neutral-200/60" />
            </div>

            {/* Micro Trust Indicators Skeleton */}
            <div className="pt-4 border-t border-neutral-100 grid grid-cols-3 gap-2">
              <div className="h-4 bg-neutral-100 rounded-full" />
              <div className="h-4 bg-neutral-100 rounded-full" />
              <div className="h-4 bg-neutral-100 rounded-full" />
            </div>

            {/* Collapsible Accordions Skeleton */}
            <div className="space-y-2.5 pt-2">
              <div className="h-13 w-full bg-neutral-50 rounded-xl border border-neutral-200/60 p-4 flex items-center justify-between">
                <div className="h-4 w-32 bg-neutral-200 rounded-md" />
                <div className="w-4 h-4 rounded-full bg-neutral-200" />
              </div>
              <div className="h-13 w-full bg-neutral-50 rounded-xl border border-neutral-200/60 p-4 flex items-center justify-between">
                <div className="h-4 w-28 bg-neutral-200 rounded-md" />
                <div className="w-4 h-4 rounded-full bg-neutral-200" />
              </div>
              <div className="h-13 w-full bg-neutral-50 rounded-xl border border-neutral-200/60 p-4 flex items-center justify-between">
                <div className="h-4 w-36 bg-neutral-200 rounded-md" />
                <div className="w-4 h-4 rounded-full bg-neutral-200" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Deep-Dive Performance Features Skeleton */}
      <section className="border-t border-neutral-200 bg-neutral-50/60 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center space-y-2.5 mb-12">
            <div className="h-3.5 w-32 bg-neutral-200 mx-auto rounded-full" />
            <div className="h-6 w-64 bg-neutral-200 mx-auto rounded-lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 bg-white rounded-2xl border border-neutral-200/70 space-y-3 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-100" />
                <div className="h-4 w-36 bg-neutral-200 rounded-md" />
                <div className="h-3 w-full bg-neutral-100 rounded-md" />
                <div className="h-3 w-4/5 bg-neutral-100 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
