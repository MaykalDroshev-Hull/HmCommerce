'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  ExternalLink,
  HardDrive,
  X,
  Check,
  ChevronRight,
  Filter,
  Layers,
  FileCheck2,
  Trash2,
  Maximize2
} from 'lucide-react';
import { Card, SectionSurface, EmptyState } from '../../components/layout';

export interface DatabaseImageAsset {
  id: string;
  assetType: 'product_image' | 'store_settings' | 'testimonial';
  targetField?: string | null;
  productId?: string | null;
  productName: string;
  sku: string | null;
  isPrimary: boolean;
  sortOrder: number;
  url: string;
  format: string;
  isAvif: boolean;
  isExternal: boolean;
  storagePath: string | null;
  createdAt: string;
}

export interface AssetAnalysis {
  originalSize: number;
  originalSizeFormatted: string;
  originalFormat: string;
  width: number;
  height: number;
  avifSize: number;
  avifSizeFormatted: string;
  bytesSaved: number;
  savedFormatted: string;
  percentSaved: number;
  quality: number;
  isSmaller: boolean;
  previewUrl?: string;
  error?: string;
}

function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function DatabaseAssetOptimizer() {
  const [assets, setAssets] = useState<DatabaseImageAsset[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    needsOptimisation: 0,
    alreadyAvif: 0,
    externalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs_optimisation' | 'avif' | 'external'>('needs_optimisation');

  // Quality settings
  const [quality, setQuality] = useState<number>(70);

  // Real-time analysis map (by asset id)
  const [analyses, setAnalyses] = useState<Record<string, AssetAnalysis>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Replace State
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    savedBytes: 0,
    currentName: '',
  });
  const cancelBatchRef = useRef(false);

  // Single replacing state (by asset id)
  const [replacingIds, setReplacingIds] = useState<Set<string>>(new Set());

  // Side-by-side Modal State
  const [modalAsset, setModalAsset] = useState<DatabaseImageAsset | null>(null);
  const [modalAnalysis, setModalAnalysis] = useState<AssetAnalysis | null>(null);
  const [modalQuality, setModalQuality] = useState<number>(70);
  const [isModalAnalyzing, setIsModalAnalyzing] = useState(false);
  const [isModalReplacing, setIsModalReplacing] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);
  const [deleteOldFile, setDeleteOldFile] = useState(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load database assets
  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/media/database-assets?filter=all');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load database assets');
      }

      setAssets(data.assets || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading database assets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Filtered Assets Memo
  const displayedAssets = useMemo(() => {
    let list = [...assets];

    if (filter === 'needs_optimisation') {
      list = list.filter((a) => !a.isAvif);
    } else if (filter === 'avif') {
      list = list.filter((a) => a.isAvif);
    } else if (filter === 'external') {
      list = list.filter((a) => a.isExternal);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        return (
          a.productName.toLowerCase().includes(q) ||
          (a.sku && a.sku.toLowerCase().includes(q)) ||
          a.url.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [assets, filter, search]);

  // Analyze single asset
  const analyzeSingleAsset = async (asset: DatabaseImageAsset, targetQuality = quality): Promise<AssetAnalysis | null> => {
    setAnalyzingIds((prev) => new Set(prev).add(asset.id));
    try {
      const res = await fetch('/api/admin/media/database-assets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: asset.id,
          url: asset.url,
          quality: targetQuality,
          includePreview: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.results && data.results[0]) {
        const result: AssetAnalysis = data.results[0];
        setAnalyses((prev) => ({ ...prev, [asset.id]: result }));
        return result;
      }
    } catch (err) {
      console.error('Error analyzing asset:', err);
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
    return null;
  };

  // Analyze all currently displayed unoptimized assets in small batches
  const analyzeAllDisplayed = async () => {
    const unoptimized = displayedAssets.filter((a) => !a.isAvif);
    if (unoptimized.length === 0) {
      showToast('All currently visible assets are already AVIF.', 'success');
      return;
    }

    setIsBulkAnalyzing(true);
    const batchSize = 10;

    for (let i = 0; i < unoptimized.length; i += batchSize) {
      const chunk = unoptimized.slice(i, i + batchSize);
      const items = chunk.map((a) => ({ id: a.id, url: a.url }));

      // Add to analyzing set
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        items.forEach((it) => next.add(it.id));
        return next;
      });

      try {
        const res = await fetch('/api/admin/media/database-assets/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            quality,
          }),
        });
        const data = await res.json();
        if (data.success && data.results) {
          const newMap: Record<string, AssetAnalysis> = {};
          data.results.forEach((r: any) => {
            if (!r.error) {
              newMap[r.id] = r;
            }
          });
          setAnalyses((prev) => ({ ...prev, ...newMap }));
        }
      } catch (err) {
        console.error('Batch analyze error:', err);
      } finally {
        setAnalyzingIds((prev) => {
          const next = new Set(prev);
          items.forEach((it) => next.delete(it.id));
          return next;
        });
      }
    }

    setIsBulkAnalyzing(false);
    showToast(`Analyzed ${unoptimized.length} assets with quality ${quality}`, 'success');
  };

  // Replace single asset in database
  const replaceSingleAsset = async (
    asset: DatabaseImageAsset,
    targetQuality = quality,
    shouldDeleteOld = true
  ): Promise<boolean> => {
    setReplacingIds((prev) => new Set(prev).add(asset.id));
    try {
      const res = await fetch('/api/admin/media/database-assets/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          assetType: asset.assetType,
          targetField: asset.targetField,
          currentUrl: asset.url,
          quality: targetQuality,
          deleteOldFromStorage: shouldDeleteOld,
          customBaseName: asset.productName ? `${asset.productName.slice(0, 25)}` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to replace image in database');
      }

      // Update state locally in real time
      setAssets((prev) =>
        prev.map((item) => {
          if (item.id === asset.id) {
            return {
              ...item,
              url: data.newUrl,
              format: 'avif',
              isAvif: true,
              isExternal: false,
              storagePath: data.newStoragePath,
            };
          }
          return item;
        })
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        needsOptimisation: Math.max(0, prev.needsOptimisation - 1),
        alreadyAvif: prev.alreadyAvif + 1,
        externalCount: asset.isExternal ? Math.max(0, prev.externalCount - 1) : prev.externalCount,
      }));

      // Update analysis state for this item
      setAnalyses((prev) => ({
        ...prev,
        [asset.id]: {
          originalSize: data.originalSize,
          originalSizeFormatted: data.originalSizeFormatted,
          originalFormat: 'avif',
          width: 0,
          height: 0,
          avifSize: data.newSize,
          avifSizeFormatted: data.newSizeFormatted,
          bytesSaved: data.bytesSaved,
          savedFormatted: data.savedFormatted,
          percentSaved: data.percentSaved,
          quality: targetQuality,
          isSmaller: data.bytesSaved > 0,
        },
      }));

      // Remove from selectedIds if present
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Replacement error';
      showToast(`Error replacing image: ${msg}`, 'error');
      return false;
    } finally {
      setReplacingIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  };

  // Run Batch Replace for selected or all unoptimized
  const runBatchReplace = async () => {
    const targetAssetIds = selectedIds.size > 0
      ? Array.from(selectedIds)
      : displayedAssets.filter((a) => !a.isAvif).map((a) => a.id);

    const targetList = assets.filter((a) => targetAssetIds.includes(a.id) && !a.isAvif);

    if (targetList.length === 0) {
      showToast('No unoptimized assets selected to replace.', 'error');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to convert and replace ${targetList.length} images in the database with AVIF format?\n\nThis will update the database records with the new AVIF URLs.`
      )
    ) {
      return;
    }

    setIsBatchRunning(true);
    cancelBatchRef.current = false;
    let savedTotal = 0;

    setBatchProgress({
      current: 0,
      total: targetList.length,
      savedBytes: 0,
      currentName: targetList[0].productName,
    });

    for (let i = 0; i < targetList.length; i++) {
      if (cancelBatchRef.current) {
        showToast('Batch optimization cancelled by user.', 'error');
        break;
      }

      const item = targetList[i];
      setBatchProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentName: item.productName,
      }));

      const success = await replaceSingleAsset(item, quality, true);
      if (success) {
        const currentSaved = analyses[item.id]?.bytesSaved || 0;
        savedTotal += currentSaved;
        setBatchProgress((prev) => ({
          ...prev,
          savedBytes: savedTotal,
        }));
      }

      // Small tick between items to prevent request flooding
      await new Promise((r) => setTimeout(r, 150));
    }

    setIsBatchRunning(false);
    showToast(`Batch completed! Saved approximately ${formatBytes(savedTotal)}!`, 'success');
  };

  // Open side-by-side modal for inspecting an asset
  const openReviewModal = async (asset: DatabaseImageAsset) => {
    setModalAsset(asset);
    setModalQuality(quality);
    setModalSuccessMsg(null);
    setIsModalAnalyzing(true);

    try {
      const res = await fetch('/api/admin/media/database-assets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: asset.id,
          url: asset.url,
          quality,
          includePreview: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.results && data.results[0]) {
        setModalAnalysis(data.results[0]);
      } else {
        setModalAnalysis(null);
      }
    } catch {
      setModalAnalysis(null);
    } finally {
      setIsModalAnalyzing(false);
    }
  };

  // Re-analyze inside the modal with updated quality
  const handleModalQualityChange = async (newQuality: number) => {
    if (!modalAsset) return;
    setModalQuality(newQuality);
    setIsModalAnalyzing(true);
    setModalSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/media/database-assets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalAsset.id,
          url: modalAsset.url,
          quality: newQuality,
          includePreview: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.results && data.results[0]) {
        setModalAnalysis(data.results[0]);
      }
    } catch {
      //
    } finally {
      setIsModalAnalyzing(false);
    }
  };

  // Replace inside the modal
  const handleModalReplace = async () => {
    if (!modalAsset) return;
    setIsModalReplacing(true);
    setModalSuccessMsg(null);

    const success = await replaceSingleAsset(modalAsset, modalQuality, deleteOldFile);
    if (success) {
      setModalSuccessMsg('Successfully optimized and replaced asset in database!');
      // Update modal asset
      setModalAsset((prev) =>
        prev
          ? {
              ...prev,
              format: 'avif',
              isAvif: true,
            }
          : null
      );
    }
    setIsModalReplacing(false);
  };

  // Selection toggles
  const toggleSelectAll = () => {
    const unoptimized = displayedAssets.filter((a) => !a.isAvif).map((a) => a.id);
    if (selectedIds.size === unoptimized.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unoptimized));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-red-950 text-red-100 border-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* METRIC CARDS HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Assets */}
        <Card className="p-4 bg-white border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Total Database Assets
            </span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">{stats.total}</span>
            <span className="text-xs text-neutral-500">in catalog</span>
          </div>
        </Card>

        {/* Card 2: Needs Optimization */}
        <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-amber-50/10 border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Needs AVIF Optimisation
            </span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950 font-mono">{stats.needsOptimisation}</span>
            <span className="text-xs text-amber-700 font-medium">uncompressed</span>
          </div>
        </Card>

        {/* Card 3: Already AVIF */}
        <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-emerald-50/10 border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Already Next-Gen AVIF
            </span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950 font-mono">{stats.alreadyAvif}</span>
            <span className="text-xs text-emerald-700 font-medium">optimised</span>
          </div>
        </Card>

        {/* Card 4: Bandwidth Savings */}
        <Card className="p-4 bg-neutral-900 text-white border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Avg. Gain Potential
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">-75% to -90%</span>
            <span className="text-xs text-neutral-400">speed boost</span>
          </div>
        </Card>
      </div>

      {/* BATCH PROGRESS BAR (Visible during batch execution) */}
      {isBatchRunning && (
        <div className="p-4 bg-emerald-950 text-white rounded-2xl shadow-xl border border-emerald-800 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <div>
                <p className="text-xs font-bold text-white">
                  Batch Optimising & Replacing: {batchProgress.current} of {batchProgress.total}
                </p>
                <p className="text-[11px] text-emerald-300 truncate max-w-md">
                  Processing: &ldquo;{batchProgress.currentName}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-emerald-400">
                {formatBytes(batchProgress.savedBytes)} saved so far
              </span>
              <button
                type="button"
                onClick={() => {
                  cancelBatchRef.current = true;
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-2 rounded-full bg-emerald-900/60 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
              style={{
                width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* TOOLBAR CONTROLS */}
      <Card className="p-4 bg-white border-neutral-200 space-y-4">
        {/* Top Row: Search & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('needs_optimisation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filter === 'needs_optimisation'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Needs Optimisation ({stats.needsOptimisation})</span>
            </button>

            <button
              onClick={() => setFilter('avif')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filter === 'avif'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>Already AVIF ({stats.alreadyAvif})</span>
            </button>

            <button
              onClick={() => setFilter('external')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filter === 'external'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ExternalLink className="w-3 h-3" />
              <span>External CDN ({stats.externalCount})</span>
            </button>

            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All Assets ({stats.total})
            </button>

            <button
              onClick={loadAssets}
              disabled={loading}
              title="Refresh database records"
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom Row: Quality Slider & Batch Action Buttons */}
        <div className="pt-3 border-t border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quality Slider Control */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1 shrink-0">
              <Sliders className="w-3.5 h-3.5 text-neutral-500" />
              AVIF Quality: <span className="font-mono text-emerald-700 font-bold">{quality}</span>
            </span>

            <div className="flex items-center gap-1.5">
              {[
                { val: 55, label: 'Max Savings (55)' },
                { val: 70, label: 'Balanced (70)' },
                { val: 85, label: 'High Fidelity (85)' },
              ].map((q) => (
                <button
                  key={q.val}
                  type="button"
                  onClick={() => setQuality(q.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    quality === q.val
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="30"
              max="95"
              step="5"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
              className="w-24 sm:w-32 accent-emerald-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={analyzeAllDisplayed}
              disabled={isBulkAnalyzing || isBatchRunning || displayedAssets.length === 0}
              className="px-3.5 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
            >
              {isBulkAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating Gains...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Analyze Real-Time Gains</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={runBatchReplace}
              disabled={isBatchRunning || isBulkAnalyzing}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>
                {selectedIds.size > 0
                  ? `Optimise & Replace (${selectedIds.size})`
                  : 'Batch Optimise All Visible'}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* ASSET REVIEW TABLE / LIST */}
      <SectionSurface tone="soft" padding="md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-neutral-900 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">Loading catalog assets from database...</p>
            <p className="text-xs text-neutral-500">Querying product_images and joined products</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-bold text-red-900">{error}</p>
            <button
              onClick={loadAssets}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : displayedAssets.length === 0 ? (
          <EmptyState
            title="No Image Assets Found"
            description={
              search
                ? `No database images match "${search}". Try clearing your search.`
                : 'No assets found for the selected filter.'
            }
          />
        ) : (
          <div className="space-y-3">
            {/* Table Header Row */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 bg-neutral-100/80 rounded-xl text-[11px] font-bold uppercase tracking-wider text-neutral-500 items-center">
              <div className="col-span-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    displayedAssets.filter((a) => !a.isAvif).length > 0 &&
                    selectedIds.size === displayedAssets.filter((a) => !a.isAvif).length
                  }
                  onChange={toggleSelectAll}
                  aria-label="Select all unoptimized assets"
                  className="rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                />
                <span>Item</span>
              </div>
              <div className="col-span-4">Product & Asset Info</div>
              <div className="col-span-2 text-center">Format & Storage</div>
              <div className="col-span-3 text-center">Real-Time Sizes & Gain</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            {displayedAssets.map((asset) => {
              const analysis = analyses[asset.id];
              const isAnalyzing = analyzingIds.has(asset.id);
              const isReplacing = replacingIds.has(asset.id);
              const isSelected = selectedIds.has(asset.id);

              return (
                <div
                  key={asset.id}
                  className={`p-3.5 bg-white rounded-xl border transition-all duration-150 flex flex-col lg:grid lg:grid-cols-12 gap-3 items-center ${
                    asset.isAvif
                      ? 'border-emerald-200/80 bg-emerald-50/10'
                      : isSelected
                      ? 'border-neutral-900 bg-neutral-50/50 shadow-2xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {/* Col 1: Checkbox & Thumbnail */}
                  <div className="col-span-1 flex items-center gap-3 w-full lg:w-auto">
                    {!asset.isAvif && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(asset.id)}
                        aria-label={`Select ${asset.productName}`}
                        className="rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                      />
                    )}

                    <div
                      onClick={() => openReviewModal(asset)}
                      className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 cursor-pointer shrink-0 group"
                      title="Click to view comparison"
                    >
                      <img
                        src={asset.url}
                        alt={asset.productName}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Product Name & SKU */}
                  <div className="col-span-4 w-full text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-neutral-900 line-clamp-1" title={asset.productName}>
                        {asset.productName}
                      </span>
                      {asset.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-900 text-white">
                          Primary
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
                      {asset.sku && <span className="font-mono">SKU: {asset.sku}</span>}
                      <span className="truncate max-w-[200px]" title={asset.url}>
                        {asset.url.split('/').pop()}
                      </span>
                    </div>
                  </div>

                  {/* Col 3: Format & Location */}
                  <div className="col-span-2 w-full lg:text-center flex lg:flex-col items-center lg:items-center justify-between lg:justify-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          asset.isAvif
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-200 text-neutral-800'
                        }`}
                      >
                        {asset.format.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[10px] text-neutral-400">
                      {asset.isExternal ? (
                        <span className="text-blue-600 font-medium flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5" /> External CDN
                        </span>
                      ) : (
                        'Supabase Storage'
                      )}
                    </span>
                  </div>

                  {/* Col 4: Real-time Sizes & Gain */}
                  <div className="col-span-3 w-full text-center">
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 py-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                        <span>Calculating gain...</span>
                      </div>
                    ) : analysis ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 text-xs font-mono">
                          <span className="text-neutral-500 line-through">
                            {analysis.originalSizeFormatted}
                          </span>
                          <ArrowRight className="w-3 h-3 text-neutral-400" />
                          <span className="font-bold text-emerald-700">
                            {analysis.avifSizeFormatted}
                          </span>
                        </div>

                        {/* Ratio Bar */}
                        <div className="w-36 mx-auto h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{ width: `${Math.max(5, 100 - analysis.percentSaved)}%` }}
                          />
                        </div>

                        <div className="text-[10px] font-bold text-emerald-700">
                          -{analysis.percentSaved}% ({analysis.savedFormatted} saved)
                        </div>
                      </div>
                    ) : asset.isAvif ? (
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Optimised in AVIF</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => analyzeSingleAsset(asset)}
                        className="text-xs text-neutral-500 hover:text-neutral-900 underline hover:no-underline font-medium"
                      >
                        Calculate gain
                      </button>
                    )}
                  </div>

                  {/* Col 5: Actions */}
                  <div className="col-span-2 w-full flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openReviewModal(asset)}
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition"
                      title="Inspect side-by-side comparison"
                    >
                      Compare
                    </button>

                    {!asset.isAvif ? (
                      <button
                        type="button"
                        onClick={() => replaceSingleAsset(asset, quality, true)}
                        disabled={isReplacing || isBatchRunning}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {isReplacing ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Replacing...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Replace</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                        Done
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionSurface>

      {/* =====================================================================
          SIDE-BY-SIDE COMPARISON & REPLACE MODAL
      ====================================================================== */}
      {modalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    AVIF Format Comparison & Database Replace
                  </h3>
                  <p className="text-xs text-neutral-500 truncate max-w-md">
                    {modalAsset.productName} {modalAsset.sku ? `(${modalAsset.sku})` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalAsset(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Success Notification */}
              {modalSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {/* SAVINGS CALLOUT CARD */}
              {modalAnalysis && (
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/60 p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Bandwidth & Storage Reduction
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-black text-emerald-950 font-mono">
                          -{modalAnalysis.percentSaved}%
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          ({modalAnalysis.savedFormatted} saved)
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-64 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                        <span>Original: {modalAnalysis.originalSizeFormatted}</span>
                        <span className="text-emerald-700 font-bold">AVIF: {modalAnalysis.avifSizeFormatted}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-neutral-200 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                          style={{ width: `${Math.max(5, 100 - modalAnalysis.percentSaved)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SIDE BY SIDE CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left Card: Original File */}
                <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/60 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                        Current Image
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-800">
                        {modalAsset.format.toUpperCase()}
                      </span>
                    </div>

                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-neutral-200/50 border border-neutral-200 flex items-center justify-center">
                      <img
                        src={modalAsset.url}
                        alt="Current Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-200 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Size:</span>
                      <span className="font-mono font-bold text-neutral-900">
                        {modalAnalysis?.originalSizeFormatted || 'Calculating...'}
                      </span>
                    </div>
                    {modalAnalysis?.width ? (
                      <div className="flex justify-between text-neutral-600">
                        <span>Dimensions:</span>
                        <span className="font-mono text-neutral-700">
                          {modalAnalysis.width} &times; {modalAnalysis.height} px
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right Card: Next-Gen AVIF */}
                <div className="border-2 border-emerald-500/60 rounded-xl p-4 bg-emerald-50/20 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        AVIF Next-Gen
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                        AVIF ({modalQuality}Q)
                      </span>
                    </div>

                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-neutral-950/5 border border-emerald-200 flex items-center justify-center">
                      {isModalAnalyzing ? (
                        <div className="text-center space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                          <p className="text-xs text-neutral-500 font-medium">Encoding preview...</p>
                        </div>
                      ) : modalAnalysis?.previewUrl ? (
                        <img
                          src={modalAnalysis.previewUrl}
                          alt="AVIF Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <p className="text-xs text-neutral-400">Preview ready</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-emerald-200 space-y-1 text-xs">
                    <div className="flex justify-between text-emerald-900">
                      <span>Optimised Size:</span>
                      <span className="font-mono font-black text-emerald-700">
                        {modalAnalysis?.avifSizeFormatted || 'Calculating...'}
                      </span>
                    </div>
                    {modalAnalysis?.width ? (
                      <div className="flex justify-between text-emerald-800">
                        <span>Dimensions:</span>
                        <span className="font-mono">
                          {modalAnalysis.width} &times; {modalAnalysis.height} px
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quality Tuning Bar */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    AVIF Quality Level: <span className="font-mono text-emerald-700 font-bold">{modalQuality}</span>
                  </label>

                  <div className="flex gap-1.5">
                    {[55, 70, 85].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleModalQualityChange(q)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          modalQuality === q
                            ? 'bg-neutral-900 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        {q === 55 ? 'Max Savings (55)' : q === 70 ? 'Balanced (70)' : 'High Fidelity (85)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-neutral-400">30</span>
                  <input
                    type="range"
                    min="30"
                    max="95"
                    step="5"
                    value={modalQuality}
                    onChange={(e) => handleModalQualityChange(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                  />
                  <span className="text-[11px] text-neutral-400">95</span>
                </div>
              </div>

              {/* Storage Cleanup Toggle */}
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={deleteOldFile}
                    onChange={(e) => setDeleteOldFile(e.target.checked)}
                    className="rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                  />
                  <span>
                    Delete previous uncompressed file from storage after replacement (recommended to save disk space)
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalAsset(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleModalReplace}
                disabled={isModalReplacing || isModalAnalyzing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-40"
              >
                {isModalReplacing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Replacing in Database...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Replace in Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
