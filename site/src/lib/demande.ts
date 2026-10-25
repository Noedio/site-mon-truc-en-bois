// Demandes de devis envoyées depuis la page Contact.
// Avec Supabase configuré, la demande part vers la fonction `contact` (supabase/functions/contact)
// et arrive dans l'admin, onglet Demandes. Sans Supabase, on prépare un email au lieu d'une impasse.
// Les fichiers joints sont annoncés avec la demande ; le serveur répond avec une adresse d'envoi
// signée par fichier, et le navigateur les y dépose (deposerFichiers), comme les photos des commandes.
// Tout envoi passe par `transport` : le mode démo le remplace avec `remplacerTransport`.

export interface ConfigServeur { supabaseUrl: string; supabaseCle: string }

export interface Demande {
  nom: string;
  email: string;
  tel: string;
  projet: string; // type de projet choisi dans la liste
  quantite: number | null;
  date: string; // date souhaitée, AAAA-MM-JJ, ou vide
  message: string;
  consentement: boolean;
  piege: string; // champ caché rempli seulement par les robots
  fichiers?: File[]; // photos ou PDF, déposés après l'enregistrement de la demande
}

// ---------- Fichiers joints (mêmes limites que la fonction `contact` et le seau photos-clients) ----------

export const FICHIERS_MAX = 5;
export const FICHIER_TAILLE_MAX = 15 * 1024 * 1024;
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" };
export const ACCEPT_FICHIERS = [...new Set(Object.values(TYPES))].join(",") + ",.heic,.heif";

/** Type MIME d'un fichier ; certains navigateurs n'en donnent pas pour le HEIC : on lit l'extension. */
export const typeFichier = (f: File) => (Object.values(TYPES).includes(f.type) ? f.type : TYPES[f.name.split(".").pop()?.toLowerCase() ?? ""] ?? "");

/** Message d'erreur si le fichier ne peut pas être envoyé, sinon "". */
export function verifierFichier(f: File) {
  if (!typeFichier(f)) return `« ${f.name} » : format non accepté. Envoyez des photos (JPEG, PNG, WebP, HEIC) ou un PDF.`;
  if (!f.size) return `« ${f.name} » est vide.`;
  if (f.size > FICHIER_TAILLE_MAX) return `« ${f.name} » dépasse 15 Mo.`;
  return "";
}

/** « 850 Ko », « 2,4 Mo » */
export const tailleLisible = (octets: number) =>
  octets < 1024 * 1024 ? `${Math.max(1, Math.round(octets / 1024))} Ko` : `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

/** Dépose les fichiers aux adresses d'envoi données par le serveur ; renvoie les noms de ceux qui ont échoué. */
export async function deposerFichiers(envois: { fichier: number; url: string }[], fichiers: File[], progression?: (n: number) => void) {
  const rates: string[] = [];
  for (const [n, e] of envois.entries()) {
    const f = fichiers[e.fichier];
    if (!f) continue;
    progression?.(n + 1);
    try {
      const r = await fetch(e.url, { method: "PUT", headers: { "Content-Type": typeFichier(f) }, body: f });
      if (!r.ok) rates.push(f.name);
    } catch {
      rates.push(f.name);
    }
  }
  return rates;
}

type Transport = (url: string, cle: string, fonction: string, corps: unknown) => Promise<unknown>;

const parFetch: Transport = async (url, cle, fonction, corps) => {
  let r: Response;
  try {
    r = await fetch(`${url.replace(/\/$/, "")}/functions/v1/${fonction}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cle, Authorization: `Bearer ${cle}` },
      body: JSON.stringify(corps),
    });
  } catch {
    throw new Error("Connexion impossible : vérifiez votre accès à internet puis réessayez.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { erreur?: string }).erreur || `Erreur ${r.status}`);
  return d;
};

let transport: Transport = parFetch;
export const remplacerTransport = (t: Transport) => (transport = t);

export const serveurPret = (c: ConfigServeur) => Boolean(c.supabaseUrl && c.supabaseCle);

/** « 2026-12-24 » → « 24/12/2026 » */
const dateLisible = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : iso);

/** Corps attendu par la fonction `contact` ; elle n'a pas de champ date, la date rejoint le message. */
export function corpsContact(d: Demande) {
  const message = [d.message.trim(), d.date ? `Date souhaitée : ${dateLisible(d.date)}` : ""].filter(Boolean).join("\n\n");
  return {
    type: "devis",
    nom: d.nom.trim(),
    email: d.email.trim(),
    tel: d.tel.trim(),
    sujet: d.projet,
    quantite: d.quantite,
    message,
    consentement_marketing: d.consentement,
    site_web: d.piege,
    fichiers: (d.fichiers ?? []).map((f) => ({ nom: f.name, type: typeFichier(f), taille: f.size })),
  };
}

/** Réponse de la fonction `contact` : une adresse d'envoi par fichier annoncé. */
export interface ReponseDemande { recu: boolean; envois?: { fichier: number; url: string }[] }

export async function envoyerDemande(c: ConfigServeur, d: Demande) {
  if (!serveurPret(c)) throw new Error("L'envoi en ligne n'est pas configuré.");
  return (await transport(c.supabaseUrl, c.supabaseCle, "contact", corpsContact(d))) as ReponseDemande;
}

/** Récapitulatif en texte simple, repris dans l'email prérempli. */
export function recapitulatif(d: Demande) {
  const lignes = [
    `Nom : ${d.nom.trim()}`,
    `Email : ${d.email.trim()}`,
    d.tel.trim() ? `Téléphone : ${d.tel.trim()}` : "",
    `Projet : ${d.projet}`,
    d.quantite ? `Quantité : ${d.quantite}` : "",
    d.date ? `Date souhaitée : ${dateLisible(d.date)}` : "",
  ].filter(Boolean);
  return `${lignes.join("\n")}\n\n${d.message.trim()}`;
}

export const sujetEmail = (d: Demande) => `Demande de devis : ${d.projet}`;

export const lienEmail = (destinataire: string, d: Demande) =>
  `mailto:${destinataire}?subject=${encodeURIComponent(sujetEmail(d))}&body=${encodeURIComponent(recapitulatif(d))}`;
