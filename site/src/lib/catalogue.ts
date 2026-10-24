// Tri et filtres de la boutique (chantier C2), calculés au build : pas de JavaScript côté visiteur.
import { produits, prixDe, type Produit } from "./donnees";

type Piece = Produit & { numero: number };

/** Plafonds des pages « moins de … € » de la boutique (/boutique/moins-de-30-euros/). */
export const PLAFONDS = [10, 20, 30];

/** Du prix d'entrée le plus bas au plus haut ; à prix égal, l'ordre du catalogue. */
export const parPrix = <T extends Piece>(pieces: T[]) =>
  [...pieces].sort((a, b) => prixDe(a).prix - prixDe(b).prix || a.numero - b.numero);

/** Pièces dont le prix d'entrée est strictement sous le plafond, triées par prix. */
export const piecesSousBudget = (plafond: number) => parPrix(produits.filter((p) => prixDe(p).prix < plafond));
