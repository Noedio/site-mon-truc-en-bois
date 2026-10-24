// Copie img/ (à la racine du dépôt, là où l'admin publie les photos) dans public/img/
// avant le build : favicons, logo et image de partage gardent leur adresse /img/…
// Les photos de produits, elles, sont optimisées par Astro (src/lib/images.ts).
import fs from "node:fs";
import path from "node:path";

const source = path.resolve(process.cwd(), "../img");
const cible = path.resolve(process.cwd(), "public/img");

fs.rmSync(cible, { recursive: true, force: true });
fs.cpSync(source, cible, { recursive: true });
console.log(`img/ copié dans public/img (${fs.readdirSync(cible).length} fichiers)`);
