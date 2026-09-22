'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  Type,
  ImageIcon,
  Download,
  Trash2,
  Move,
  Plus,
  ChevronDown,
  Sparkles,
  Sliders,
  Bookmark,
  Copy,
  Check,
  FolderOpen,
  X,
  Upload,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OverlayItem {
  id: string;
  type: 'text' | 'logo';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  // Text-specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: string;
  hasOutline?: boolean;
  outlineColor?: string;
  // Logo-specific
  logoVariant?: 'black' | 'white';
  logoScale?: number; // percentage of container width
}

export interface OverlayTemplate {
  id: string;
  name: string;
  createdAt: number;
  isBuiltIn?: boolean;
  overlays: Omit<OverlayItem, 'id'>[];
}

interface ImageOverlayEditorProps {
  imageUrl: string;
  mode?: 'single' | 'versus' | 'dual_costume' | 'dog_cat_scene';
  versusLayout?: 'horizontal' | 'vertical';
  onDownload?: (dataUrl: string) => void;
  onUploadImage?: (dataUrl: string) => void;
}

const TEMPLATES_STORAGE_KEY = 'pet_studio_overlay_templates';
const CLIPBOARD_STORAGE_KEY = 'pet_studio_overlay_clipboard';

/* ------------------------------------------------------------------ */
/*  Font list & options                                                */
/* ------------------------------------------------------------------ */

export const AVAILABLE_FONTS = [
  { label: 'Inter (Clean Sans)', value: 'Inter, sans-serif' },
  { label: 'Impact (Meme / TikTok Bold)', value: 'Impact, Arial Black, sans-serif' },
  { label: 'DM Serif Display (Editorial)', value: '"DM Serif Display", Georgia, serif' },
  { label: 'Arial (Standard Sans)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia (Classic Serif)', value: 'Georgia, serif' },
  { label: 'Courier New (Monospace)', value: '"Courier New", Courier, monospace' },
  { label: 'Times New Roman (Formal)', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana (Readable Sans)', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS (Modern)', value: '"Trebuchet MS", sans-serif' },
  { label: 'Comic Sans MS (Playful)', value: '"Comic Sans MS", cursive' },
];

const FONT_SIZES = [14, 18, 24, 32, 40, 48, 56, 64, 72, 96, 120];

const FONT_COLORS = [
  '#ffffff', '#000000', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

/* ------------------------------------------------------------------ */
/*  Built-in Starter Templates                                         */
/* ------------------------------------------------------------------ */

const BUILT_IN_TEMPLATES: OverlayTemplate[] = [
  {
    id: 'builtin-who-wears-it-better-v',
    name: 'TikTok "Who Wears It Better" (Side by Side)',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'text',
        x: 50,
        y: 8,
        text: 'WHO WEARS IT BETTER?',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 50,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 25,
        y: 16,
        text: 'A',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 44,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 75,
        y: 16,
        text: 'B',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 44,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'logo',
        x: 50,
        y: 93,
        logoVariant: 'white',
        logoScale: 20,
      }
    ]
  },
  {
    id: 'builtin-who-wears-it-better-h',
    name: 'TikTok "Who Wears It Better" (Stacked)',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'text',
        x: 50,
        y: 6,
        text: 'WHO WEARS IT BETTER?',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 50,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 12,
        y: 18,
        text: 'A',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 42,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 12,
        y: 65,
        text: 'B',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 42,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'logo',
        x: 50,
        y: 93,
        logoVariant: 'white',
        logoScale: 20,
      }
    ]
  },
  {
    id: 'builtin-cta-shop-both',
    name: 'TikTok Call to Action (Shop Both / Link in Bio)',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'text',
        x: 50,
        y: 8,
        text: 'WHICH ONE IS YOUR FAVOURITE?',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 46,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 50,
        y: 83,
        text: 'SHOP BOTH • LINK IN BIO',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 38,
        fontColor: '#fde047',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 50,
        y: 89,
        text: 'Use code TIKTOK10 for 10% off',
        fontFamily: 'Inter, sans-serif',
        fontSize: 22,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'logo',
        x: 50,
        y: 95,
        logoVariant: 'white',
        logoScale: 18,
      }
    ]
  },
  {
    id: 'builtin-cta-team-a-vs-b',
    name: 'TikTok Call to Action (Team A vs Team B)',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'text',
        x: 50,
        y: 7,
        text: 'DROP A COMMENT: TEAM A OR B?',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 44,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 25,
        y: 16,
        text: 'TEAM A',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 36,
        fontColor: '#38bdf8',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 75,
        y: 16,
        text: 'TEAM B',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 36,
        fontColor: '#f43f5e',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 50,
        y: 85,
        text: 'TAP LINK IN BIO TO SHOP',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 36,
        fontColor: '#fde047',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'logo',
        x: 50,
        y: 95,
        logoVariant: 'white',
        logoScale: 18,
      }
    ]
  },
  {
    id: 'builtin-dog-cat-dynamic-duo',
    name: 'Dog & Cat: "Dynamic Duo / Besties"',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'text',
        x: 50,
        y: 8,
        text: 'THE DYNAMIC DUO',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 48,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 50,
        y: 86,
        text: 'MEOW & BARK • BEST FRIENDS',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 32,
        fontColor: '#fde047',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'logo',
        x: 50,
        y: 94,
        logoVariant: 'white',
        logoScale: 18,
      }
    ]
  },
  {
    id: 'builtin-dog-cat-costume-party',
    name: 'Dog & Cat: "Costume Party / Who Wore It Better"',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'text',
        x: 50,
        y: 8,
        text: 'COSTUME PARTY',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 50,
        fontColor: '#ffffff',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 25,
        y: 16,
        text: 'DOG',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 36,
        fontColor: '#38bdf8',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'text',
        x: 75,
        y: 16,
        text: 'CAT',
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 36,
        fontColor: '#f472b6',
        fontWeight: 'bold',
        hasOutline: true,
        outlineColor: '#000000',
      },
      {
        type: 'logo',
        x: 50,
        y: 93,
        logoVariant: 'white',
        logoScale: 20,
      }
    ]
  },
  {
    id: 'builtin-brand-watermark',
    name: 'Meow Bark Official Watermark Only',
    createdAt: 0,
    isBuiltIn: true,
    overlays: [
      {
        type: 'logo',
        x: 50,
        y: 92,
        logoVariant: 'white',
        logoScale: 24,
      }
    ]
  }
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ImageOverlayEditor({
  imageUrl,
  mode = 'single',
  versusLayout = 'vertical',
  onDownload,
  onUploadImage,
}: ImageOverlayEditorProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorUploadInputRef = useRef<HTMLInputElement>(null);
  const [isEditorDragOver, setIsEditorDragOver] = useState(false);

  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Template management state
  const [savedTemplates, setSavedTemplates] = useState<OverlayTemplate[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // Image natural dimensions
  const [imgNatural, setImgNatural] = useState({ w: 1024, h: 1024 });

  // Logo urls
  const blackLogoUrl = '/Black%20Logo.png';
  const whiteLogoUrl = '/White-logo.png';

  // Load image natural size
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Load templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedTemplates(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not load saved overlay templates:', err);
    }
  }, []);

  // Helper to show transient toast message
  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  /* ---------------------------------------------------------------- */
  /*  Template Actions                                                 */
  /* ---------------------------------------------------------------- */

  const handleSaveAsTemplate = () => {
    if (overlays.length === 0) {
      alert('Add at least one text or logo overlay before saving a template.');
      return;
    }
    const name = newTemplateName.trim() || `Template ${new Date().toLocaleDateString()}`;

    // Strip IDs so each applied instance gets clean unique IDs
    const cleanOverlays: Omit<OverlayItem, 'id'>[] = overlays.map(({ id, ...rest }) => rest);

    const newTemplate: OverlayTemplate = {
      id: `template-${Date.now()}`,
      name,
      createdAt: Date.now(),
      overlays: cleanOverlays,
    };

    const updated = [newTemplate, ...savedTemplates.filter(t => t.name !== name)];
    setSavedTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save template to localStorage:', err);
    }

    setActiveTemplateName(name);
    setShowSaveModal(false);
    setNewTemplateName('');
    showToast(`Template "${name}" saved! You can now apply it to all other photos.`);
  };

  const applyTemplate = (template: OverlayTemplate) => {
    // Generate fresh IDs for each item while preserving exact percentages and properties
    const instantiated: OverlayItem[] = template.overlays.map((o, idx) => ({
      ...o,
      id: `${o.type}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    setOverlays(instantiated);
    setSelectedId(instantiated[0]?.id || null);
    setActiveTemplateName(template.name);
    setShowTemplateMenu(false);
    showToast(`Applied "${template.name}" template. Overlays positioned identically.`);
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to delete template from localStorage:', err);
    }
  };

  // Quick 1-click Copy & Paste
  const handleCopyOverlays = () => {
    if (overlays.length === 0) {
      alert('No overlays to copy.');
      return;
    }
    try {
      const payload = JSON.stringify(overlays.map(({ id, ...rest }) => rest));
      sessionStorage.setItem(CLIPBOARD_STORAGE_KEY, payload);
      showToast('Overlays copied! Switch to another photo and click Paste.');
    } catch (err) {
      console.warn('Could not copy overlays:', err);
    }
  };

  const handlePasteOverlays = () => {
    try {
      const stored = sessionStorage.getItem(CLIPBOARD_STORAGE_KEY);
      if (!stored) {
        alert('Clipboard empty. Click "Copy Layout" on an existing photo first.');
        return;
      }
      const parsed: Omit<OverlayItem, 'id'>[] = JSON.parse(stored);
      const instantiated: OverlayItem[] = parsed.map((o, idx) => ({
        ...o,
        id: `${o.type}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      }));
      setOverlays(instantiated);
      setSelectedId(instantiated[0]?.id || null);
      showToast('Overlays pasted in exact same positions!');
    } catch (err) {
      console.warn('Could not paste overlays:', err);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Overlay creation helpers                                         */
  /* ---------------------------------------------------------------- */

  const addText = (initialText = 'Your text here', customOpts: Partial<OverlayItem> = {}) => {
    const item: OverlayItem = {
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'text',
      x: 50,
      y: 50,
      text: initialText,
      fontFamily: 'Inter, sans-serif',
      fontSize: 36,
      fontColor: '#ffffff',
      fontWeight: 'bold',
      hasOutline: true,
      outlineColor: '#000000',
      ...customOpts,
    };
    setOverlays(prev => [...prev, item]);
    setSelectedId(item.id);
  };

  const addLogo = (variant: 'black' | 'white') => {
    const item: OverlayItem = {
      id: `logo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'logo',
      x: 50,
      y: 92,
      logoVariant: variant,
      logoScale: 22,
    };
    setOverlays(prev => [...prev, item]);
    setSelectedId(item.id);
  };

  const removeOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateOverlay = (id: string, updates: Partial<OverlayItem>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  /* ---------------------------------------------------------------- */
  /*  Drag handling with window pointer tracking                       */
  /* ---------------------------------------------------------------- */

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const item = overlays.find(o => o.id === id);
    if (!item) return;

    const pxX = (item.x / 100) * rect.width;
    const pxY = (item.y / 100) * rect.height;
    setDragOffset({ x: e.clientX - rect.left - pxX, y: e.clientY - rect.top - pxY });
    setDragging(id);
    setSelectedId(id);
  }, [overlays]);

  // Window-level tracking to prevent dragging from dropping outside bounds
  useEffect(() => {
    if (!dragging) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const rawX = e.clientX - rect.left - dragOffset.x;
      const rawY = e.clientY - rect.top - dragOffset.y;
      const pctX = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
      const pctY = Math.max(0, Math.min(100, (rawY / rect.height) * 100));

      updateOverlay(dragging, { x: pctX, y: pctY });
    };

    const handleWindowPointerUp = () => {
      setDragging(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [dragging, dragOffset]);

  /* ---------------------------------------------------------------- */
  /*  Canvas export (combines base image + typography + logos)         */
  /* ---------------------------------------------------------------- */

  const loadImageSafe = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (src.startsWith('http')) {
          fetch(src)
            .then(res => res.blob())
            .then(blob => {
              const objUrl = URL.createObjectURL(blob);
              const fallback = new window.Image();
              fallback.onload = () => resolve(fallback);
              fallback.onerror = () => reject(new Error(`Failed to load image: ${src}`));
              fallback.src = objUrl;
            })
            .catch(reject);
        } else {
          reject(new Error(`Failed to load image: ${src}`));
        }
      };
      img.src = src;
    });
  };

  const exportToCanvas = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas ref missing');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    canvas.width = imgNatural.w || 1024;
    canvas.height = imgNatural.h || 1024;

    // Draw base photo
    const baseImg = await loadImageSafe(imageUrl);
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

    // Draw overlays
    for (const item of overlays) {
      const px = (item.x / 100) * canvas.width;
      const py = (item.y / 100) * canvas.height;

      if (item.type === 'text' && item.text) {
        const scaledSize = Math.max(16, Math.round(((item.fontSize || 36) / 100) * canvas.width * 0.1));
        const fontFamily = item.fontFamily || 'Inter, sans-serif';
        const fontWeight = item.fontWeight || 'bold';

        ctx.font = `${fontWeight} ${scaledSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Optional black/custom outline (TikTok Meme style)
        if (item.hasOutline) {
          ctx.strokeStyle = item.outlineColor || '#000000';
          ctx.lineWidth = Math.max(3, scaledSize * 0.12);
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(item.text, px, py);
        } else {
          // Drop shadow for readability
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = scaledSize * 0.2;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = scaledSize * 0.05;
        }

        ctx.fillStyle = item.fontColor || '#ffffff';
        ctx.fillText(item.text, px, py);

        // Reset shadows
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      if (item.type === 'logo') {
        const logoSrc = item.logoVariant === 'white' ? whiteLogoUrl : blackLogoUrl;
        try {
          const logoImg = await loadImageSafe(logoSrc);
          if (logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
            const logoW = canvas.width * ((item.logoScale || 22) / 100);
            const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
            ctx.drawImage(logoImg, px - logoW / 2, py - logoH / 2, logoW, logoH);
          }
        } catch (err) {
          console.warn('Could not draw logo on canvas:', err);
        }
      }
    }

    return canvas.toDataURL('image/png');
  };

  const handleExport = async () => {
    try {
      const dataUrl = await exportToCanvas();
      onDownload?.(dataUrl);

      // Trigger automatic download
      const link = document.createElement('a');
      link.download = `pet-studio-branded-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export image with overlays. Please try again.');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Styles                                                           */
  /* ---------------------------------------------------------------- */

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 12,
  };

  const btnPrimary: React.CSSProperties = {
    backgroundColor: theme.colors.primary,
    color: '#fff',
    borderRadius: 8,
  };

  const btnSecondary: React.CSSProperties = {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.text,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: theme.colors.border,
  };

  const selected = overlays.find(o => o.id === selectedId);
  const allTemplates = [...BUILT_IN_TEMPLATES, ...savedTemplates];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {copiedToast && (
        <div
          className="flex items-center gap-2 p-2.5 px-3.5 rounded-lg text-xs font-semibold shadow-md transition-all animate-in fade-in slide-in-from-top-2"
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
          }}
        >
          <Check size={14} />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Layer Addition Buttons */}
        <button
          onClick={() => addText('Your text here')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
          style={btnSecondary}
        >
          <Type size={14} />
          Add Text
        </button>

        <button
          onClick={() => addLogo('black')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
          style={btnSecondary}
        >
          <ImageIcon size={14} />
          Black Logo
        </button>

        <button
          onClick={() => addLogo('white')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
          style={btnSecondary}
        >
          <ImageIcon size={14} />
          White Logo
        </button>

        {/* Upload / Swap Base Image Button */}
        {onUploadImage && (
          <>
            <button
              onClick={() => editorUploadInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
              style={btnSecondary}
              title="Upload your own photo to apply these overlays onto"
            >
              <Upload size={14} />
              Upload Image
            </button>
            <input
              ref={editorUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const res = ev.target?.result as string;
                    if (res) {
                      onUploadImage(res);
                      showToast('Photo uploaded! You can now adjust or apply overlay templates.');
                    }
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
            />
          </>
        )}

        {/* Quick CTA Template */}
        <button
          onClick={() => {
            const tpl = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-cta-shop-both');
            if (tpl) applyTemplate(tpl);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: theme.colors.surface,
            color: '#ca8a04',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: '#ca8a04',
            borderRadius: 8,
          }}
          title="Apply high-converting Call To Action template for the final slide"
        >
          <Sparkles size={14} />
          + CTA Template
        </button>

        <div className="w-px h-5 self-center mx-0.5" style={{ backgroundColor: theme.colors.border }} />

        {/* Template Menu Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: activeTemplateName ? theme.colors.primary : theme.colors.secondary,
              color: activeTemplateName ? '#fff' : theme.colors.text,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: theme.colors.border,
              borderRadius: 8,
            }}
            title="Load a saved layout so all photos look uniform"
          >
            <FolderOpen size={14} />
            <span>Templates {allTemplates.length > 0 && `(${allTemplates.length})`}</span>
            <ChevronDown size={13} className={`transition-transform ${showTemplateMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Templates Dropdown Popover */}
          {showTemplateMenu && (
            <div
              className="absolute left-0 top-full mt-1.5 w-80 rounded-xl shadow-2xl z-40 p-3 space-y-2.5 max-h-96 overflow-y-auto"
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: theme.colors.border }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.text }}>
                  Overlay Templates
                </span>
                <button
                  onClick={() => setShowTemplateMenu(false)}
                  className="p-1 rounded hover:bg-black/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={13} />
                </button>
              </div>

              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Apply a template to give this photo the exact same text, logo, and positions as your other slides:
              </p>

              <div className="space-y-1.5">
                {allTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-2 rounded-lg text-left transition-colors border group"
                    style={{
                      backgroundColor: theme.colors.secondary,
                      borderColor: activeTemplateName === tpl.name ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <button
                      onClick={() => applyTemplate(tpl)}
                      className="flex-1 text-left min-w-0 pr-2"
                    >
                      <div className="text-xs font-semibold truncate" style={{ color: theme.colors.text }}>
                        {tpl.name}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: theme.colors.textSecondary }}>
                        {tpl.overlays.length} element{tpl.overlays.length !== 1 ? 's' : ''} {tpl.isBuiltIn ? '• Preset' : '• Saved Custom'}
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => applyTemplate(tpl)}
                        className="px-2 py-1 text-[11px] font-bold rounded"
                        style={btnPrimary}
                      >
                        Apply
                      </button>
                      {!tpl.isBuiltIn && (
                        <button
                          onClick={(e) => deleteTemplate(tpl.id, e)}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete template"
                          aria-label="Delete template"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Current as Template */}
        <button
          onClick={() => {
            if (overlays.length === 0) {
              alert('Add text or logo overlays first, then save as template.');
              return;
            }
            setShowSaveModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
          style={btnSecondary}
          title="Save the current text and logo positions as a reusable template"
        >
          <Bookmark size={14} />
          Save as Template
        </button>

        {/* Copy / Paste Overlays 1-Click Clipboard */}
        <button
          onClick={handleCopyOverlays}
          disabled={overlays.length === 0}
          className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-40"
          style={btnSecondary}
          title="Copy overlay positions to apply to next slide"
        >
          <Copy size={13} />
          Copy
        </button>

        <button
          onClick={handlePasteOverlays}
          className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors"
          style={btnSecondary}
          title="Paste overlay positions onto this photo"
        >
          Paste
        </button>

        <div className="flex-1" />

        {/* Download Button */}
        {overlays.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all shadow-sm hover:opacity-95"
            style={btnPrimary}
          >
            <Download size={14} />
            Download with Overlays (PNG)
          </button>
        )}
      </div>

      {/* Save Template Modal / Inline Prompt */}
      {showSaveModal && (
        <div
          style={cardStyle}
          className="p-3.5 space-y-2 border-2 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: theme.colors.text }}>
              Save Layout as Reusable Template
            </span>
            <button
              onClick={() => setShowSaveModal(false)}
              className="p-1 rounded hover:bg-black/10"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
            Save where your text and logo are placed so every slide in your TikTok looks identical:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. TikTok Who Wears It Better..."
              className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{
                backgroundColor: theme.colors.secondary,
                color: theme.colors.text,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.colors.border,
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveAsTemplate();
              }}
            />
            <button
              onClick={handleSaveAsTemplate}
              className="px-4 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={btnPrimary}
            >
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* Canvas preview area */}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border select-none max-w-full transition-all ${
          isEditorDragOver ? 'ring-4 ring-primary scale-[1.005]' : ''
        }`}
        style={{ borderColor: theme.colors.border, touchAction: 'none' }}
        onClick={() => setSelectedId(null)}
        onDragOver={(e) => {
          if (onUploadImage) {
            e.preventDefault();
            setIsEditorDragOver(true);
          }
        }}
        onDragLeave={() => setIsEditorDragOver(false)}
        onDrop={(e) => {
          if (onUploadImage) {
            e.preventDefault();
            setIsEditorDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const res = ev.target?.result as string;
                if (res) {
                  onUploadImage(res);
                  showToast('Photo updated! Overlays and template positions preserved.');
                }
              };
              reader.readAsDataURL(file);
            }
          }
        }}
      >
        {/* Drag over indicator overlay */}
        {isEditorDragOver && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none p-4 text-center">
            <Upload size={40} className="animate-bounce mb-2 text-primary" />
            <span className="font-bold text-sm">Drop image here to replace base photo</span>
            <span className="text-xs opacity-75 mt-1">All your overlay text & templates will stay in place</span>
          </div>
        )}

        {/* Base generated or stitched image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Pet Fashion Generation"
          className="w-full h-auto block"
          draggable={false}
        />

        {/* Overlay items */}
        {overlays.map(item => (
          <div
            key={item.id}
            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded transition-shadow ${
              selectedId === item.id
                ? 'ring-2 ring-blue-500 shadow-xl ring-offset-1'
                : 'hover:ring-1 hover:ring-white/60'
            }`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: selectedId === item.id ? 30 : 20,
            }}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
          >
            {item.type === 'text' && (
              <span
                style={{
                  fontFamily: item.fontFamily,
                  fontSize: `${(item.fontSize || 36) * 0.55}px`,
                  color: item.fontColor || '#ffffff',
                  fontWeight: (item.fontWeight as any) || 'bold',
                  WebkitTextStroke: item.hasOutline ? `1.5px ${item.outlineColor || '#000000'}` : undefined,
                  textShadow: item.hasOutline ? 'none' : '0 2px 10px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  display: 'inline-block',
                }}
              >
                {item.text}
              </span>
            )}

            {item.type === 'logo' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.logoVariant === 'white' ? whiteLogoUrl : blackLogoUrl}
                alt={`${item.logoVariant} logo`}
                style={{
                  width: `${(item.logoScale || 22) * 3}px`,
                  height: 'auto',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                }}
                draggable={false}
              />
            )}

            {/* Drag Handle Indicator */}
            {selectedId === item.id && (
              <div
                className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md cursor-grab"
                style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
                title="Drag to reposition"
              >
                <Move size={10} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1" style={{ color: theme.colors.textSecondary }}>
        <span>
          Tip: Click any layer to select & drag it anywhere.
        </span>
        {activeTemplateName && (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Active Template: {activeTemplateName}
          </span>
        )}
      </div>

      {/* Inspector / Properties panel for selected overlay */}
      {selected && (
        <div style={cardStyle} className="p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.colors.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.colors.text }}>
              <Sliders size={14} />
              {selected.type === 'text' ? 'Edit Text Layer' : 'Edit Logo Layer'}
            </h3>
            <button
              onClick={() => removeOverlay(selected.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-red-500/10 text-red-500"
              aria-label="Delete this layer"
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>

          {selected.type === 'text' && (
            <>
              {/* Text content */}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: theme.colors.textSecondary }}>
                  Text Content
                </label>
                <input
                  type="text"
                  value={selected.text || ''}
                  onChange={(e) => updateOverlay(selected.id, { text: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: theme.colors.border,
                  }}
                  placeholder="Enter text..."
                />
              </div>

              {/* Font family & Font size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: theme.colors.textSecondary }}>
                    Font Family
                  </label>
                  <select
                    value={selected.fontFamily || 'Inter, sans-serif'}
                    onChange={(e) => updateOverlay(selected.id, { fontFamily: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                    style={{
                      backgroundColor: theme.colors.secondary,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: theme.colors.border,
                    }}
                  >
                    {AVAILABLE_FONTS.map(f => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold" style={{ color: theme.colors.textSecondary }}>
                      Font Size
                    </label>
                    <span className="text-xs font-mono" style={{ color: theme.colors.textSecondary }}>
                      {selected.fontSize || 36}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={120}
                    value={selected.fontSize || 36}
                    onChange={(e) => updateOverlay(selected.id, { fontSize: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              {/* Font weight & Outline Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: theme.colors.textSecondary }}>
                    Weight
                  </label>
                  <div className="flex gap-2">
                    {(['normal', 'bold'] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => updateOverlay(selected.id, { fontWeight: w })}
                        className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize"
                        style={selected.fontWeight === w ? btnPrimary : btnSecondary}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: theme.colors.textSecondary }}>
                    Outline (TikTok Meme Style)
                  </label>
                  <button
                    onClick={() => updateOverlay(selected.id, { hasOutline: !selected.hasOutline })}
                    className="w-full py-1.5 text-xs font-medium rounded-md transition-all"
                    style={selected.hasOutline ? btnPrimary : btnSecondary}
                  >
                    {selected.hasOutline ? 'Outline: ON (Black Stroke)' : 'Outline: OFF (Soft Shadow)'}
                  </button>
                </div>
              </div>

              {/* Font colour */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme.colors.textSecondary }}>
                  Text Colour
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {FONT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateOverlay(selected.id, { fontColor: c })}
                      className="w-7 h-7 rounded-full border-2 transition-all shadow-sm"
                      style={{
                        backgroundColor: c,
                        borderColor: selected.fontColor === c ? theme.colors.primary : 'rgba(0,0,0,0.2)',
                        transform: selected.fontColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                      aria-label={`Colour ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={selected.fontColor || '#ffffff'}
                    onChange={(e) => updateOverlay(selected.id, { fontColor: e.target.value })}
                    className="w-7 h-7 rounded-full cursor-pointer border p-0 bg-transparent"
                    title="Custom colour"
                  />
                </div>
              </div>
            </>
          )}

          {selected.type === 'logo' && (
            <>
              {/* Logo variant */}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: theme.colors.textSecondary }}>
                  Logo Variant
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateOverlay(selected.id, { logoVariant: 'black' })}
                    className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all"
                    style={selected.logoVariant === 'black' ? btnPrimary : btnSecondary}
                  >
                    Black Logo
                  </button>
                  <button
                    onClick={() => updateOverlay(selected.id, { logoVariant: 'white' })}
                    className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all"
                    style={selected.logoVariant === 'white' ? btnPrimary : btnSecondary}
                  >
                    White Logo
                  </button>
                </div>
              </div>

              {/* Logo scale */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold" style={{ color: theme.colors.textSecondary }}>
                    Logo Size
                  </label>
                  <span className="text-xs font-mono" style={{ color: theme.colors.textSecondary }}>
                    {selected.logoScale || 22}%
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={60}
                  value={selected.logoScale || 22}
                  onChange={(e) => updateOverlay(selected.id, { logoScale: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden canvas for high-resolution export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
