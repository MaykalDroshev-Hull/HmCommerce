'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    initGoogleMapsAutocomplete?: () => void;
    gm_authFailure?: () => void;
  }
}

interface AddressFields {
  street: string;
  addressLine2?: string;
  city: string;
  postcode: string;
}

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (fields: AddressFields) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  hasError?: boolean;
}

export default function GoogleAddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'e.g. 10 High Street',
  required = false,
  className = '',
  hasError = false,
}: GoogleAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  // Load Google Maps JavaScript API with Places library if API key is provided
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!apiKey) {
      console.warn(
        '[GoogleAddressAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not detected in the client bundle.\n' +
        'If you recently updated .env.local, please restart the Next.js server (npm run dev) so the environment variable is picked up.'
      );
      return;
    }

    // Register global Google Maps auth failure handler to aid debugging
    window.gm_authFailure = () => {
      console.error(
        '[GoogleAddressAutocomplete] Google Maps Authentication Failed!\n' +
        'Common causes:\n' +
        '1. "Places API" is not enabled in Google Cloud Console.\n' +
        '2. Billing is not linked to your Google Cloud project (Google provides $200 free credit monthly).\n' +
        '3. API key restriction is blocking http://localhost:3000.'
      );
    };

    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }

    const scriptId = 'google-maps-places-script';
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en&region=GB`;
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = (err) => {
        console.error('[GoogleAddressAutocomplete] Error loading Google Maps script:', err);
      };
      document.head.appendChild(script);
    } else {
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setIsScriptLoaded(true));
      }
    }
  }, [apiKey]);

  // Attach Google Places Autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google?.maps?.places) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gb' }, // Strictly UK
        fields: ['address_components', 'formatted_address', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place || !place.address_components) return;

        let streetNumber = '';
        let route = '';
        let subpremise = '';
        let premise = '';
        let city = '';
        let postcode = '';

        for (const component of place.address_components) {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('subpremise')) {
            subpremise = component.long_name;
          } else if (types.includes('premise')) {
            premise = component.long_name;
          } else if (types.includes('postal_town') || types.includes('locality')) {
            if (!city) city = component.long_name;
          } else if (types.includes('postal_code')) {
            postcode = component.long_name;
          }
        }

        // Build UK Address Line 1
        const streetParts = [];
        if (premise && !streetNumber) streetParts.push(premise);
        if (streetNumber) streetParts.push(streetNumber);
        if (route) streetParts.push(route);

        const fullStreet = streetParts.join(' ') || place.formatted_address?.split(',')[0] || '';

        onAddressSelect({
          street: fullStreet,
          addressLine2: subpremise,
          city: city,
          postcode: postcode,
        });
      });
    } catch (err) {
      console.error('[GoogleAddressAutocomplete] Error initializing Autocomplete:', err);
    }
  }, [isScriptLoaded, onAddressSelect]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="shipping address-line1"
        className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 transition-all ${
          hasError ? 'border-red-500' : 'border-neutral-300'
        } ${className}`}
      />
      {Boolean(apiKey && isScriptLoaded) && (
        <span
          className="absolute right-3 top-2.5 text-emerald-600 pointer-events-none"
          title="Google Address Autocomplete active"
        >
          <MapPin size={15} />
        </span>
      )}
    </div>
  );
}
