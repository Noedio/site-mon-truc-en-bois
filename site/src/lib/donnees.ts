// Lecture du catalogue au moment du build.
// La source reste data/donnees.js à la racine du dépôt : c'est le fichier que l'admin publie.
// (Chantier C6 : l'admin écrira un JSON et déclenchera le build ; seul ce fichier changera.)
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
  // Date de l'occasion et date limite de commande : à fixer avec l'atelier.
  date?: string;
  dateLimite?: string;
}

export interface Avis { nom: string; date: string; texte: string; source: string; note?: number; produit?: string }

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
  livraison: number;
  livraisonOfferteDes: number;
  emballage: { actif: boolean; prix: number };
  plateformesAvis: {
    facebook: { lien: string; taux: number; nombre: number };
    google: { lien: string; lienAvis: string; note: number; nombre: number };
  };
  commandes: { supabaseUrl: string; supabaseCle: string; paiement: { enLigne: boolean; apresValidation: boolean; boutique: boolean } };
  siret: string;
  mentionTva: string;
  legal?: Record<string, unknown>;
}

export interface Donnees {
  site: Site;
  textes: { heroTitre: string; heroTexte: string; equipe: string; aPropos: string[] };
  galerie: string[];
  categories: Categorie[];
  produits: Produit[];
  occasions: Occasion[];
  avis: Avis[];
  faq: { question: string; reponse: string }[];
}

function lire(): Donnees {
  const chemin = process.env.DONNEES_CHEMIN || path.resolve(process.cwd(), "../data/donnees.js");
  const texte = fs.readFileSync(chemin, "utf8");
  const debut = texte.indexOf("{", texte.indexOf("window.DONNEES"));
  const fin = texte.lastIndexOf("}");
  return JSON.parse(texte.slice(debut, fin + 1));
}

export const donnees: Donnees = lire();
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
