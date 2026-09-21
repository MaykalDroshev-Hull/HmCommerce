'use client';

import { useEffect, useState } from 'react';
import { Star, CheckCircle2, MessageSquare, Image as ImageIcon } from 'lucide-react';

export interface ProductReview {
  review_id: string;
  product_id: string;
  author_name: string;
  rating: number;
  review_text: string;
  image_url?: string | null;
  pet_name?: string | null;
  is_verified?: boolean;
  created_at?: string;
}

interface ProductReviewsSectionProps {
  productId: string;
  productName?: string;
}

export default function ProductReviewsSection({
  productId,
  productName,
}: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let isCancelled = false;

    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/products/${productId}/reviews`);
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      } catch (err) {
        console.error('Failed to load product reviews:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchReviews();
    return () => {
      isCancelled = true;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <section className="border-t border-neutral-200 py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4 max-w-sm">
            <div className="h-4 bg-neutral-200 rounded w-1/3" />
            <div className="h-7 bg-neutral-200 rounded w-2/3" />
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  // Calculate average rating
  const avgRating =
    reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length;

  return (
    <section className="border-t border-neutral-200 py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1.5">
              Verified Pet Parent Feedback
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
              {productName ? `What Pet Parents Say About ${productName}` : 'Customer Reviews'}
            </h2>
          </div>

          <div className="shrink-0 inline-flex items-center gap-2.5 sm:gap-3 bg-neutral-50 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-neutral-200 self-start sm:self-auto whitespace-nowrap">
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(avgRating)
                      ? 'fill-neutral-950 text-neutral-950'
                      : 'fill-transparent text-neutral-300'
                  }
                />
              ))}
            </div>
            <span className="text-sm font-bold text-neutral-950 whitespace-nowrap shrink-0">
              {avgRating.toFixed(1)} / 5.0
            </span>
            <span className="text-xs text-neutral-500 whitespace-nowrap shrink-0">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.review_id}
              className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50/40 space-y-4 flex flex-col justify-between shadow-xs hover:border-neutral-300 transition-colors"
            >
              <div className="space-y-3">
                {/* Rating & Pet Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 text-neutral-950">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className="fill-neutral-950 text-neutral-950"
                      />
                    ))}
                  </div>
                  {rev.pet_name && (
                    <span className="text-[11px] font-semibold text-neutral-500">
                      {rev.pet_name}
                    </span>
                  )}
                </div>

                {/* Review Text */}
                <p className="text-xs text-neutral-700 leading-relaxed font-normal">
                  &ldquo;{rev.review_text}&rdquo;
                </p>

                {/* Review Image (Pet photo thumbnail if provided) */}
                {rev.image_url && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedImage(rev.image_url!)}
                      className="group relative block w-full aspect-[4/3] max-h-72 rounded-xl overflow-hidden border border-neutral-200 hover:border-neutral-950 transition-all focus:outline-none shadow-xs bg-neutral-100"
                    >
                      <img
                        src={rev.image_url}
                        alt={`Photo by ${rev.author_name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium backdrop-blur-[2px]">
                        <ImageIcon size={16} />
                        <span>Enlarge photo</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Author & Verification Footer */}
              <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-950">
                  {rev.author_name}
                </span>
                {rev.is_verified !== false && (
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 size={13} /> Verified Buyer
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox / Image Preview Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
          >
            <img
              src={selectedImage}
              alt="Pet parent photo full view"
              className="w-full h-full object-contain max-h-[80vh]"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
