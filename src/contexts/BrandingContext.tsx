import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { settingsService, WhiteLabelSettings } from '@/services/settingsService';

interface BrandingContextType {
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  loading: boolean;
  reload: () => Promise<void>;
}

const defaults: BrandingContextType = {
  platformName: 'Poupe Agora',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#00E676',
  loading: true,
  reload: async () => {},
};

const BrandingContext = createContext<BrandingContextType>(defaults);

/** Convert hex color to HSL string for CSS variable injection */
function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyPrimaryColor(hex: string) {
  try {
    const hsl = hexToHSL(hex);
    document.documentElement.style.setProperty('--primary', hsl);
  } catch {
    // Ignore invalid colors
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<BrandingContextType, 'reload'>>({
    platformName: defaults.platformName,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: defaults.primaryColor,
    loading: true,
  });

  async function loadBranding() {
    try {
      const settings = await settingsService.getWhiteLabelSettings();
      const color = settings.primaryColor || defaults.primaryColor;
      applyPrimaryColor(color);
      setState({
        platformName: settings.platformName || defaults.platformName,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        primaryColor: color,
        loading: false,
      });
    } catch (err) {
      console.error('[BrandingProvider] Error loading settings:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  useEffect(() => {
    loadBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ ...state, reload: loadBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBrandingContext(): BrandingContextType {
  return useContext(BrandingContext);
}
