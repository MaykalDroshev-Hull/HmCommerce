'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PublicPageLayout from '@/components/PublicPageLayout';
import { 
  Ruler, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Maximize2,
  X,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Eye
} from 'lucide-react';

interface SizeRow {
  size: string;
  category: string;
  neckInches: string;
  neckCm: string;
  chestInches: string;
  chestCm: string;
  leashSpec: string;
  breeds: string[];
  popular?: boolean;
}

const SIZE_DATA: SizeRow[] = [
  {
    size: 'XXS',
    category: 'Cats & Toy Breeds',
    neckInches: '9.4" – 11.0"',
    neckCm: '24 – 28 cm',
    chestInches: '11.8" – 13.7"',
    chestCm: '30 – 35 cm',
    leashSpec: '5/8" width × 5 ft (150 cm)',
    breeds: ['Chihuahua', 'Teacup Breeds', 'Yorkshire Terrier (Puppy)', 'Cats'],
  },
  {
    size: 'XS',
    category: 'Small Puppies & Toy Breeds',
    neckInches: '11.8" – 13.7"',
    neckCm: '30 – 35 cm',
    chestInches: '14.6" – 17.7"',
    chestCm: '37 – 45 cm',
    leashSpec: '5/8" width × 5 ft (150 cm)',
    breeds: ['Miniature Dachshund', 'Pomeranian', 'Maltese', 'Toy Poodle'],
  },
  {
    size: 'S',
    category: 'Small Breeds',
    neckInches: '14.2" – 15.7"',
    neckCm: '36 – 40 cm',
    chestInches: '17.3" – 18.8"',
    chestCm: '44 – 48 cm',
    leashSpec: '5/8" width × 5 ft (150 cm)',
    breeds: ['Standard Dachshund', 'Jack Russell', 'Pug', 'Shih Tzu', 'Cavalier King Charles'],
  },
  {
    size: 'M',
    category: 'Medium Breeds',
    neckInches: '15.7" – 18.8"',
    neckCm: '40 – 48 cm',
    chestInches: '18.8" – 21.6"',
    chestCm: '48 – 55 cm',
    leashSpec: '3/4" width × 5 ft (150 cm)',
    breeds: ['Cocker Spaniel', 'French Bulldog', 'Beagle', 'Cockapoo', 'Staffordshire Bull Terrier'],
  },
  {
    size: 'L',
    category: 'Large Breeds',
    neckInches: '16.9" – 19.6"',
    neckCm: '43 – 50 cm',
    chestInches: '22.0" – 25.5"',
    chestCm: '56 – 65 cm',
    leashSpec: '3/4" width × 5 ft (150 cm)',
    breeds: ['Labrador Retriever', 'Golden Retriever', 'Border Collie', 'Boxer', 'Dalmatian'],
  },
  {
    size: 'XL',
    category: 'Extra Large Breeds',
    neckInches: '17.3" – 21.6"',
    neckCm: '44 – 55 cm',
    chestInches: '25.5" – 29.5"',
    chestCm: '65 – 75 cm',
    leashSpec: '3/4" width × 5 ft (150 cm)',
    breeds: ['German Shepherd', 'Rottweiler', 'Bernese Mountain Dog', 'Great Dane', 'Doberman'],
  },
];

const FAQS = [
  {
    q: 'How tight should my pet\'s collar be fitted?',
    a: 'Always follow the two-finger rule: you should be able to slide two fingers comfortably between the collar and your dog\'s neck. It should be snug enough not to slip over the head, but loose enough to prevent fur friction or breathing restriction.',
  },
  {
    q: 'What should I do if my dog is between two sizes?',
    a: 'We always advise sizing up. A larger size allows you to adjust the collar to its tighter setting while leaving room for seasonal coat changes or further adjustment.',
  },
  {
    q: 'How do I measure for a harness vs a collar?',
    a: 'For collars, measure the neck circumference at the base of the neck where the collar sits. For harnesses, take the chest girth at the widest point of the ribcage, directly behind the front legs.',
  },
  {
    q: 'My puppy is still growing. Which size should I choose?',
    a: 'Choose a size where your puppy\'s current neck circumference is close to the minimum range of that size, so the collar can be extended as your dog grows.',
  },
];

export default function SizeGuidePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [breedQuery, setBreedQuery] = useState('');
  // View mode: 'cards' is mobile-first, 'table' is tabular
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  // Mobile layout tab: 'chart' (measurements) vs 'diagram' (visual image)
  const [mobileSectionTab, setMobileSectionTab] = useState<'chart' | 'diagram'>('chart');
  // Quick size filter pill
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  const filteredSizes = SIZE_DATA.filter((row) => {
    if (sizeFilter && row.size !== sizeFilter) return false;
    if (!breedQuery.trim()) return true;
    const q = breedQuery.toLowerCase();
    return (
      row.size.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q) ||
      row.breeds.some((b) => b.toLowerCase().includes(q))
    );
  });

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="bg-white min-h-screen text-neutral-900 pb-20">
        {/* Top Header Section */}
        <section className="border-b border-neutral-200 bg-neutral-50/60 py-8 sm:py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-200/70 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-800">
              <Ruler size={13} strokeWidth={2} />
              Accurate Fit Guaranteed
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase text-neutral-950">
              Pet Sizing &amp; Fit Guide
            </h1>
            <p className="text-xs sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Find the perfect collar and harness fit for your dog. Please measure your pet before purchasing for maximum comfort, safety, and durability.
            </p>

            {/* Unit Switcher */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3">
              <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Unit of measurement:
              </span>
              <div className="inline-flex bg-neutral-200/80 p-1 rounded-full text-xs font-bold w-full sm:w-auto max-w-[280px]">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full transition-all duration-200 text-center ${
                    unit === 'in'
                      ? 'bg-neutral-950 text-white shadow-sm'
                      : 'text-neutral-700 hover:text-neutral-950'
                  }`}
                >
                  Inches (in)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full transition-all duration-200 text-center ${
                    unit === 'cm'
                      ? 'bg-neutral-950 text-white shadow-sm'
                      : 'text-neutral-700 hover:text-neutral-950'
                  }`}
                >
                  Centimetres (cm)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile View Switcher Tabs (Visible only on mobile / small screens) */}
        <div className="lg:hidden sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 py-2.5">
          <div className="flex rounded-lg bg-neutral-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileSectionTab('chart')}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                mobileSectionTab === 'chart'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Sizing Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileSectionTab('diagram')}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                mobileSectionTab === 'diagram'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Eye size={14} />
              <span>Visual Diagram</span>
            </button>
          </div>
        </div>

        {/* Main Content: Size Table & Image Diagram Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Left Column: Sizing Grid & Controls */}
            <div className={`lg:col-span-7 space-y-5 ${
              mobileSectionTab === 'diagram' ? 'hidden lg:block' : 'block'
            }`}>
              {/* Header with Search & Mobile View Toggle */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-neutral-950">
                      Measurement Grid
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Select your dog&apos;s size for tailored collar, chest &amp; leash specs
                    </p>
                  </div>

                  {/* View Mode Toggle: Cards vs Table */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider hidden sm:inline">
                      View:
                    </span>
                    <div className="inline-flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
                          viewMode === 'cards'
                            ? 'bg-neutral-950 text-white shadow-xs'
                            : 'text-neutral-600 hover:text-neutral-950'
                        }`}
                        title="Mobile Card Grid View"
                      >
                        <LayoutGrid size={13} />
                        <span>Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
                          viewMode === 'table'
                            ? 'bg-neutral-950 text-white shadow-xs'
                            : 'text-neutral-600 hover:text-neutral-950'
                        }`}
                        title="Tabular Comparison View"
                      >
                        <TableIcon size={13} />
                        <span>Table</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search Bar & Clear Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={breedQuery}
                      onChange={(e) => setBreedQuery(e.target.value)}
                      placeholder="Search breed (e.g. Dachshund, Cocker Spaniel, Pug)..."
                      className="w-full text-xs pl-8 pr-8 py-2.5 bg-neutral-50 sm:bg-white border border-neutral-200 rounded-lg focus:border-neutral-900 focus:bg-white focus:outline-none placeholder:text-neutral-400 transition-colors"
                    />
                    {breedQuery && (
                      <button
                        type="button"
                        onClick={() => setBreedQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                        aria-label="Clear breed search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Size Pill Bar (Optimised for quick mobile thumb tapping) */}
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSizeFilter(null);
                        setSelectedSize(null);
                      }}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        sizeFilter === null
                          ? 'bg-neutral-950 text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      All Sizes
                    </button>
                    {SIZE_DATA.map((row) => {
                      const isActive = sizeFilter === row.size;
                      return (
                        <button
                          key={row.size}
                          type="button"
                          onClick={() => {
                            const newFilter = isActive ? null : row.size;
                            setSizeFilter(newFilter);
                            setSelectedSize(newFilter);
                          }}
                          className={`shrink-0 px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                            isActive
                              ? 'bg-neutral-950 text-white shadow-xs'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <span>{row.size}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* VIEW 1: Responsive Mobile Card Grid (Mobile-first, zero horizontal scroll) */}
              {viewMode === 'cards' && (
                <div className="space-y-3">
                  {filteredSizes.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200 space-y-2">
                      <p className="text-xs font-medium text-neutral-600">
                        No sizes match &quot;{breedQuery}&quot;.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBreedQuery('');
                          setSizeFilter(null);
                        }}
                        className="text-xs font-bold text-neutral-950 underline hover:text-neutral-700"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {filteredSizes.map((row) => {
                        const isSelected = selectedSize === row.size;
                        return (
                          <div
                            key={row.size}
                            onClick={() => setSelectedSize(isSelected ? null : row.size)}
                            className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative ${
                              isSelected
                                ? 'bg-neutral-50/90 border-neutral-950 ring-2 ring-neutral-950/10 shadow-sm'
                                : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/40 shadow-xs'
                            }`}
                          >
                            {/* Card Top: Size Badge, Category & Selected Indicator */}
                            <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-100">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-block px-2.5 py-1 rounded-md bg-neutral-950 text-white font-extrabold text-sm tracking-wide">
                                    {row.size}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-neutral-500 mt-1">
                                  {row.category}
                                </p>
                              </div>

                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                isSelected 
                                  ? 'bg-neutral-950 text-white' 
                                  : 'border border-neutral-300 text-transparent'
                              }`}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            </div>

                            {/* Card Middle: 2-Column Measurement Grid */}
                            <div className="grid grid-cols-2 gap-2.5 py-3">
                              <div className="p-2.5 rounded-lg bg-neutral-100/70 border border-neutral-200/60">
                                <span className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                                  Neck Girth
                                </span>
                                <span className="text-sm font-extrabold text-neutral-950">
                                  {unit === 'in' ? row.neckInches : row.neckCm}
                                </span>
                                <span className="block text-[9px] text-neutral-500 mt-0.5">
                                  Collar position
                                </span>
                              </div>

                              <div className="p-2.5 rounded-lg bg-neutral-100/70 border border-neutral-200/60">
                                <span className="block text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                                  Chest / Bust
                                </span>
                                <span className="text-sm font-extrabold text-neutral-950">
                                  {unit === 'in' ? row.chestInches : row.chestCm}
                                </span>
                                <span className="block text-[9px] text-neutral-500 mt-0.5">
                                  Widest ribcage
                                </span>
                              </div>
                            </div>

                            {/* Card Bottom: Leash & Breeds */}
                            <div className="space-y-2 pt-1 text-[11px]">
                              <div className="flex items-center justify-between text-neutral-600 bg-neutral-50 px-2.5 py-1.5 rounded-md border border-neutral-200/70">
                                <span className="font-semibold text-neutral-700">Matching Leash:</span>
                                <span className="font-bold text-neutral-950">{row.leashSpec}</span>
                              </div>

                              <div>
                                <span className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                                  Common Breeds:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {row.breeds.map((b) => (
                                    <span
                                      key={b}
                                      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: Mobile-Optimised Table View with Sticky First Column */}
              {viewMode === 'table' && (
                <div className="space-y-2">
                  {/* Mobile swipe hint banner */}
                  <div className="sm:hidden flex items-center justify-between px-3 py-1.5 bg-neutral-100 rounded-md text-[10px] font-semibold text-neutral-600">
                    <span>Swipe sideways to view all measurements</span>
                    <span className="font-bold">&rarr;</span>
                  </div>

                  <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-950 text-white">
                            {/* Sticky Left Column Header on Horizontal Scroll */}
                            <th className="sticky left-0 z-20 bg-neutral-950 text-white py-3 px-3.5 font-bold uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                              Size
                            </th>
                            <th className="py-3 px-3.5 font-bold uppercase tracking-wider whitespace-nowrap">
                              Neck ({unit === 'in' ? 'in' : 'cm'})
                            </th>
                            <th className="py-3 px-3.5 font-bold uppercase tracking-wider whitespace-nowrap">
                              Chest ({unit === 'in' ? 'in' : 'cm'})
                            </th>
                            <th className="py-3 px-3.5 font-bold uppercase tracking-wider whitespace-nowrap">
                              Matching Leash
                            </th>
                            <th className="py-3 px-3.5 font-bold uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                              Ideal Breeds
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                          {filteredSizes.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs">
                                No matching sizes found.
                              </td>
                            </tr>
                          ) : (
                            filteredSizes.map((row) => {
                              const isSelected = selectedSize === row.size;
                              return (
                                <tr
                                  key={row.size}
                                  onClick={() => setSelectedSize(isSelected ? null : row.size)}
                                  className={`cursor-pointer transition-colors duration-150 ${
                                    isSelected
                                      ? 'bg-neutral-100 font-semibold'
                                      : 'hover:bg-neutral-50'
                                  }`}
                                >
                                  {/* Sticky Left Column Cell on Horizontal Scroll */}
                                  <td className={`sticky left-0 z-10 py-3 px-3.5 font-bold text-sm text-neutral-950 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${
                                    isSelected ? 'bg-neutral-100' : 'bg-white'
                                  }`}>
                                    <span className="inline-block px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300">
                                      {row.size}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3.5 font-semibold text-neutral-900 whitespace-nowrap">
                                    {unit === 'in' ? row.neckInches : row.neckCm}
                                  </td>
                                  <td className="py-3 px-3.5 font-semibold text-neutral-900 whitespace-nowrap">
                                    {unit === 'in' ? row.chestInches : row.chestCm}
                                  </td>
                                  <td className="py-3 px-3.5 text-neutral-600 whitespace-nowrap">
                                    {row.leashSpec}
                                  </td>
                                  <td className="py-3 px-3.5 text-neutral-600 text-[11px]">
                                    <span className="line-clamp-2">
                                      {row.breeds.join(', ')}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Two-Finger Comfort Rule Banner */}
              <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-neutral-100/70 border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                <CheckCircle2 size={18} className="text-neutral-900 shrink-0 mt-0.5" />
                <p>
                  <strong>Two-Finger Comfort Rule:</strong> When fitting collars, slide two fingers flat between the measuring tape and your dog&apos;s neck. If your pet falls between two sizes, always select the larger size.
                </p>
              </div>
            </div>

            {/* Right Column: Size Chart Infographic Image */}
            <div className={`lg:col-span-5 space-y-4 ${
              mobileSectionTab === 'chart' ? 'hidden lg:block' : 'block'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-neutral-950">
                    Visual Diagram
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Measuring points &amp; breed reference
                  </p>
                </div>
                <a
                  href="/size-chart.jpg"
                  download="MB-Paws-Size-Chart.jpg"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-md text-xs text-neutral-900 font-semibold transition-colors"
                >
                  <Download size={13} />
                  <span>Save Image</span>
                </a>
              </div>

              {/* Graphic Card */}
              <div className="relative group border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div 
                  className="cursor-pointer relative aspect-square"
                  onClick={() => setLightboxOpen(true)}
                  title="Click to view full screen"
                >
                  <Image
                    src="/size-chart.jpg"
                    alt="MB-Paws Size Chart with Logo and Measuring Diagram"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-contain p-2 group-hover:scale-[1.02] transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-950/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                      <Maximize2 size={13} />
                      Tap to enlarge
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1">
                <span>Official MB-Paws Sizing Graphic</span>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="font-semibold text-neutral-900 underline flex items-center gap-1"
                >
                  <Maximize2 size={11} />
                  Full-screen view
                </button>
              </div>

              {/* Quick tip on mobile */}
              <div className="lg:hidden pt-3">
                <button
                  type="button"
                  onClick={() => setMobileSectionTab('chart')}
                  className="w-full py-2.5 bg-neutral-950 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <LayoutGrid size={14} />
                  Return to Measurement Grid
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Measuring Tutorial Section */}
        <section className="border-t border-b border-neutral-200 bg-neutral-50/70 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-2 mb-8 sm:mb-14">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                Simple Measurement Guide
              </h2>
              <p className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-neutral-950">
                How to Measure Your Pet in 3 Steps
              </p>
              <p className="text-xs sm:text-sm text-neutral-600">
                Follow these simple steps with a soft measuring tape for a precise, comfortable fit.
              </p>
            </div>

            {/* Steps Grid: 1-col on mobile, 3-col on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Step 1 */}
              <div className="p-5 sm:p-6 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    01
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-950 uppercase tracking-wide">
                    Neck Circumference
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Wrap the soft measuring tape around the base of your pet&apos;s neck where the collar naturally rests. Keep the tape flat against the coat without pulling too tight.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-5 sm:p-6 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    02
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-950 uppercase tracking-wide">
                    The Two-Finger Rule
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Slide two fingers flat between the measuring tape and your dog&apos;s neck. This ensures the collar allows full freedom of movement without sliding off when exploring.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-5 sm:p-6 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    03
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-950 uppercase tracking-wide">
                    Chest / Ribcage Girth
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  For harnesses and jackets, measure around the broadest point of your dog&apos;s chest, typically 2 to 3 inches behind the front legs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Accordion */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center space-y-2 mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
              <HelpCircle size={14} />
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-neutral-950">
              Sizing &amp; Fit Questions
            </h2>
          </div>

          <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-3.5 sm:py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-bold text-sm sm:text-base text-neutral-950 hover:text-neutral-700 transition-colors gap-3"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} className="shrink-0" /> : <ChevronDown size={18} className="shrink-0" />}
                  </button>
                  {isOpen && (
                    <p className="pt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA Banner */}
          <div className="mt-12 sm:mt-14 p-6 sm:p-8 rounded-xl bg-neutral-950 text-white text-center space-y-4">
            <h3 className="text-lg sm:text-2xl font-bold uppercase tracking-wider">
              Ready to Upgrade Your Adventure Gear?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-lg mx-auto">
              Engineered with ripstop nylon webbing, quick-release alloy hardware, and full weather resistance.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white text-neutral-950 font-bold uppercase text-xs tracking-widest rounded hover:bg-neutral-100 transition-colors"
              >
                Shop All Products
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* Full Screen Image Lightbox Modal */}
        {lightboxOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setLightboxOpen(false)}
          >
            <div 
              className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-12 right-0 text-white hover:text-neutral-300 p-2"
                aria-label="Close image preview"
              >
                <X size={26} />
              </button>
              <div className="relative w-full aspect-square bg-white rounded-xl overflow-hidden shadow-2xl p-2 sm:p-4">
                <Image
                  src="/size-chart.jpg"
                  alt="MB-Paws Size Chart Full View"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicPageLayout>
  );
}
