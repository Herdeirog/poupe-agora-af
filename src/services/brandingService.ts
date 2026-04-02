const STORAGE_KEY = 'app_branding';

interface BrandingData {
  logoUrl: string | null;
  faviconUrl: string | null;
}

function getStoredBranding(): BrandingData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { logoUrl: null, faviconUrl: null };
  } catch {
    return { logoUrl: null, faviconUrl: null };
  }
}

function saveBranding(data: BrandingData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const brandingService = {
  async getLogoUrl(): Promise<string | null> {
    return getStoredBranding().logoUrl;
  },

  async getFaviconUrl(): Promise<string | null> {
    return getStoredBranding().faviconUrl;
  },

  async uploadLogo(file: File): Promise<string> {
    // Create a data URL from the file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const branding = getStoredBranding();
        branding.logoUrl = dataUrl;
        saveBranding(branding);
        resolve(dataUrl);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  async uploadFavicon(file: File): Promise<string> {
    // Create a data URL from the file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const branding = getStoredBranding();
        branding.faviconUrl = dataUrl;
        saveBranding(branding);
        resolve(dataUrl);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },
};
