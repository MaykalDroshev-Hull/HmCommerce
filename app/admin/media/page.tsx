'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { getAdminSession } from '@/lib/auth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { Upload, X, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { AdminPage, PageHeader, Section, SectionSurface, EmptyState, Card } from '../components/layout';

interface MediaFile {
  name: string;
  path: string;
  url: string;
  size?: number;
  folder: string;
}

export default function MediaPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.title = t.mediaLibrary || t.media || ('Media');
  }, [language, t]);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('images');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24; // 24 items for a 6-column grid

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
          alert(`${t.failedToUpload} ${file.name}: ${result.error}`);
        }
      }

      // Reload media files
      loadMediaFiles();
    } catch {
      alert(t.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (path: string) => {
    if (!confirm(t.confirmDeleteFile)) return;

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
        alert(t.deleteFileError + ': ' + result.error);
      }
    } catch {
      alert(t.deleteFileError);
    }
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
        return t.folderImages;
      case 'logos':
        return t.folderLogos;
      case 'hero-images':
        return t.folderHeroImages;
      default:
        return folder.replace('-', ' ').toUpperCase();
    }
  };

  const folderFiles = mediaFiles.filter(file => {
    const fileFolder = file.path.split('/')[0];
    return fileFolder === selectedFolder;
  });

  // Pagination calculations
  const totalPages = Math.ceil(folderFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFiles = folderFiles.slice(startIndex, endIndex);

  return (
    <AdminLayout currentPath="/admin/media">
      <AdminPage className="space-y-6">
        <PageHeader
          title={t.mediaLibrary}
          subtitle={t.manageImagesAndMediaFiles}
        />

        {/* Folder Selection */}
        <Section>
          <div className="flex gap-2 flex-wrap">
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFolder === folder
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getFolderDisplayName(folder)}
              </button>
            ))}
          </div>
        </Section>

        {/* Upload Section */}
        <Section
          title={t.uploadFiles}
          description={t.supportedImageFormats}
        >
          <Card>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-gray-600 mb-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500">{t.clickToUpload}</span> {t.orDragAndDrop}
              </label>
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
            <p className="text-sm text-gray-500">{t.supportedImageFormats}</p>
            {uploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">{t.uploading}</p>
              </div>
            )}
          </div>
          </Card>
        </Section>

        {/* Media Grid */}
        <Section
          title={`${getFolderDisplayName(selectedFolder)} (${folderFiles.length} ${t.files})`}
        >
          {folderFiles.length === 0 ? (
            <EmptyState
              title={'No Files'}
              description={`No files in the "${getFolderDisplayName(selectedFolder)}" folder. Upload files to get started.`}
              icon={ImageIcon}
            />
          ) : (
            <SectionSurface tone="soft" padding="md">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-500">{t.loadingMediaFiles}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {paginatedFiles.map((file, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => deleteFile(file.path)}
                        className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                        title={t.deleteFile}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                      <p className="text-xs truncate" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  </div>
                  ))}
                  </div>

                  {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-3 sm:px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
                {/* Mobile: Simple Prev/Next */}
                <div className="flex-1 flex justify-between sm:hidden w-full">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center justify-center px-4 py-2.5 min-w-[100px] border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  >
                    {t.previous || 'Previous'}
                  </button>
                  <div className="flex items-center px-4">
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center justify-center px-4 py-2.5 min-w-[100px] border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  >
                    {t.next || 'Next'}
                  </button>
                </div>

                {/* Tablet/Desktop: Full Pagination */}
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-700">
                      {t.showingTransactions || 'Showing'} <span className="font-medium">{startIndex + 1}</span> {'to'} <span className="font-medium">{Math.min(endIndex, folderFiles.length)}</span> {'of'} <span className="font-medium">{folderFiles.length}</span> {'files'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      >
                        <span className="sr-only">{t.previous || 'Previous'}</span>
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 rotate-90" />
                      </button>
                      <div className="hidden md:flex">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-3 sm:px-4 py-2 border text-sm font-medium transition-colors touch-manipulation ${
                                  currentPage === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 active:bg-gray-100'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="relative inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      <div className="md:hidden flex items-center px-3 border-t border-b border-gray-300 bg-white">
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      >
                        <span className="sr-only">{t.next || 'Next'}</span>
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 -rotate-90" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
                </>
              )}
            </SectionSurface>
          )}
        </Section>
      </AdminPage>
    </AdminLayout>
  );
}