// POST /functions/v1/admin — actions réservées à la boutique (connectée à son compte Supabase) :
//   etat           : ce qui est configuré côté serveur (Stripe, webhook, emails…)
//   lien_paiement  : crée un lien de paiement Stripe pour une commande (et l'envoie au client si demandé)
//   notifier       : envoie au client un email sur l'avancement de sa commande,
//                    ou un rappel (relance : maquette à valider, paiement) dont la date est gardée dans relance_le
//   photos         : liens temporaires pour télécharger les photos envoyées par le client
//   creer_commande : vente en boutique, commande par téléphone ou sur un salon
//   email_client   : message libre à un client (CRM)
//   campagne       : email (nouveautés, promotion) aux clients abonnés, ou essai à la boutique
//   contenu_lire, contenu_publier, photo_publier : le commerçant modifie le site sans compte GitHub
//                    (le serveur publie avec une clé GitHub limitée au contenu, gardée dans ses secrets)
import {
  catalogue, chercherCodePromo, compterUtilisation, creerPaiementStripe, db, enregistrerClient, env, ErreurClient, json, lireJson, montantRemise, servir, urlLecturePhoto,
} from "../_shared/outils.ts";
import { emailCampagne, emailLibre, emailLienPaiement, emailRelance, emailStatut, envoyerEmail, envoyerLot, expediteur, fournisseurEmail } from "../_shared/emails.ts";

type LigneSaisie = { id?: string; nom?: string; prix_unitaire?: number; quantite?: number; texte?: string; remarque?: string; variante?: string };
type Demande = {
  action: "etat" | "lien_paiement" | "notifier" | "photos" | "creer_commande" | "email_client" | "campagne" | "contenu_lire" | "contenu_publier" | "photo_publier";
  contenu?: string; // base64
  sha?: string;
  chemin?: string;
  lien?: string;
  texte_lien?: string;
  essai?: boolean;
  commande_id?: string;
  envoyer?: boolean;
  relance?: boolean;
  message?: string;
  sujet?: string;
  email?: string;
  nom?: string;
  vente?: {
    client?: { id?: string; nom?: string; email?: string; tel?: string; adresse?: string; consentement?: boolean };
    lignes: LigneSaisie[];
    canal?: "boutique" | "telephone" | "salon";
    mode_reception?: "retrait" | "livraison";
    statut?: string;
    paiement_statut?: "paye" | "en_attente";
    paiement_moyen?: string;
    remise?: number;
    code_promo?: string;
    port?: number;
    notes?: string;
    date_souhaitee?: string;
    echeance?: string; // date « prête le » fixée à la vente (AAAA-MM-JJ), sinon calculée par l'admin
  };
};

async function verifierAdmin(req: Request) {
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) throw new ErreurClient("Connexion requise.", 401);
  const r = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: env("SUPABASE_ANON_KEY", env("SUPABASE_SERVICE_ROLE_KEY")), Authorization: `Bearer ${jeton}` },
  });
  if (!r.ok) throw new ErreurClient("Session expirée : reconnectez-vous.", 401);
  const utilisateur = await r.json();
  const admins = await db<any[]>(`admins?user_id=eq.${utilisateur.id}&select=user_id`);
  if (!admins.length) throw new ErreurClient("Ce compte n'a pas accès à la gestion des commandes.", 403);
  return utilisateur;
}

// ---------- Publication du contenu du site (dépôt GitHub) ----------
const FICHIER_CONTENU = "data/donnees.js";
async function github(chemin: string, init: RequestInit = {}) {
  const jeton = env("CONTENU_GITHUB_TOKEN");
  if (!jeton || !env("CONTENU_DEPOT")) throw new ErreurClient("La publication depuis le serveur n'est pas encore configurée (onglet Installation).", 503);
  const r = await fetch(`https://api.github.com/repos/${env("CONTENU_DEPOT")}/contents/${chemin}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${jeton}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "mon-truc-en-bois", ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 409 || r.status === 422) throw new ErreurClient("Le site a été modifié ailleurs entre-temps : rechargez la page.", 409);
  if (r.status === 401) throw new ErreurClient("La clé de publication a expiré ou a été révoquée : prévenez votre agence.", 502);
  if (!r.ok) throw new ErreurClient(`Publication impossible (GitHub ${r.status}) : prévenez votre agence.`, 502);
  return { d, expiration: r.headers.get("github-authentication-token-expiration") };
}
const branche = () => env("CONTENU_BRANCHE", "main");
const auteur = (u: any) => ({ name: `Admin ${String(u.email ?? "").split("@")[0]}`.slice(0, 60), email: u.email || "admin@boutique.invalid" });
function verifierContenu(base64: string) {
  if (!base64 || base64.length > 3_000_000) throw new ErreurClient("Contenu manquant ou trop volumineux.");
  const texte = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  const i = texte.search(/^window\.DONNEES = /m);
  if (i < 0) throw new ErreurClient("Contenu invalide.");
  // Le fichier ne doit contenir que des commentaires puis les données JSON : aucun code ne peut s'y glisser.
  if (texte.slice(0, i).split("\n").some((l) => l.trim() && !l.trim().startsWith("//"))) throw new ErreurClient("Contenu invalide.");
  let d: any;
  try {
    d = JSON.parse(texte.slice(i + "window.DONNEES = ".length).trim().replace(/;\s*$/, ""));
  } catch {
    throw new ErreurClient("Contenu invalide (JSON).");
  }
  if (!d?.site || !Array.isArray(d.produits)) throw new ErreurClient("Contenu invalide.");
}

const arrondi = (n: number) => Math.round(n * 100) / 100;
const dateValide = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) && !isNaN(Date.parse(String(v)));
const texte = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

async function creerVente(v: NonNullable<Demande["vente"]>) {
  if (!Array.isArray(v.lignes) || !v.lignes.length) throw new ErreurClient("Ajoutez au moins un article.");
  const D = await catalogue();
  // Assujetti à la TVA : les espèces doivent être enregistrées sur une caisse certifiée (art. 286 du CGI)
  if (D.site?.legal?.regimeTva === "assujetti" && v.paiement_statut === "paye" && v.paiement_moyen === "especes")
    throw new ErreurClient("Les paiements en espèces doivent être enregistrés sur votre caisse certifiée.");
  const lignes = v.lignes.map((l) => {
    const p = l.id ? (D.produits ?? []).find((x: any) => x.id === l.id) : null;
    const nom = texte(l.nom || p?.nom, 160);
    if (!nom) throw new ErreurClient("Chaque article doit avoir un nom.");
    const quantite = Math.trunc(Number(l.quantite ?? 1));
    if (!(quantite >= 1 && quantite <= 999)) throw new ErreurClient("Quantité invalide.");
    const prix_unitaire = arrondi(Number(l.prix_unitaire ?? p?.prix ?? NaN));
    if (!(prix_unitaire >= 0)) throw new ErreurClient(`Prix manquant pour « ${nom} ».`);
    return { id: p?.id ?? "", nom, quantite, prix_unitaire, total: arrondi(prix_unitaire * quantite), variante: texte(l.variante, 120), texte: texte(l.texte, 200), police: "", remarque: texte(l.remarque, 500), photo_nom: "", photo_type: "", photo_chemin: "" };
  });
  const sous_total = arrondi(lignes.reduce((t, l) => t + l.total, 0));
  const port = arrondi(Math.max(0, Number(v.port ?? 0)));
  // Code promo donné en caisse : vérifié et compté comme sur le site ; il remplace la remise saisie à la main
  const promo = texte(v.code_promo, 30) ? await chercherCodePromo(v.code_promo, sous_total) : null;
  const remise = promo ? montantRemise(promo, sous_total) : arrondi(Math.min(sous_total, Math.max(0, Number(v.remise ?? 0))));

  const c = v.client ?? {};
  const nomSaisi = texte(c.nom, 120);
  const emailSaisi = texte(c.email, 160).toLowerCase();
  if (nomSaisi && nomSaisi.length < 2) throw new ErreurClient("Le nom du client doit faire au moins 2 lettres.");
  if (emailSaisi && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailSaisi)) throw new ErreurClient("Adresse email du client invalide.");
  let fiche: any = null;
  if (c.id) [fiche] = await db<any[]>(`clients?id=eq.${encodeURIComponent(c.id)}`);
  // Une fiche n'est créée que si l'on sait qui est le client (nom, email ou téléphone), jamais pour une simple adresse.
  else if (nomSaisi || emailSaisi || texte(c.tel, 30)) fiche = await enregistrerClient({ nom: nomSaisi, email: emailSaisi, tel: texte(c.tel, 30), adresse: texte(c.adresse, 400), source: v.canal ?? "boutique", consentement: !!c.consentement });

  await compterUtilisation(promo);
  const canal = ["boutique", "telephone", "salon"].includes(v.canal ?? "") ? v.canal : "boutique";
  const paye = v.paiement_statut === "paye";
  const [commande] = await db<any[]>("commandes", {
    method: "POST",
    body: JSON.stringify({
      client_id: fiche?.id ?? null,
      canal,
      client_nom: (fiche?.nom && fiche.nom.length >= 2 ? fiche.nom : "") || nomSaisi || "Client en boutique",
      client_email: fiche?.email || emailSaisi || "sans-email@boutique.invalid",
      client_tel: fiche?.tel || texte(c.tel, 30),
      adresse: v.mode_reception === "livraison" ? fiche?.adresse || texte(c.adresse, 400) : "",
      mode_reception: v.mode_reception === "livraison" ? "livraison" : "retrait",
      lignes,
      sous_total,
      port,
      emballage: 0,
      remise,
      code_promo: promo?.code ?? "",
      total: arrondi(Math.max(0, sous_total + port - remise)),
      paiement_mode: paye || canal === "boutique" ? "boutique" : "apres_validation", // réglée sur place, ou à régler plus tard
      paiement_statut: paye ? "paye" : "en_attente",
      paiement_moyen: texte(v.paiement_moyen, 30),
      // Réglée et remise sur place (boutique, salon) : terminée. Commande par téléphone ou à livrer : à traiter.
      statut: ["nouvelle", "maquette_envoyee", "retouche", "confirmee", "en_fabrication", "prete", "expediee", "terminee"].includes(v.statut ?? "") ? v.statut : paye && canal !== "telephone" && v.mode_reception !== "livraison" ? "terminee" : "nouvelle",
      notes: texte(v.notes, 2000),
      cadeau: /^\d{4}-\d{2}-\d{2}$/.test(v.date_souhaitee ?? "") ? { date: v.date_souhaitee } : {},
      ...(dateValide(v.echeance) ? { echeance: v.echeance } : {}),
    }),
  });
  return commande;
}

export const traiter = servir(async (req) => {
  const utilisateur = await verifierAdmin(req);
  const d = await lireJson<Demande>(req, 6_000_000);

  if (d.action === "etat") {
    const cle = env("STRIPE_SECRET_KEY");
    return json(req, {
      stripe: !!cle,
      stripe_mode: cle ? (cle.startsWith("sk_live_") || cle.startsWith("rk_live_") ? "production" : "test") : null,
      webhook: !!env("STRIPE_WEBHOOK_SECRET"),
      emails: !!fournisseurEmail(),
      emails_service: fournisseurEmail(),
      expediteur: fournisseurEmail() ? `${expediteur().nom} <${expediteur().email}>` : "",
      boutique_email: env("BOUTIQUE_EMAIL"),
      site_url: env("SITE_URL"),
      publication: !!(env("CONTENU_GITHUB_TOKEN") && env("CONTENU_DEPOT")),
      publication_expiration: env("CONTENU_GITHUB_TOKEN") && env("CONTENU_DEPOT") ? await github(`${FICHIER_CONTENU}?ref=${branche()}`).then((r) => r.expiration ?? "", () => "erreur") : null,
    });
  }
  if (d.action === "contenu_lire") {
    const { d: f } = await github(`${FICHIER_CONTENU}?ref=${encodeURIComponent(branche())}&t=${Date.now()}`);
    return json(req, { content: f.content, sha: f.sha });
  }
  if (d.action === "contenu_publier") {
    verifierContenu(d.contenu ?? "");
    if (!/^[0-9a-f]{40}$/.test(d.sha ?? "")) throw new ErreurClient("Version du contenu manquante : rechargez la page.");
    const { d: r } = await github(FICHIER_CONTENU, {
      method: "PUT",
      body: JSON.stringify({ message: texte(d.message, 200) || "Mise à jour du contenu du site (admin)", content: d.contenu, sha: d.sha, branch: branche(), committer: auteur(utilisateur) }),
    });
    return json(req, { content: { sha: r.content?.sha }, commit: { sha: r.commit?.sha } });
  }
  if (d.action === "photo_publier") {
    const chemin = String(d.chemin ?? "");
    if (!/^img\/[a-z0-9-]{1,80}\.jpg$/.test(chemin)) throw new ErreurClient("Nom de photo invalide.");
    const contenu = String(d.contenu ?? "");
    if (!contenu || contenu.length > 4_000_000 || !contenu.startsWith("/9j/")) throw new ErreurClient("Photo invalide (JPEG de 3 Mo maximum).");
    const { d: r } = await github(chemin, { method: "PUT", body: JSON.stringify({ message: `Ajout de la photo ${chemin} (admin)`, content: contenu, branch: branche(), committer: auteur(utilisateur) }) });
    return json(req, { content: { sha: r.content?.sha } }, 201);
  }
  if (d.action === "creer_commande") {
    if (!d.vente) throw new ErreurClient("Vente manquante.");
    return json(req, { commande: await creerVente(d.vente) }, 201);
  }
  if (d.action === "email_client") {
    const email = texte(d.email, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErreurClient("Adresse email invalide.");
    if (texte(d.sujet, 160).length < 2 || texte(d.message, 10_000).length < 2) throw new ErreurClient("Indiquez un sujet et un message.");
    const r = await envoyerEmail({ a: email, ...emailLibre(texte(d.nom, 120), texte(d.sujet, 160), texte(d.message, 10_000)), repondreA: env("BOUTIQUE_EMAIL") || undefined });
    if (!r.envoye) throw new ErreurClient(`Email non envoyé (${r.raison}).`);
    return json(req, { email_envoye: true });
  }

  if (d.action === "campagne") {
    const sujet = texte(d.sujet, 160);
    const message = texte(d.message, 10_000);
    if (sujet.length < 2 || message.length < 2) throw new ErreurClient("Indiquez un sujet et un message.");
    const lien = /^https:\/\/\S+$/.test(texte(d.lien, 500)) ? texte(d.lien, 500) : "";
    const contenu = { sujet, message, lien, texte_lien: texte(d.texte_lien, 60) };
    const boutique = env("BOUTIQUE_EMAIL") || (await catalogue()).site?.email;
    if (d.essai) {
      const r = await envoyerEmail({ ...(await emailCampagne({ ...contenu, email: boutique, nom: "" })), a: boutique });
      if (!r.envoye) throw new ErreurClient(`Email d'essai non envoyé (${r.raison}).`);
      return json(req, { essai: true, a: boutique });
    }
    const abonnes = await db<any[]>("clients?consentement_marketing=eq.true&email=not.is.null&select=nom,email&limit=5000");
    if (!abonnes.length) throw new ErreurClient("Aucun client abonné pour l'instant.");
    const r = await envoyerLot(await Promise.all(abonnes.map((c) => emailCampagne({ ...contenu, email: c.email, nom: c.nom }))), boutique);
    if (r.raison && !r.envoyes) throw new ErreurClient(`Envoi impossible (${r.raison}).`);
    await db("campagnes", { method: "POST", body: JSON.stringify({ sujet, message, lien, texte_lien: contenu.texte_lien, destinataires: r.envoyes }) });
    return json(req, { envoyes: r.envoyes, total: abonnes.length, raison: r.raison ?? "" });
  }

  if (!/^[0-9a-f-]{36}$/i.test(d.commande_id ?? "")) throw new ErreurClient("Commande invalide.");
  const [commande] = await db<any[]>(`commandes?id=eq.${d.commande_id}`);
  if (!commande) throw new ErreurClient("Commande introuvable.", 404);

  if (d.action === "lien_paiement") {
    if (!env("STRIPE_SECRET_KEY")) throw new ErreurClient("Le paiement en ligne n'est pas configuré (clé Stripe manquante).");
    if (commande.paiement_statut === "paye") throw new ErreurClient("Cette commande est déjà payée.");
    if (commande.paiement_statut === "rembourse") throw new ErreurClient("Cette commande a été remboursée : créez une nouvelle vente si le client doit payer à nouveau.");
    if (commande.statut === "annulee") throw new ErreurClient("Cette commande est annulée.");
    const site = env("SITE_URL").replace(/\/$/, "");
    const url = await creerPaiementStripe(commande, `${site}/suivi.html`);
    const email = d.envoyer && !commande.client_email.endsWith(".invalid") ? await envoyerEmail({ a: commande.client_email, ...emailLienPaiement(commande, d.message) }) : null;
    // Lien envoyé : c'est le premier rappel, la relance du paiement se calera sur cette date
    if (email?.envoye) await db(`commandes?id=eq.${commande.id}`, { method: "PATCH", body: JSON.stringify({ relance_le: new Date().toISOString() }) });
    return json(req, { url, lien: `${site}/suivi.html?jeton=${commande.jeton_suivi}&payer=1`, email_envoye: !!email?.envoye });
  }
  if (d.action === "notifier") {
    if (commande.client_email.endsWith(".invalid")) throw new ErreurClient("Ce client n'a pas d'adresse email.");
    const contenu = d.relance ? emailRelance(commande, d.message) : emailStatut(commande, d.message);
    if (!contenu) throw new ErreurClient("Rien à rappeler au client pour cette commande.");
    const email = await envoyerEmail({ a: commande.client_email, ...contenu });
    if (!email.envoye) throw new ErreurClient(`Email non envoyé (${email.raison}).`);
    if (!d.relance) return json(req, { email_envoye: true });
    const relance_le = new Date().toISOString();
    await db(`commandes?id=eq.${commande.id}`, { method: "PATCH", body: JSON.stringify({ relance_le }) });
    return json(req, { email_envoye: true, relance_le });
  }
  if (d.action === "photos") {
    const photos = await Promise.all(
      (commande.lignes ?? []).map(async (l: any, i: number) => (l.photo_chemin ? { ligne: i, nom: l.photo_nom, url: await urlLecturePhoto(l.photo_chemin) } : null))
    );
    return json(req, { photos: photos.filter(Boolean) });
  }
  throw new ErreurClient("Action inconnue.");
});

if (import.meta.main) Deno.serve(traiter);
