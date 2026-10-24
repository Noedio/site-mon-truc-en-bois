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
// L'admin publie data/donnees.js sur GitHub : depuis l'aperçu, il doit écrire sur la branche dont le nouveau
// site est construit (Cloudflare fournit CF_PAGES_BRANCH), sinon ses modifications n'apparaîtraient pas ici.
// La branche demo est une copie : on y publie sur refonte. ADMIN_BRANCHE permet de forcer une autre branche.
const branche = process.env.ADMIN_BRANCHE || (process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== "demo" ? process.env.CF_PAGES_BRANCH : "refonte");
const reglages = { branche, sansPrevisualisation: true };
const admin = path.join(publicDir, "admin.html");
const html = fs.readFileSync(admin, "utf8");
const repere = html.match(/<script src="js\/admin-serveur\.js[^"]*"><\/script>/);
if (!repere) throw new Error("admin.html : script js/admin-serveur.js introuvable, réglages de l'admin non posés.");
fs.writeFileSync(admin, html.replace(repere[0], `<script>window.MTB_ADMIN = ${JSON.stringify(reglages)};</script>
  ${repere[0]}`));

console.log(`Copié dans public/ : ${COPIES.map(([s]) => s).join(", ")} (admin : publication sur ${branche})`);
