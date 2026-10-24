// Outils communs aux fonctions serveur (Supabase Edge Functions, Deno).
// Aucune dépendance externe : tout passe par fetch() et WebCrypto, ce qui facilite les tests.

export const env = (cle: string, defaut = "") => Deno.env.get(cle) ?? defaut;

/** Erreur à montrer au client (formulaire invalide, commandes fermées…). */
export class ErreurClient extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// ---------- Réponses HTTP et CORS ----------
function origineAutorisee(req: Request) {
  const origine = req.headers.get("Origin") ?? "";
  const autorisees = env("SITE_ORIGINES", "*").split(",").map((o) => o.trim()).filter(Boolean);
  if (autorisees.includes("*")) return "*";
  return autorisees.includes(origine) ? origine : autorisees[0] ?? "";
}
export function entetesCors(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origineAutorisee(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
export const json = (req: Request, donnees: unknown, status = 200) =>
  new Response(JSON.stringify(donnees), { status, headers: { ...entetesCors(req), "Content-Type": "application/json; charset=utf-8" } });

/** Enveloppe commune : CORS, méthode POST, erreurs lisibles. */
export function servir(traiter: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: entetesCors(req) });
    // Contrôle de santé pour la surveillance (Better Stack) : GET …/suivi?sante=1 → 200 si la base répond
    if (req.method === "GET" && new URL(req.url).searchParams.has("sante")) {
      try {
        await db("admins?select=user_id&limit=1");
        return json(req, { ok: true });
      } catch {
        return json(req, { ok: false }, 503);
      }
    }
    if (req.method !== "POST") return json(req, { erreur: "Méthode non autorisée" }, 405);
    try {
      return await traiter(req);
    } catch (e) {
      if (e instanceof ErreurClient) return json(req, { erreur: e.message }, e.status);
      console.error(e);
      return json(req, { erreur: "Erreur du serveur. Réessayez dans un instant ou contactez la boutique." }, 500);
    }
  };
}

export async function lireJson<T>(req: Request, maxOctets = 200_000): Promise<T> {
  const texte = await req.text();
  if (texte.length > maxOctets) throw new ErreurClient("Demande trop volumineuse.", 413);
  try {
    return JSON.parse(texte) as T;
  } catch {
    throw new ErreurClient("Demande illisible.");
  }
}

// ---------- Base de données (API REST de Supabase, clé de service) ----------
export async function db<T = any>(chemin: string, options: RequestInit = {}): Promise<T> {
  const cle = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`Base de données ${r.status} : ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

// ---------- Stockage des photos clients ----------
const SEAU = "photos-clients";
async function stockage(chemin: string, corps: unknown) {
  const cle = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/storage/v1/${chemin}`, {
    method: "POST",
    headers: { apikey: cle, Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`Stockage ${r.status} : ${await r.text()}`);
  return r.json();
}
const encoderChemin = (c: string) => c.split("/").map(encodeURIComponent).join("/");
/** Adresse d'envoi à usage unique (le navigateur du client y dépose la photo avec un PUT). */
export async function urlEnvoiPhoto(chemin: string): Promise<string> {
  const { url } = await stockage(`object/upload/sign/${SEAU}/${encoderChemin(chemin)}`, {});
  return `${env("SUPABASE_URL")}/storage/v1${url}`;
}
/** Lien de téléchargement temporaire pour l'admin. */
export async function urlLecturePhoto(chemin: string, secondes = 3600): Promise<string> {
  const { signedURL } = await stockage(`object/sign/${SEAU}/${encoderChemin(chemin)}`, { expiresIn: secondes });
  return `${env("SUPABASE_URL")}/storage/v1${signedURL}`;
}

// ---------- Catalogue publié (data/donnees.js du site) ----------
let cache: { donnees: any; date: number } | null = null;
export async function catalogue(): Promise<any> {
  if (cache && Date.now() - cache.date < 60_000) return cache.donnees;
  const r = await fetch(`${env("SITE_URL").replace(/\/$/, "")}/data/donnees.js?v=${Date.now()}`);
  if (!r.ok) throw new Error(`Catalogue introuvable (${r.status})`);
  const texte = await r.text();
  const i = texte.search(/^window\.DONNEES = /m);
  if (i < 0) throw new Error("Catalogue illisible");
  const donnees = JSON.parse(texte.slice(i + "window.DONNEES = ".length).trim().replace(/;\s*$/, ""));
  cache = { donnees, date: Date.now() };
  return donnees;
}
export const viderCacheCatalogue = () => (cache = null);

// ---------- Calcul de la commande à partir du catalogue (jamais des prix envoyés par le navigateur) ----------
export type LigneDemandee = {
  id: string;
  quantite: number;
  variante?: number | null;
  texte?: string;
  police?: string;
  remarque?: string;
  photo?: { nom: string; type: string } | null;
};
export type DemandeCommande = {
  client: { nom: string; email: string; tel: string; adresse?: string };
  mode_reception: "livraison" | "retrait";
  lignes: LigneDemandee[];
  cadeau?: { emballage?: boolean; message?: string; date?: string };
  message?: string;
  paiement_mode: "en_ligne" | "apres_validation" | "boutique";
  retour?: string;
  code_promo?: string;
  consentement_marketing?: boolean;
  simulation?: boolean;
};

const arrondi = (n: number) => Math.round(n * 100) / 100;
const texte = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function calculerCommande(D: any, demande: DemandeCommande, promo: any = null) {
  if (!Array.isArray(demande.lignes) || !demande.lignes.length) throw new ErreurClient("Votre panier est vide.");
  if (demande.lignes.length > 30) throw new ErreurClient("Trop d'articles dans une seule commande : contactez-nous pour un devis.");
  const lignes = demande.lignes.map((l) => {
    const p = (D.produits ?? []).find((x: any) => x.id === l.id && x.visible !== false);
    if (!p) throw new ErreurClient("Un produit de votre panier n'est plus disponible. Retirez-le puis réessayez.");
    if (p.dispo === "epuise") throw new ErreurClient(`« ${p.nom} » est épuisé pour le moment.`);
    const quantite = Math.trunc(Number(l.quantite));
    if (!(quantite >= 1 && quantite <= 99)) throw new ErreurClient("Quantité invalide.");
    const choix = p.variantes?.choix ?? [];
    let variante = "";
    let supplement = 0;
    if (choix.length) {
      const c = choix[Number(l.variante ?? 0)];
      if (!c) throw new ErreurClient(`Choix invalide pour « ${p.nom} ».`);
      variante = `${p.variantes.nom || "Option"} : ${c.nom}`;
      supplement = Number(c.prix || 0);
    }
    const prix_unitaire = arrondi(Number(p.prix) + supplement);
    return {
      id: p.id,
      nom: p.nom,
      quantite,
      prix_unitaire,
      total: arrondi(prix_unitaire * quantite),
      variante,
      texte: texte(l.texte, 200),
      police: texte(l.police, 40),
      remarque: texte(l.remarque, 500),
      photo_nom: l.photo ? texte(l.photo.nom, 120) : "",
      photo_type: l.photo ? texte(l.photo.type, 40) : "",
      photo_chemin: "",
    };
  });
  const sous_total = arrondi(lignes.reduce((t, l) => t + l.total, 0));
  const site = D.site ?? {};
  const port = demande.mode_reception === "retrait" || sous_total >= Number(site.livraisonOfferteDes ?? Infinity) ? 0 : arrondi(Number(site.livraison || 0));
  const emballage = site.emballage?.actif && demande.cadeau?.emballage ? arrondi(Number(site.emballage.prix || 0)) : 0;
  const remise = promo ? montantRemise(promo, sous_total) : 0;
  return { lignes, sous_total, port, emballage, remise, code_promo: promo?.code ?? "", total: arrondi(Math.max(0, sous_total + port + emballage - remise)) };
}

// ---------- Codes promo ----------
export function montantRemise(promo: any, sousTotal: number) {
  const v = Number(promo.valeur);
  return arrondi(Math.min(sousTotal, promo.type === "pourcentage" ? (sousTotal * v) / 100 : v));
}
const aujourdhui = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
/** Renvoie le code promo valide, ou lève une erreur lisible par le client. */
export async function chercherCodePromo(code: string | undefined, sousTotal: number) {
  const c = String(code ?? "").trim().toUpperCase();
  if (!c) return null;
  if (!/^[A-Z0-9_-]{3,30}$/.test(c)) throw new ErreurClient("Code promo invalide.");
  const [promo] = await db<any[]>(`codes_promo?code=eq.${encodeURIComponent(c)}`);
  const j = aujourdhui();
  if (!promo || !promo.actif || (promo.debut && j < promo.debut) || (promo.fin && j > promo.fin)) throw new ErreurClient("Ce code promo n'est pas valable.");
  if (promo.utilisations_max && promo.utilisations >= promo.utilisations_max) throw new ErreurClient("Ce code promo a déjà été utilisé le nombre maximum de fois.");
  if (sousTotal < Number(promo.minimum || 0)) throw new ErreurClient(`Ce code promo s'applique dès ${euros(promo.minimum)} d'achat.`);
  return promo;
}
/** Compte une utilisation en une seule opération côté base (pas de double comptage ni de dépassement du maximum). */
export async function compterUtilisation(promo: any) {
  if (!promo) return;
  const ok = await db<boolean>("rpc/utiliser_code_promo", { method: "POST", body: JSON.stringify({ p_code: promo.code }) });
  if (ok === false) throw new ErreurClient("Ce code promo a déjà été utilisé le nombre maximum de fois.");
}

// ---------- Fiches clients (CRM) ----------
/** Crée ou complète la fiche client (clé : l'email). Le consentement n'est jamais retiré ici,
 *  et un nom vide (inscription à la newsletter sans prénom) ne remplace jamais le nom déjà connu. */
export async function enregistrerClient(c: { nom?: string; email?: string; tel?: string; adresse?: string; source?: string; consentement?: boolean }) {
  const email = (c.email ?? "").trim().toLowerCase();
  const nom = String(c.nom ?? "").trim();
  const fiche: Record<string, unknown> = {};
  if (nom) fiche.nom = nom;
  if (c.tel) fiche.tel = c.tel;
  if (c.adresse) fiche.adresse = c.adresse;
  if (c.consentement) Object.assign(fiche, { consentement_marketing: true, consentement_le: new Date().toISOString() });
  if (!email) {
    const [cree] = await db<any[]>("clients", { method: "POST", body: JSON.stringify({ nom: nom || "Client", ...fiche, source: c.source ?? "boutique" }) });
    return cree;
  }
  const [existant] = await db<any[]>(`clients?email=eq.${encodeURIComponent(email)}&select=id,nom`);
  if (existant) {
    if (!Object.keys(fiche).length) return existant;
    const [maj] = await db<any[]>(`clients?id=eq.${existant.id}`, { method: "PATCH", body: JSON.stringify(fiche) });
    return maj;
  }
  const [cree] = await db<any[]>("clients", { method: "POST", body: JSON.stringify({ nom: nom || email.split("@")[0], ...fiche, email, source: c.source ?? "site" }) });
  return cree;
}

// ---------- Désinscription de la newsletter ----------
/** Clé personnelle du lien de désinscription : seul le destinataire de l'email peut se désinscrire en un clic. */
export async function cleDesinscription(email: string) {
  const secret = env("DESINSCRIPTION_SECRET") || env("SUPABASE_SERVICE_ROLE_KEY");
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(`desinscription:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(email.trim().toLowerCase())));
  return [...mac.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function validerClient(demande: DemandeCommande) {
  const c = demande.client ?? ({} as DemandeCommande["client"]);
  const nom = texte(c.nom, 120);
  const email = texte(c.email, 160).toLowerCase();
  const tel = texte(c.tel, 30);
  const adresse = texte(c.adresse, 400);
  if (nom.length < 2) throw new ErreurClient("Indiquez votre nom.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErreurClient("Adresse email invalide.");
  if (tel.replace(/\D/g, "").length < 6) throw new ErreurClient("Indiquez un numéro de téléphone.");
  if (!["livraison", "retrait"].includes(demande.mode_reception)) throw new ErreurClient("Mode de réception invalide.");
  if (demande.mode_reception === "livraison" && adresse.length < 8) throw new ErreurClient("Indiquez votre adresse de livraison.");
  return { nom, email, tel, adresse: demande.mode_reception === "livraison" ? adresse : "" };
}

/** Modes de paiement proposés : réglages de l'admin + clé Stripe présente côté serveur. */
export function modesPaiement(D: any) {
  const p = D.site?.commandes?.paiement ?? {};
  return {
    en_ligne: !!p.enLigne && !!env("STRIPE_SECRET_KEY"),
    apres_validation: p.apresValidation !== false,
    boutique: p.boutique !== false,
  };
}

// ---------- Stripe (paiement par carte, Apple Pay, Google Pay…) ----------
function formulaire(obj: Record<string, unknown>, prefixe = "", sortie = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (typeof v === "object") formulaire(v as Record<string, unknown>, cle, sortie);
    else sortie.append(cle, String(v));
  }
  return sortie;
}
export async function stripe(chemin: string, corps: Record<string, unknown>) {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: formulaire(corps),
  });
  const donnees = await r.json();
  if (!r.ok) throw new Error(`Stripe ${r.status} : ${donnees?.error?.message ?? ""}`);
  return donnees;
}

export async function creerPaiementStripe(commande: any, retour: string) {
  const centimes = (n: number) => Math.round(Number(n) * 100);
  const articles: Record<string, unknown>[] = commande.lignes.map((l: any) => ({
    quantity: l.quantite,
    price_data: { currency: "eur", unit_amount: centimes(l.prix_unitaire), product_data: { name: l.variante ? `${l.nom} (${l.variante})` : l.nom } },
  }));
  if (Number(commande.port) > 0) articles.push({ quantity: 1, price_data: { currency: "eur", unit_amount: centimes(commande.port), product_data: { name: "Livraison" } } });
  if (Number(commande.emballage) > 0) articles.push({ quantity: 1, price_data: { currency: "eur", unit_amount: centimes(commande.emballage), product_data: { name: "Emballage cadeau" } } });
  const sep = retour.includes("?") ? "&" : "?";
  let reduction: Record<string, unknown> | undefined;
  if (Number(commande.remise) > 0) {
    const coupon = await stripe("coupons", { amount_off: centimes(commande.remise), currency: "eur", duration: "once", name: commande.code_promo || "Remise" });
    reduction = { 0: { coupon: coupon.id } };
  }
  const session = await stripe("checkout/sessions", {
    ...(reduction ? { discounts: reduction } : {}),
    mode: "payment",
    locale: "fr",
    customer_email: commande.client_email,
    client_reference_id: commande.numero,
    line_items: Object.fromEntries(articles.map((a, i) => [i, a])),
    metadata: { commande_id: commande.id, numero: commande.numero },
    payment_intent_data: { description: `Commande ${commande.numero}`, metadata: { commande_id: commande.id, numero: commande.numero } },
    success_url: `${retour}${sep}jeton=${commande.jeton_suivi}&paiement=ok`,
    cancel_url: `${retour}${sep}jeton=${commande.jeton_suivi}&paiement=annule`,
  });
  await db(`commandes?id=eq.${commande.id}`, { method: "PATCH", body: JSON.stringify({ stripe_session_id: session.id, stripe_url: session.url }) });
  return session.url as string;
}

/** Vérifie l'en-tête Stripe-Signature (t=…,v1=…) : HMAC-SHA256 de « t.corps » avec le secret du webhook. */
export async function signatureStripeValide(corps: string, entete: string | null, secret: string, toleranceSecondes = 300) {
  if (!entete || !secret) return false;
  const morceaux = Object.fromEntries(entete.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(morceaux.t);
  const signatures = entete.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !signatures.length || Math.abs(Date.now() / 1000 - t) > toleranceSecondes) return false;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${t}.${corps}`)));
  const attendu = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => s.length === attendu.length && [...s].every((c, i) => c === attendu[i]));
}

// ---------- Utilitaires ----------
export const nomFichier = (nom: string) =>
  (nom || "photo").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60);

export const STATUTS: Record<string, string> = {
  nouvelle: "Commande reçue",
  maquette_envoyee: "Maquette envoyée",
  retouche: "Maquette en retouche",
  confirmee: "Maquette validée",
  en_fabrication: "En fabrication",
  prete: "Prête à retirer en boutique",
  expediee: "Expédiée",
  terminee: "Terminée",
  annulee: "Annulée",
};
export const euros = (n: number) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Champs d'une commande que le client a le droit de voir (jamais les notes internes). */
export const champsPublics = (c: any) => ({
  numero: c.numero,
  cree_le: c.cree_le,
  statut: c.statut,
  statut_libelle: STATUTS[c.statut] ?? c.statut,
  historique: c.historique,
  mode_reception: c.mode_reception,
  lignes: (c.lignes ?? []).map((l: any) => ({ nom: l.nom, quantite: l.quantite, variante: l.variante, texte: l.texte, total: l.total })),
  sous_total: c.sous_total,
  remise: c.remise,
  code_promo: c.code_promo,
  port: c.port,
  emballage: c.emballage,
  total: c.total,
  paiement_mode: c.paiement_mode,
  paiement_statut: c.paiement_statut,
  suivi_colis: c.suivi_colis,
});
