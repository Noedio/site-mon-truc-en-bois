// Promesses faites au client qui dépendent des réponses de l'atelier (questionnaire de l'admin).
// Une seule formulation par promesse, reprise partout : accueil, fiche, atelier, panier.
import { site } from "./donnees";

/** Maquette : envoyée à chaque commande, seulement si besoin, ou "" tant que l'atelier n'a pas répondu (question 3). */
export const maquette = site.commandes.maquette ?? "";

/** Phrase courte pour les listes (accueil, fiche) ; vide tant que la réponse manque. */
export const maquetteCourte =
  maquette === "toujours" ? "Une maquette à valider, à chaque commande" : maquette === "si-besoin" ? "Une maquette à valider quand la pièce le demande" : "";

/** Phrase complète, vraie quelle que soit la réponse attendue : utilisée tant que l'atelier n'a pas répondu. */
export const phraseMaquette =
  maquette === "toujours"
    ? "Nous vous envoyons une maquette à valider avant de graver."
    : maquette === "si-besoin"
      ? "Nous validons le rendu avec vous avant de graver, avec une maquette quand la pièce le demande."
      : "Nous validons la personnalisation avec vous avant de graver.";

/** Libellé de la question pour <ACompleter>, le même partout. */
export const questionMaquette = "maquette à chaque commande ou seulement si besoin";
