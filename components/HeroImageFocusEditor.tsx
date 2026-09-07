'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface HeroImageFocusEditorProps {
  imageUrl: string;
  focusX: number;
  focusY: number;
  onFocusChange: (x: number, y: number) => void;
}

export default function HeroImageFocusEditor({
  imageUrl,
  focusX,
  focusY,
  onFocusChange
}: HeroImageFocusEditorProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
    }
  }, [imageUrl]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imageLoaded) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate percentage coordinates
    const newFocusX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newFocusY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    onFocusChange(newFocusX, newFocusY);
  };

  const handleReset = () => {
    onFocusChange(50, 50);
  };

  // Calculate guide positions - centered on focus point
  // Mobile guide: vertical strip (narrow width, full height) - centered horizontally on focusX
  const mobileGuideWidth = 40; // 40% width for mobile (portrait orientation)
  const mobileGuideLeft = Math.max(0, Math.min(100 - mobileGuideWidth, focusX - mobileGuideWidth / 2));
  const mobileGuideTop = 0;
  const mobileGuideHeight = 100;

  // Desktop guide: horizontal strip (full width, narrow height) - centered vertically on focusY
  const desktopGuideHeight = 40; // 40% height for desktop (landscape orientation)
  const desktopGuideTop = Math.max(0, Math.min(100 - desktopGuideHeight, focusY - desktopGuideHeight / 2));
  const desktopGuideLeft = 0;
  const desktopGuideWidth = 100;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          ref={containerRef}
          onClick={handleImageClick}
          className="relative w-full cursor-crosshair border-2 rounded-lg overflow-hidden"
          style={{
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            aspectRatio: '16/9',
            minHeight: '300px'
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Hero image preview"
            onLoad={handleImageLoad}
            className="w-full h-full object-contain"
            style={{ pointerEvents: 'none' }}
          />

          {/* Overlay guides */}
          {imageLoaded && (
            <>
              {/* Mobile guide (vertical rectangle) - shows what will be visible on mobile */}
              <div
                className="absolute border-2 border-dashed pointer-events-none"
                style={{
                  left: `${mobileGuideLeft}%`,
                  top: `${mobileGuideTop}%`,
                  width: `${mobileGuideWidth}%`,
                  height: `${mobileGuideHeight}%`,
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }}
              >
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium px-2 py-1 rounded whitespace-nowrap"
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff'
                  }}
                >
                  Mobile view
                </div>
              </div>

              {/* Desktop guide (horizontal rectangle) - shows what will be visible on desktop */}
              <div
                className="absolute border-2 border-dashed pointer-events-none"
                style={{
                  left: `${desktopGuideLeft}%`,
                  top: `${desktopGuideTop}%`,
                  width: `${desktopGuideWidth}%`,
                  height: `${desktopGuideHeight}%`,
                  borderColor: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)'
                }}
              >
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium px-2 py-1 rounded whitespace-nowrap"
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff'
                  }}
                >
                  Desktop view
                </div>
              </div>

              {/* Crosshair at focus point */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${focusX}%`,
                  top: `${focusY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div
                  className="absolute w-8 h-0.5"
                  style={{
                    left: '-50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.8)'
                  }}
                />
                <div
                  className="absolute h-8 w-0.5"
                  style={{
                    top: '-50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.8)'
                  }}
                />
                <div
                  className="absolute w-4 h-4 rounded-full border-2"
                  style={{
                    left: '-50%',
                    top: '-50%',
                    transform: 'translate(50%, 50%)',
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
          Click on the image to set the focus point. The focal area will remain visible across all screen sizes.
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300"
          style={{
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Reset to center
        </button>
      </div>

      {/* Preview info */}
      {imageLoaded && (
        <div className="text-xs space-y-1" style={{ color: theme.colors.textSecondary }}>
          <div>Focus point: ({focusX.toFixed(1)}%, {focusY.toFixed(1)}%)</div>
          <div className="flex flex-wrap gap-4">
            <span style={{ color: '#3b82f6' }}>■ Mobile: Image positioned at center {focusY.toFixed(1)}%</span>
            <span style={{ color: '#10b981' }}>■ Desktop: Image positioned at {focusX.toFixed(1)}% center</span>
          </div>
        </div>
      )}
    </div>
  );
}
