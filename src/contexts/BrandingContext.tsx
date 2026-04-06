import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { settingsService } from '@/services/settingsService';

interface BrandingContextType {
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  sidebarColor: string;
  cardColor: string;
  loading: boolean;
  reload: () => Promise<void>;
}

const defaults: BrandingContextType = {
  platformName: 'Poupe Agora',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#00E676',
  backgroundColor: '#0f1117',
  sidebarColor: '#080c12',
  cardColor: '#141920',
  loading: true,
  reload: async () => {},
};

const BrandingContext = createContext<BrandingContextType>(defaults);

// ─── Color utilities ────────────────────────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
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

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Returns "H S% L%" clamped to valid range */
function hsl(h: number, s: number, l: number): string {
  return `${h} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}%`;
}

/** Offset lightness by delta, clamped 0-100 */
function lighter(base: { h: number; s: number; l: number }, delta: number): string {
  return hsl(base.h, base.s, base.l + delta);
}

// ─── Main injection function ────────────────────────────────────────────────

function applyColorScheme(
  primaryHex: string,
  backgroundHex: string,
  sidebarHex: string,
  cardHex: string,
) {
  const set = (variable: string, value: string) =>
    document.documentElement.style.setProperty(variable, value);

  const pr = hexToHSL(primaryHex);
  const bg = hexToHSL(backgroundHex);
  const sb = hexToHSL(sidebarHex);
  const cd = hexToHSL(cardHex);

  const isDark = bg.l < 45;

  // Text colors: white on dark, near-black on light
  const fg        = isDark ? hsl(210, 20, 95)  : hsl(220, 16, 12);
  const fgMuted   = isDark ? hsl(215, 16, 60)  : hsl(220, 12, 42);
  const fgStrong  = isDark ? hsl(210, 20, 98)  : hsl(220, 16, 8);

  // Primary
  set('--primary',              hsl(pr.h, pr.s, pr.l));
  set('--primary-foreground',   isDark ? hsl(bg.h, bg.s, bg.l) : '0 0% 100%');
  set('--ring',                 hsl(pr.h, pr.s, pr.l));

  // Background & derivatives
  set('--background',           hsl(bg.h, bg.s, bg.l));
  set('--foreground',           fg);
  set('--muted',                lighter(bg, isDark ? 8  : -4));
  set('--muted-foreground',     fgMuted);
  set('--secondary',            lighter(bg, isDark ? 6  : -3));
  set('--secondary-foreground', fg);
  set('--accent',               lighter(bg, isDark ? 6  : -3));
  set('--accent-foreground',    fg);
  set('--border',               lighter(bg, isDark ? 16 : -14));
  set('--input',                lighter(bg, isDark ? 13 : -10));
  set('--input-background',     lighter(bg, isDark ? 5  : 2));

  // Sidebar
  set('--sidebar-background',         hsl(sb.h, sb.s, sb.l));
  set('--sidebar-foreground',         fg);
  set('--sidebar-primary',            hsl(pr.h, pr.s, pr.l));
  set('--sidebar-primary-foreground', isDark ? hsl(bg.h, bg.s, bg.l + 5) : '0 0% 100%');
  set('--sidebar-accent',             lighter(sb, isDark ? 6  : -3));
  set('--sidebar-accent-foreground',  fg);
  set('--sidebar-border',             lighter(sb, isDark ? 10 : -8));
  set('--sidebar-ring',               hsl(pr.h, pr.s, pr.l));
  set('--sidebar-gradient-from',      lighter(sb, isDark ? 2  : -1));
  set('--sidebar-gradient-to',        hsl(sb.h, sb.s, sb.l));

  // Cards / Popover
  set('--card',                 hsl(cd.h, cd.s, cd.l));
  set('--card-foreground',      fgStrong);
  set('--popover',              hsl(cd.h, cd.s, cd.l));
  set('--popover-foreground',   fgStrong);

  // Destructive (not theme-dependent, but keep consistent)
  set('--destructive',          isDark ? '0 72% 51%' : '0 84% 60%');
  set('--destructive-foreground', isDark ? hsl(210, 20, 98) : '0 0% 100%');

  // Glass morphism
  if (isDark) {
    set('--glass-bg',           '0 0% 100% / 0.06');
    set('--glass-bg-strong',    '0 0% 100% / 0.10');
    set('--glass-bg-card',      '0 0% 100% / 0.04');
    set('--glass-border',       '0 0% 100% / 0.12');
    set('--glass-border-strong','0 0% 100% / 0.18');
    set('--glass-shadow',       '0 0% 0% / 0.35');
  } else {
    set('--glass-bg',           '0 0% 100% / 0.70');
    set('--glass-bg-strong',    '0 0% 100% / 0.85');
    set('--glass-bg-card',      '0 0% 100% / 0.60');
    set('--glass-border',       `${bg.h} ${bg.s}% ${bg.l}% / 0.08`);
    set('--glass-border-strong',`${bg.h} ${bg.s}% ${bg.l}% / 0.12`);
    set('--glass-shadow',       `${bg.h} ${bg.s}% ${bg.l}% / 0.10`);
  }

  // Table helpers
  set('--table-row-hover',  isDark ? '0 0% 100% / 0.04' : lighter(bg, -3));
  set('--table-row-stripe', isDark ? '0 0% 100% / 0.02' : lighter(bg, -1));
  set('--table-border',     isDark ? '0 0% 100% / 0.06' : lighter(bg, -12));

  // Badge colors follow primary for income/success, keep rest
  set('--badge-income-bg',   `${pr.h} ${pr.s}% ${pr.l}% / ${isDark ? '0.15' : '0.12'}`);
  set('--badge-income-text', hsl(pr.h, pr.s, isDark ? pr.l + 20 : pr.l - 10));
  set('--badge-income-border',`${pr.h} ${pr.s}% ${pr.l}% / ${isDark ? '0.30' : '0.25'}`);
  set('--badge-success-bg',   `${pr.h} ${pr.s}% ${pr.l}% / ${isDark ? '0.15' : '0.12'}`);
  set('--badge-success-text', hsl(pr.h, pr.s, isDark ? pr.l + 20 : pr.l - 10));
  set('--badge-success-border',`${pr.h} ${pr.s}% ${pr.l}% / ${isDark ? '0.30' : '0.25'}`);
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<BrandingContextType, 'reload'>>({
    platformName:    defaults.platformName,
    logoUrl:         null,
    faviconUrl:      null,
    primaryColor:    defaults.primaryColor,
    backgroundColor: defaults.backgroundColor,
    sidebarColor:    defaults.sidebarColor,
    cardColor:       defaults.cardColor,
    loading:         true,
  });

  async function loadBranding() {
    try {
      const settings = await settingsService.getWhiteLabelSettings();

      const primary    = settings.primaryColor    || defaults.primaryColor;
      const background = settings.backgroundColor || defaults.backgroundColor;
      const sidebar    = settings.sidebarColor    || defaults.sidebarColor;
      const card       = settings.cardColor       || defaults.cardColor;
      const name       = settings.platformName    || defaults.platformName;

      applyColorScheme(primary, background, sidebar, card);
      document.title = name;

      setState({
        platformName:    name,
        logoUrl:         settings.logoUrl ?? null,
        faviconUrl:      settings.faviconUrl ?? null,
        primaryColor:    primary,
        backgroundColor: background,
        sidebarColor:    sidebar,
        cardColor:       card,
        loading:         false,
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
