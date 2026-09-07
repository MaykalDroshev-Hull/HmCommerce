// store/checkoutStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DeliveryType = 'office' | 'address' | 'econtomat';

export interface CheckoutFormData {
  notes: string;
  missingEcontOffice?: string;
  firstName: string;
  lastName: string;
  telephone: string;
  email: string;
  country: string;
  city: string;
  deliveryType: DeliveryType;
  discountCode: string;
  econtOfficeId?: string;
  // Address delivery fields
  street?: string;
  streetNumber?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
}

export interface AppliedDiscount {
  code: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  discountAmount: number;
  finalTotal: number;
}

export interface CityOption {
  name: string;
  postcode: string;
  displayName: string;
}

export interface CheckoutState {
  formData: CheckoutFormData;
  cities: CityOption[];
  isSubmitting: boolean;
  isValidatingStock: boolean;
  error: string | null;
  insufficientStock: any[];
  appliedDiscount: AppliedDiscount | null;
  discountValidating: boolean;
  discountError: string | null;

  // Actions
  updateFormData: (data: Partial<CheckoutFormData>) => void;
  setCities: (cities: CityOption[]) => void;
  setSubmitting: (submitting: boolean) => void;
  setValidatingStock: (validating: boolean) => void;
  setError: (error: string | null) => void;
  setInsufficientStock: (stock: any[]) => void;
  resetForm: () => void;
  validateDiscount: (cartTotal: number) => Promise<void>;
  removeDiscount: () => void;

  // Computed
  isFormValid: () => boolean;
  fullName: () => string;
  discountedTotal: (originalTotal: number, deliveryCost: number) => number;
}

const defaultFormData: CheckoutFormData = {
  notes: '',
  missingEcontOffice: '',
  firstName: '',
  lastName: '',
  telephone: '',
  email: '',
  country: 'United Kingdom',
  city: '',
  deliveryType: 'address',
  discountCode: '',
  econtOfficeId: '',
  street: '',
  streetNumber: '',
  entrance: '',
  floor: '',
  apartment: '',
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      formData: defaultFormData,
      cities: [],
      isSubmitting: false,
      isValidatingStock: false,
      error: null,
      insufficientStock: [],
      appliedDiscount: null,
      discountValidating: false,
      discountError: null,

      updateFormData: (data) => {
        set(state => ({
          formData: { ...state.formData, ...data }
        }));
      },

      setCities: (cities) => {
        set({ cities });
      },

      setSubmitting: (submitting) => {
        set({ isSubmitting: submitting });
      },

      setValidatingStock: (validating) => {
        set({ isValidatingStock: validating });
      },

      setError: (error) => {
        set({ error });
      },

      setInsufficientStock: (stock) => {
        set({ insufficientStock: stock });
      },

      validateDiscount: async (cartTotal: number) => {
        const { formData } = get();

        if (!formData.discountCode.trim()) {
          set({ appliedDiscount: null, discountError: null });
          return;
        }

        try {
          set({ discountValidating: true, discountError: null });

          const response = await fetch('/api/discounts/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: formData.discountCode.trim(),
              cartTotal
            }),
          });

          const result = await response.json();

          if (result.success) {
            set({
              appliedDiscount: result.discount,
              discountError: null,
              discountValidating: false
            });
          } else {
            set({
              appliedDiscount: null,
              discountError: result.error,
              discountValidating: false
            });
          }
        } catch (error) {
          set({
            appliedDiscount: null,
            discountError: 'Failed to validate discount code',
            discountValidating: false
          });
        }
      },

      removeDiscount: () => {
        const { formData } = get();
        set({
          appliedDiscount: null,
          discountError: null,
          formData: { ...formData, discountCode: '' }
        });
      },

      resetForm: () => {
        set({
          formData: defaultFormData,
          error: null,
          isSubmitting: false,
          isValidatingStock: false,
          insufficientStock: [],
          appliedDiscount: null,
          discountValidating: false,
          discountError: null
        });
      },

      isFormValid: () => {
        const { formData } = get();
        return !!(
          formData.firstName?.trim() &&
          formData.lastName?.trim() &&
          formData.telephone?.trim() &&
          formData.street?.trim() &&
          formData.streetNumber?.trim() &&
          formData.city?.trim()
        );
      },

      fullName: () => {
        const { formData } = get();
        return `${formData.firstName} ${formData.lastName}`.trim();
      },

      discountedTotal: (originalTotal: number, deliveryCost: number) => {
        const { appliedDiscount } = get();
        const subtotal = originalTotal + deliveryCost;

        if (appliedDiscount) {
          return appliedDiscount.finalTotal + deliveryCost;
        }

        return subtotal;
      }
    }),
    {
      name: 'checkout-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        formData: state.formData,
        cities: state.cities,
        appliedDiscount: state.appliedDiscount
      }), // Persist form data, cities, and applied discount
      merge: (persistedState: any, currentState: CheckoutState) => ({
        ...currentState,
        ...persistedState,
        formData: {
          ...defaultFormData,
          ...(persistedState?.formData || {})
        }
      })
    }
  )
);
