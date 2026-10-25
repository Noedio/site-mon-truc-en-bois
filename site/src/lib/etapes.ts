// Étapes d'une commande, dans l'ordre du parcours (brief §5) :
// commande à maquetter → maquette envoyée → validée (sinon retouche) → paiement → gravure → remise.
// `statuts` liste les statuts de la table `commandes` qui correspondent à l'étape ;
// `court` est le nom affiché sous chaque segment du fil d'avancement d'une commande (une seule ligne).
// « maquette_envoyee » et « retouche » viennent de supabase/migrations/20261025000000_statuts_maquette.sql.

export interface Etape { cle: string; titre: string; court: string; texte: string; statuts: string[] }

export const ETAPES: Etape[] = [
  { cle: "recue", titre: "Commande reçue, à maquetter", court: "Reçue", texte: "Nous préparons la maquette de votre gravure.", statuts: ["nouvelle"] },
  { cle: "maquette", titre: "Maquette envoyée", court: "Maquette", texte: "Vous la validez, ou vous nous demandez une retouche.", statuts: ["maquette_envoyee", "retouche"] },
  { cle: "validee", titre: "Maquette validée", court: "Validée", texte: "Vous réglez selon le mode choisi : en ligne ou à la boutique.", statuts: ["confirmee"] },
  { cle: "fabrication", titre: "En fabrication", court: "Fabrication", texte: "Nous gravons votre pièce à l'atelier, à Auchel.", statuts: ["en_fabrication"] },
  { cle: "remise", titre: "Prête ou expédiée", court: "Remise", texte: "Vous venez la chercher à la boutique, ou nous l'envoyons chez vous.", statuts: ["prete", "expediee"] },
  { cle: "terminee", titre: "Terminée", court: "Terminée", texte: "La pièce est entre vos mains.", statuts: ["terminee"] },
];

/** Position de l'étape en cours pour un statut (0 si le statut est inconnu). */
export const indexEtape = (statut: string) => Math.max(0, ETAPES.findIndex((e) => e.statuts.includes(statut)));

/** Titre de l'étape « remise » selon le mode de réception. */
export const titreRemise = (mode: string, statut?: string) =>
  statut === "expediee" || (statut !== "prete" && mode === "livraison") ? "Expédiée" : "Prête à retirer en boutique";

export const LIBELLES_PAIEMENT: Record<string, string> = {
  en_ligne: "Paiement en ligne par carte",
  apres_validation: "Paiement après validation de la maquette",
  boutique: "Paiement à la boutique, au retrait",
};
