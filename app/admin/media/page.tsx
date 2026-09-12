'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  ChevronDown, 
  Zap, 
  Download, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Sliders, 
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { AdminPage, PageHeader, Section, SectionSurface, EmptyState, Card } from '../components/layout';

interface MediaFile {
  name: string;
  path: string;
  url: string;
  size?: number;
  folder?: string;
  created_at?: string;
}

interface AvifComparisonResult {
  original: {
    name: string;
    size: number;
    sizeFormatted: string;
    format: string;
    width: number;
    height: number;
  };
  avif: {
    name: string;
    size: number;
    sizeFormatted: string;
    format: string;
    quality: number;
    width: number;
    height: number;
    dataUrl: string;
    savedPath?: string | null;
    savedUrl?: string | null;
  };
  comparison: {
    bytesSaved: number;
    savedFormatted: string;
    percentSaved: number;
    isSmaller: boolean;
    savingsText: string;
  };
}

interface ActiveSourceImage {
  name: string;
  path?: string;
  url?: string;
  file?: File;
  previewUrl?: string;
  folder?: string;
}

function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function MediaPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.title = t.mediaLibrary || t.media || 'Media';
  }, [language, t]);

  const [isLoading, setIsLoading] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('images');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // AVIF Converter & Size Comparison States
  const [isAvifModalOpen, setIsAvifModalOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [savingAvif, setSavingAvif] = useState(false);
  const [avifQuality, setAvifQuality] = useState<number>(70);
  const [activeSource, setActiveSource] = useState<ActiveSourceImage | null>(null);
  const [avifResult, setAvifResult] = useState<AvifComparisonResult | null>(null);
  const [avifError, setAvifError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getAdminSession();
        if (!session) {
          router.push('/admin/login');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMediaFiles();
    }
  }, [isAuthenticated, selectedFolder]);

  // Reset to page 1 when folder changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFolder]);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/storage/list?folders=${selectedFolder}&limit=200`);
      const result = await response.json();

      if (result.success) {
        setMediaFiles(result.files || []);
      }
    } catch {
      // Media list unavailable
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', selectedFolder);

        const response = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (!result.success) {
          alert(`${t.failedToUpload || 'Failed to upload'} ${file.name}: ${result.error}`);
        }
      }

      loadMediaFiles();
    } catch {
      alert(t.uploadError || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (path: string) => {
    if (!confirm(t.confirmDeleteFile || 'Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      const result = await response.json();
      if (result.success) {
        loadMediaFiles();
      } else {
        alert((t.deleteFileError || 'Error deleting file') + ': ' + result.error);
      }
    } catch {
      alert(t.deleteFileError || 'Error deleting file');
    }
  };

  // Run AVIF conversion with size comparison
  const runAvifConversion = async (
    source: ActiveSourceImage, 
    quality: number, 
    saveToStorage = false
  ) => {
    setConverting(true);
    setAvifError(null);
    setSaveSuccessMsg(null);

    try {
      let res: Response;

      if (source.file) {
        const formData = new FormData();
        formData.append('file', source.file);
        formData.append('quality', quality.toString());
        formData.append('saveToStorage', saveToStorage ? 'true' : 'false');
        formData.append('folder', selectedFolder);

        res = await fetch('/api/storage/convert-avif', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch('/api/storage/convert-avif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: source.path,
            url: source.url,
            name: source.name,
            quality,
            saveToStorage,
            folder: selectedFolder
          })
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Conversion to AVIF failed');
      }

      setAvifResult(data);

      if (saveToStorage) {
        setSaveSuccessMsg(`Successfully saved ${data.avif?.name} to "${selectedFolder}"!`);
        loadMediaFiles();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown conversion error';
      setAvifError(msg);
    } finally {
      setConverting(false);
      setSavingAvif(false);
    }
  };

  // Open AVIF modal for existing media file in library
  const openAvifForMediaFile = (file: MediaFile) => {
    const source: ActiveSourceImage = {
      name: file.name,
      path: file.path,
      url: file.url,
      previewUrl: file.url,
      folder: selectedFolder
    };
    setActiveSource(source);
    setIsAvifModalOpen(true);
    setAvifResult(null);
    runAvifConversion(source, avifQuality, false);
  };

  // Handle direct file drop or selection for AVIF converter
  const handleDirectAvifUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const source: ActiveSourceImage = {
      name: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
      folder: selectedFolder
    };
    setActiveSource(source);
    setIsAvifModalOpen(true);
    setAvifResult(null);
    runAvifConversion(source, avifQuality, false);
  };

  // Save the currently converted AVIF into Supabase storage
  const handleSaveAvifToLibrary = async () => {
    if (!activeSource) return;
    setSavingAvif(true);
    await runAvifConversion(activeSource, avifQuality, true);
  };

  // Trigger browser download of AVIF
  const handleDownloadAvif = () => {
    if (!avifResult?.avif?.dataUrl) return;
    const a = document.createElement('a');
    a.href = avifResult.avif.dataUrl;
    a.download = avifResult.avif.name || 'image.avif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const folders = ['images', 'logos', 'hero-images'];
  
  const getFolderDisplayName = (folder: string): string => {
    switch (folder) {
      case 'images':
        return t.folderImages || 'Products & Images';
      case 'logos':
        return t.folderLogos || 'Logos';
      case 'hero-images':
        return t.folderHeroImages || 'Hero & Banners';
      default:
        return folder.replace('-', ' ').toUpperCase();
    }
  };

  const folderFiles = mediaFiles.filter(file => {
    const fileFolder = file.path.split('/')[0];
    return fileFolder === selectedFolder;
  });

  // Helper to detect extension
  const getFileExtension = (name: string): string => {
    return name.split('.').pop()?.toUpperCase() || 'FILE';
  };

  // Pagination calculations
  const totalPages = Math.ceil(folderFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFiles = folderFiles.slice(startIndex, endIndex);

  return (
    <AdminLayout currentPath="/admin/media">
      <AdminPage className="space-y-6">
        <PageHeader
          title={t.mediaLibrary || 'Media Library'}
          subtitle={t.manageImagesAndMediaFiles || 'Manage, upload, and optimize images for high-speed next-gen delivery.'}
        />

        {/* Folder Selection Tabs */}
        <Section>
          <div className="flex gap-2 flex-wrap">
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedFolder === folder
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                {getFolderDisplayName(folder)}
              </button>
            ))}
          </div>
        </Section>

        {/* Action Banners: Standard Upload & AVIF Optimizer Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. Standard Multi-File Uploader */}
          <div className="lg:col-span-6">
            <Card className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Upload Files</h3>
                    <p className="text-xs text-neutral-500">Add photos to &ldquo;{getFolderDisplayName(selectedFolder)}&rdquo;</p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-xl p-6 text-center transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                  <div className="text-xs text-neutral-600 mb-1">
                    <label htmlFor="file-upload" className="cursor-pointer font-semibold text-neutral-900 hover:underline">
                      Click to upload
                    </label>{' '}
                    or drag and drop
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      disabled={uploading}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400">JPG, PNG, WebP, AVIF up to 10MB</p>
                  
                  {uploading && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-700">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to library...</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 2. AVIF Converter & Size Comparison Tool */}
          <div className="lg:col-span-6">
            <Card className="h-full border-emerald-900/20 bg-gradient-to-br from-white to-emerald-50/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-900">AVIF Optimizer & Compressor</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                          Next-Gen
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">Transform any image to AVIF with instant size comparison</p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-emerald-200/80 hover:border-emerald-500 bg-white/80 rounded-xl p-6 text-center transition-colors">
                  <Zap className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                  <div className="text-xs text-neutral-700 mb-1">
                    <label htmlFor="avif-convert-upload" className="cursor-pointer font-bold text-emerald-700 hover:underline">
                      Select image to convert
                    </label>{' '}
                    or drag & drop here
                    <input
                      id="avif-convert-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDirectAvifUpload(e.target.files)}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Typically cuts file size by <strong className="text-emerald-700">70% to 85%</strong> with zero visible quality loss
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-neutral-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  AVIF 4:2:0 Chroma Subsampling
                </span>
                <span className="text-[11px] text-neutral-400">
                  Or click &ldquo;Convert to AVIF&rdquo; on any image below
                </span>
              </div>
            </Card>
          </div>

        </div>

        {/* Media Grid Section */}
        <Section
          title={`${getFolderDisplayName(selectedFolder)} (${folderFiles.length} ${t.files || 'files'})`}
          description="Hover any image to convert to AVIF or inspect file details."
        >
          {folderFiles.length === 0 ? (
            <EmptyState
              title={'No Files in this folder'}
              description={`No images currently in "${getFolderDisplayName(selectedFolder)}". Upload or convert images above.`}
              icon={ImageIcon}
            />
          ) : (
            <SectionSurface tone="soft" padding="md">
              {loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto"></div>
                  <p className="mt-3 text-xs text-neutral-500">Loading library files...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {paginatedFiles.map((file, index) => {
                      const ext = getFileExtension(file.name);
                      const isAvif = ext === 'AVIF';

                      return (
                        <div 
                          key={index} 
                          className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-2xs hover:shadow-md transition-all duration-200"
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />

                          {/* Format Badge (Top Left) */}
                          <div className="absolute top-2 left-2 z-10">
                            <span 
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                                isAvif 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-neutral-900/85 text-white backdrop-blur-xs'
                              }`}
                            >
                              {ext}
                            </span>
                          </div>

                          {/* Top-Right Delete Action */}
                          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => deleteFile(file.path)}
                              className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
                              title={t.deleteFile || 'Delete file'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Hover Overlay with Center "Convert to AVIF" Action */}
                          <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-center">
                            <button
                              onClick={() => openAvifForMediaFile(file)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-neutral-950 hover:bg-neutral-100 shadow-md transition-all active:scale-95 mb-2"
                              title="Convert to AVIF & View Size Savings"
                            >
                              <Zap className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isAvif ? 'Re-optimize' : 'To AVIF'}</span>
                            </button>
                            <span className="text-[10px] text-white/80 line-clamp-1 break-all px-1">
                              {file.name}
                            </span>
                          </div>

                          {/* Bottom Metadata Bar */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white p-2 pt-4 flex items-center justify-between">
                            <p className="text-[11px] truncate flex-1 pr-1 font-medium" title={file.name}>
                              {file.name}
                            </p>
                            {file.size ? (
                              <span className="text-[10px] text-neutral-300 shrink-0 font-mono">
                                {formatBytes(file.size)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="bg-white rounded-xl px-4 py-3 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border border-neutral-200">
                      <div className="text-xs text-neutral-600">
                        Showing <span className="font-semibold text-neutral-900">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold text-neutral-900">{Math.min(endIndex, folderFiles.length)}</span> of{' '}
                        <span className="font-semibold text-neutral-900">{folderFiles.length}</span> files
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-medium text-neutral-600 px-2">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </SectionSurface>
          )}
        </Section>

        {/* =====================================================================
            AVIF CONVERSION & SIZE COMPARISON MODAL
        ====================================================================== */}
        {isAvifModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">AVIF Image Optimizer & Comparison</h2>
                    <p className="text-xs text-neutral-500 truncate max-w-sm sm:max-w-md">
                      {activeSource?.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAvifModalOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* Error Banner */}
                {avifError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Conversion Error</p>
                      <p>{avifError}</p>
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {saveSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Loading State during Conversion */}
                {converting ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                    <p className="text-sm font-semibold text-neutral-800">Converting image to AVIF...</p>
                    <p className="text-xs text-neutral-500">Encoding next-gen frames with chroma subsampling 4:2:0</p>
                  </div>
                ) : avifResult ? (
                  <>
                    {/* SIZE COMPARISON CALLOUT CARD */}
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/60 p-5">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                            Storage & Bandwidth Reduction
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5 justify-center sm:justify-start">
                            <span className="text-3xl font-extrabold tracking-tight text-emerald-950 font-mono">
                              -{avifResult.comparison.percentSaved}%
                            </span>
                            <span className="text-xs font-semibold text-emerald-700">
                              ({avifResult.comparison.savedFormatted} saved)
                            </span>
                          </div>
                        </div>

                        {/* Visual Ratio Bar */}
                        <div className="w-full sm:w-64 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                            <span>Original: {avifResult.original.sizeFormatted}</span>
                            <span className="text-emerald-700">AVIF: {avifResult.avif.sizeFormatted}</span>
                          </div>
                          <div className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden flex">
                            <div 
                              className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                              style={{ width: `${Math.max(5, 100 - avifResult.comparison.percentSaved)}%` }}
                              title={`AVIF takes ${100 - avifResult.comparison.percentSaved}% of original`}
                            />
                          </div>
                          <p className="text-[10px] text-neutral-500 text-right">
                            {avifResult.comparison.isSmaller 
                              ? 'Loads ~4x faster on mobile & 4G/5G' 
                              : 'File is already highly optimized'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SIDE-BY-SIDE VISUAL COMPARISON */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Left: Original Card */}
                      <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/60 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                              Original File
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-800">
                              {avifResult.original.format.toUpperCase()}
                            </span>
                          </div>

                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-200/60 border border-neutral-200 flex items-center justify-center">
                            <img
                              src={activeSource?.previewUrl || activeSource?.url}
                              alt="Original preview"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-neutral-200/80 space-y-1 text-xs">
                          <div className="flex justify-between text-neutral-600">
                            <span>File Size:</span>
                            <span className="font-mono font-bold text-neutral-900">{avifResult.original.sizeFormatted}</span>
                          </div>
                          <div className="flex justify-between text-neutral-600">
                            <span>Dimensions:</span>
                            <span className="font-mono text-neutral-700">{avifResult.original.width} &times; {avifResult.original.height} px</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: AVIF Converted Card */}
                      <div className="border-2 border-emerald-500/50 rounded-xl p-4 bg-emerald-50/20 flex flex-col justify-between relative shadow-xs">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-emerald-600" />
                              AVIF Format
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                              AVIF ({avifResult.avif.quality}Q)
                            </span>
                          </div>

                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-950/5 border border-emerald-200 flex items-center justify-center">
                            <img
                              src={avifResult.avif.dataUrl}
                              alt="AVIF preview"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-emerald-200 space-y-1 text-xs">
                          <div className="flex justify-between text-emerald-900">
                            <span>Optimized Size:</span>
                            <span className="font-mono font-extrabold text-emerald-700">{avifResult.avif.sizeFormatted}</span>
                          </div>
                          <div className="flex justify-between text-emerald-800">
                            <span>Dimensions:</span>
                            <span className="font-mono">{avifResult.avif.width} &times; {avifResult.avif.height} px</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* QUALITY TUNING SLIDER */}
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="quality-slider" className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          AVIF Quality Level: <span className="font-mono text-emerald-700 text-sm">{avifQuality}</span>
                        </label>
                        <div className="flex gap-1.5">
                          {[55, 70, 85].map(q => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => {
                                setAvifQuality(q);
                                if (activeSource) runAvifConversion(activeSource, q, false);
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider transition ${
                                avifQuality === q
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
                          id="quality-slider"
                          type="range"
                          min="30"
                          max="95"
                          step="5"
                          value={avifQuality}
                          onChange={(e) => setAvifQuality(parseInt(e.target.value, 10))}
                          className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                        />
                        <span className="text-[11px] text-neutral-400">95</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeSource) runAvifConversion(activeSource, avifQuality, false);
                          }}
                          className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shrink-0 transition"
                        >
                          Re-evaluate
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

              </div>

              {/* Modal Footer Actions */}
              <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-500">
                  Target folder: <span className="font-semibold text-neutral-900">{getFolderDisplayName(selectedFolder)}</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsAvifModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 transition"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAvif}
                    disabled={!avifResult?.avif?.dataUrl || converting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900 text-xs font-bold transition shadow-xs disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .avif</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAvifToLibrary}
                    disabled={!avifResult || converting || savingAvif}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingAvif ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Save to Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </AdminPage>
    </AdminLayout>
  );
}