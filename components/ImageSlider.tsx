'use client';

import { useState, useRef, UIEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { theme } = useTheme();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scrollContainerRef.current) {
      const nextIndex = (currentIndex + 1) % images.length;
      scrollContainerRef.current.scrollTo({
        left: nextIndex * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scrollContainerRef.current) {
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      scrollContainerRef.current.scrollTo({
        left: prevIndex * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="relative w-full aspect-[4/5] sm:aspect-square rounded-t-2xl overflow-hidden group transition-colors duration-300"
      style={{ 
        backgroundColor: theme.colors.secondary,
      }}
    >
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center overflow-hidden">
             <img
               src={img}
               alt="Product"
               className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
             />
          </div>
        ))}
      </div>
      
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="hidden sm:block absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            style={{
              backgroundColor: theme.colors.surface + 'CC',
              color: theme.colors.text
            }}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            style={{
              backgroundColor: theme.colors.surface + 'CC',
              color: theme.colors.text
            }}
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center z-10">
            {images.map((_, idx) => {
              const maxVisibleDots = 4;
              const start = Math.max(0, Math.min(currentIndex - 1, images.length - maxVisibleDots));
              const end = start + maxVisibleDots - 1;
              const actualEnd = Math.min(end, images.length - 1);
              
              const isVisible = idx >= start && idx <= end;
              const isEdge = (idx === start && start > 0) || (idx === end && end < images.length - 1);
              const isActive = idx === currentIndex;
              
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({
                        left: idx * scrollContainerRef.current.clientWidth,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: isVisible ? (isActive ? '1.5rem' : '0.5rem') : '0px',
                    height: isVisible ? '0.5rem' : '0px',
                    marginRight: isVisible && idx < actualEnd ? '0.375rem' : '0px',
                    backgroundColor: isActive ? theme.colors.surface : theme.colors.surface + '99',
                    transform: isEdge ? 'scale(0.7)' : 'scale(1)',
                    opacity: isVisible ? (isEdge ? 0.7 : 1) : 0,
                    padding: 0,
                    border: 'none'
                  }}
                  aria-label={`Image ${idx + 1}`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

