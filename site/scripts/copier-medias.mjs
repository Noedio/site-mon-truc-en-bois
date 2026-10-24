// Avant le build : copie dans public/ ce qui vit à la racine du dépôt.
// - img/ (là où l'admin publie les photos) : favicons, logo et image de partage gardent leur adresse /img/…
//   Les photos de produits, elles, sont optimisées par Astro (src/lib/images.ts).
// - l'admin (admin.html, css/, js/, data/donnees.js) : il est servi tel quel à côté du nouveau site,
//   avec son mode démo (js/demo.js), utilisé aussi par la variante démo du build.
import fs from "node:fs";
import path from "node:path";

const racine = path.resolve(process.cwd(), "..");
const publicDir = path.resolve(process.cwd(), "public");

const COPIES = [
  ["img", "img"],
  ["css", "css"],
  ["js", "js"],
  ["data", "data"],
  ["admin.html", "admin.html"],
  ["admin.webmanifest", "admin.webmanifest"],
];

for (const [source, cible] of COPIES) {
  const de = path.join(racine, source);
  const vers = path.join(publicDir, cible);
  fs.rmSync(vers, { recursive: true, force: true });
  fs.cpSync(de, vers, { recursive: true });
}
console.log(`Copié dans public/ : ${COPIES.map(([s]) => s).join(", ")}`);
