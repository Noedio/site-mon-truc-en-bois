// Les photos du catalogue sont dans img/ à la racine du dépôt.
// On les importe au build pour qu'Astro produise des WebP à la bonne taille (srcset).
import type { ImageMetadata } from "astro";

const fichiers = import.meta.glob<ImageMetadata>("../../../img/*.{jpg,jpeg,png,webp}", { eager: true, import: "default" });

const parNom = new Map(Object.entries(fichiers).map(([chemin, meta]) => [chemin.split("/").pop()!, meta]));

/** « img/planche-aperitif.jpg » → l'image importée, ou undefined si le fichier n'existe pas. */
export const image = (chemin: string | undefined) => (chemin ? parNom.get(chemin.split("/").pop()!) : undefined);

/**
 * Photos à ne pas montrer tant que l'atelier n'a pas répondu (audit, §1.9) :
 * personnage sous licence, marques déposées, logo d'un client.
 */
export const PHOTOS_A_VERIFIER: Record<string, string> = {
  "plaque-naissance-bois.jpg": "personnage sous licence",
  "verre-imprime.jpg": "écussons de clubs (marques déposées)",
  "tirelire.jpg": "logo d'un commerce client",
};

export const aVerifier = (chemin: string | undefined) => (chemin ? PHOTOS_A_VERIFIER[chemin.split("/").pop()!] : undefined);
