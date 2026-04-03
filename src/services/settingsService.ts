import { supabase } from "@/integrations/supabase/client";

export interface WhiteLabelSettings {
  platformName: string;
  subdomain: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
}

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  footerText: string;
  footerEmail: string;
  footerPhone: string;
}

const defaultWhiteLabel: WhiteLabelSettings = {
  platformName: "Poupe Agora",
  subdomain: "app",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#00E676",
};

const defaultSiteSettings: SiteSettings = {
  heroTitle: "Controle Absoluto do seu Dinheiro",
  heroSubtitle: "A plataforma mais completa para gerenciar suas finanças.",
  heroCtaText: "Começar Agora",
  footerText: "Todos os direitos reservados.",
  footerEmail: "contato@poupeagora.com",
  footerPhone: "(11) 99999-9999",
};

export const settingsService = {
  async getWhiteLabelSettings(): Promise<WhiteLabelSettings> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'white_label_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.value) {
        return { ...defaultWhiteLabel, ...(data.value as any) };
      }

      return defaultWhiteLabel;
    } catch (error) {
      console.error("Error getting white label settings:", error);
      return defaultWhiteLabel;
    }
  },

  async saveWhiteLabelSettings(settings: Partial<WhiteLabelSettings>): Promise<void> {
    try {
      const current = await this.getWhiteLabelSettings();
      const updated = { ...current, ...settings };

      const { error } = await supabase.from('global_settings').upsert({
        key: 'white_label_settings',
        value: updated as any,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving white label settings:", error);
      throw error;
    }
  },

  async getSiteSettings(): Promise<SiteSettings> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'site_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.value) {
        return { ...defaultSiteSettings, ...(data.value as any) };
      }

      return defaultSiteSettings;
    } catch (error) {
      console.error("Error getting site settings:", error);
      return defaultSiteSettings;
    }
  },

  async saveSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
    try {
      const current = await this.getSiteSettings();
      const updated = { ...current, ...settings };

      const { error } = await supabase.from('global_settings').upsert({
        key: 'site_settings',
        value: updated as any,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving site settings:", error);
      throw error;
    }
  },

  async uploadFile(file: File, pathFolder: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${pathFolder}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
    return data.publicUrl;
  }
};
