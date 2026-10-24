// Configuration du nouveau site Mon Truc en Bois (refonte, lot 1).
// Le site est 100 % statique : seuls le configurateur et le panier chargent du JavaScript.
import { defineConfig } from "astro/config";

// Adresse publique du site : l'aperçu Cloudflare Pages tant que le domaine n'est pas basculé.
const SITE = process.env.PUBLIC_SITE_URL || "https://mon-truc-en-bois.pages.dev";

export default defineConfig({
  site: SITE,
  trailingSlash: "ignore",
  build: { format: "directory", inlineStylesheets: "auto" },
  compressHTML: true,
  // Les photos sont dans img/ à la racine du dépôt (là où l'admin les publie).
  vite: { server: { fs: { allow: [".."] } } },
});
