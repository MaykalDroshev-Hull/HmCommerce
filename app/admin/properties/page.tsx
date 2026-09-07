'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, X, List, ChevronDown, ChevronRight } from 'lucide-react';
import { Property, PropertyValue, ProductType } from '@/lib/types/product-types';
import { PropertyValuesStorage } from '@/lib/propertyValuesStorage';
import AdminLayout from '../components/AdminLayout';
import AdminModal from '../components/AdminModal';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { AdminPage, PageHeader, DataTableShell, TableHeader, TableHeaderRow, TableHeaderCell, TableBody, TableRow, TableCell, SectionSurface, EmptyState, Section } from '../components/layout';
import CompleteAnimation from '@/components/CompleteAnimation';
import { adminAuthHeaders } from '@/lib/admin-auth-headers';

export default function PropertiesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language || 'en'];
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    document.title = t.properties || ('Properties');
  }, [language, t]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [showDeleteValueModal, setShowDeleteValueModal] = useState(false);
  const [valueToDelete, setValueToDelete] = useState<{ propertyId: string; valueId: string; value: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteProducts, setDeleteProducts] = useState<{
    loading: boolean;
    items: Array<{ productid: string; name: string }>;
  }>({
    loading: false,
    items: []
  });
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [availableProductTypes, setAvailableProductTypes] = useState<ProductType[]>([]);
  const [selectedProductTypeIds, setSelectedProductTypeIds] = useState<string[]>([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(false);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showCompleteAnimation, setShowCompleteAnimation] = useState(false);
  const [showDeleteCompleteAnimation, setShowDeleteCompleteAnimation] = useState(false);
  const [showBulkDeleteCompleteAnimation, setShowBulkDeleteCompleteAnimation] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination calculations
  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = properties.slice(startIndex, endIndex);
  const currentPropertyIds = currentProperties.map((prop) => prop.propertyid);
  const allSelectedOnPage =
    currentPropertyIds.length > 0 &&
    currentPropertyIds.every((id) => selectedPropertyIds.includes(id));

  // Reset to first page when properties change
  useEffect(() => {
    setCurrentPage(1);
  }, [properties.length]);

  useEffect(() => {
    setSelectedPropertyIds((prev) =>
      prev.filter((id) => properties.some((prop) => prop.propertyid === id))
    );
  }, [properties]);
  const [formData, setFormData] = useState({ name: '', description: '', datatype: 'select' as 'text' | 'select' | 'number' });
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [showValueModal, setShowValueModal] = useState(false);
  const [editingValue, setEditingValue] = useState<PropertyValue | null>(null);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [valueFormData, setValueFormData] = useState({ value: '', displayorder: 0 });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const loadDeleteProducts = async () => {
      if (!showDeleteModal || !propertyToDelete) return;
      setDeleteConfirmed(false);
      setDeleteProducts({ loading: true, items: [] });
      try {
        const authHeaders = await adminAuthHeaders();
        const response = await fetch(
          `/api/products?propertyid=${propertyToDelete.propertyid}&basic=true&includeDisabled=true`,
          { headers: authHeaders }
        );
        const result = await response.json();
        if (result.success) {
          setDeleteProducts({
            loading: false,
            items: result.products || []
          });
        } else {
          setDeleteProducts({ loading: false, items: [] });
        }
      } catch (error) {
        setDeleteProducts({ loading: false, items: [] });
      }
    };

    loadDeleteProducts();
  }, [showDeleteModal, propertyToDelete]);

  useEffect(() => {
    const loadProductTypes = async () => {
      if (!showModal) return;
      setLoadingProductTypes(true);
      try {
        const response = await fetch('/api/product-types');
        const result = await response.json();
        if (result.success) {
          setAvailableProductTypes(result.productTypes || []);
        }
      } catch (error) {
      } finally {
        setLoadingProductTypes(false);
      }
    };

    if (showModal) {
      loadProductTypes();
      if (!editingProperty) {
        setSelectedProductTypeIds([]);
      }
    }
  }, [showModal, editingProperty]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/properties');
      const result = await response.json();
      if (result.success) {
        // Merge database properties with local storage values
        const propertiesWithLocalValues = result.properties.map((prop: Property) => {
          // If database has values, use them; otherwise check local storage
          const localValues = PropertyValuesStorage.getPropertyValues(prop.propertyid);
          return {
            ...prop,
            values: prop.values && prop.values.length > 0 ? prop.values : localValues
          };
        });
        setProperties(propertiesWithLocalValues);
      }
    } catch (error) {
      // As a last resort, try to load from local storage only
      try {
        const localData = PropertyValuesStorage.getAllPropertyValues();
        const localProperties = Object.keys(localData).map(propertyId => ({
          propertyid: propertyId,
          name: `Property ${propertyId}`,
          description: 'Locally stored property',
          datatype: 'select' as const,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString(),
          values: localData[propertyId]
        }));
        setProperties(localProperties);
      } catch (localError) {
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProperty 
        ? `/api/properties/${editingProperty.propertyid}`
        : '/api/properties';
      const method = editingProperty ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          datatype: 'select', // Always use 'select' type
          productTypeIds: editingProperty ? undefined : selectedProductTypeIds
        })
      });

      const result = await response.json();
      if (result.success) {
        // Show complete animation
        setShowCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setShowModal(false);
          setShowCompleteAnimation(false);
          setFormData({ name: '', description: '', datatype: 'select' });
          setEditingProperty(null);
          setSelectedProductTypeIds([]);
          loadProperties();
        }, 1200);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to save property');
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      description: property.description || '',
      datatype: 'select' // Always use 'select' type
    });
    setShowModal(true);
  };

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/properties/${propertyToDelete.propertyid}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // Show complete animation
        setShowDeleteCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setShowDeleteModal(false);
          setShowDeleteCompleteAnimation(false);
          setPropertyToDelete(null);
          loadProperties();
        }, 1200);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to delete property');
    } finally {
      setDeleting(false);
    }
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleSelectAllPropertiesOnPage = () => {
    setSelectedPropertyIds((prev) => {
      if (allSelectedOnPage) {
        return prev.filter((id) => !currentPropertyIds.includes(id));
      }
      const next = new Set(prev);
      currentPropertyIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedPropertyIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const results = await Promise.all(
        selectedPropertyIds.map(async (id) => {
          const response = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
          const result = await response.json();
          return { id, ok: response.ok && result.success, error: result.error };
        })
      );

      const failed = results.filter((item) => !item.ok);
      if (failed.length > 0) {
        alert(
          `Failed to delete ${failed.length} properties.`
        );
        setSelectedPropertyIds(failed.map((item) => item.id));
      } else {
        // Show complete animation
        setShowBulkDeleteCompleteAnimation(true);
        
        // Close modal and reset after animation completes
        setTimeout(() => {
          setSelectedPropertyIds([]);
          setShowBulkDeleteModal(false);
          setShowBulkDeleteCompleteAnimation(false);
          loadProperties();
        }, 1200);
      }

      if (failed.length === 0) {
        // Don't reload if there were failures
        return;
      }
    } catch (error) {
      alert('Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const togglePropertyExpansion = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

  const handleAddValue = (property: Property) => {
    setCurrentProperty(property);
    setEditingValue(null);
    setValueFormData({ value: '', displayorder: (property.values?.length || 0) + 1 });
    setShowValueModal(true);
  };

  const handleEditValue = (property: Property, value: PropertyValue) => {
    setCurrentProperty(property);
    setEditingValue(value);
    setValueFormData({ value: value.value, displayorder: value.displayorder });
    setShowValueModal(true);
  };

  const handleDeleteValueClick = (property: Property, value: PropertyValue) => {
    setValueToDelete({ propertyId: property.propertyid, valueId: value.propertyvalueid, value: value.value });
    setShowDeleteValueModal(true);
  };

  const handleDeleteValueConfirm = async () => {
    if (!valueToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/properties/values/${valueToDelete.valueId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // If it's a temporary/local value, also remove from local storage
        if (valueToDelete.valueId.startsWith('temp-') || result.warning) {
          // Find which property this value belongs to and remove it from local storage
          const allLocalData = PropertyValuesStorage.getAllPropertyValues();
          for (const [propertyId, values] of Object.entries(allLocalData)) {
            const valueIndex = values.findIndex(v => v.propertyvalueid === valueToDelete.valueId);
            if (valueIndex !== -1) {
              PropertyValuesStorage.deletePropertyValue(propertyId, valueToDelete.valueId);
              break;
            }
          }
        }

        setShowDeleteValueModal(false);
        setValueToDelete(null);
        loadProperties();

        if (result.warning) {
          alert('Property value deleted locally. Database migration needed for persistence.');
        }
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {

      // Fallback to local storage
      const allLocalData = PropertyValuesStorage.getAllPropertyValues();
      for (const [propertyId, values] of Object.entries(allLocalData)) {
        const valueIndex = values.findIndex(v => v.propertyvalueid === valueToDelete.valueId);
        if (valueIndex !== -1) {
          PropertyValuesStorage.deletePropertyValue(propertyId, valueToDelete.valueId);
          setShowDeleteValueModal(false);
          setValueToDelete(null);
          loadProperties();
          alert('Property value deleted locally. Database migration needed for full functionality.');
          return;
        }
      }

      alert('Failed to delete property value');
    } finally {
      setDeleting(false);
    }
  };

  const handleNextValue = async () => {
    if (!currentProperty || !valueFormData.value.trim()) return;

    try {
      const url = editingValue
        ? `/api/properties/values/${editingValue.propertyvalueid}`
        : `/api/properties/${currentProperty.propertyid}/values`;
      const method = editingValue ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valueFormData)
      });

      const result = await response.json();
      if (result.success) {
        // If it's a temporary/local value, store it locally
        if (result.value?.PropertyValueID?.startsWith('temp-') || result.warning) {
          const value: PropertyValue = {
            propertyvalueid: result.value.propertyvalueid || PropertyValuesStorage.generateTempId(),
            propertyid: currentProperty.propertyid,
            value: valueFormData.value,
            displayorder: valueFormData.displayorder,
            isactive: true,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          };

          if (editingValue) {
            PropertyValuesStorage.updatePropertyValue(currentProperty.propertyid, editingValue.propertyvalueid, value);
          } else {
            PropertyValuesStorage.addPropertyValue(currentProperty.propertyid, value);
          }
        }

        // Clear value and increment display order, keep modal open
        setValueFormData({
          value: '',
          displayorder: valueFormData.displayorder + 1
        });
        loadProperties();

        if (result.warning) {
          alert('Property value saved locally. Database migration needed for persistence.');
        }
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {

      // Fallback to local storage
      const value: PropertyValue = {
        propertyvalueid: editingValue?.propertyvalueid || PropertyValuesStorage.generateTempId(),
        propertyid: currentProperty.propertyid,
        value: valueFormData.value,
        displayorder: valueFormData.displayorder,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      };

      if (editingValue) {
        PropertyValuesStorage.updatePropertyValue(currentProperty.propertyid, editingValue.propertyvalueid, value);
      } else {
        PropertyValuesStorage.addPropertyValue(currentProperty.propertyid, value);
      }

      // Clear value and increment display order, keep modal open
      setValueFormData({
        value: '',
        displayorder: valueFormData.displayorder + 1
      });
      loadProperties();

      alert('Property value saved locally. Database migration needed for full functionality.');
    }
  };

  const handleValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty) return;

    try {
      const url = editingValue
        ? `/api/properties/values/${editingValue.propertyvalueid}`
        : `/api/properties/${currentProperty.propertyid}/values`;
      const method = editingValue ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valueFormData)
      });

      const result = await response.json();
      if (result.success) {
        // If it's a temporary/local value, store it locally
        if (result.value?.PropertyValueID?.startsWith('temp-') || result.warning) {
          const value: PropertyValue = {
            propertyvalueid: result.value.propertyvalueid || PropertyValuesStorage.generateTempId(),
            propertyid: currentProperty.propertyid,
            value: valueFormData.value,
            displayorder: valueFormData.displayorder,
            isactive: true,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          };

          if (editingValue) {
            PropertyValuesStorage.updatePropertyValue(currentProperty.propertyid, editingValue.propertyvalueid, value);
          } else {
            PropertyValuesStorage.addPropertyValue(currentProperty.propertyid, value);
          }
        }

        setShowValueModal(false);
        setValueFormData({ value: '', displayorder: 0 });
        setEditingValue(null);
        setCurrentProperty(null);
        loadProperties();

        if (result.warning) {
          alert('Property value saved locally. Database migration needed for persistence.');
        }
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {

      // Fallback to local storage
      const value: PropertyValue = {
        propertyvalueid: editingValue?.propertyvalueid || PropertyValuesStorage.generateTempId(),
        propertyid: currentProperty.propertyid,
        value: valueFormData.value,
        displayorder: valueFormData.displayorder,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      };

      if (editingValue) {
        PropertyValuesStorage.updatePropertyValue(currentProperty.propertyid, editingValue.propertyvalueid, value);
      } else {
        PropertyValuesStorage.addPropertyValue(currentProperty.propertyid, value);
      }

      setShowValueModal(false);
      setValueFormData({ value: '', displayorder: 0 });
      setEditingValue(null);
      setCurrentProperty(null);
      loadProperties();

      alert('Property value saved locally. Database migration needed for full functionality.');
    }
  };

  return (
    <AdminLayout currentPath="/admin/properties">
      <AdminPage className="space-y-6">
        <PageHeader
          title={'Characteristics'}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {selectedPropertyIds.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  {`Delete selected (${selectedPropertyIds.length})`}
                </button>
              )}
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setFormData({ name: '', description: '', datatype: 'select' });
                  setShowModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                {t.addProperty}
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-500">{'Loading...'}</p>
          </div>
        ) : (
          <>
            <Section
              title={'Characteristics List'}
              description={'Manage item characteristics and their values'}
            >
              {properties.length === 0 ? (
                <EmptyState
                  title={'No Characteristics'}
                  description={'Create your first characteristic to start organizing your items.'}
                  action={
                    <button
                      onClick={() => {
                        setEditingProperty(null);
                        setFormData({ name: '', description: '', datatype: 'select' });
                        setShowModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {t.addProperty}
                    </button>
                  }
                  icon={List}
                />
              ) : (
                <SectionSurface tone="soft" padding="md">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 xl:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={allSelectedOnPage}
                          onChange={toggleSelectAllPropertiesOnPage}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label={'Select all'}
                        />
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.name}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.description}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.propertyValues}
                      </th>
                      <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentProperties.map((prop) => (
                      <React.Fragment key={prop.propertyid}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="checkbox"
                              checked={selectedPropertyIds.includes(prop.propertyid)}
                              onChange={() => togglePropertySelection(prop.propertyid)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              aria-label={'Select property'}
                            />
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {prop.datatype === 'select' && (
                                <button
                                  onClick={() => togglePropertyExpansion(prop.propertyid)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
                                  title={expandedProperties.has(prop.propertyid) ? 'Collapse' : 'Expand'}
                                >
                                  {expandedProperties.has(prop.propertyid) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <span className="truncate max-w-xs">{prop.name}</span>
                            </div>
                          </td>
                          <td className="px-4 xl:px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate">{prop.description || '-'}</div>
                          </td>
                          <td className="px-4 xl:px-6 py-4 text-sm text-gray-500">
                            {prop.datatype === 'select' ? (
                              <span>{prop.values?.length || 0} {'values'}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              {prop.datatype === 'select' && (
                                <button
                                  onClick={() => handleAddValue(prop)}
                                  className="p-1.5 sm:p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors touch-manipulation"
                                  title={t.addPropertyValue || 'Add Value'}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(prop)}
                                className="p-1.5 sm:p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                title={t.editProperty || 'Edit Property'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(prop)}
                                className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                title={'Delete Property'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded property values - Desktop */}
                        {expandedProperties.has(prop.propertyid) && prop.datatype === 'select' && (
                          <tr>
                            <td colSpan={5} className="px-4 xl:px-6 py-0">
                              <div className="bg-gray-50 rounded-md p-3 sm:p-4 m-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                                  <h4 className="text-xs sm:text-sm font-medium text-gray-700">
                                    {'Property Values'}
                                  </h4>
                                  <button
                                    onClick={() => handleAddValue(prop)}
                                    className="flex items-center justify-center gap-1 text-xs px-2 sm:px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation w-full sm:w-auto"
                                  >
                                    <Plus className="w-3 h-3" />
                                    {'Add Value'}
                                  </button>
                                </div>

                                {prop.values && prop.values.length > 0 ? (
                                  <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
                                    {prop.values.map((value) => (
                                      <div
                                        key={value.propertyvalueid}
                                        className="flex items-center justify-between bg-white p-2 sm:p-3 rounded border hover:bg-gray-50 transition-colors"
                                      >
                                        <span className="text-xs sm:text-sm flex-1 min-w-0 truncate">{value.value}</span>
                                        <div className="flex gap-1 sm:gap-2 ml-2 flex-shrink-0">
                                          <button
                                            onClick={() => handleEditValue(prop, value)}
                                            className="p-1.5 sm:p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                            title={t.editPropertyValue || 'Edit Value'}
                                          >
                                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteValueClick(prop, value)}
                                            className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                            title={'Delete Value'}
                                          >
                                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-xs sm:text-sm">
                                    {t.noValuesDefined || ('No values defined. Click "Add Value" to create options for this property.')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>
                </SectionSurface>
              )}
            </Section>

            {/* Mobile Card Layout */}
            {properties.length > 0 && (
              <Section
                title={'Characteristics List'}
                className="lg:hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllPropertiesOnPage}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    {'Select all on page'}
                  </label>
                </div>
                <div className="space-y-3">
              {currentProperties.map((prop) => {
                const isExpanded = expandedProperties.has(prop.propertyid);
                return (
                  <div key={prop.propertyid} className="bg-white p-3 sm:p-4 rounded-lg shadow border">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="checkbox"
                            checked={selectedPropertyIds.includes(prop.propertyid)}
                            onChange={() => togglePropertySelection(prop.propertyid)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={'Select property'}
                          />
                          {prop.datatype === 'select' && (
                            <button
                              onClick={() => togglePropertyExpansion(prop.propertyid)}
                              className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation flex-shrink-0"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">{prop.name}</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{prop.description || ('No description')}</p>
                        {prop.datatype === 'select' && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                            <span>{prop.values?.length || 0} {'values'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        {prop.datatype === 'select' && (
                          <button
                            onClick={() => handleAddValue(prop)}
                            className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 active:bg-green-100 rounded transition-colors touch-manipulation"
                            title={t.addPropertyValue || 'Add Value'}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(prop)}
                          className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 active:bg-indigo-100 rounded transition-colors touch-manipulation"
                          title={t.editProperty || 'Edit Property'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(prop)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded transition-colors touch-manipulation"
                          title={'Delete Property'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded values for mobile */}
                    {isExpanded && prop.datatype === 'select' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs sm:text-sm font-medium text-gray-700">
                            {t.propertyValues || 'Property Values'}:
                          </h4>
                          <button
                            onClick={() => handleAddValue(prop)}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation"
                          >
                            <Plus className="w-3 h-3" />
                            {'Add'}
                          </button>
                        </div>
                        {prop.values && prop.values.length > 0 ? (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {prop.values.map((value) => (
                              <div key={value.propertyvalueid} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded text-xs sm:text-sm hover:bg-gray-100 transition-colors">
                                <span className="flex-1 min-w-0 truncate">{value.value}</span>
                                <div className="flex gap-1 ml-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditValue(prop, value)}
                                    className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                    title={t.editPropertyValue || 'Edit Value'}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteValueClick(prop, value)}
                                    className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                    title={'Delete Value'}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-gray-500 text-xs">
                            {t.noValuesDefined || ('No values defined')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              </Section>
            )}
          </>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="bg-white px-3 sm:px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
            {/* Mobile: Simple Prev/Next */}
            <div className="flex-1 flex justify-between lg:hidden w-full">
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

            {/* Desktop: Full Pagination */}
            <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-between w-full">
              <div>
                <p className="text-xs sm:text-sm text-gray-700">
                  {t.showingTransactions || 'Showing'} <span className="font-medium">{startIndex + 1}</span> {'to'} <span className="font-medium">{Math.min(endIndex, properties.length)}</span> {'of'} <span className="font-medium">{properties.length}</span> {'properties'}
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

        <AdminModal
          isOpen={showModal}
          onClose={() => {
            if (!showCompleteAnimation) {
              setShowModal(false);
              setShowCompleteAnimation(false);
            }
          }}
          title={editingProperty ? t.editProperty : t.addProperty}
          subheader={editingProperty 
            ? ('Edit the property information')
            : ('Create a new choice property')
          }
          maxWidth="max-w-2xl"
          minWidth={520}
          minHeight={550}
        >
          <div className="relative">
            <form onSubmit={handleSubmit}>
              <div className={`space-y-4 transition-all duration-300 ${showCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t.name}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t.description}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              {!editingProperty && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {'Categories'}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {'Select categories (multi-select)'}
                  </p>
                  {loadingProductTypes ? (
                    <div className="text-xs text-gray-500">
                      {'Loading...'}
                    </div>
                  ) : availableProductTypes.length === 0 ? (
                    <div className="text-xs text-gray-500">
                      {'No categories available'}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                      {availableProductTypes.map((pt) => (
                        <label
                          key={pt.producttypeid}
                          className="flex items-start gap-2 py-1 cursor-pointer hover:bg-gray-50 px-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProductTypeIds.includes(pt.producttypeid)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setSelectedProductTypeIds((prev) =>
                                isChecked
                                  ? [...prev, pt.producttypeid]
                                  : prev.filter((id) => id !== pt.producttypeid)
                              );
                            }}
                            className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs sm:text-sm">
                            {pt.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!showCompleteAnimation) {
                      setShowModal(false);
                      setShowCompleteAnimation(false);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                >
                  {editingProperty ? t.update : t.create}
                </button>
              </div>
            </div>
          </form>
          
          {/* Complete Animation Overlay */}
          {showCompleteAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <CompleteAnimation size={120} />
            </div>
          )}
          </div>
        </AdminModal>

        {showValueModal && currentProperty && (
          <AdminModal
            isOpen={showValueModal}
            onClose={() => setShowValueModal(false)}
            title={editingValue ? t.editPropertyValue : t.addPropertyValue}
            subheader={editingValue
              ? ('Edit the property value')
              : ('Add a new choice value')
            }
            maxWidth="max-w-md"
            minWidth={400}
            minHeight={350}
          >
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-xs sm:text-sm text-gray-600">
                {t.propertyColon || 'Property'}: <strong>{currentProperty.name}</strong>
              </p>
            </div>
            <form onSubmit={handleValueSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.valueRequired || 'Value'} *
                  </label>
                  <input
                    type="text"
                    value={valueFormData.value}
                    onChange={(e) => setValueFormData({ ...valueFormData, value: e.target.value })}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={'Enter value (e.g., Genuine Leather)'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t.displayOrder || 'Display Order'}
                  </label>
                  <input
                    type="number"
                    value={valueFormData.displayorder}
                    onChange={(e) => setValueFormData({ ...valueFormData, displayorder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t.lowerNumbersFirst || 'Lower numbers appear first'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowValueModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                  >
                    {t.cancel}
                  </button>
                  {!editingValue && (
                    <button
                      type="button"
                      onClick={handleNextValue}
                      className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 transition-colors touch-manipulation"
                    >
                      {t.next || 'Next'}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                  >
                    {editingValue ? (t.updateValue || t.update) : (t.addValueBtn || ('Add'))}
                  </button>
                </div>
              </div>
            </form>
          </AdminModal>
        )}

        {/* Delete Property Confirmation Modal */}
        <AdminModal
          isOpen={showDeleteModal}
          onClose={() => {
            if (!showDeleteCompleteAnimation) {
              setShowDeleteModal(false);
              setPropertyToDelete(null);
              setShowDeleteCompleteAnimation(false);
            }
          }}
          title={'Confirm Delete'}
          subheader={'Are you sure you want to delete this property? Products linked to it will be deleted. This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={550}
        >
          <div className="relative">
            <div className={`space-y-4 transition-all duration-300 ${showDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
            {propertyToDelete && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Property:'}
                </p>
                <p className="text-sm text-gray-700">{propertyToDelete.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Products'}
                {deleteProducts.items.length > 0 ? ` (${deleteProducts.items.length})` : ''}
              </p>
              {deleteProducts.loading ? (
                <p className="text-xs text-gray-500">
                  {'Loading...'}
                </p>
              ) : deleteProducts.items.length === 0 ? (
                <p className="text-xs text-gray-500">
                  {'None'}
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded border border-gray-200 bg-white">
                  {deleteProducts.items.map((product) => (
                    <div key={product.productid} className="px-3 py-1 text-xs text-gray-700 border-b last:border-b-0">
                      {product.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {deleteProducts.items.length > 0 && (
              <label className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span>
                  {'I confirm that products and variants will be deleted.'}
                </span>
              </label>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (!showDeleteCompleteAnimation) {
                    setShowDeleteModal(false);
                    setPropertyToDelete(null);
                    setShowDeleteCompleteAnimation(false);
                  }
                }}
                disabled={deleting || showDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting || showDeleteCompleteAnimation || (deleteProducts.items.length > 0 && !deleteConfirmed)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? ('Deleting...') : ('Delete')}
              </button>
            </div>
            </div>
            
            {/* Complete Animation Overlay */}
            {showDeleteCompleteAnimation && (
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
          subheader={'Selected properties and linked products will be deleted. This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={260}
        >
          <div className="relative">
            <div className={`space-y-4 transition-all duration-300 ${showBulkDeleteCompleteAnimation ? 'blur-sm pointer-events-none' : ''}`}>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {'Selected properties:'}
              </p>
              <p className="text-sm text-gray-700">
                {selectedPropertyIds.length}
              </p>
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
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting || showBulkDeleteCompleteAnimation}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? ('Deleting...') : ('Delete selected')}
              </button>
            </div>
            </div>
            
            {/* Complete Animation Overlay */}
            {showBulkDeleteCompleteAnimation && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <CompleteAnimation size={120} />
              </div>
            )}
          </div>
        </AdminModal>

        {/* Delete Property Value Confirmation Modal */}
        <AdminModal
          isOpen={showDeleteValueModal}
          onClose={() => {
            setShowDeleteValueModal(false);
            setValueToDelete(null);
          }}
          title={'Confirm Delete'}
          subheader={'Are you sure you want to delete this property value? This action cannot be undone.'}
          maxWidth="max-w-md"
          minWidth={400}
          minHeight={200}
        >
          <div className="space-y-4">
            {valueToDelete && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {'Value:'}
                </p>
                <p className="text-sm text-gray-700">{valueToDelete.value}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteValueModal(false);
                  setValueToDelete(null);
                }}
                disabled={deleting}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteValueConfirm}
                disabled={deleting}
                className="w-full sm:w-auto px-4 py-2.5 text-sm sm:text-base bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? ('Deleting...') : ('Delete')}
              </button>
            </div>
          </div>
        </AdminModal>
      </AdminPage>
    </AdminLayout>
  );
}

