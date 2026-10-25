// Lecture du catalogue au moment du build.
// La source reste data/donnees.js à la racine du dépôt : c'est le fichier que l'admin publie.
// Les champs de la fiche technique, des occasions, des commandes et des mentions légales sont remplis
// par le questionnaire de démarrage de l'admin (chantier C6) ; tant qu'ils sont vides, on affiche <ACompleter />.
import fs from "node:fs";
import path from "node:path";

export interface Variante { nom: string; prix: number }

export interface Produit {
  id: string;
  nom: string;
  categorie: string;
  prix: number;
  image: string;
  images?: string[];
  description: string;
  options?: { texte?: boolean; photo?: boolean };
  variantes?: { nom: string; choix: Variante[] } | null;
  visible?: boolean;
  vedette?: boolean;
  occasions?: string[];
  badge?: string;
  prixBarre?: number;
  dispo?: string;
  instructions?: string;
  // Fiche technique (brief §3). Vides tant que l'atelier n'a pas répondu au questionnaire.
  // numero : n° de pièce, figé par l'admin (rang dans le catalogue au départ, puis le suivant libre).
  numero?: number;
  delai?: number;
  matiere?: string;
  dimensions?: string;
  zoneGravable?: string;
  entretien?: string;
}

export interface Categorie { id: string; nom: string; description: string; image: string }

export interface Occasion {
  id: string;
  nom: string;
  description?: string;
  image?: string;
  // Date de l'occasion et date limite de commande, au format AAAA-MM-JJ (vides pour une occasion sans date fixe).
  date?: string;
  dateLimite?: string;
  // Jours ouvrés à prévoir entre la commande et la remise ; donne la date limite d'une occasion datée sans dateLimite.
  delaiJours?: number;
}

export interface Avis { nom: string; date: string; texte: string; source: string; note?: number; produit?: string }

/** Mentions légales (Infos boutique → Informations légales, et questions 15-16 du questionnaire). */
export interface Legal {
  exploitant?: string;
  formeJuridique?: string;
  /** RM (répertoire des métiers) ou RCS, avec ville et numéro. */
  immatriculation?: string;
  regimeTva?: "" | "franchise" | "assujetti";
  tauxTva?: number;
  directeurPublication?: string;
  mediateur?: { nom: string; url: string; adresse: string };
  hebergeur?: "github" | "cloudflare";
  plateformeFacturation?: boolean;
}

/**
 * Réponses du questionnaire de démarrage qui ne correspondent à aucun champ du site
 * (licences, accords, essai de gravure, textes signés, clientèle, concurrents, domaine…).
 * Chaque réponse porte sa date (AAAA-MM-JJ) une fois validée par l'atelier.
 */
export interface Questionnaire {
  reponses: Record<string, { date?: string; [champ: string]: unknown }>;
}

export interface Site {
  apercu: boolean;
  nom: string;
  slogan: string;
  telephone: string;
  email: string;
  adresse: string;
  horaires: string[];
  facebook: string;
  instagram: string;
  whatsapp?: string;
  livraison: number;
  livraisonOfferteDes: number;
  emballage: { actif: boolean; prix: number };
  expedition?: { transporteur?: string; zones?: string };
  plateformesAvis: {
    facebook: { lien: string; taux: number; nombre: number };
    google: { lien: string; lienAvis: string; note: number; nombre: number };
  };
  commandes: {
    supabaseUrl: string;
    supabaseCle: string;
    paiement: { enLigne: boolean; apresValidation: boolean; boutique: boolean };
    /** Maquette envoyée pour chaque commande, ou seulement si besoin ("" : pas encore répondu). */
    maquette?: "" | "toujours" | "si-besoin";
    /** Délai de réponse promis après une commande ou un devis, en clair (« 48 h ») ; vide : rien de promis. */
    delaiReponse?: string;
  };
  siret: string;
  mentionTva: string;
  legal?: Legal;
}

export interface Donnees {
  site: Site;
  textes: { heroTitre: string; heroTexte: string; equipe: string; aPropos: string[] };
  galerie: string[];
  categories: Categorie[];
  produits: Produit[];
  occasions: Occasion[];
  avis: Avis[];
  faq: { q: string; r: string }[]; // forme du fichier publié par l'admin
  questionnaire?: Questionnaire;
}

function lire(): Donnees {
  const chemin = process.env.DONNEES_CHEMIN || path.resolve(process.cwd(), "../data/donnees.js");
  const texte = fs.readFileSync(chemin, "utf8");
  const debut = texte.indexOf("{", texte.indexOf("window.DONNEES"));
  const fin = texte.lastIndexOf("}");
  return JSON.parse(texte.slice(debut, fin + 1));
}

/**
 * Variante démo du build (branche `demo` sur Cloudflare Pages, ou MTB_DEMO=1) : le site se comporte
 * comme une boutique ouverte, et js/demo.js simule dans le navigateur Supabase, Stripe, les emails
 * et la publication. Mêmes réglages que contenu() dans js/demo.js.
 */
export const DEMO = process.env.MTB_DEMO === "1" || process.env.CF_PAGES_BRANCH === "demo";
export const DEMO_SUPABASE = { url: "https://demo.supabase.local", cle: "demo-anon" };

function versionDemo(d: Donnees): Donnees {
  d.site.apercu = false;
  d.site.commandes = {
    ...d.site.commandes,
    supabaseUrl: DEMO_SUPABASE.url,
    supabaseCle: DEMO_SUPABASE.cle,
    paiement: { enLigne: true, apresValidation: true, boutique: true },
  };
  return d;
}

export const donnees: Donnees = DEMO ? versionDemo(lire()) : lire();
export const site = donnees.site;

/** Produits visibles, dans l'ordre du catalogue, avec leur numéro de pièce. */
export const produits: (Produit & { numero: number })[] = donnees.produits
  .map((p, i) => ({ ...p, numero: p.numero ?? i + 1 }))
  .filter((p) => p.visible !== false);

export const categories = donnees.categories;
export const occasions = donnees.occasions;
export const avis = donnees.avis;

export const trouverProduit = (id: string) => produits.find((p) => p.id === id);
export const categorieDe = (p: Produit) => categories.find((c) => c.id === p.categorie);
export const produitsDe = (filtre: { categorie?: string; occasion?: string }) =>
  produits.filter((p) => (!filtre.categorie || p.categorie === filtre.categorie) && (!filtre.occasion || p.occasions?.includes(filtre.occasion)));

/** Prix d'entrée d'un produit (le moins cher de ses variantes) et s'il en a plusieurs. */
export function prixDe(p: Produit) {
  const ecarts = p.variantes?.choix?.map((c) => Number(c.prix) || 0) ?? [0];
  const min = Math.min(...ecarts);
  return { prix: p.prix + min, plusieurs: ecarts.some((e) => e !== min) };
}
