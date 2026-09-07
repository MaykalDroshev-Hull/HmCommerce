export interface Theme {
  id: string;
  name: string;
  nameBg: string;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    headerBg: string;
    footerBg: string;
    cardBg: string;
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonSecondary: string;
  };
  effects: {
    shadow: string;
    shadowHover: string;
    borderRadius: string;
    gradient?: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'minimalist',
    name: 'ModaBox',
    nameBg: 'ModaBox',
    colors: {
      background: '#ffffff',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#6b6b6b',
      primary: '#7d8461',
      secondary: '#f9f7f2',
      accent: '#7d8461',
      border: '#e8e4dc',
      headerBg: '#ffffff',
      footerBg: '#f9f7f2',
      cardBg: '#ffffff',
      buttonPrimary: '#1a1a1a',
      buttonPrimaryHover: '#333333',
      buttonSecondary: '#f9f7f2',
    },
    effects: {
      shadow: '0 1px 3px rgba(0,0,0,0.06)',
      shadowHover: '0 4px 12px rgba(0,0,0,0.08)',
      borderRadius: '1rem',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    nameBg: 'Dark Mode',
    colors: {
      background: '#1a1a1a',
      surface: '#2a2a2a',
      text: '#f5f5f5',
      textSecondary: '#b0b0b0',
      primary: '#00d9ff',
      secondary: '#333333',
      accent: '#00d9ff',
      border: '#404040',
      headerBg: '#1a1a1a',
      footerBg: '#1a1a1a',
      cardBg: '#2a2a2a',
      buttonPrimary: '#00d9ff',
      buttonPrimaryHover: '#00b8d9',
      buttonSecondary: '#333333',
    },
    effects: {
      shadow: '0 4px 6px rgba(0,0,0,0.3)',
      shadowHover: '0 8px 12px rgba(0,217,255,0.2)',
      borderRadius: '0.5rem',
    },
  },
  {
    id: 'vibrant',
    name: 'Bold & Vibrant',
    nameBg: 'Bold & Vibrant',
    colors: {
      background: '#ffffff',
      surface: '#ffffff',
      text: '#000000',
      textSecondary: '#333333',
      primary: '#0066ff',
      secondary: '#ff0066',
      accent: '#0066ff',
      border: '#e0e0e0',
      headerBg: '#ffffff',
      footerBg: '#ffffff',
      cardBg: '#ffffff',
      buttonPrimary: '#0066ff',
      buttonPrimaryHover: '#0052cc',
      buttonSecondary: '#ff0066',
    },
    effects: {
      shadow: '0 4px 12px rgba(0,102,255,0.2)',
      shadowHover: '0 8px 20px rgba(0,102,255,0.3)',
      borderRadius: '1rem',
    },
  },
  {
    id: 'luxury',
    name: 'Elegant Luxury',
    nameBg: 'Elegant Luxury',
    colors: {
      background: '#faf8f3',
      surface: '#ffffff',
      text: '#3d2817',
      textSecondary: '#6b5d4f',
      primary: '#d4af37',
      secondary: '#f5e6d3',
      accent: '#d4af37',
      border: '#e8ddd0',
      headerBg: '#ffffff',
      footerBg: '#faf8f3',
      cardBg: '#ffffff',
      buttonPrimary: '#d4af37',
      buttonPrimaryHover: '#b8941f',
      buttonSecondary: '#f5e6d3',
    },
    effects: {
      shadow: '0 4px 16px rgba(212,175,55,0.15)',
      shadowHover: '0 8px 24px rgba(212,175,55,0.25)',
      borderRadius: '0.75rem',
    },
  },
  {
    id: 'gradient',
    name: 'Modern Gradient',
    nameBg: 'Modern Gradient',
    colors: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#667eea',
      border: '#e0e0e0',
      headerBg: '#ffffff',
      footerBg: '#ffffff',
      cardBg: '#ffffff',
      buttonPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      buttonPrimaryHover: 'linear-gradient(135deg, #5568d3 0%, #653a8f 100%)',
      buttonSecondary: '#f0f0f0',
    },
    effects: {
      shadow: '0 4px 16px rgba(102,126,234,0.2)',
      shadowHover: '0 8px 24px rgba(102,126,234,0.3)',
      borderRadius: '1rem',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
  },
  {
    id: 'retro',
    name: 'Retro Vintage',
    nameBg: 'Retro Vintage',
    colors: {
      background: '#f5e6d3',
      surface: '#ffffff',
      text: '#3d2817',
      textSecondary: '#6b5d4f',
      primary: '#d97706',
      secondary: '#fbbf24',
      accent: '#d97706',
      border: '#e8d5c4',
      headerBg: '#ffffff',
      footerBg: '#f5e6d3',
      cardBg: '#ffffff',
      buttonPrimary: '#d97706',
      buttonPrimaryHover: '#b45309',
      buttonSecondary: '#fbbf24',
    },
    effects: {
      shadow: '0 4px 12px rgba(217,119,6,0.2)',
      shadowHover: '0 6px 16px rgba(217,119,6,0.3)',
      borderRadius: '1.5rem',
    },
  },
  {
    id: 'nature',
    name: 'Nature Organic',
    nameBg: 'Natural Organic',
    colors: {
      background: '#f0f7f0',
      surface: '#ffffff',
      text: '#1a3d1a',
      textSecondary: '#4a6b4a',
      primary: '#2d5016',
      secondary: '#4a7c59',
      accent: '#2d5016',
      border: '#d4e4d4',
      headerBg: '#ffffff',
      footerBg: '#f0f7f0',
      cardBg: '#ffffff',
      buttonPrimary: '#2d5016',
      buttonPrimaryHover: '#1f3610',
      buttonSecondary: '#4a7c59',
    },
    effects: {
      shadow: '0 4px 12px rgba(45,80,22,0.15)',
      shadowHover: '0 6px 16px rgba(45,80,22,0.25)',
      borderRadius: '0.75rem',
    },
  },
  {
    id: 'neon',
    name: 'Tech Neon',
    nameBg: 'Cyber Neon',
    colors: {
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      primary: '#00ff41',
      secondary: '#ff0080',
      accent: '#00ff41',
      border: '#333333',
      headerBg: '#0a0a0a',
      footerBg: '#0a0a0a',
      cardBg: '#1a1a1a',
      buttonPrimary: '#00ff41',
      buttonPrimaryHover: '#00cc33',
      buttonSecondary: '#ff0080',
    },
    effects: {
      shadow: '0 0 20px rgba(0,255,65,0.3)',
      shadowHover: '0 0 30px rgba(0,255,65,0.5)',
      borderRadius: '0.5rem',
    },
  },
  {
    id: 'pastel',
    name: 'Soft Pastel',
    nameBg: 'Soft Pastel',
    colors: {
      background: '#fff5f8',
      surface: '#ffffff',
      text: '#4a4a4a',
      textSecondary: '#888888',
      primary: '#ffb3d9',
      secondary: '#b3d9ff',
      accent: '#ffb3d9',
      border: '#ffe6f0',
      headerBg: '#ffffff',
      footerBg: '#fff5f8',
      cardBg: '#ffffff',
      buttonPrimary: '#ffb3d9',
      buttonPrimaryHover: '#ff99cc',
      buttonSecondary: '#b3d9ff',
    },
    effects: {
      shadow: '0 2px 8px rgba(255,179,217,0.2)',
      shadowHover: '0 4px 12px rgba(255,179,217,0.3)',
      borderRadius: '1.5rem',
    },
  },
  {
    id: 'corporate',
    name: 'Professional Corporate',
    nameBg: 'Corporate Pro',
    colors: {
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      primary: '#003366',
      secondary: '#0066cc',
      accent: '#003366',
      border: '#e0e0e0',
      headerBg: '#ffffff',
      footerBg: '#f8f9fa',
      cardBg: '#ffffff',
      buttonPrimary: '#003366',
      buttonPrimaryHover: '#002244',
      buttonSecondary: '#0066cc',
    },
    effects: {
      shadow: '0 2px 8px rgba(0,51,102,0.1)',
      shadowHover: '0 4px 12px rgba(0,51,102,0.15)',
      borderRadius: '0.5rem',
    },
  },
];

export const defaultTheme = themes[0];

