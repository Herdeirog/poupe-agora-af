import fs from 'fs';

const filePath = 'src/pages/admin/AdminSettings.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace import
content = content.replace(
  'import { brandingService } from "@/services/brandingService";',
  'import { settingsService } from "@/services/settingsService";'
);

// Update loadBranding and general settings load
const generalSettingsLoad = `
  const loadBranding = async () => {
    try {
      const whiteLabel = await settingsService.getWhiteLabelSettings();
      setGeneralSettings({
        platformName: whiteLabel.platformName || "Poupe Agora",
        subdomain: whiteLabel.subdomain || "app",
        logo: whiteLabel.logoUrl || "",
        primaryColor: whiteLabel.primaryColor || "#00E676",
      });
      if (whiteLabel.logoUrl) setLogoPreview(whiteLabel.logoUrl);
      if (whiteLabel.faviconUrl) setFaviconPreview(whiteLabel.faviconUrl);
    } catch (error) {
      console.error("Error loading branding:", error);
    }
  };
`;
// We will replace the existing loadBranding function
content = content.replace(/  const loadBranding = async \(\) => {[\s\S]*?  \};\n/m, generalSettingsLoad);


// Replace handleSaveGeneral
const newHandleSaveGeneral = `
  const handleSaveGeneral = async () => {
    try {
      await settingsService.saveWhiteLabelSettings({
        platformName: generalSettings.platformName,
        subdomain: generalSettings.subdomain,
        logoUrl: generalSettings.logo,
        primaryColor: generalSettings.primaryColor,
      });
      toast.success("Configurações gerais salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações gerais.");
    }
  };
`;
content = content.replace(/  const handleSaveGeneral = \(\) => {\s*toast\.success\("Configurações gerais salvas com sucesso!"\);\s*};\n/m, newHandleSaveGeneral);

// Replace handleSaveLogo
content = content.replace(
  'const url = await brandingService.uploadLogo(logoFile);',
  'const url = await settingsService.uploadFile(logoFile, "logos");\n      await settingsService.saveWhiteLabelSettings({ logoUrl: url });\n      setGeneralSettings(prev => ({ ...prev, logo: url }));'
);

// Replace handleSaveFavicon
content = content.replace(
  'const url = await brandingService.uploadFavicon(faviconFile);',
  'const url = await settingsService.uploadFile(faviconFile, "favicons");\n      await settingsService.saveWhiteLabelSettings({ faviconUrl: url });'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('AdminSettings.tsx updated successfully.');
