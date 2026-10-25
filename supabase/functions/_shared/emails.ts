// Emails envoyés par le site, par Brevo (recommandé : société française, 300 emails/jour gratuits)
// ou par Resend. Sans clé, rien n'est envoyé et la commande reste visible dans l'admin :
// un email raté ne bloque jamais une commande.
import { cleDesinscription, env, euros, STATUTS } from "./outils.ts";

const echapper = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Message = { a: string; sujet: string; html: string; repondreA?: string; desinscription?: string };

/** Service d'envoi configuré : Brevo s'il a une clé, sinon Resend, sinon aucun. */
export const fournisseurEmail = () => (env("BREVO_API_KEY") ? "brevo" : env("RESEND_API_KEY") ? "resend" : null);

/** Expéditeur : « Nom <adresse> ». Par défaut l'adresse de la boutique (déjà validée chez Brevo à l'inscription). */
export function expediteur() {
  const brut = env("EMAIL_EXPEDITEUR") || (fournisseurEmail() === "resend" ? "Mon Truc en Bois <onboarding@resend.dev>" : `Mon Truc en Bois <${env("BOUTIQUE_EMAIL")}>`);
  const m = brut.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { nom: m[1].replace(/^"|"$/g, ""), email: m[2].trim() } : { nom: "Mon Truc en Bois", email: brut.trim() };
}

async function envoyerUn(m: Message): Promise<{ envoye: boolean; raison?: string }> {
  const service = fournisseurEmail();
  if (!service || !m.a) return { envoye: false, raison: "non configuré" };
  const exp = expediteur();
  const entetes = m.desinscription ? { "List-Unsubscribe": `<${m.desinscription}>` } : undefined;
  const r =
    service === "brevo"
      ? await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": env("BREVO_API_KEY"), "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            sender: { name: exp.nom, email: exp.email },
            to: [{ email: m.a }],
            subject: m.sujet,
            htmlContent: m.html,
            ...(m.repondreA ? { replyTo: { email: m.repondreA } } : {}),
            ...(entetes ? { headers: entetes } : {}),
          }),
        })
      : await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${exp.nom} <${exp.email}>`,
            to: [m.a],
            subject: m.sujet,
            html: m.html,
            ...(m.repondreA ? { reply_to: m.repondreA } : {}),
            ...(entetes ? { headers: entetes } : {}),
          }),
        });
  if (!r.ok) {
    console.error("Email non envoyé", service, r.status, await r.text());
    return { envoye: false, raison: `${service === "brevo" ? "Brevo" : "Resend"} ${r.status}` };
  }
  return { envoye: true };
}

export const envoyerEmail = (m: Message) => envoyerUn(m);

/** Envoi groupé (newsletter), 5 à la fois ; s'arrête à la première erreur du service (quota atteint…). */
export async function envoyerLot(messages: Omit<Message, "repondreA">[], repondreA?: string) {
  if (!fournisseurEmail()) return { envoyes: 0, raison: "non configuré" };
  let envoyes = 0;
  for (let i = 0; i < messages.length; i += 5) {
    const resultats = await Promise.all(messages.slice(i, i + 5).map((m) => envoyerUn({ ...m, repondreA })));
    envoyes += resultats.filter((r) => r.envoye).length;
    const echec = resultats.find((r) => !r.envoye);
    if (echec) return { envoyes, raison: echec.raison };
  }
  return { envoyes };
}

// ---------- Mise en page commune ----------
const site = () => env("SITE_URL").replace(/\/$/, "");
// Mise en page des emails : fond vert sauge, carte blanche, et pour les clients une signature des artisans.
// Mises en forme en ligne uniquement (les messageries ignorent les feuilles de style).
const SIGNATURE = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid #d7bf9c;padding-top:18px;width:100%">
        <tr><td style="width:64px;vertical-align:middle"><img src="__SITE__/img/logo-email.png" alt="" width="52" style="width:52px;height:auto;border-radius:50%"></td>
        <td style="vertical-align:middle;font-size:15px;line-height:1.45;color:#231a14">À très vite,<br><strong>Christophe et Laetitia</strong><br><span style="color:#6b5a4a;font-size:13px">Mon Truc en Bois · une question ? répondez simplement à cet email</span></td></tr>
      </table>`;
function gabarit(titre: string, corps: string, { pourClient = true, apercu = "" } = {}) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#efe6d8;font-family:Georgia,'Times New Roman',serif;color:#231a14">
  ${apercu ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${echapper(apercu)}</div>` : ""}
  <div style="max-width:600px;margin:0 auto;padding:28px 16px">
    <div style="text-align:center;padding:4px 0 18px"><a href="${site()}"><img src="${site()}/img/logo-email.png" alt="Mon Truc en Bois" width="104" style="width:104px;height:auto"></a></div>
    <div style="background:#fbf7f0;border:1px solid #231a14;border-radius:0;padding:30px 26px;font-size:16px;line-height:1.55">
      <h1 style="font-size:23px;line-height:1.25;margin:0 0 16px;color:#231a14">${echapper(titre)}</h1>
      ${corps}
      ${pourClient ? SIGNATURE.replace("__SITE__", site()) : ""}
    </div>
    <p style="text-align:center;color:#6b5a4a;font-size:13px;line-height:1.5;margin-top:18px">Mon Truc en Bois · 3 rue Salengro, 62260 Auchel<br><a href="${site()}" style="color:#231a14">${site().replace(/^https?:\/\//, "")}</a></p>
  </div></body></html>`;
}
const bouton = (url: string, texte: string) =>
  `<p style="margin:24px 0"><a href="${echapper(url)}" style="background:#231a14;color:#fff;text-decoration:none;padding:14px 24px;border-radius:0;font-weight:bold;font-size:16px;display:inline-block">${echapper(texte)}</a></p>`;

function recapitulatif(c: any) {
  const lignes = (c.lignes ?? [])
    .map(
      (l: any) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">
          <strong>${echapper(l.nom)}</strong> × ${l.quantite}
          ${l.variante ? `<br><span style="color:#6b5a4a">${echapper(l.variante)}</span>` : ""}
          ${l.texte ? `<br><span style="color:#6b5a4a">Texte : « ${echapper(l.texte)} »${l.police ? ` (${echapper(l.police)})` : ""}</span>` : ""}
          ${l.photo_nom ? `<br><span style="color:#6b5a4a">Photo : ${echapper(l.photo_nom)}</span>` : ""}
          ${l.remarque ? `<br><span style="color:#6b5a4a">Précisions : ${echapper(l.remarque)}</span>` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${euros(l.total)}</td>
      </tr>`
    )
    .join("");
  const ligne = (libelle: string, montant: number, gras = false) =>
    `<tr><td style="padding:4px 0;${gras ? "font-weight:bold" : ""}">${libelle}</td><td style="padding:4px 0;text-align:right;${gras ? "font-weight:bold" : ""}">${euros(montant)}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${lignes}
    ${ligne("Sous-total", c.sous_total)}
    ${Number(c.remise) ? ligne(`Remise${c.code_promo ? ` (${echapper(c.code_promo)})` : ""}`, -Number(c.remise)) : ""}
    ${Number(c.port) ? ligne("Livraison", c.port) : ""}
    ${Number(c.emballage) ? ligne("Emballage cadeau", c.emballage) : ""}
    ${ligne("Total", c.total, true)}
  </table>`;
}
const lienSuivi = (c: any) => `${site()}/suivi.html?jeton=${c.jeton_suivi}`;
// Les boutons « Payer » passent par la page de suivi, qui crée un paiement Stripe neuf à chaque clic :
// un lien Stripe direct expire au bout de 24 h, celui-ci marche tant que la commande attend son paiement.
const lienPayer = (c: any) => `${lienSuivi(c)}&payer=1`;
const MODES_PAIEMENT: Record<string, string> = {
  en_ligne: "Paiement en ligne par carte",
  apres_validation: "Paiement après validation de la maquette (nous vous envoyons un lien de paiement)",
  boutique: "Paiement à la boutique lors du retrait",
};

// ---------- Emails ----------
export function emailNouvelleCommande(c: any) {
  return {
    sujet: `Nouvelle commande ${c.numero} · ${euros(c.total)}`,
    html: gabarit(`Nouvelle commande ${c.numero}`, `
      <p><strong>${echapper(c.client_nom)}</strong><br>${echapper(c.client_email)} · ${echapper(c.client_tel)}<br>
      ${c.mode_reception === "retrait" ? "Retrait à la boutique" : `Livraison : ${echapper(c.adresse)}`}</p>
      <p>${echapper(MODES_PAIEMENT[c.paiement_mode] ?? c.paiement_mode)}</p>
      ${c.cadeau?.message ? `<p>Message pour la carte : « ${echapper(c.cadeau.message)} »</p>` : ""}
      ${c.cadeau?.date ? `<p>Date souhaitée : ${echapper(new Date(c.cadeau.date).toLocaleDateString("fr-FR"))}</p>` : ""}
      ${c.message ? `<p>Message : ${echapper(c.message)}</p>` : ""}
      ${recapitulatif(c)}
      ${bouton(`${site()}/admin.html#commandes`, "Ouvrir dans l'admin")}`, { pourClient: false }),
  };
}

export function emailConfirmationClient(c: any, paiementUrl?: string) {
  return {
    sujet: `Votre commande ${c.numero} chez Mon Truc en Bois`,
    html: gabarit("Merci pour votre commande !", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>Nous avons bien reçu votre commande <strong>${c.numero}</strong>. Nous revenons vers vous rapidement pour valider la personnalisation (avec une maquette si besoin).</p>
      <p><strong>${echapper(MODES_PAIEMENT[c.paiement_mode] ?? "")}</strong></p>
      ${paiementUrl || (c.paiement_mode === "en_ligne" && c.paiement_statut !== "paye") ? bouton(lienPayer(c), "Payer ma commande") : ""}
      ${recapitulatif(c)}
      ${bouton(lienSuivi(c), "Suivre ma commande")}
`, { apercu: `Commande ${c.numero} bien reçue : nous revenons vers vous pour valider la personnalisation.` }),
  };
}

export function emailPaiementRecu(c: any) {
  return {
    sujet: `Paiement reçu pour la commande ${c.numero}`,
    html: gabarit("Paiement bien reçu", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>Nous avons bien reçu votre paiement de <strong>${euros(c.total)}</strong> pour la commande <strong>${c.numero}</strong>${c.facture_numero ? ` (facture ${c.facture_numero})` : ""}. Merci !</p>
      ${bouton(lienSuivi(c), "Suivre ma commande")}`),
  };
}

export function emailPaiementRecuBoutique(c: any) {
  return {
    sujet: `Paiement reçu : ${c.numero} · ${euros(c.total)}`,
    html: gabarit(`Paiement reçu pour ${c.numero}`, `<p>${echapper(c.client_nom)} a payé ${euros(c.total)} en ligne.</p>${bouton(`${site()}/admin.html#commandes`, "Ouvrir dans l'admin")}`, { pourClient: false }),
  };
}

export function emailPaiementInattendu(c: any) {
  const etat = c.paiement_statut === "rembourse" ? "déjà remboursée" : "annulée";
  return {
    sujet: `À vérifier : paiement reçu pour la commande ${c.numero} (${etat})`,
    html: gabarit(`Paiement reçu pour une commande ${etat}`, `
      <p>${echapper(c.client_nom)} vient de payer ${euros(c.total)} par carte pour la commande <strong>${c.numero}</strong>, qui est ${etat}.</p>
      <p>La commande n'a pas été modifiée. Ouvrez l'application Stripe pour rembourser ce paiement, ou reprenez la commande avec le client.</p>
      ${bouton(`${site()}/admin.html#commandes`, "Ouvrir dans l'admin")}`, { pourClient: false }),
  };
}

// Où en est la commande : cinq étapes, celle en cours en brûlé (rien pour une commande annulée)
function frise(c: any) {
  const etapes = ["maquette_envoyee", "confirmee", "en_fabrication", c.mode_reception === "livraison" ? "expediee" : "prete", "terminee"];
  const libelles: Record<string, string> = { maquette_envoyee: "Maquette envoyée", confirmee: "Maquette validée", en_fabrication: "En fabrication", prete: "Prête", expediee: "Expédiée", terminee: "Terminée" };
  const rang = etapes.indexOf(c.statut === "retouche" ? "maquette_envoyee" : c.statut);
  if (rang < 0) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0 6px;border-collapse:separate;border-spacing:4px 0"><tr>${etapes
    .map((e, i) => `<td style="width:20%;padding-top:8px;border-top:4px solid ${i <= rang ? "#231a14" : "#d7bf9c"};font-size:12px;color:${i === rang ? "#231a14" : "#6b5a4a"};${i === rang ? "font-weight:bold;" : ""}vertical-align:top">${libelles[e]}</td>`)
    .join("")}</tr></table>`;
}

export function emailStatut(c: any, message = "") {
  const textes: Record<string, string> = {
    maquette_envoyee: "La maquette de votre gravure est prête : nous vous l'avons envoyée. Dites-nous si elle vous convient ou ce qu'il faut changer.",
    retouche: "Nous reprenons votre maquette avec vos remarques ; la nouvelle version arrive très vite.",
    confirmee: "Votre maquette est validée : nous lançons la fabrication très bientôt.",
    en_fabrication: "Votre création est en cours de fabrication.",
    prete: "Bonne nouvelle : votre commande est prête ! Vous pouvez venir la retirer à la boutique aux heures d'ouverture.",
    expediee: `Votre commande est partie !${c.suivi_colis ? ` Numéro de suivi : <strong>${echapper(c.suivi_colis)}</strong>` : ""}`,
    terminee: "Votre commande est terminée. Merci pour votre confiance ! Un avis nous aiderait beaucoup.",
    annulee: "Votre commande a été annulée. N'hésitez pas à nous contacter pour toute question.",
  };
  return {
    sujet: `Commande ${c.numero} : ${STATUTS[c.statut] ?? c.statut}`,
    html: gabarit(STATUTS[c.statut] ?? "Votre commande", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>${textes[c.statut] ?? "Le statut de votre commande a changé."}</p>
      ${frise(c)}
      ${message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(message).replace(/\n/g, "<br>")}</p>` : ""}
      ${bouton(lienSuivi(c), "Voir ma commande")}`),
  };
}

export function emailLienPaiement(c: any, message = "") {
  return {
    sujet: `Commande ${c.numero} : votre lien de paiement`,
    html: gabarit("Votre commande est prête à être réglée", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>Voici le lien pour régler votre commande <strong>${c.numero}</strong> (${euros(c.total)}) en toute sécurité par carte bancaire.</p>
      ${message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(message).replace(/\n/g, "<br>")}</p>` : ""}
      ${bouton(lienPayer(c), `Payer ${euros(c.total)}`)}
      ${recapitulatif(c)}`),
  };
}

/** Ce que l'on peut rappeler au client : la maquette à valider, ou le paiement d'une maquette validée. */
export function sujetRelance(c: any): "maquette" | "paiement" | null {
  if (c.statut === "maquette_envoyee") return "maquette";
  const apresValidation = ["confirmee", "en_fabrication", "prete", "expediee", "terminee"].includes(c.statut);
  // Un rappel de paiement n'a de sens que si le client peut payer : lien déjà envoyé, ou paiement en ligne choisi à la commande
  if (c.paiement_statut === "en_attente" && apresValidation && (c.paiement_mode === "en_ligne" || c.stripe_url)) return "paiement";
  return null;
}

/** Rappel envoyé par la boutique depuis l'admin (liste « À faire »). */
export function emailRelance(c: any, message = "") {
  const sujet = sujetRelance(c);
  const bonjour = `<p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>`;
  const mot = message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(message).replace(/\n/g, "<br>")}</p>` : "";
  if (sujet === "maquette") {
    const envoi = [...(c.historique ?? [])].reverse().find((h: any) => h.statut === "maquette_envoyee")?.date;
    const le = envoi ? ` le ${new Date(envoi).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}` : "";
    return {
      sujet: `Commande ${c.numero} : votre maquette attend votre réponse`,
      html: gabarit("Votre maquette attend votre réponse", `${bonjour}
      <p>Nous vous avons envoyé${le} la maquette de votre commande <strong>${c.numero}</strong>. Nous lançons la gravure dès que vous l'avez validée.</p>
      <p>Répondez simplement à cet email : « c'est bon pour moi », ou ce qu'il faut changer.</p>
      ${mot}
      ${bouton(lienSuivi(c), "Voir ma commande")}`),
    };
  }
  if (sujet === "paiement") {
    return {
      sujet: `Commande ${c.numero} : rappel de paiement`,
      html: gabarit("Votre commande attend son règlement", `${bonjour}
      <p>Votre commande <strong>${c.numero}</strong> (${euros(c.total)}) n'est pas encore réglée. Vous pouvez la payer par carte bancaire en suivant ce lien.</p>
      ${mot}
      ${bouton(lienPayer(c), `Payer ${euros(c.total)}`)}
      <p style="color:#6b5a4a;font-size:14px">Déjà réglé ? Ne tenez pas compte de ce message, et merci !</p>`),
    };
  }
  return null;
}

// ---------- Demandes (devis, contact, newsletter) et messages libres ----------
const TYPES: Record<string, string> = { devis: "Demande de devis", contact: "Message", newsletter: "Inscription à la newsletter" };
export function emailDemandeBoutique(d: any) {
  return {
    sujet: `${TYPES[d.type] ?? "Demande"} : ${d.nom}${d.sujet ? ` (${d.sujet})` : ""}`,
    html: gabarit(TYPES[d.type] ?? "Nouvelle demande", `
      <p><strong>${echapper(d.nom)}</strong><br>${echapper(d.email)}${d.tel ? ` · ${echapper(d.tel)}` : ""}</p>
      ${d.sujet ? `<p>Sujet : <strong>${echapper(d.sujet)}</strong>${d.quantite ? ` · quantité : ${d.quantite}` : ""}</p>` : ""}
      ${d.message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(d.message).replace(/\n/g, "<br>")}</p>` : ""}
      ${bouton(`${site()}/admin.html#demandes`, "Ouvrir dans l'admin")}`, { pourClient: false }),
  };
}
export async function emailAccuseDemande(d: any) {
  const texte =
    d.type === "newsletter"
      ? "Merci, vous êtes bien inscrit(e) : vous recevrez nos nouveautés et idées cadeaux. Vous pouvez vous désinscrire à tout moment depuis notre site."
      : "Nous avons bien reçu votre demande et nous vous répondons très vite (en général sous 48 h).";
  return {
    sujet: d.type === "newsletter" ? "Inscription confirmée chez Mon Truc en Bois" : "Mon Truc en Bois a bien reçu votre demande",
    html: gabarit(d.type === "newsletter" ? "Bienvenue !" : "Merci pour votre message", `
      <p>Bonjour ${echapper(String(d.nom || "").split(" ")[0])},</p><p>${texte}</p>
      ${d.type === "newsletter" ? `<p style="font-size:13px;color:#6b5a4a"><a href="${await lienDesinscription(d.email)}" style="color:#6b5a4a">Se désinscrire</a></p>` : ""}`),
  };
}
export function emailLibre(nom: string, sujet: string, message: string) {
  return {
    sujet,
    html: gabarit(sujet, `<p>Bonjour ${echapper(String(nom || "").split(" ")[0])},</p>
      <p style="white-space:pre-line">${echapper(message)}</p>
`),
  };
}

// ---------- Newsletter / promotion envoyée aux clients abonnés ----------
export const lienDesinscription = async (email: string) =>
  `${site()}/newsletter.html?desinscription=1&email=${encodeURIComponent(email)}&cle=${await cleDesinscription(email)}`;
export async function emailCampagne(c: { nom?: string; email: string; sujet: string; message: string; lien?: string; texte_lien?: string }) {
  const desinscription = await lienDesinscription(c.email);
  return {
    a: c.email,
    sujet: c.sujet,
    desinscription,
    html: gabarit(c.sujet, `${c.nom ? `<p>Bonjour ${echapper(String(c.nom).split(" ")[0])},</p>` : ""}
      <p style="white-space:pre-line">${echapper(c.message)}</p>
      ${c.lien ? bouton(c.lien, c.texte_lien || "Découvrir") : ""}
      <p style="font-size:12px;color:#6b5a4a;margin-top:24px">Vous recevez cet email car vous êtes inscrit(e) aux nouveautés de Mon Truc en Bois.
      <a href="${desinscription}" style="color:#6b5a4a">Se désinscrire</a></p>`),
  };
}

/** Demande de désinscription sans le lien personnel (formulaire du site) : on écrit à l'adresse pour confirmer. */
export async function emailConfirmerDesinscription(email: string) {
  return {
    sujet: "Confirmez votre désinscription de Mon Truc en Bois",
    html: gabarit("Ne plus recevoir nos emails", `
      <p>Bonjour,</p>
      <p>Vous avez demandé à ne plus recevoir nos nouveautés et promotions. Cliquez sur le bouton pour confirmer.</p>
      ${bouton(await lienDesinscription(email), "Confirmer ma désinscription")}
      <p style="color:#6b5a4a;font-size:14px">Ce n'est pas vous ? Ignorez simplement cet email : rien ne change.</p>`),
  };
}
