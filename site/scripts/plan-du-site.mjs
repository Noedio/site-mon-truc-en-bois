// Après le build : écrit dist/sitemap.xml avec les pages publiques construites, et ajoute
// sa ligne « Sitemap: » à dist/robots.txt. Le panier, le suivi, les favoris, la démo et le socle n'y sont pas.
import fs from "node:fs";
import path from "node:path";

const SITE = (process.env.PUBLIC_SITE_URL || "https://mon-truc-en-bois.pages.dev").replace(/\/$/, "");
const dist = path.resolve(process.cwd(), "dist");
const EXCLUES = /^\/(panier|suivi|favoris|demo|demo-paiement|socle|newsletter)\//;
const HORS_SITE = new Set(["_astro", "img", "js", "css", "data"]);

const pages = [];
function parcourir(dossier) {
  for (const nom of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (fs.statSync(chemin).isDirectory()) {
      if (!(dossier === dist && HORS_SITE.has(nom))) parcourir(chemin);
    } else if (nom === "index.html") {
      const relatif = path.relative(dist, dossier).split(path.sep).join("/");
      const adresse = relatif ? `/${relatif}/` : "/";
      if (!EXCLUES.test(adresse)) pages.push(adresse);
    }
  }
}
parcourir(dist);
pages.sort();

fs.writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${SITE}${p}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
const robots = path.join(dist, "robots.txt");
fs.writeFileSync(robots, `${fs.readFileSync(robots, "utf8").trimEnd()}\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`dist/sitemap.xml : ${pages.length} pages`);
