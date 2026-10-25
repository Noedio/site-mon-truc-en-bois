// Catalogue des polices de gravure, sous le nom que voit le client (brief §3).
// La valeur `police` d'une ligne du panier est l'un de ces noms, ou « Autre police ».
// Les identifiants sont ceux de `site.configurateur.polices` et du questionnaire de l'admin.
//
// Les quatre premières sont les polices du site (socle.css ; Sacramento est chargée par le configurateur
// et le panier). Les autres sont auto-hébergées (@fontsource, caractères latins) et seulement déclarées
// dans le navigateur : il ne les télécharge que lorsqu'un texte les affiche.
import greatVibes from "@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2?url";
import dancingScript from "@fontsource/dancing-script/files/dancing-script-latin-600-normal.woff2?url";
import pacifico from "@fontsource/pacifico/files/pacifico-latin-400-normal.woff2?url";
import amaticSc from "@fontsource/amatic-sc/files/amatic-sc-latin-700-normal.woff2?url";
import playfair from "@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2?url";
import bebasNeue from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url";
import cinzel from "@fontsource/cinzel/files/cinzel-latin-600-normal.woff2?url";
import caveat from "@fontsource/caveat/files/caveat-latin-600-normal.woff2?url";
import josefinSans from "@fontsource/josefin-sans/files/josefin-sans-latin-600-normal.woff2?url";

export interface Police {
  id: string;
  nom: string; // nom affiché, enregistré tel quel dans la ligne du panier
  famille: string; // famille CSS, sans guillemets
  secours: "serif" | "sans-serif" | "monospace" | "cursive";
  graisse: number;
  capitales: boolean;
  chasse: number; // largeur moyenne d'un caractère, en corps : estimation avant le chargement de la police
  echelle: number; // corps relatif, pour qu'un même texte ait un poids visuel proche d'une police à l'autre
  fichier?: string; // police auto-hébergée, déclarée à la demande
}

export const CATALOGUE_POLICES: Police[] = [
  { id: "atelier", nom: "Atelier", famille: "Big Shoulders", secours: "sans-serif", graisse: 800, capitales: true, chasse: 0.5, echelle: 1 },
  { id: "classique", nom: "Classique", famille: "Literata Variable", secours: "serif", graisse: 600, capitales: false, chasse: 0.55, echelle: 0.85 },
  { id: "machine", nom: "Machine à écrire", famille: "Courier Prime", secours: "monospace", graisse: 700, capitales: false, chasse: 0.6, echelle: 0.8 },
  { id: "manuscrite", nom: "Manuscrite", famille: "Sacramento", secours: "cursive", graisse: 400, capitales: false, chasse: 0.36, echelle: 1.3 },
  { id: "calligraphie", nom: "Calligraphie", famille: "Great Vibes", secours: "cursive", graisse: 400, capitales: false, chasse: 0.4, echelle: 1.3, fichier: greatVibes },
  { id: "ronde", nom: "Ronde", famille: "Dancing Script", secours: "cursive", graisse: 600, capitales: false, chasse: 0.46, echelle: 1.1, fichier: dancingScript },
  { id: "retro", nom: "Rétro", famille: "Pacifico", secours: "cursive", graisse: 400, capitales: false, chasse: 0.56, echelle: 0.95, fichier: pacifico },
  { id: "craie", nom: "Craie", famille: "Amatic SC", secours: "sans-serif", graisse: 700, capitales: false, chasse: 0.36, echelle: 1.2, fichier: amaticSc },
  { id: "elegante", nom: "Élégante", famille: "Playfair Display", secours: "serif", graisse: 600, capitales: false, chasse: 0.54, echelle: 0.9, fichier: playfair },
  { id: "affiche", nom: "Affiche", famille: "Bebas Neue", secours: "sans-serif", graisse: 400, capitales: true, chasse: 0.42, echelle: 1, fichier: bebasNeue },
  { id: "romaine", nom: "Romaine", famille: "Cinzel", secours: "serif", graisse: 600, capitales: false, chasse: 0.68, echelle: 0.8, fichier: cinzel },
  { id: "ecriture", nom: "Écriture", famille: "Caveat", secours: "cursive", graisse: 600, capitales: false, chasse: 0.42, echelle: 1.15, fichier: caveat },
  { id: "moderne", nom: "Moderne", famille: "Josefin Sans", secours: "sans-serif", graisse: 600, capitales: false, chasse: 0.54, echelle: 0.9, fichier: josefinSans },
];

/** Les quatre polices proposées quand `site.configurateur.polices` est absent ou vide. */
export const POLICES_DE_BASE = ["atelier", "classique", "machine", "manuscrite"];
export const POLICES = CATALOGUE_POLICES.filter((p) => POLICES_DE_BASE.includes(p.id));

/** Nom enregistré dans la ligne quand le client demande une police hors catalogue. */
export const AUTRE_POLICE = "Autre police";

/** Par nom (ligne du panier) ou par identifiant (réglages, questionnaire). */
export const trouverPolice = (nom: string) => CATALOGUE_POLICES.find((p) => p.nom === nom || p.id === nom);

/** Les polices proposées au client, dans l'ordre des réglages ; les quatre de base à défaut. */
export function policesProposees(ids: string[] | undefined) {
  const choisies = (ids ?? []).map((id) => CATALOGUE_POLICES.find((p) => p.id === id)).filter((p): p is Police => !!p);
  return choisies.length ? [...new Set(choisies)] : POLICES;
}

/** Valeur CSS font-family (attribut SVG, style en ligne). */
export const pileCss = (p: Police) => `'${p.famille}', ${p.secours}`;

// Dans le navigateur : déclaration des polices auto-hébergées, sans téléchargement.
// Une FontFace ajoutée à document.fonts se charge d'elle-même au premier texte qui l'utilise.
if (typeof document !== "undefined" && typeof FontFace !== "undefined" && document.fonts) {
  for (const p of CATALOGUE_POLICES) {
    if (!p.fichier) continue;
    try {
      document.fonts.add(new FontFace(p.famille, `url(${p.fichier}) format("woff2")`, { weight: String(p.graisse), display: "swap" }));
    } catch { /* navigateur sans FontFace : la police de secours s'affiche */ }
  }
}
