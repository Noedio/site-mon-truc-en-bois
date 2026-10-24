// Informations légales lues dans les données (même source que `remplirLegal` de l'ancien js/main.js).
// Une valeur vide reste vide : la page affiche alors <ACompleter>, et le questionnaire de l'admin la remplit.
import { site } from "./donnees";

interface Mediateur { nom?: string; adresse?: string; url?: string }
interface Legal {
  exploitant?: string;
  formeJuridique?: string;
  siret?: string;
  regimeTva?: "franchise" | "assujetti" | "";
  mediateur?: Mediateur;
  directeurPublication?: string; // à défaut, l'exploitant
  immatriculation?: string; // inscription au RM ou au RCS, telle qu'elle doit apparaître
}

const L = (site.legal ?? {}) as Legal;
const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const TVA: Record<string, string> = {
  franchise: "TVA non applicable, article 293 B du code général des impôts",
  assujetti: "toutes taxes comprises (TVA incluse)",
};

export const legal = {
  exploitant: texte(L.exploitant),
  formeJuridique: texte(L.formeJuridique),
  siret: texte(L.siret) || texte(site.siret),
  immatriculation: texte(L.immatriculation),
  mentionTva: texte(site.mentionTva) || TVA[L.regimeTva ?? ""] || "",
  directeurPublication: texte(L.directeurPublication) || texte(L.exploitant),
  mediateur: L.mediateur?.nom ? { nom: texte(L.mediateur.nom), adresse: texte(L.mediateur.adresse), url: texte(L.mediateur.url) } : null,
};

/** Hébergeur du nouveau site (Cloudflare Pages, voir site/README.md). */
export const hebergeur = {
  nom: "Cloudflare Pages, service de Cloudflare, Inc.",
  adresse: "101 Townsend Street, San Francisco, CA 94107, États-Unis",
  url: "https://www.cloudflare.com",
};

/** Le serveur de commandes (Supabase) est-il branché ? Sans lui, ni commande en ligne ni emails automatiques. */
export const serveurBranche = Boolean(site.commandes?.supabaseUrl && site.commandes?.supabaseCle);
export const paiementEnLigne = serveurBranche && Boolean(site.commandes?.paiement?.enLigne);

/**
 * Moyens de paiement réellement proposés, d'après site.commandes.paiement.
 * Le lien de paiement envoyé par email passe par le serveur : sans lui, le moyen à distance reste à préciser.
 * `manque` = libellé du [À COMPLÉTER] à afficher après le texte.
 */
export function modesPaiement() {
  const p = site.commandes?.paiement ?? { enLigne: false, apresValidation: true, boutique: true };
  const modes: { texte: string; manque?: string }[] = [];
  if (paiementEnLigne) modes.push({ texte: "en ligne par carte bancaire au moment de la commande (paiement sécurisé par Stripe)" });
  if (p.apresValidation !== false)
    modes.push(
      serveurBranche
        ? { texte: "après validation de la maquette, au moyen d'un lien de paiement sécurisé envoyé par email" }
        : { texte: "après validation de la maquette :", manque: "moyen de paiement après validation de la maquette" },
    );
  if (p.boutique !== false) modes.push({ texte: "à la boutique, lors du retrait :", manque: "moyens de paiement acceptés à la boutique" });
  return modes;
}
