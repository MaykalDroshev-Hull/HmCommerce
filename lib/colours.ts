/**
 * Comprehensive Colour Palette and Normalization Helper for Pet Apparel & Accessories
 */

export const COLOUR_PALETTE: Record<string, string> = {
  // Monochromes
  black: '#18181B',
  'midnight black': '#09090B',
  'jet black': '#0A0A0A',
  white: '#FFFFFF',
  'snow white': '#FAFAFA',
  'off white': '#F8FAFC',
  'pure white': '#FFFFFF',
  grey: '#64748B',
  gray: '#64748B',
  'light grey': '#CBD5E1',
  'light gray': '#CBD5E1',
  'dark grey': '#334155',
  'dark gray': '#334155',
  charcoal: '#334155',
  anthracite: '#27272A',
  silver: '#94A3B8',
  'heathered graphite grey': '#4A4D50',
  'graphite grey': '#4A4D50',
  melange: '#64748B',
  slate: '#475569',

  // Pinks & Roses
  pink: '#F472B6',
  'baby pink': '#FBCFE8',
  'light pink': '#FBCFE8',
  'pastel pink': '#FBCFE8',
  'soft pink': '#F9A8D4',
  'hot pink': '#EC4899',
  'rose pink': '#F43F5E',
  rose: '#FB7185',
  blush: '#FCE7F3',
  coral: '#FB7185',
  magenta: '#D946EF',
  fuchsia: '#D946EF',

  // Blues
  blue: '#2563EB',
  'light blue': '#38BDF8',
  'sky blue': '#7DD3FC',
  'baby blue': '#BAE6FD',
  'navy blue': '#1E3A8A',
  navy: '#1E293B',
  'royal blue': '#1D4ED8',
  cobalt: '#1D4ED8',
  indigo: '#4F46E5',
  denim: '#3B82F6',
  cyan: '#06B6D4',
  teal: '#0D9488',
  turquoise: '#14B8A6',
  aqua: '#22D3EE',

  // Yellows & Golds
  yellow: '#EAB308',
  'light yellow': '#FEF08A',
  'bright yellow': '#FACC15',
  'lemon yellow': '#FDE047',
  mustard: '#D97706',
  gold: '#EAB308',
  amber: '#D97706',
  bronze: '#B45309',

  // Reds & Crimsons
  red: '#EF4444',
  'dark red': '#991B1B',
  crimson: '#DC2626',
  scarlet: '#DC2626',
  burgundy: '#881337',
  maroon: '#881337',
  wine: '#881337',
  ruby: '#E11D48',
  cherry: '#DC2626',

  // Greens
  green: '#16A34A',
  'light green': '#86EFAC',
  'dark green': '#14532D',
  'forest green': '#166534',
  olive: '#4D5B44',
  'army green': '#3F6212',
  sage: '#84A98C',
  mint: '#6EE7B7',
  emerald: '#059669',
  lime: '#84CC16',
  khaki: '#C2B29A',
  'sand khaki': '#C2B29A',

  // Purples & Violets
  purple: '#9333EA',
  violet: '#7C3AED',
  lavender: '#C084FC',
  lilac: '#D8B4FE',
  plum: '#701A75',
  mauve: '#A21CAF',

  // Oranges & Browns
  orange: '#F97316',
  'dark orange': '#C2410C',
  peach: '#FDBA74',
  apricot: '#FB923C',
  brown: '#78350F',
  'dark brown': '#451A03',
  chocolate: '#5B2806',
  coffee: '#4A2C11',
  caramel: '#B45309',
  tan: '#D4B996',
  beige: '#E5D5C5',
  sand: '#C2B29A',
  camel: '#C19A6B',
  cream: '#FEF3C7',
  ivory: '#FFFBEB',
  nude: '#E2C2B3',
};

/**
 * Returns a high-fidelity hex colour code for any given colour name.
 * Handles British & US spelling, multi-word attributes, substrings, and graceful fallback.
 */
export function getColourHex(colourName?: string): string {
  if (!colourName || typeof colourName !== 'string') return '#4A4D50';

  const clean = colourName.toLowerCase().trim();

  // 1. Direct dictionary match
  if (COLOUR_PALETTE[clean]) {
    return COLOUR_PALETTE[clean];
  }

  // 2. Normalized alphanumeric match (removes slashes, hyphens, parentheses)
  const noPunct = clean.replace(/[^a-z0-9\s]/g, '').trim();
  if (COLOUR_PALETTE[noPunct]) {
    return COLOUR_PALETTE[noPunct];
  }

  // 3. Multi-word phrase matches (e.g. "light blue", "sand khaki", "sky blue")
  const multiWordKeys = Object.keys(COLOUR_PALETTE).filter((k) => k.includes(' '));
  for (const mw of multiWordKeys) {
    if (clean.includes(mw)) {
      return COLOUR_PALETTE[mw];
    }
  }

  // 4. Word-by-word token matches
  const tokens = clean.split(/[\s\-_/|,]+/);
  for (const token of tokens) {
    if (COLOUR_PALETTE[token]) {
      return COLOUR_PALETTE[token];
    }
  }

  // 5. Broad substring match for core colours
  const coreColours = [
    'pink',
    'yellow',
    'blue',
    'red',
    'black',
    'white',
    'grey',
    'gray',
    'green',
    'purple',
    'orange',
    'brown',
    'gold',
    'silver',
    'beige',
    'cream',
    'olive',
    'navy',
    'teal'
  ];
  for (const col of coreColours) {
    if (clean.includes(col)) {
      return COLOUR_PALETTE[col];
    }
  }

  // 6. Deterministic soft hue hash for any obscure custom name
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
