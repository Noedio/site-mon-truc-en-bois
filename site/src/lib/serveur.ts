// Seul point d'appel des fonctions Supabase (supabase/functions/*) depuis le navigateur.
// Mêmes requêtes que l'ancien site (js/main.js → appelServeur, panier.html → envoyerAuServeur).
// Le mode démo pourra tout intercepter ici avec remplacerTransport(), sans toucher aux pages.

export interface ConfigServeur { url: string; cle: string }

/** Une fonction qui porte la requête : fetch vers Supabase par défaut, une fausse base en démo. */
export type Transport = (fonction: string, corps: unknown, config: ConfigServeur | null) => Promise<Response>;

let config: ConfigServeur | null = null;
let transport: Transport | null = null;

/** À appeler avec site.commandes : sans adresse ni clé, le serveur est considéré absent. */
export function configurerServeur(commandes: { supabaseUrl?: string; supabaseCle?: string } | undefined) {
  const url = (commandes?.supabaseUrl ?? "").trim().replace(/\/$/, "");
  const cle = (commandes?.supabaseCle ?? "").trim();
  config = url && cle ? { url, cle } : null;
}

export function remplacerTransport(t: Transport | null) {
  transport = t;
}

export const serveurDisponible = () => !!transport || !!config;

const transportSupabase: Transport = (fonction, corps, c) =>
  fetch(`${c!.url}/functions/v1/${fonction}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: c!.cle, Authorization: `Bearer ${c!.cle}` },
    body: JSON.stringify(corps),
  });

export class ErreurServeur extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

export async function appelServeur<T>(fonction: "commande" | "suivi" | "contact", corps: unknown): Promise<T> {
  const t = transport ?? (config ? transportSupabase : null);
  if (!t) throw new ErreurServeur("Commandes en ligne non configurées.");
  let r: Response;
  try {
    r = await t(fonction, corps, config);
  } catch {
    throw new ErreurServeur("Connexion impossible : vérifiez votre accès à internet puis réessayez.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurServeur(d.erreur || `Erreur ${r.status}`, r.status);
  return d as T;
}

// ---------- Commande (supabase/functions/commande) ----------

export type ModePaiement = "en_ligne" | "apres_validation" | "boutique";
export type ModeReception = "retrait" | "livraison";

export interface LigneDemandee {
  id: string;
  quantite: number;
  variante: number | null;
  texte?: string;
  police?: string;
  remarque?: string;
  photo?: { nom: string; type: string } | null;
}

export interface DemandeCommande {
  client: { nom: string; email: string; tel: string; adresse: string };
  mode_reception: ModeReception;
  lignes: LigneDemandee[];
  cadeau: { emballage: boolean; message: string; date: string };
  message: string;
  paiement_mode: ModePaiement;
  code_promo: string;
  consentement_marketing: boolean;
  retour: string;
}

export interface ReponseCommande {
  numero: string;
  jeton: string;
  total: number;
  paiement_url: string | null;
  envois_photos: { ligne: number; url: string }[];
}

export interface Simulation {
  sous_total: number;
  port: number;
  emballage: number;
  remise: number;
  code_promo: string;
  total: number;
  erreur_code: string;
  promo_description: string;
}

export const envoyerCommande = (demande: DemandeCommande) => appelServeur<ReponseCommande>("commande", demande);

/** Montants exacts calculés par le serveur (les mêmes qu'au paiement), et vérification du code promo. */
export const simulerCommande = (d: { lignes: LigneDemandee[]; mode_reception: ModeReception; cadeau: { emballage: boolean }; code_promo: string }) =>
  appelServeur<Simulation>("commande", { simulation: true, ...d });

/** Dépose une photo du client à l'adresse à usage unique fournie par le serveur. */
export async function deposerPhoto(url: string, photo: Blob) {
  const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: photo });
  if (!r.ok) throw new Error(`Envoi de la photo refusé (${r.status})`);
}

// ---------- Suivi (supabase/functions/suivi) ----------

export interface CommandePublique {
  numero: string;
  jeton: string;
  cree_le: string;
  statut: string;
  statut_libelle: string;
  historique: { date: string; statut: string }[] | null;
  mode_reception: ModeReception;
  lignes: { nom: string; quantite: number; variante: string; texte: string; total: number }[];
  sous_total: number;
  remise: number;
  code_promo: string;
  port: number;
  emballage: number;
  total: number;
  paiement_mode: ModePaiement;
  paiement_statut: "en_attente" | "paye" | "rembourse";
  paiement_possible: boolean;
  suivi_colis: string;
}

export const suivreCommande = (critere: { jeton: string } | { numero: string; email: string }) =>
  appelServeur<CommandePublique>("suivi", critere);

export const lienPaiement = (jeton: string, retour: string) =>
  appelServeur<{ paiement_url: string }>("suivi", { jeton, action: "payer", retour });
