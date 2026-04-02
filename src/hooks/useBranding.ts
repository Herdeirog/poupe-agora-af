import { useState, useEffect } from "react";
import { brandingService } from "@/services/brandingService";

interface BrandingState {
  logoUrl: string | null;
  faviconUrl: string | null;
  loading: boolean;
}

export function useBranding() {
  const [state, setState] = useState<BrandingState>({
    logoUrl: null,
    faviconUrl: null,
    loading: true,
  });

  useEffect(() => {
    async function loadBranding() {
      try {
        const [logoUrl, faviconUrl] = await Promise.all([
          brandingService.getLogoUrl(),
          brandingService.getFaviconUrl(),
        ]);

        setState({
          logoUrl,
          faviconUrl,
          loading: false,
        });
      } catch (error) {
        console.error("Error loading branding:", error);
        setState((prev) => ({ ...prev, loading: false }));
      }
    }

    loadBranding();
  }, []);

  return state;
}
