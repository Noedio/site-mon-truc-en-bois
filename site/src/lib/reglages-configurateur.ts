// Réglages du configurateur lus au build : polices proposées, choix « Autre police » et motifs
// (site.configurateur), et photo de la pièce vierge (produit.apercuPhoto) servie en image optimisée.
// Sans ces champs, le configurateur propose les quatre polices du site, sans motif.
import { getImage } from "astro:assets";
import { site, type Produit } from "./donnees";
import { image } from "./images";
import { policesProposees } from "./polices";
import { MOTIFS, type ApercuPhoto, type Motif } from "./configurateur";

export function reglagesConfigurateur() {
  const r = site.configurateur ?? {};
  return {
    polices: policesProposees(r.polices),
    autrePolice: r.autrePolice === true,
    motifs: (r.motifs ?? []).map((id) => MOTIFS.find((m) => m.id === id)).filter((m): m is Motif => !!m),
  };
}

/** Photo de la pièce vierge et zone gravable (en % de la photo), ou null. */
export async function apercuPhotoDe(p: Produit): Promise<ApercuPhoto | null> {
  const a = p.apercuPhoto, meta = image(a?.image);
  if (!a?.zone || !meta) return null;
  const optimisee = await getImage({ src: meta, width: Math.min(1000, meta.width), format: "webp", quality: 80 });
  return { image: optimisee.src, zone: a.zone, ratio: meta.width / meta.height };
}
