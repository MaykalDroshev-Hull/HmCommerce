'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  Ruler,
  Zap,
  Home,
  Trees,
  Wand2,
  Copy,
  UploadCloud,
  ExternalLink
} from 'lucide-react';

export interface StudioQueueItem {
  id: string;
  sourceUrl: string;
  imageType: 'product' | 'size_guide';
  logoVariant: 'black' | 'white';
  status: 'idle' | 'generating' | 'completed' | 'error';
  generatedUrl?: string;
  error?: string;
}

export interface AiImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  images: string[];
  initialFocusedImage?: string;
  onReplaceImage?: (originalUrl: string, newUrl: string) => void;
  onAddImage?: (newUrl: string, makePrimary?: boolean) => void;
  onApplyAllCompleted?: (replacements: Array<{ originalUrl: string; newUrl: string }>) => void;
}

export default function AiImageStudioModal({
  isOpen,
  onClose,
  productTitle,
  images,
  initialFocusedImage,
  onReplaceImage,
  onAddImage,
  onApplyAllCompleted
}: AiImageStudioModalProps) {
  const [studioSourceImage, setStudioSourceImage] = useState<string>('');
  const [studioQueue, setStudioQueue] = useState<StudioQueueItem[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [studioBreed, setStudioBreed] = useState<string>('Labrador Retriever');
  const [studioPreset, setStudioPreset] = useState<'clean_studio' | 'dynamic_action' | 'british_home' | 'outdoor_park' | 'custom'>('clean_studio');
  const [studioCustomPrompt, setStudioCustomPrompt] = useState<string>('');
  const [synthesizedPrompt, setSynthesizedPrompt] = useState<string | null>(null);
  const [synthesizedAnalysis, setSynthesizedAnalysis] = useState<string | null>(null);
  const [isSynthesizingPrompt, setIsSynthesizingPrompt] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [studioRequiresBilling, setStudioRequiresBilling] = useState(false);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);
  const [isUploadingManual, setIsUploadingManual] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Initialize or update queue on open
  useEffect(() => {
    if (isOpen) {
      const queueList = images.length > 0 ? images : initialFocusedImage ? [initialFocusedImage] : [];
      const queue: StudioQueueItem[] = queueList.map((url, i) => {
        const isLikelySizeGuide =
          /size|chart|measur|guide|dimension|table/i.test(url) || (i === 1 && queueList.length > 2);
        return {
          id: `img-${i}-${Date.now()}`,
          sourceUrl: url,
          imageType: isLikelySizeGuide ? 'size_guide' : 'product',
          logoVariant: 'black',
          status: 'idle'
        };
      });

      setStudioQueue(queue);
      const activeUrl = initialFocusedImage || queueList[0] || '';
      const focusedIdx = queue.findIndex((q) => q.sourceUrl === activeUrl);
      const validIdx = focusedIdx >= 0 ? focusedIdx : 0;
      setActiveQueueIndex(validIdx);
      setStudioSourceImage(activeUrl);
      setGeneratedImageUrl(null);
      setStudioError(null);
      setStudioRequiresBilling(false);
      setSynthesizedPrompt(null);
      setSynthesizedAnalysis(null);
      setActionSuccessMessage(null);
    }
  }, [isOpen, images, initialFocusedImage]);

  if (!isOpen) return null;

  const activeItem = studioQueue[activeQueueIndex] || studioQueue[0];
  const completedCount = studioQueue.filter((q) => q.status === 'completed' && q.generatedUrl).length;

  const handleSelectQueueIndex = (idx: number) => {
    setActiveQueueIndex(idx);
    const item = studioQueue[idx];
    if (item) {
      setStudioSourceImage(item.sourceUrl);
      setGeneratedImageUrl(item.generatedUrl || null);
      setStudioError(item.error || null);
      setSynthesizedPrompt(null);
      setSynthesizedAnalysis(null);
      setActionSuccessMessage(null);
    }
  };

  const handleToggleQueueItemType = (idx: number, newType: 'product' | 'size_guide') => {
    setStudioQueue((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], imageType: newType };
      }
      return next;
    });
  };

  const handleToggleQueueItemLogo = (idx: number, variant: 'black' | 'white') => {
    setStudioQueue((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], logoVariant: variant };
      }
      return next;
    });
  };

  // Generate single queue item directly with Gemini multimodal
  const handleGenerateDirectItem = async (index: number) => {
    const item = studioQueue[index];
    if (!item) return;

    try {
      setStudioQueue((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'generating', error: undefined };
        return next;
      });
      setStudioError(null);
      setStudioRequiresBilling(false);
      setActionSuccessMessage(null);

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-direct',
          sourceImageUrl: item.sourceUrl,
          imageType: item.imageType,
          productTitle: productTitle || 'Pet Product',
          breed: studioBreed,
          scenePreset: studioPreset,
          customInstructions: studioCustomPrompt,
          logoVariant: item.logoVariant
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setStudioQueue((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: 'completed',
            generatedUrl: data.imageUrl
          };
          return next;
        });
        if (index === activeQueueIndex) {
          setGeneratedImageUrl(data.imageUrl);
        }
      } else {
        if (data.requiresBilling) {
          setStudioRequiresBilling(true);
        }
        setStudioQueue((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: 'error',
            error: data.error || 'Generation failed'
          };
          return next;
        });
        setStudioError(data.error || 'Image generation failed');
      }
    } catch (err: any) {
      setStudioQueue((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: 'error',
          error: err.message || 'Network error'
        };
        return next;
      });
      setStudioError(err.message || 'Network error');
    }
  };

  // Generate ALL queued images simultaneously
  const handleGenerateAllQueued = async () => {
    try {
      setIsBatchGenerating(true);
      setStudioError(null);
      setStudioRequiresBilling(false);
      setActionSuccessMessage(null);

      await Promise.allSettled(
        studioQueue.map((_, idx) => handleGenerateDirectItem(idx))
      );
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Synthesize Studio Prompt with Gemini
  const handleSynthesizePrompt = async () => {
    try {
      setIsSynthesizingPrompt(true);
      setStudioError(null);
      setStudioRequiresBilling(false);

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesize-prompt',
          sourceImageUrl: studioSourceImage,
          productTitle: productTitle || 'Pet Product',
          breed: studioBreed,
          scenePreset: studioPreset,
          customInstructions: studioCustomPrompt
        })
      });

      const data = await res.json();
      if (data.success) {
        setSynthesizedAnalysis(data.analysis);
        setSynthesizedPrompt(data.imagenPrompt);
      } else {
        setStudioError(data.error || 'Failed to synthesize prompt');
      }
    } catch (err: any) {
      setStudioError(err.message || 'Error communicating with Gemini');
    } finally {
      setIsSynthesizingPrompt(false);
    }
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    if (!synthesizedPrompt) return;
    navigator.clipboard.writeText(synthesizedPrompt);
    setHasCopiedPrompt(true);
    setTimeout(() => setHasCopiedPrompt(false), 2000);
  };

  // Handle manual file upload from user's Gemini chat
  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingManual(true);
      setStudioError(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload-manual',
              base64Data,
              mimeType: file.type
            })
          });

          const data = await res.json();
          if (data.success && data.imageUrl) {
            setGeneratedImageUrl(data.imageUrl);
            setStudioQueue((prev) => {
              const next = [...prev];
              if (next[activeQueueIndex]) {
                next[activeQueueIndex] = {
                  ...next[activeQueueIndex],
                  status: 'completed',
                  generatedUrl: data.imageUrl
                };
              }
              return next;
            });
          } else {
            setStudioError(data.error || 'Failed to upload image');
          }
        } catch (uploadErr: any) {
          setStudioError(uploadErr.message || 'Upload processing error');
        } finally {
          setIsUploadingManual(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setStudioError(err.message || 'Error reading file');
      setIsUploadingManual(false);
    }
  };

  // Replace Single Generated Image in Gallery
  const handleReplaceClick = () => {
    if (!activeItem || !activeItem.generatedUrl) return;
    if (onReplaceImage) {
      onReplaceImage(activeItem.sourceUrl, activeItem.generatedUrl);
      setActionSuccessMessage('Replaced original image with AI-generated photo in product images!');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  // Add Generated Image as New Photo
  const handleAddAsNewClick = () => {
    const imgToAdd = generatedImageUrl || activeItem?.generatedUrl;
    if (!imgToAdd) return;
    if (onAddImage) {
      onAddImage(imgToAdd, false);
      setActionSuccessMessage('Added AI-generated photo to product gallery!');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  // Apply ALL Completed Images
  const handleApplyAllClick = () => {
    const completed = studioQueue.filter((q) => q.status === 'completed' && q.generatedUrl);
    if (completed.length === 0) return;

    if (onApplyAllCompleted) {
      const replacements = completed.map((q) => ({
        originalUrl: q.sourceUrl,
        newUrl: q.generatedUrl!
      }));
      onApplyAllCompleted(replacements);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-5xl w-full shadow-2xl border-t sm:border border-neutral-200 overflow-hidden flex flex-col h-[95vh] sm:h-[90vh] mx-auto">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight truncate">
                  AI Studio: Gemini Multimodal Re-imaginer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {studioQueue.length} Images Queued
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                {productTitle ? `Product: ${productTitle} • ` : ''}Feeds source photos directly into Gemini vision for British editorial studio shots &amp; branded sizing charts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {completedCount > 0 && onApplyAllCompleted && (
              <button
                type="button"
                onClick={handleApplyAllClick}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <CheckCircle2 size={13} />
                <span>Apply All Completed ({completedCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Queue Strip & Simultaneous Action Bar */}
        <div className="bg-neutral-100/90 px-4 sm:px-6 py-2.5 border-b border-neutral-200 shrink-0 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 shrink-0 hidden md:inline">
              Selected Queue ({studioQueue.length}):
            </span>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
              {studioQueue.map((item, idx) => {
                const isActive = idx === activeQueueIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectQueueIndex(idx)}
                    className={`relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-all touch-manipulation group ${
                      isActive
                        ? 'border-neutral-950 ring-2 ring-neutral-950/20 shadow-md scale-105'
                        : 'border-neutral-300 hover:border-neutral-400 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={item.generatedUrl || item.sourceUrl}
                      alt={`Queue ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                      }}
                    />
                    {item.status === 'generating' && (
                      <span className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center">
                        <RefreshCw size={13} className="text-amber-400 animate-spin" />
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <Check size={9} className="stroke-[3]" />
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                        <AlertCircle size={9} />
                      </span>
                    )}
                    {item.imageType === 'size_guide' && (
                      <span className="absolute bottom-0 inset-x-0 bg-neutral-950/80 text-[8px] text-amber-300 font-bold uppercase text-center py-0.2 truncate leading-tight">
                        Size
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Batch Simultaneous Action Button */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateAllQueued}
              disabled={isBatchGenerating || studioQueue.some((q) => q.status === 'generating')}
              className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 touch-manipulation disabled:opacity-50"
            >
              {isBatchGenerating ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-amber-400" />
                  <span>Re-imagining All ({studioQueue.filter((q) => q.status === 'generating').length} active)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Re-imagine All ({studioQueue.length}) Directly</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column: Active Image Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Image Mode Box */}
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Active Item #{activeQueueIndex + 1} of {studioQueue.length}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    activeItem?.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : activeItem?.status === 'generating'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : activeItem?.status === 'error'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {activeItem?.status || 'idle'}
                </span>
              </div>

              {/* Multimodal Generation Mode Toggle */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                  Multimodal Generation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleQueueItemType(activeQueueIndex, 'product')}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      activeItem?.imageType === 'product'
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Camera size={14} className={activeItem?.imageType === 'product' ? 'text-amber-400' : 'text-neutral-500'} />
                    <div>
                      <span className="text-xs font-bold block">Product Photo</span>
                      <span className={`text-[10px] block ${activeItem?.imageType === 'product' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        Editorial photoshoot
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleQueueItemType(activeQueueIndex, 'size_guide')}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      activeItem?.imageType === 'size_guide'
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Ruler size={14} className={activeItem?.imageType === 'size_guide' ? 'text-amber-400' : 'text-neutral-500'} />
                    <div>
                      <span className="text-xs font-bold block">Size Guide</span>
                      <span className={`text-[10px] block ${activeItem?.imageType === 'size_guide' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        With brand logo
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* If Size Guide: Brand Logo Variant Selector */}
              {activeItem?.imageType === 'size_guide' && (
                <div className="p-3 bg-white rounded-lg border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1">
                      <span>Brand Logo to Embed:</span>
                    </label>
                    <span className="text-[10px] text-neutral-400">Meow Bark Official</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleQueueItemLogo(activeQueueIndex, 'black')}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                        activeItem.logoVariant === 'black'
                          ? 'bg-neutral-950 text-white border-neutral-950'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded bg-white border border-neutral-300 p-0.5 flex items-center justify-center shrink-0">
                        <img src="/Black Logo.png" alt="Black Logo" className="max-h-full object-contain" />
                      </div>
                      <span className="truncate">Black Logo (Light)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleQueueItemLogo(activeQueueIndex, 'white')}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                        activeItem.logoVariant === 'white'
                          ? 'bg-neutral-950 text-white border-neutral-950'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded bg-neutral-900 border border-neutral-700 p-0.5 flex items-center justify-center shrink-0">
                        <img src="/White-logo.png" alt="White Logo" className="max-h-full object-contain" />
                      </div>
                      <span className="truncate">White Logo (Dark)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-tight">
                    Gemini will read measurement rows directly from this photo and embed our official Meow Bark logo into a clean UK editorial chart.
                  </p>
                </div>
              )}
            </div>

            {/* If Product Photo: Breed Selection & Style Presets */}
            {activeItem?.imageType === 'product' && (
              <>
                {/* Breed Selection */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                    Target Pet Breed
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Labrador Retriever',
                      'Golden Retriever',
                      'French Bulldog',
                      'Cockapoo',
                      'Dachshund',
                      'Poodle',
                      'Original Breed'
                    ].map((breed) => (
                      <button
                        key={breed}
                        type="button"
                        onClick={() => {
                          setStudioBreed(breed);
                          setSynthesizedPrompt(null);
                          setSynthesizedAnalysis(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium touch-manipulation ${
                          studioBreed === breed
                            ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {breed}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={studioBreed}
                    onChange={(e) => {
                      setStudioBreed(e.target.value);
                      setSynthesizedPrompt(null);
                      setSynthesizedAnalysis(null);
                    }}
                    placeholder="Or enter custom breed (e.g. Jack Russell)"
                    className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                {/* Scene Presets */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1.5">
                    Scene &amp; Pose Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'clean_studio', label: 'Clean Studio', desc: 'White backdrop, soft 85mm light', icon: Camera },
                      { id: 'dynamic_action', label: 'Dynamic Action', desc: 'Rearing stallion pose, motion', icon: Zap },
                      { id: 'british_home', label: 'British Home', desc: 'Warm oak floor, morning sun', icon: Home },
                      { id: 'outdoor_park', label: 'Autumn Park', desc: 'English garden, golden hour', icon: Trees }
                    ].map((preset) => {
                      const IconComponent = preset.icon;
                      const isSelected = studioPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setStudioPreset(preset.id as any);
                            setSynthesizedPrompt(null);
                            setSynthesizedAnalysis(null);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all touch-manipulation flex flex-col justify-between ${
                            isSelected
                              ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                              : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <IconComponent size={12} className={isSelected ? 'text-amber-400' : 'text-neutral-600'} />
                            <span className="text-xs font-bold block truncate">{preset.label}</span>
                          </div>
                          <span className={`text-[9px] block leading-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Custom Directions */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block mb-1">
                Custom Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={studioCustomPrompt}
                onChange={(e) => setStudioCustomPrompt(e.target.value)}
                placeholder={
                  activeItem?.imageType === 'size_guide'
                    ? 'e.g. Bold table borders, highlight chest girth in centimeters, clean white background'
                    : 'e.g. Playful head tilt, soft golden hour rim lighting, cozy rug'
                }
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            {/* Active Item Action Buttons */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleGenerateDirectItem(activeQueueIndex)}
                disabled={activeItem?.status === 'generating' || isBatchGenerating}
                className="w-full py-3 px-4 bg-neutral-950 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
              >
                {activeItem?.status === 'generating' ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-amber-400" />
                    <span>Feeding Directly to Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Re-imagine Active Image #{activeQueueIndex + 1} Directly</span>
                  </>
                )}
              </button>

              {activeItem?.imageType === 'product' && (
                <button
                  type="button"
                  onClick={handleSynthesizePrompt}
                  disabled={isSynthesizingPrompt}
                  className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 touch-manipulation"
                >
                  {isSynthesizingPrompt ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Analyzing Prompt...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={12} />
                      <span>Synthesize Prompt for Web Gemini Chat</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Visual Preview, Comparison & Drop-in (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-neutral-50/70 p-4 rounded-xl border border-neutral-200">
            <div className="space-y-3">
              {/* Feedback banners */}
              {actionSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {studioError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{studioError}</span>
                </div>
              )}

              {studioRequiresBilling && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span>Google Cloud Project Billing Required for Direct Image Generation</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Google Imagen 3 direct API calls require an active billing account linked in Google AI Studio.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href="https://console.cloud.google.com/billing"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-[11px] font-semibold rounded-lg shadow-sm"
                    >
                      <span>Open Google Cloud Billing</span>
                      <ExternalLink size={10} />
                    </a>
                    <span className="text-[11px] text-amber-700">
                      Or upload images generated in your free gemini.google.com chat below!
                    </span>
                  </div>
                </div>
              )}

              {/* Side-by-side: Source vs Result */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Image */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Source Image #{activeQueueIndex + 1}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-medium">Original</span>
                  </div>
                  <div className="aspect-square w-full rounded-xl overflow-hidden border border-neutral-300 bg-white relative flex items-center justify-center">
                    <img
                      src={activeItem?.sourceUrl || studioSourceImage}
                      alt="Source preview"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/Logo.jpg';
                      }}
                    />
                    {activeItem?.imageType === 'size_guide' && (
                      <div className="absolute top-2 left-2 bg-neutral-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                        <Ruler size={10} className="text-amber-400" />
                        <span>Supplier Sizing</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generated or Result Image */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Gemini Re-imagined Result
                    </span>
                    {activeItem?.status === 'completed' && (
                      <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check size={10} />
                        Ready
                      </span>
                    )}
                  </div>

                  <div className="aspect-square w-full rounded-xl overflow-hidden border border-neutral-300 bg-white relative flex items-center justify-center">
                    {activeItem?.status === 'generating' ? (
                      <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-neutral-200 border-t-neutral-950 animate-spin" />
                          <Sparkles size={16} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
                        </div>
                        <span className="text-xs font-bold text-neutral-800">Generating Editorial Photo...</span>
                        <span className="text-[10px] text-neutral-400 max-w-[200px]">
                          Gemini 1.5 Pro multimodal vision is styling your pet in 85mm portrait light
                        </span>
                      </div>
                    ) : (activeItem?.generatedUrl || generatedImageUrl) ? (
                      <img
                        src={activeItem?.generatedUrl || generatedImageUrl!}
                        alt="AI Generated result"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-400 space-y-1.5">
                        <Sparkles size={28} className="text-neutral-300" />
                        <span className="text-xs font-semibold text-neutral-600">No Image Generated Yet</span>
                        <span className="text-[10px] text-neutral-400 max-w-[200px]">
                          Click &quot;Re-imagine Active Image Directly&quot; on the left to transform this photo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action bar if image is completed */}
              {(activeItem?.generatedUrl || generatedImageUrl) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {onReplaceImage && activeItem && (
                    <button
                      type="button"
                      onClick={handleReplaceClick}
                      className="py-2.5 px-3 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm touch-manipulation"
                    >
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Replace Original Photo</span>
                    </button>
                  )}

                  {onAddImage && (
                    <button
                      type="button"
                      onClick={handleAddAsNewClick}
                      className="py-2.5 px-3 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 touch-manipulation"
                    >
                      <span>Add as New Photo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Synthesized Prompt Card if available */}
              {synthesizedPrompt && (
                <div className="bg-white p-3 rounded-xl border border-neutral-200 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 truncate">
                      <Sparkles size={12} className="text-amber-500 shrink-0" />
                      <span className="truncate">Synthesized Prompt for Gemini Chat</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors touch-manipulation shrink-0"
                    >
                      {hasCopiedPrompt ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  {synthesizedAnalysis && (
                    <p className="text-[10px] text-neutral-500 italic bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                      &quot;{synthesizedAnalysis}&quot;
                    </p>
                  )}
                  <div className="p-2 bg-neutral-900 text-neutral-100 rounded-lg text-[11px] font-mono leading-relaxed max-h-24 overflow-y-auto select-all">
                    {synthesizedPrompt}
                  </div>
                </div>
              )}
            </div>

            {/* Manual Drop-In Upload Box */}
            <div className="pt-2 border-t border-neutral-200 shrink-0">
              <label className="flex items-center justify-between p-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl cursor-pointer transition-colors group touch-manipulation">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors shrink-0">
                    <UploadCloud size={15} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-neutral-800 block truncate">
                      {isUploadingManual ? 'Uploading to Store...' : 'Upload Image from Gemini Chat'}
                    </span>
                    <span className="text-[10px] text-neutral-500 block truncate">
                      Generated via gemini.google.com? Click to upload and attach directly
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleManualUpload}
                  disabled={isUploadingManual}
                  className="hidden"
                />
                <span className="text-[11px] font-semibold text-neutral-900 px-2.5 py-1 bg-neutral-100 group-hover:bg-neutral-200 rounded-lg transition-colors shrink-0">
                  Browse
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
