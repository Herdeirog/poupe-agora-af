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

// Usamos "as any" para contornar os tipos gerados que não incluem
// a tabela global_settings ainda. Os dados são validados manualmente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const settingsService = {
  async getWhiteLabelSettings(): Promise<WhiteLabelSettings> {
    try {
      const { data, error } = await db
        .from("global_settings")
        .select("value")
        .eq("key", "white_label_settings")
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar white_label_settings:", error);
        return defaultWhiteLabel;
      }

      if (data && data.value) {
        return { ...defaultWhiteLabel, ...(data.value as WhiteLabelSettings) };
      }

      return defaultWhiteLabel;
    } catch (error) {
      console.error("Erro inesperado ao buscar white_label_settings:", error);
      return defaultWhiteLabel;
    }
  },

  async saveWhiteLabelSettings(settings: Partial<WhiteLabelSettings>): Promise<void> {
    try {
      // Buscar atual para merge
      const current = await this.getWhiteLabelSettings();
      const updated = { ...current, ...settings };

      const { error } = await db
        .from("global_settings")
        .upsert(
          { key: "white_label_settings", value: updated },
          { onConflict: "key" }
        );

      if (error) {
        console.error("Erro ao salvar white_label_settings:", error);
        throw new Error(error.message || "Erro ao salvar.");
      }
    } catch (error) {
      console.error("Erro inesperado ao salvar white_label_settings:", error);
      throw error;
    }
  },

  async getSiteSettings(): Promise<SiteSettings> {
    try {
      const { data, error } = await db
        .from("global_settings")
        .select("value")
        .eq("key", "site_settings")
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar site_settings:", error);
        return defaultSiteSettings;
      }

      if (data && data.value) {
        return { ...defaultSiteSettings, ...(data.value as SiteSettings) };
      }

      return defaultSiteSettings;
    } catch (error) {
      console.error("Erro inesperado ao buscar site_settings:", error);
      return defaultSiteSettings;
    }
  },

  async saveSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
    try {
      const current = await this.getSiteSettings();
      const updated = { ...current, ...settings };

      const { error } = await db
        .from("global_settings")
        .upsert(
          { key: "site_settings", value: updated },
          { onConflict: "key" }
        );

      if (error) {
        console.error("Erro ao salvar site_settings:", error);
        throw new Error(error.message || "Erro ao salvar.");
      }
    } catch (error) {
      console.error("Erro inesperado ao salvar site_settings:", error);
      throw error;
    }
  },

  async uploadFile(file: File, pathFolder: string): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${pathFolder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from("branding").getPublicUrl(filePath);
    return data.publicUrl;
  },
};
