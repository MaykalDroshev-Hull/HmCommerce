'use client';

import { useState } from 'react';
import AdminModal from './AdminModal';
import CompleteAnimation from '@/components/CompleteAnimation';
import { adminAuthHeaders } from '@/lib/admin-auth-headers';

type BulkVisibilityMode = 'hide' | 'show';
type BulkRestockMode = 'mark' | 'clear';

export type ProductBulkCompleteResult =
  | { action: 'visibility'; productIds: string[]; isdisabled: boolean }
  | { action: 'restock'; productIds: string[]; awaitingrestock: boolean }
  | { action: 'delete'; productIds: string[] };

function headerActionButton(opts: {
  label: string;
  onClick: () => void;
  variant: 'outline-orange' | 'outline-green' | 'solid-slate' | 'solid-teal' | 'solid-red';
  badge?: number;
  title?: string;
  disabled?: boolean;
}) {
  const variantClasses = {
    'outline-orange': {
      button: 'border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50',
      badge: 'bg-orange-500 text-white',
    },
    'outline-green': {
      button: 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50',
      badge: 'bg-emerald-600 text-white',
    },
    'solid-slate': {
      button: 'border border-slate-700 bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50',
      badge: 'bg-slate-900 text-white',
    },
    'solid-teal': {
      button: 'border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50',
      badge: 'bg-teal-800 text-white',
    },
    'solid-red': {
      button: 'border border-red-500 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
      badge: 'bg-red-700 text-white',
    },
  }[opts.variant];

  return (
    <button
      type="button"
      onClick={opts.onClick}
      title={opts.title || opts.label}
      disabled={opts.disabled}
      className={`inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors touch-manipulation disabled:cursor-not-allowed ${variantClasses.button}`}
    >
      <span className="whitespace-nowrap">{opts.label}</span>
      {opts.badge != null && opts.badge > 0 && (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${variantClasses.badge}`}
        >
          {opts.badge}
        </span>
      )}
    </button>
  );
}

interface ProductBulkControlsProps {
  language: 'bg' | 'en';
  selectedProductIds: string[];
  onClearSelection: () => void;
  onComplete: (result: ProductBulkCompleteResult) => void;
  className?: string;
}

export default function ProductBulkControls({
  language,
  selectedProductIds,
  onClearSelection,
  onComplete,
  className = '',
}: ProductBulkControlsProps) {
  const selectedCount = selectedProductIds.length;
  const selectFirstTitle =
    'Select items first';

  const [bulkVisibilityModal, setBulkVisibilityModal] = useState<BulkVisibilityMode | null>(null);
  const [bulkRestockModal, setBulkRestockModal] = useState<BulkRestockMode | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkUpdatingVisibility, setBulkUpdatingVisibility] = useState(false);
  const [bulkUpdatingRestock, setBulkUpdatingRestock] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkVisibilityCompleteAnimation, setShowBulkVisibilityCompleteAnimation] =
    useState(false);
  const [showBulkRestockCompleteAnimation, setShowBulkRestockCompleteAnimation] = useState(false);
  const [showBulkDeleteCompleteAnimation, setShowBulkDeleteCompleteAnimation] = useState(false);

  const finishWithAnimation = (close: () => void, result: ProductBulkCompleteResult) => {
    setShowBulkVisibilityCompleteAnimation(false);
    setShowBulkRestockCompleteAnimation(false);
    setShowBulkDeleteCompleteAnimation(true);
    setTimeout(() => {
      onComplete(result);
      onClearSelection();
      close();
      setShowBulkDeleteCompleteAnimation(false);
    }, 1200);
  };

  const handleBulkVisibilityConfirm = async () => {
    if (!bulkVisibilityModal || selectedProductIds.length === 0) return;
    const isdisabled = bulkVisibilityModal === 'hide';

    try {
      setBulkUpdatingVisibility(true);
      const authHeaders = await adminAuthHeaders();
      const response = await fetch('/api/admin/products/bulk-visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ productIds: selectedProductIds, isdisabled }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(
          `Error: ${result.error || 'Update failed'}`
        );
        return;
      }

      setShowBulkVisibilityCompleteAnimation(true);
      setTimeout(() => {
        onComplete({ action: 'visibility', productIds: [...selectedProductIds], isdisabled });
        onClearSelection();
        setBulkVisibilityModal(null);
        setShowBulkVisibilityCompleteAnimation(false);
      }, 1200);
    } catch {
      alert(
        'Failed to update visibility'
      );
    } finally {
      setBulkUpdatingVisibility(false);
    }
  };

  const handleBulkRestockConfirm = async () => {
    if (!bulkRestockModal || selectedProductIds.length === 0) return;
    const awaitingrestock = bulkRestockModal === 'mark';

    try {
      setBulkUpdatingRestock(true);
      const authHeaders = await adminAuthHeaders();
      const response = await fetch('/api/admin/products/bulk-awaiting-restock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ productIds: selectedProductIds, awaitingrestock }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(
          `Error: ${result.error || 'Update failed'}`
        );
        return;
      }

      setShowBulkRestockCompleteAnimation(true);
      setTimeout(() => {
        onComplete({ action: 'restock', productIds: [...selectedProductIds], awaitingrestock });
        onClearSelection();
        setBulkRestockModal(null);
        setShowBulkRestockCompleteAnimation(false);
      }, 1200);
    } catch {
      alert(
        'Failed to update out-of-stock display status'
      );
    } finally {
      setBulkUpdatingRestock(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedProductIds.length === 0) return;
    const idsToDelete = [...selectedProductIds];

    try {
      setBulkDeleting(true);
      const results = await Promise.all(
        idsToDelete.map(async (id) => {
          const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
          const result = await response.json();
          return { id, ok: response.ok && result.success };
        })
      );

      const failed = results.filter((item) => !item.ok);
      const succeeded = results.filter((item) => item.ok).map((item) => item.id);

      if (failed.length > 0) {
        alert(
          `Failed to delete ${failed.length} products.`
        );
      }

      if (succeeded.length > 0) {
        finishWithAnimation(
          () => setShowBulkDeleteModal(false),
          { action: 'delete', productIds: succeeded }
        );
      }
    } catch {
      alert('Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const cancelLabel = 'Cancel';

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {headerActionButton({
          label: 'Hide selected',
          variant: 'outline-orange',
          onClick: () => setBulkVisibilityModal('hide'),
          badge: selectedCount > 0 ? selectedCount : undefined,
          disabled: selectedCount === 0,
          title: selectedCount > 0 ? undefined : selectFirstTitle,
        })}
        {headerActionButton({
          label: 'Show selected',
          variant: 'outline-green',
          onClick: () => setBulkVisibilityModal('show'),
          badge: selectedCount > 0 ? selectedCount : undefined,
          disabled: selectedCount === 0,
          title: selectedCount > 0 ? undefined : selectFirstTitle,
        })}
        {headerActionButton({
          label: 'Out of stock',
          variant: 'solid-slate',
          onClick: () => setBulkRestockModal('mark'),
          badge: selectedCount > 0 ? selectedCount : undefined,
          disabled: selectedCount === 0,
          title: selectedCount > 0 ? undefined : selectFirstTitle,
        })}
        {headerActionButton({
          label: 'Clear out of stock',
          variant: 'solid-teal',
          onClick: () => setBulkRestockModal('clear'),
          badge: selectedCount > 0 ? selectedCount : undefined,
          disabled: selectedCount === 0,
          title: selectedCount > 0 ? undefined : selectFirstTitle,
        })}
        {headerActionButton({
          label: 'Delete selected',
          variant: 'solid-red',
          onClick: () => setShowBulkDeleteModal(true),
          badge: selectedCount > 0 ? selectedCount : undefined,
          disabled: selectedCount === 0,
          title: selectedCount > 0 ? undefined : selectFirstTitle,
        })}
      </div>

      <AdminModal
        isOpen={bulkRestockModal !== null}
        onClose={() => {
          if (!showBulkRestockCompleteAnimation) {
            setBulkRestockModal(null);
            setShowBulkRestockCompleteAnimation(false);
          }
        }}
        title={
          bulkRestockModal === 'mark'
            ? 'Mark as out of stock'
            : 'Clear out-of-stock display'
        }
        subheader={
          bulkRestockModal === 'mark'
            ? 'Selected products will appear greyed out with “Out of stock / Restock coming soon”.'
            : 'Selected products will display normally (if they have stock).'
        }
        maxWidth="max-w-md"
        minWidth={400}
        minHeight={200}
      >
        <div className="relative">
          <div
            className={`space-y-4 transition-all duration-300 ${
              showBulkRestockCompleteAnimation ? 'blur-sm pointer-events-none' : ''
            }`}
          >
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Selected items:'}
              </p>
              <p className="text-sm text-gray-700">{selectedCount}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showBulkRestockCompleteAnimation) {
                    setBulkRestockModal(null);
                    setShowBulkRestockCompleteAnimation(false);
                  }
                }}
                disabled={bulkUpdatingRestock || showBulkRestockCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleBulkRestockConfirm}
                disabled={bulkUpdatingRestock || showBulkRestockCompleteAnimation}
                className={`w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base text-white rounded transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                  bulkRestockModal === 'mark'
                    ? 'bg-slate-600 hover:bg-slate-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {bulkUpdatingRestock
                  ? 'Saving...'
                  : bulkRestockModal === 'mark'
                    ? 'Mark selected'
                    : 'Clear status'}
              </button>
            </div>
          </div>
          {showBulkRestockCompleteAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <CompleteAnimation size={120} />
            </div>
          )}
        </div>
      </AdminModal>

      <AdminModal
        isOpen={bulkVisibilityModal !== null}
        onClose={() => {
          if (!showBulkVisibilityCompleteAnimation) {
            setBulkVisibilityModal(null);
            setShowBulkVisibilityCompleteAnimation(false);
          }
        }}
        title={
          bulkVisibilityModal === 'hide'
            ? 'Hide selected from shop'
            : 'Show selected in shop'
        }
        subheader={
          bulkVisibilityModal === 'hide'
            ? 'Selected products will be hidden from customers. You can show them again anytime.'
            : 'Selected products will become visible in the online shop.'
        }
        maxWidth="max-w-md"
        minWidth={400}
        minHeight={200}
      >
        <div className="relative">
          <div
            className={`space-y-4 transition-all duration-300 ${
              showBulkVisibilityCompleteAnimation ? 'blur-sm pointer-events-none' : ''
            }`}
          >
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Selected items:'}
              </p>
              <p className="text-sm text-gray-700">{selectedCount}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showBulkVisibilityCompleteAnimation) {
                    setBulkVisibilityModal(null);
                    setShowBulkVisibilityCompleteAnimation(false);
                  }
                }}
                disabled={bulkUpdatingVisibility || showBulkVisibilityCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleBulkVisibilityConfirm}
                disabled={bulkUpdatingVisibility || showBulkVisibilityCompleteAnimation}
                className={`w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base text-white rounded transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                  bulkVisibilityModal === 'hide'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {bulkUpdatingVisibility
                  ? 'Saving...'
                  : bulkVisibilityModal === 'hide'
                    ? 'Hide'
                    : 'Show'}
              </button>
            </div>
          </div>
          {showBulkVisibilityCompleteAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <CompleteAnimation size={120} />
            </div>
          )}
        </div>
      </AdminModal>

      <AdminModal
        isOpen={showBulkDeleteModal}
        onClose={() => {
          if (!showBulkDeleteCompleteAnimation) {
            setShowBulkDeleteModal(false);
            setShowBulkDeleteCompleteAnimation(false);
          }
        }}
        title={'Confirm Bulk Delete'}
        subheader={
          'Selected products will be deleted. This action cannot be undone.'
        }
        maxWidth="max-w-md"
        minWidth={400}
        minHeight={200}
      >
        <div className="relative">
          <div
            className={`space-y-4 transition-all duration-300 ${
              showBulkDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''
            }`}
          >
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Selected items:'}
              </p>
              <p className="text-sm text-gray-700">{selectedCount}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showBulkDeleteCompleteAnimation) {
                    setShowBulkDeleteModal(false);
                    setShowBulkDeleteCompleteAnimation(false);
                  }
                }}
                disabled={bulkDeleting || showBulkDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting || showBulkDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-danger text-danger-foreground rounded hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleting
                  ? 'Deleting...'
                  : 'Delete selected'}
              </button>
            </div>
          </div>
          {showBulkDeleteCompleteAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <CompleteAnimation size={120} />
            </div>
          )}
        </div>
      </AdminModal>
    </>
  );
}
