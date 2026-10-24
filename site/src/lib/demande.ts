// Demandes de devis envoyées depuis la page Contact.
// Avec Supabase configuré, la demande part vers la fonction `contact` (supabase/functions/contact)
// et arrive dans l'admin, onglet Demandes. Sans Supabase, on prépare un email au lieu d'une impasse.
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
  };
}

export async function envoyerDemande(c: ConfigServeur, d: Demande) {
  if (!serveurPret(c)) throw new Error("L'envoi en ligne n'est pas configuré.");
  return transport(c.supabaseUrl, c.supabaseCle, "contact", corpsContact(d));
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
