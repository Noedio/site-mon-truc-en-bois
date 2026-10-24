// Après le build : écrit dist/_redirects (Cloudflare Pages) pour que les adresses
// de l'ancien site mènent aux nouvelles pages (301), y compris les 27 fiches p/<id>.html.
// Les liens produit.html?id=<id> sont gérés par public/produit.html (Cloudflare ne lit pas ?id=).
import fs from "node:fs";
import path from "node:path";

const texte = fs.readFileSync(path.resolve(process.cwd(), "../data/donnees.js"), "utf8");
const donnees = JSON.parse(texte.slice(texte.indexOf("{", texte.indexOf("window.DONNEES")), texte.lastIndexOf("}") + 1));

const PAGES = {
  "/index.html": "/",
  "/boutique.html": "/boutique/",
  "/idees-cadeaux.html": "/occasions/",
  "/atelier.html": "/atelier/",
  "/contact.html": "/contact/",
  "/avis.html": "/avis/",
  "/faq.html": "/faq/",
  "/favoris.html": "/favoris/",
  "/panier.html": "/panier/",
  "/suivi.html": "/suivi/",
  "/cgv.html": "/cgv/",
  "/mentions-legales.html": "/mentions-legales/",
  "/newsletter.html": "/contact/",
};

const lignes = [
  "# Généré par scripts/redirections.mjs : ne pas modifier à la main.",
  ...Object.entries(PAGES).map(([de, vers]) => `${de} ${vers} 301`),
  ...donnees.produits.map((p) => `/p/${p.id}.html /produit/${p.id}/ 301`),
];

fs.writeFileSync(path.resolve(process.cwd(), "dist/_redirects"), lignes.join("\n") + "\n");
console.log(`dist/_redirects : ${lignes.length - 1} redirections`);
