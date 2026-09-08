'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Heart, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { normalizeProductImages } from '@/lib/product-images';

interface ProductMediaGalleryProps {
  images: string[];
  productName: string;
  focusImage?: string | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function ProductMediaGallery({
  images,
  productName,
  focusImage,
  isFavorited = false,
  onToggleFavorite,
}: ProductMediaGalleryProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const safeImages = useMemo(() => {
    const valid = Array.isArray(images)
      ? images.filter((img) => typeof img === 'string' && img.trim().length > 0)
      : [];
    const norm = normalizeProductImages(
      valid.length > 0 ? valid : ['/products/collar-graphite-grey.jpg'],
      '/products/collar-graphite-grey.jpg'
    );
    const cleaned = norm.filter((img) => typeof img === 'string' && img.trim().length > 0);
    return cleaned.length > 0 ? cleaned : ['/products/collar-graphite-grey.jpg'];
  }, [images]);


  // If focusImage changes (e.g. colour swatch click), select that image
  useEffect(() => {
    if (!focusImage) return;
    const idx = safeImages.findIndex((img) => img === focusImage);
    if (idx >= 0) {
      setActiveSlide(idx);
    }
  }, [focusImage, safeImages]);

  const prevSlide = () => {
    setActiveSlide((prev) => (prev > 0 ? prev - 1 : safeImages.length - 1));
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev < safeImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      {/* Desktop View: 2x2 Clean Image Grid */}
      <div className="hidden md:grid grid-cols-2 gap-2.5">
        {safeImages.map((imageUrl, idx) => (
          <div
            key={`${imageUrl}-${idx}`}
            className="group relative aspect-square bg-neutral-100 rounded-sm overflow-hidden cursor-zoom-in"
            onClick={() => setModalImage(imageUrl)}
          >
            <Image
              src={imageUrl}
              alt={`${productName} view ${idx + 1}`}
              fill
              priority={idx === 0}
              sizes="(min-width: 1024px) 30vw, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            <button
              type="button"
              className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-neutral-800 hover:bg-white"
              aria-label="Expand image"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile View: Swipeable Carousel Slider */}
      <div className="md:hidden relative aspect-square bg-neutral-100 overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src={safeImages[activeSlide] || safeImages[0]}
            alt={`${productName} slide ${activeSlide + 1}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Favorite Heart Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-neutral-800 hover:scale-110 active:scale-95 transition-all"
            aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              size={18}
              className={isFavorited ? 'fill-[#D31336] text-[#D31336]' : 'text-neutral-700'}
            />
          </button>
        )}

        {/* Navigation Arrows (Mobile) */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-neutral-800 shadow hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm text-neutral-800 shadow hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>

            {/* Pagination Dots (Mobile) */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
              {safeImages.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setActiveSlide(dotIdx)}
                  className={`transition-all duration-300 rounded-full ${
                    dotIdx === activeSlide
                      ? 'w-5 h-1.5 bg-neutral-900'
                      : 'w-1.5 h-1.5 bg-neutral-400 hover:bg-neutral-600'
                  }`}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Full-Screen Zoom Modal (Desktop / Click) */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setModalImage(null)}
        >
          <button
            type="button"
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setModalImage(null)}
            aria-label="Close zoomed image"
          >
            <X size={24} />
          </button>
          <div className="relative w-full max-w-4xl max-h-[85vh] aspect-square">
            <Image
              src={modalImage}
              alt={`${productName} zoomed preview`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
