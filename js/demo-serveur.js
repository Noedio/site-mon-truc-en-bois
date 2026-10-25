// supabase/functions/_shared/outils.ts
var env = (cle, defaut = "") => Deno.env.get(cle) ?? defaut;
var ErreurClient = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message), this.status = status;
  }
};
function origineAutorisee(req) {
  const origine = req.headers.get("Origin") ?? "";
  const autorisees = env("SITE_ORIGINES", "*").split(",").map((o) => o.trim()).filter(Boolean);
  if (autorisees.includes("*")) return "*";
  return autorisees.includes(origine) ? origine : autorisees[0] ?? "";
}
function entetesCors(req) {
  return {
    "Access-Control-Allow-Origin": origineAutorisee(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}
var json = (req, donnees, status = 200) => new Response(JSON.stringify(donnees), {
  status,
  headers: {
    ...entetesCors(req),
    "Content-Type": "application/json; charset=utf-8"
  }
});
function servir(traiter6) {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", {
      headers: entetesCors(req)
    });
    if (req.method === "GET" && new URL(req.url).searchParams.has("sante")) {
      try {
        await db("admins?select=user_id&limit=1");
        return json(req, {
          ok: true
        });
      } catch {
        return json(req, {
          ok: false
        }, 503);
      }
    }
    if (req.method !== "POST") return json(req, {
      erreur: "M\xE9thode non autoris\xE9e"
    }, 405);
    try {
      return await traiter6(req);
    } catch (e) {
      if (e instanceof ErreurClient) return json(req, {
        erreur: e.message
      }, e.status);
      console.error(e);
      return json(req, {
        erreur: "Erreur du serveur. R\xE9essayez dans un instant ou contactez la boutique."
      }, 500);
    }
  };
}
async function lireJson(req, maxOctets = 2e5) {
  const texte4 = await req.text();
  if (texte4.length > maxOctets) throw new ErreurClient("Demande trop volumineuse.", 413);
  try {
    return JSON.parse(texte4);
  } catch {
    throw new ErreurClient("Demande illisible.");
  }
}
async function db(chemin, options = {}) {
  const cle = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers ?? {}
    }
  });
  if (!r.ok) throw new Error(`Base de donn\xE9es ${r.status} : ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
var SEAU = "photos-clients";
async function stockage(chemin, corps) {
  const cle = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/storage/v1/${chemin}`, {
    method: "POST",
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(corps)
  });
  if (!r.ok) throw new Error(`Stockage ${r.status} : ${await r.text()}`);
  return r.json();
}
var encoderChemin = (c) => c.split("/").map(encodeURIComponent).join("/");
async function urlEnvoiPhoto(chemin) {
  const { url } = await stockage(`object/upload/sign/${SEAU}/${encoderChemin(chemin)}`, {});
  return `${env("SUPABASE_URL")}/storage/v1${url}`;
}
async function urlLecturePhoto(chemin, secondes = 3600) {
  const { signedURL } = await stockage(`object/sign/${SEAU}/${encoderChemin(chemin)}`, {
    expiresIn: secondes
  });
  return `${env("SUPABASE_URL")}/storage/v1${signedURL}`;
}
var cache = null;
async function catalogue() {
  if (cache && Date.now() - cache.date < 6e4) return cache.donnees;
  const r = await fetch(`${env("SITE_URL").replace(/\/$/, "")}/data/donnees.js?v=${Date.now()}`);
  if (!r.ok) throw new Error(`Catalogue introuvable (${r.status})`);
  const texte4 = await r.text();
  const i = texte4.search(/^window\.DONNEES = /m);
  if (i < 0) throw new Error("Catalogue illisible");
  const donnees = JSON.parse(texte4.slice(i + "window.DONNEES = ".length).trim().replace(/;\s*$/, ""));
  cache = {
    donnees,
    date: Date.now()
  };
  return donnees;
}
var viderCacheCatalogue = () => cache = null;
var arrondi = (n) => Math.round(n * 100) / 100;
var texte = (v, max) => String(v ?? "").trim().slice(0, max);
function calculerCommande(D, demande, promo = null) {
  if (!Array.isArray(demande.lignes) || !demande.lignes.length) throw new ErreurClient("Votre panier est vide.");
  if (demande.lignes.length > 30) throw new ErreurClient("Trop d'articles dans une seule commande : contactez-nous pour un devis.");
  const lignes = demande.lignes.map((l) => {
    const p = (D.produits ?? []).find((x) => x.id === l.id && x.visible !== false);
    if (!p) throw new ErreurClient("Un produit de votre panier n'est plus disponible. Retirez-le puis r\xE9essayez.");
    if (p.dispo === "epuise") throw new ErreurClient(`\xAB ${p.nom} \xBB est \xE9puis\xE9 pour le moment.`);
    const quantite = Math.trunc(Number(l.quantite));
    if (!(quantite >= 1 && quantite <= 99)) throw new ErreurClient("Quantit\xE9 invalide.");
    const choix = p.variantes?.choix ?? [];
    let variante = "";
    let supplement = 0;
    if (choix.length) {
      const c = choix[Number(l.variante ?? 0)];
      if (!c) throw new ErreurClient(`Choix invalide pour \xAB ${p.nom} \xBB.`);
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
      photo_chemin: ""
    };
  });
  const sous_total = arrondi(lignes.reduce((t, l) => t + l.total, 0));
  const site2 = D.site ?? {};
  const port = demande.mode_reception === "retrait" || sous_total >= Number(site2.livraisonOfferteDes ?? Infinity) ? 0 : arrondi(Number(site2.livraison || 0));
  const emballage = site2.emballage?.actif && demande.cadeau?.emballage ? arrondi(Number(site2.emballage.prix || 0)) : 0;
  const remise = promo ? montantRemise(promo, sous_total) : 0;
  return {
    lignes,
    sous_total,
    port,
    emballage,
    remise,
    code_promo: promo?.code ?? "",
    total: arrondi(Math.max(0, sous_total + port + emballage - remise))
  };
}
function montantRemise(promo, sousTotal) {
  const v = Number(promo.valeur);
  return arrondi(Math.min(sousTotal, promo.type === "pourcentage" ? sousTotal * v / 100 : v));
}
var aujourdhui = () => (/* @__PURE__ */ new Date()).toLocaleDateString("sv-SE", {
  timeZone: "Europe/Paris"
});
async function chercherCodePromo(code, sousTotal) {
  const c = String(code ?? "").trim().toUpperCase();
  if (!c) return null;
  if (!/^[A-Z0-9_-]{3,30}$/.test(c)) throw new ErreurClient("Code promo invalide.");
  const [promo] = await db(`codes_promo?code=eq.${encodeURIComponent(c)}`);
  const j = aujourdhui();
  if (!promo || !promo.actif || promo.debut && j < promo.debut || promo.fin && j > promo.fin) throw new ErreurClient("Ce code promo n'est pas valable.");
  if (promo.utilisations_max && promo.utilisations >= promo.utilisations_max) throw new ErreurClient("Ce code promo a d\xE9j\xE0 \xE9t\xE9 utilis\xE9 le nombre maximum de fois.");
  if (sousTotal < Number(promo.minimum || 0)) throw new ErreurClient(`Ce code promo s'applique d\xE8s ${euros(promo.minimum)} d'achat.`);
  return promo;
}
async function compterUtilisation(promo) {
  if (!promo) return;
  const ok = await db("rpc/utiliser_code_promo", {
    method: "POST",
    body: JSON.stringify({
      p_code: promo.code
    })
  });
  if (ok === false) throw new ErreurClient("Ce code promo a d\xE9j\xE0 \xE9t\xE9 utilis\xE9 le nombre maximum de fois.");
}
async function enregistrerClient(c) {
  const email = (c.email ?? "").trim().toLowerCase();
  const nom = String(c.nom ?? "").trim();
  const fiche = {};
  if (nom) fiche.nom = nom;
  if (c.tel) fiche.tel = c.tel;
  if (c.adresse) fiche.adresse = c.adresse;
  if (c.consentement) Object.assign(fiche, {
    consentement_marketing: true,
    consentement_le: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!email) {
    const [cree2] = await db("clients", {
      method: "POST",
      body: JSON.stringify({
        nom: nom || "Client",
        ...fiche,
        source: c.source ?? "boutique"
      })
    });
    return cree2;
  }
  const [existant] = await db(`clients?email=eq.${encodeURIComponent(email)}&select=id,nom`);
  if (existant) {
    if (!Object.keys(fiche).length) return existant;
    const [maj] = await db(`clients?id=eq.${existant.id}`, {
      method: "PATCH",
      body: JSON.stringify(fiche)
    });
    return maj;
  }
  const [cree] = await db("clients", {
    method: "POST",
    body: JSON.stringify({
      nom: nom || email.split("@")[0],
      ...fiche,
      email,
      source: c.source ?? "site"
    })
  });
  return cree;
}
async function cleDesinscription(email) {
  const secret = env("DESINSCRIPTION_SECRET") || env("SUPABASE_SERVICE_ROLE_KEY");
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(`desinscription:${secret}`), {
    name: "HMAC",
    hash: "SHA-256"
  }, false, [
    "sign"
  ]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(email.trim().toLowerCase())));
  return [
    ...mac.slice(0, 16)
  ].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function validerClient(demande) {
  const c = demande.client ?? {};
  const nom = texte(c.nom, 120);
  const email = texte(c.email, 160).toLowerCase();
  const tel = texte(c.tel, 30);
  const adresse = texte(c.adresse, 400);
  if (nom.length < 2) throw new ErreurClient("Indiquez votre nom.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErreurClient("Adresse email invalide.");
  if (tel.replace(/\D/g, "").length < 6) throw new ErreurClient("Indiquez un num\xE9ro de t\xE9l\xE9phone.");
  if (![
    "livraison",
    "retrait"
  ].includes(demande.mode_reception)) throw new ErreurClient("Mode de r\xE9ception invalide.");
  if (demande.mode_reception === "livraison" && adresse.length < 8) throw new ErreurClient("Indiquez votre adresse de livraison.");
  return {
    nom,
    email,
    tel,
    adresse: demande.mode_reception === "livraison" ? adresse : ""
  };
}
function modesPaiement(D) {
  const p = D.site?.commandes?.paiement ?? {};
  return {
    en_ligne: !!p.enLigne && !!env("STRIPE_SECRET_KEY"),
    apres_validation: p.apresValidation !== false,
    boutique: p.boutique !== false
  };
}
function formulaire(obj, prefixe = "", sortie = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null) continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (typeof v === "object") formulaire(v, cle, sortie);
    else sortie.append(cle, String(v));
  }
  return sortie;
}
async function stripe(chemin, corps) {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formulaire(corps)
  });
  const donnees = await r.json();
  if (!r.ok) throw new Error(`Stripe ${r.status} : ${donnees?.error?.message ?? ""}`);
  return donnees;
}
async function creerPaiementStripe(commande, retour) {
  const centimes = (n) => Math.round(Number(n) * 100);
  const articles = commande.lignes.map((l) => ({
    quantity: l.quantite,
    price_data: {
      currency: "eur",
      unit_amount: centimes(l.prix_unitaire),
      product_data: {
        name: l.variante ? `${l.nom} (${l.variante})` : l.nom
      }
    }
  }));
  if (Number(commande.port) > 0) articles.push({
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: centimes(commande.port),
      product_data: {
        name: "Livraison"
      }
    }
  });
  if (Number(commande.emballage) > 0) articles.push({
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: centimes(commande.emballage),
      product_data: {
        name: "Emballage cadeau"
      }
    }
  });
  const sep = retour.includes("?") ? "&" : "?";
  let reduction;
  if (Number(commande.remise) > 0) {
    const coupon = await stripe("coupons", {
      amount_off: centimes(commande.remise),
      currency: "eur",
      duration: "once",
      name: commande.code_promo || "Remise"
    });
    reduction = {
      0: {
        coupon: coupon.id
      }
    };
  }
  const session = await stripe("checkout/sessions", {
    ...reduction ? {
      discounts: reduction
    } : {},
    mode: "payment",
    locale: "fr",
    customer_email: commande.client_email,
    client_reference_id: commande.numero,
    line_items: Object.fromEntries(articles.map((a, i) => [
      i,
      a
    ])),
    metadata: {
      commande_id: commande.id,
      numero: commande.numero
    },
    payment_intent_data: {
      description: `Commande ${commande.numero}`,
      metadata: {
        commande_id: commande.id,
        numero: commande.numero
      }
    },
    success_url: `${retour}${sep}jeton=${commande.jeton_suivi}&paiement=ok`,
    cancel_url: `${retour}${sep}jeton=${commande.jeton_suivi}&paiement=annule`
  });
  await db(`commandes?id=eq.${commande.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      stripe_session_id: session.id,
      stripe_url: session.url
    })
  });
  return session.url;
}
async function signatureStripeValide(corps, entete, secret, toleranceSecondes = 300) {
  if (!entete || !secret) return false;
  const morceaux = Object.fromEntries(entete.split(",").map((p) => p.split("=")));
  const t = Number(morceaux.t);
  const signatures = entete.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !signatures.length || Math.abs(Date.now() / 1e3 - t) > toleranceSecondes) return false;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
    name: "HMAC",
    hash: "SHA-256"
  }, false, [
    "sign"
  ]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${t}.${corps}`)));
  const attendu = [
    ...mac
  ].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => s.length === attendu.length && [
    ...s
  ].every((c, i) => c === attendu[i]));
}
var nomFichier = (nom) => (nom || "photo").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60);
var STATUTS = {
  nouvelle: "Commande re\xE7ue",
  maquette_envoyee: "Maquette envoy\xE9e",
  retouche: "Maquette en retouche",
  confirmee: "Maquette valid\xE9e",
  en_fabrication: "En fabrication",
  prete: "Pr\xEAte \xE0 retirer en boutique",
  expediee: "Exp\xE9di\xE9e",
  terminee: "Termin\xE9e",
  annulee: "Annul\xE9e"
};
var euros = (n) => Number(n || 0).toLocaleString("fr-FR", {
  style: "currency",
  currency: "EUR"
});
var champsPublics = (c) => ({
  numero: c.numero,
  cree_le: c.cree_le,
  statut: c.statut,
  statut_libelle: STATUTS[c.statut] ?? c.statut,
  historique: c.historique,
  mode_reception: c.mode_reception,
  lignes: (c.lignes ?? []).map((l) => ({
    nom: l.nom,
    quantite: l.quantite,
    variante: l.variante,
    texte: l.texte,
    total: l.total
  })),
  sous_total: c.sous_total,
  remise: c.remise,
  code_promo: c.code_promo,
  port: c.port,
  emballage: c.emballage,
  total: c.total,
  paiement_mode: c.paiement_mode,
  paiement_statut: c.paiement_statut,
  suivi_colis: c.suivi_colis
});

// supabase/functions/_shared/emails.ts
var echapper = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[c]);
var fournisseurEmail = () => env("BREVO_API_KEY") ? "brevo" : env("RESEND_API_KEY") ? "resend" : null;
function expediteur() {
  const brut = env("EMAIL_EXPEDITEUR") || (fournisseurEmail() === "resend" ? "Mon Truc en Bois <onboarding@resend.dev>" : `Mon Truc en Bois <${env("BOUTIQUE_EMAIL")}>`);
  const m = brut.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? {
    nom: m[1].replace(/^"|"$/g, ""),
    email: m[2].trim()
  } : {
    nom: "Mon Truc en Bois",
    email: brut.trim()
  };
}
async function envoyerUn(m) {
  const service = fournisseurEmail();
  if (!service || !m.a) return {
    envoye: false,
    raison: "non configur\xE9"
  };
  const exp = expediteur();
  const entetes = m.desinscription ? {
    "List-Unsubscribe": `<${m.desinscription}>`
  } : void 0;
  const r = service === "brevo" ? await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env("BREVO_API_KEY"),
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: exp.nom,
        email: exp.email
      },
      to: [
        {
          email: m.a
        }
      ],
      subject: m.sujet,
      htmlContent: m.html,
      ...m.repondreA ? {
        replyTo: {
          email: m.repondreA
        }
      } : {},
      ...entetes ? {
        headers: entetes
      } : {}
    })
  }) : await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${exp.nom} <${exp.email}>`,
      to: [
        m.a
      ],
      subject: m.sujet,
      html: m.html,
      ...m.repondreA ? {
        reply_to: m.repondreA
      } : {},
      ...entetes ? {
        headers: entetes
      } : {}
    })
  });
  if (!r.ok) {
    console.error("Email non envoy\xE9", service, r.status, await r.text());
    return {
      envoye: false,
      raison: `${service === "brevo" ? "Brevo" : "Resend"} ${r.status}`
    };
  }
  return {
    envoye: true
  };
}
var envoyerEmail = (m) => envoyerUn(m);
async function envoyerLot(messages, repondreA) {
  if (!fournisseurEmail()) return {
    envoyes: 0,
    raison: "non configur\xE9"
  };
  let envoyes = 0;
  for (let i = 0; i < messages.length; i += 5) {
    const resultats = await Promise.all(messages.slice(i, i + 5).map((m) => envoyerUn({
      ...m,
      repondreA
    })));
    envoyes += resultats.filter((r) => r.envoye).length;
    const echec = resultats.find((r) => !r.envoye);
    if (echec) return {
      envoyes,
      raison: echec.raison
    };
  }
  return {
    envoyes
  };
}
var site = () => env("SITE_URL").replace(/\/$/, "");
var SIGNATURE = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid #d7bf9c;padding-top:18px;width:100%">
        <tr><td style="width:64px;vertical-align:middle"><img src="__SITE__/img/logo-email.png" alt="" width="52" style="width:52px;height:auto;border-radius:50%"></td>
        <td style="vertical-align:middle;font-size:15px;line-height:1.45;color:#231a14">\xC0 tr\xE8s vite,<br><strong>Christophe et Laetitia</strong><br><span style="color:#6b5a4a;font-size:13px">Mon Truc en Bois \xB7 une question ? r\xE9pondez simplement \xE0 cet email</span></td></tr>
      </table>`;
function gabarit(titre, corps, { pourClient = true, apercu = "" } = {}) {
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
    <p style="text-align:center;color:#6b5a4a;font-size:13px;line-height:1.5;margin-top:18px">Mon Truc en Bois \xB7 3 rue Salengro, 62260 Auchel<br><a href="${site()}" style="color:#231a14">${site().replace(/^https?:\/\//, "")}</a></p>
  </div></body></html>`;
}
var bouton = (url, texte4) => `<p style="margin:24px 0"><a href="${echapper(url)}" style="background:#231a14;color:#fff;text-decoration:none;padding:14px 24px;border-radius:0;font-weight:bold;font-size:16px;display:inline-block">${echapper(texte4)}</a></p>`;
function recapitulatif(c) {
  const lignes = (c.lignes ?? []).map((l) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">
          <strong>${echapper(l.nom)}</strong> \xD7 ${l.quantite}
          ${l.variante ? `<br><span style="color:#6b5a4a">${echapper(l.variante)}</span>` : ""}
          ${l.texte ? `<br><span style="color:#6b5a4a">Texte : \xAB ${echapper(l.texte)} \xBB${l.police ? ` (${echapper(l.police)})` : ""}</span>` : ""}
          ${l.photo_nom ? `<br><span style="color:#6b5a4a">Photo : ${echapper(l.photo_nom)}</span>` : ""}
          ${l.remarque ? `<br><span style="color:#6b5a4a">Pr\xE9cisions : ${echapper(l.remarque)}</span>` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${euros(l.total)}</td>
      </tr>`).join("");
  const ligne = (libelle, montant, gras = false) => `<tr><td style="padding:4px 0;${gras ? "font-weight:bold" : ""}">${libelle}</td><td style="padding:4px 0;text-align:right;${gras ? "font-weight:bold" : ""}">${euros(montant)}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${lignes}
    ${ligne("Sous-total", c.sous_total)}
    ${Number(c.remise) ? ligne(`Remise${c.code_promo ? ` (${echapper(c.code_promo)})` : ""}`, -Number(c.remise)) : ""}
    ${Number(c.port) ? ligne("Livraison", c.port) : ""}
    ${Number(c.emballage) ? ligne("Emballage cadeau", c.emballage) : ""}
    ${ligne("Total", c.total, true)}
  </table>`;
}
var lienSuivi = (c) => `${site()}/suivi.html?jeton=${c.jeton_suivi}`;
var lienPayer = (c) => `${lienSuivi(c)}&payer=1`;
var MODES_PAIEMENT = {
  en_ligne: "Paiement en ligne par carte",
  apres_validation: "Paiement apr\xE8s validation de la maquette (nous vous envoyons un lien de paiement)",
  boutique: "Paiement \xE0 la boutique lors du retrait"
};
function emailNouvelleCommande(c) {
  return {
    sujet: `Nouvelle commande ${c.numero} \xB7 ${euros(c.total)}`,
    html: gabarit(`Nouvelle commande ${c.numero}`, `
      <p><strong>${echapper(c.client_nom)}</strong><br>${echapper(c.client_email)} \xB7 ${echapper(c.client_tel)}<br>
      ${c.mode_reception === "retrait" ? "Retrait \xE0 la boutique" : `Livraison : ${echapper(c.adresse)}`}</p>
      <p>${echapper(MODES_PAIEMENT[c.paiement_mode] ?? c.paiement_mode)}</p>
      ${c.cadeau?.message ? `<p>Message pour la carte : \xAB ${echapper(c.cadeau.message)} \xBB</p>` : ""}
      ${c.cadeau?.date ? `<p>Date souhait\xE9e : ${echapper(new Date(c.cadeau.date).toLocaleDateString("fr-FR"))}</p>` : ""}
      ${c.message ? `<p>Message : ${echapper(c.message)}</p>` : ""}
      ${recapitulatif(c)}
      ${bouton(`${site()}/admin.html#commandes`, "Ouvrir dans l'admin")}`, {
      pourClient: false
    })
  };
}
function emailConfirmationClient(c, paiementUrl) {
  return {
    sujet: `Votre commande ${c.numero} chez Mon Truc en Bois`,
    html: gabarit("Merci pour votre commande !", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>Nous avons bien re\xE7u votre commande <strong>${c.numero}</strong>. Nous revenons vers vous rapidement pour valider la personnalisation (avec une maquette si besoin).</p>
      <p><strong>${echapper(MODES_PAIEMENT[c.paiement_mode] ?? "")}</strong></p>
      ${paiementUrl || c.paiement_mode === "en_ligne" && c.paiement_statut !== "paye" ? bouton(lienPayer(c), "Payer ma commande") : ""}
      ${recapitulatif(c)}
      ${bouton(lienSuivi(c), "Suivre ma commande")}
`, {
      apercu: `Commande ${c.numero} bien re\xE7ue : nous revenons vers vous pour valider la personnalisation.`
    })
  };
}
function emailPaiementRecu(c) {
  return {
    sujet: `Paiement re\xE7u pour la commande ${c.numero}`,
    html: gabarit("Paiement bien re\xE7u", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>Nous avons bien re\xE7u votre paiement de <strong>${euros(c.total)}</strong> pour la commande <strong>${c.numero}</strong>${c.facture_numero ? ` (facture ${c.facture_numero})` : ""}. Merci !</p>
      ${bouton(lienSuivi(c), "Suivre ma commande")}`)
  };
}
function emailPaiementRecuBoutique(c) {
  return {
    sujet: `Paiement re\xE7u : ${c.numero} \xB7 ${euros(c.total)}`,
    html: gabarit(`Paiement re\xE7u pour ${c.numero}`, `<p>${echapper(c.client_nom)} a pay\xE9 ${euros(c.total)} en ligne.</p>${bouton(`${site()}/admin.html#commandes`, "Ouvrir dans l'admin")}`, {
      pourClient: false
    })
  };
}
function emailPaiementInattendu(c) {
  const etat = c.paiement_statut === "rembourse" ? "d\xE9j\xE0 rembours\xE9e" : "annul\xE9e";
  return {
    sujet: `\xC0 v\xE9rifier : paiement re\xE7u pour la commande ${c.numero} (${etat})`,
    html: gabarit(`Paiement re\xE7u pour une commande ${etat}`, `
      <p>${echapper(c.client_nom)} vient de payer ${euros(c.total)} par carte pour la commande <strong>${c.numero}</strong>, qui est ${etat}.</p>
      <p>La commande n'a pas \xE9t\xE9 modifi\xE9e. Ouvrez l'application Stripe pour rembourser ce paiement, ou reprenez la commande avec le client.</p>
      ${bouton(`${site()}/admin.html#commandes`, "Ouvrir dans l'admin")}`, {
      pourClient: false
    })
  };
}
function frise(c) {
  const etapes = [
    "maquette_envoyee",
    "confirmee",
    "en_fabrication",
    c.mode_reception === "livraison" ? "expediee" : "prete",
    "terminee"
  ];
  const libelles = {
    maquette_envoyee: "Maquette envoy\xE9e",
    confirmee: "Maquette valid\xE9e",
    en_fabrication: "En fabrication",
    prete: "Pr\xEAte",
    expediee: "Exp\xE9di\xE9e",
    terminee: "Termin\xE9e"
  };
  const rang = etapes.indexOf(c.statut === "retouche" ? "maquette_envoyee" : c.statut);
  if (rang < 0) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0 6px;border-collapse:separate;border-spacing:4px 0"><tr>${etapes.map((e, i) => `<td style="width:20%;padding-top:8px;border-top:4px solid ${i <= rang ? "#231a14" : "#d7bf9c"};font-size:12px;color:${i === rang ? "#231a14" : "#6b5a4a"};${i === rang ? "font-weight:bold;" : ""}vertical-align:top">${libelles[e]}</td>`).join("")}</tr></table>`;
}
function emailStatut(c, message = "") {
  const textes = {
    maquette_envoyee: "La maquette de votre gravure est pr\xEAte : nous vous l'avons envoy\xE9e. Dites-nous si elle vous convient ou ce qu'il faut changer.",
    retouche: "Nous reprenons votre maquette avec vos remarques ; la nouvelle version arrive tr\xE8s vite.",
    confirmee: "Votre maquette est valid\xE9e : nous lan\xE7ons la fabrication tr\xE8s bient\xF4t.",
    en_fabrication: "Votre cr\xE9ation est en cours de fabrication.",
    prete: "Bonne nouvelle : votre commande est pr\xEAte ! Vous pouvez venir la retirer \xE0 la boutique aux heures d'ouverture.",
    expediee: `Votre commande est partie !${c.suivi_colis ? ` Num\xE9ro de suivi : <strong>${echapper(c.suivi_colis)}</strong>` : ""}`,
    terminee: "Votre commande est termin\xE9e. Merci pour votre confiance ! Un avis nous aiderait beaucoup.",
    annulee: "Votre commande a \xE9t\xE9 annul\xE9e. N'h\xE9sitez pas \xE0 nous contacter pour toute question."
  };
  return {
    sujet: `Commande ${c.numero} : ${STATUTS[c.statut] ?? c.statut}`,
    html: gabarit(STATUTS[c.statut] ?? "Votre commande", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>${textes[c.statut] ?? "Le statut de votre commande a chang\xE9."}</p>
      ${frise(c)}
      ${message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(message).replace(/\n/g, "<br>")}</p>` : ""}
      ${bouton(lienSuivi(c), "Voir ma commande")}`)
  };
}
function emailLienPaiement(c, message = "") {
  return {
    sujet: `Commande ${c.numero} : votre lien de paiement`,
    html: gabarit("Votre commande est pr\xEAte \xE0 \xEAtre r\xE9gl\xE9e", `
      <p>Bonjour ${echapper(c.client_nom.split(" ")[0])},</p>
      <p>Voici le lien pour r\xE9gler votre commande <strong>${c.numero}</strong> (${euros(c.total)}) en toute s\xE9curit\xE9 par carte bancaire.</p>
      ${message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(message).replace(/\n/g, "<br>")}</p>` : ""}
      ${bouton(lienPayer(c), `Payer ${euros(c.total)}`)}
      ${recapitulatif(c)}`)
  };
}
var TYPES = {
  devis: "Demande de devis",
  contact: "Message",
  newsletter: "Inscription \xE0 la newsletter"
};
function emailDemandeBoutique(d) {
  return {
    sujet: `${TYPES[d.type] ?? "Demande"} : ${d.nom}${d.sujet ? ` (${d.sujet})` : ""}`,
    html: gabarit(TYPES[d.type] ?? "Nouvelle demande", `
      <p><strong>${echapper(d.nom)}</strong><br>${echapper(d.email)}${d.tel ? ` \xB7 ${echapper(d.tel)}` : ""}</p>
      ${d.sujet ? `<p>Sujet : <strong>${echapper(d.sujet)}</strong>${d.quantite ? ` \xB7 quantit\xE9 : ${d.quantite}` : ""}</p>` : ""}
      ${d.message ? `<p style="background:#efe6d8;border:1px solid #d7bf9c;padding:12px 14px">${echapper(d.message).replace(/\n/g, "<br>")}</p>` : ""}
      ${d.fichiers?.length ? `<p>${d.fichiers.length} fichier${d.fichiers.length > 1 ? "s" : ""} joint${d.fichiers.length > 1 ? "s" : ""}, \xE0 ouvrir dans l'admin : ${d.fichiers.map((f) => echapper(f.nom)).join(", ")}</p>` : ""}
      ${bouton(`${site()}/admin.html#demandes`, "Ouvrir dans l'admin")}`, {
      pourClient: false
    })
  };
}
async function emailAccuseDemande(d) {
  const texte4 = d.type === "newsletter" ? "Merci, vous \xEAtes bien inscrit(e) : vous recevrez nos nouveaut\xE9s et id\xE9es cadeaux. Vous pouvez vous d\xE9sinscrire \xE0 tout moment depuis notre site." : "Nous avons bien re\xE7u votre demande et nous vous r\xE9pondons tr\xE8s vite (en g\xE9n\xE9ral sous 48 h).";
  return {
    sujet: d.type === "newsletter" ? "Inscription confirm\xE9e chez Mon Truc en Bois" : "Mon Truc en Bois a bien re\xE7u votre demande",
    html: gabarit(d.type === "newsletter" ? "Bienvenue !" : "Merci pour votre message", `
      <p>Bonjour ${echapper(String(d.nom || "").split(" ")[0])},</p><p>${texte4}</p>
      ${d.type === "newsletter" ? `<p style="font-size:13px;color:#6b5a4a"><a href="${await lienDesinscription(d.email)}" style="color:#6b5a4a">Se d\xE9sinscrire</a></p>` : ""}`)
  };
}
function emailLibre(nom, sujet, message) {
  return {
    sujet,
    html: gabarit(sujet, `<p>Bonjour ${echapper(String(nom || "").split(" ")[0])},</p>
      <p style="white-space:pre-line">${echapper(message)}</p>
`)
  };
}
var lienDesinscription = async (email) => `${site()}/newsletter.html?desinscription=1&email=${encodeURIComponent(email)}&cle=${await cleDesinscription(email)}`;
async function emailCampagne(c) {
  const desinscription = await lienDesinscription(c.email);
  return {
    a: c.email,
    sujet: c.sujet,
    desinscription,
    html: gabarit(c.sujet, `${c.nom ? `<p>Bonjour ${echapper(String(c.nom).split(" ")[0])},</p>` : ""}
      <p style="white-space:pre-line">${echapper(c.message)}</p>
      ${c.lien ? bouton(c.lien, c.texte_lien || "D\xE9couvrir") : ""}
      <p style="font-size:12px;color:#6b5a4a;margin-top:24px">Vous recevez cet email car vous \xEAtes inscrit(e) aux nouveaut\xE9s de Mon Truc en Bois.
      <a href="${desinscription}" style="color:#6b5a4a">Se d\xE9sinscrire</a></p>`)
  };
}
async function emailConfirmerDesinscription(email) {
  return {
    sujet: "Confirmez votre d\xE9sinscription de Mon Truc en Bois",
    html: gabarit("Ne plus recevoir nos emails", `
      <p>Bonjour,</p>
      <p>Vous avez demand\xE9 \xE0 ne plus recevoir nos nouveaut\xE9s et promotions. Cliquez sur le bouton pour confirmer.</p>
      ${bouton(await lienDesinscription(email), "Confirmer ma d\xE9sinscription")}
      <p style="color:#6b5a4a;font-size:14px">Ce n'est pas vous ? Ignorez simplement cet email : rien ne change.</p>`)
  };
}

// supabase/functions/commande/index.ts
var traiter = servir(async (req) => {
  const demande = await lireJson(req);
  const D = await catalogue();
  if (demande.simulation) {
    const base = calculerCommande(D, demande);
    let promo2 = null;
    let erreur_code = "";
    try {
      promo2 = await chercherCodePromo(demande.code_promo, base.sous_total);
    } catch (e) {
      if (!(e instanceof ErreurClient)) throw e;
      erreur_code = e.message;
    }
    const c = calculerCommande(D, demande, promo2);
    return json(req, {
      sous_total: c.sous_total,
      port: c.port,
      emballage: c.emballage,
      remise: c.remise,
      code_promo: c.code_promo,
      total: c.total,
      erreur_code,
      promo_description: promo2?.description ?? ""
    });
  }
  if (D.site?.apercu) throw new ErreurClient("Les commandes en ligne ne sont pas encore ouvertes. Contactez-nous par t\xE9l\xE9phone.", 403);
  const client = validerClient(demande);
  const promo = await chercherCodePromo(demande.code_promo, calculerCommande(D, demande).sous_total);
  const calcul = calculerCommande(D, demande, promo);
  const modes = modesPaiement(D);
  const mode = demande.paiement_mode;
  if (!(mode in modes) || !modes[mode]) throw new ErreurClient("Ce mode de paiement n'est pas disponible.");
  if (mode === "boutique" && demande.mode_reception !== "retrait") throw new ErreurClient("Le paiement en boutique est r\xE9serv\xE9 au retrait \xE0 la boutique.");
  if (calcul.total <= 0 && mode === "en_ligne") throw new ErreurClient("Le montant \xE0 payer est nul : choisissez un autre mode de paiement.");
  const id = crypto.randomUUID();
  calcul.lignes.forEach((l, i) => {
    if (l.photo_nom) l.photo_chemin = `${id}/${i + 1}-${nomFichier(l.photo_nom)}`;
  });
  const envois = await Promise.all(calcul.lignes.map(async (l, i) => l.photo_chemin ? {
    ligne: i,
    url: await urlEnvoiPhoto(l.photo_chemin)
  } : null));
  await compterUtilisation(promo);
  const fiche = await enregistrerClient({
    ...client,
    source: "site",
    consentement: !!demande.consentement_marketing
  });
  const cadeau = {
    emballage: !!calcul.emballage,
    message: String(demande.cadeau?.message ?? "").trim().slice(0, 160),
    date: /^\d{4}-\d{2}-\d{2}$/.test(demande.cadeau?.date ?? "") ? demande.cadeau.date : ""
  };
  const [commande] = await db("commandes", {
    method: "POST",
    body: JSON.stringify({
      id,
      client_id: fiche?.id ?? null,
      canal: "site",
      client_nom: client.nom,
      client_email: client.email,
      client_tel: client.tel,
      adresse: client.adresse,
      mode_reception: demande.mode_reception,
      message: String(demande.message ?? "").trim().slice(0, 1e3),
      cadeau,
      paiement_mode: mode,
      ...calcul
    })
  });
  const site2 = env("SITE_URL").replace(/\/$/, "");
  const retour = demande.retour && demande.retour.startsWith(site2 + "/") ? demande.retour.split("?")[0] : `${site2}/suivi.html`;
  let paiementUrl;
  if (mode === "en_ligne") {
    try {
      paiementUrl = await creerPaiementStripe(commande, retour);
    } catch (e) {
      console.error("Paiement Stripe non cr\xE9\xE9", commande.numero, e);
    }
  }
  const boutique = env("BOUTIQUE_EMAIL", D.site?.email ?? "");
  await Promise.allSettled([
    envoyerEmail({
      a: boutique,
      ...emailNouvelleCommande(commande),
      repondreA: commande.client_email
    }),
    envoyerEmail({
      a: commande.client_email,
      ...emailConfirmationClient(commande, paiementUrl),
      repondreA: boutique
    })
  ]);
  return json(req, {
    numero: commande.numero,
    jeton: commande.jeton_suivi,
    total: commande.total,
    paiement_url: paiementUrl ?? null,
    envois_photos: envois.filter(Boolean)
  }, 201);
});
if (false) Deno.serve(traiter);

// supabase/functions/suivi/index.ts
var traiter2 = servir(async (req) => {
  const d = await lireJson(req, 5e3);
  let commande;
  if (d.jeton && /^[0-9a-f-]{36}$/i.test(d.jeton)) {
    [commande] = await db(`commandes?jeton_suivi=eq.${d.jeton}`);
  } else if (d.numero && d.email) {
    const [c] = await db(`commandes?numero=eq.${encodeURIComponent(d.numero.trim().toUpperCase())}`);
    if (c && c.client_email.toLowerCase() === d.email.trim().toLowerCase()) commande = c;
  } else throw new ErreurClient("Indiquez votre num\xE9ro de commande et votre email.");
  if (!commande) throw new ErreurClient("Commande introuvable : v\xE9rifiez le num\xE9ro et l'adresse email.", 404);
  const D = await catalogue();
  const paiementPossible = commande.paiement_statut === "en_attente" && commande.statut !== "annulee" && commande.paiement_mode !== "boutique" && modesPaiement(D).en_ligne && (commande.paiement_mode === "en_ligne" || !!commande.stripe_url);
  if (d.action === "payer") {
    if (!paiementPossible) throw new ErreurClient("Cette commande ne peut pas \xEAtre pay\xE9e en ligne pour le moment.");
    const site2 = env("SITE_URL").replace(/\/$/, "");
    const retour = d.retour && d.retour.startsWith(site2 + "/") ? d.retour.split("?")[0] : `${site2}/suivi.html`;
    return json(req, {
      paiement_url: await creerPaiementStripe(commande, retour)
    });
  }
  return json(req, {
    ...champsPublics(commande),
    jeton: commande.jeton_suivi,
    paiement_possible: paiementPossible
  });
});
if (false) Deno.serve(traiter2);

// supabase/functions/contact/index.ts
var FICHIERS_MAX = 5;
var FICHIER_TAILLE_MAX = 15 * 1024 * 1024;
var FICHIER_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
];
var texte2 = (v, max) => String(v ?? "").trim().slice(0, max);
var traiter3 = servir(async (req) => {
  const d = await lireJson(req, 2e4);
  const email = texte2(d.email, 160).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErreurClient("Adresse email invalide.");
  if (d.site_web) return json(req, {
    recu: true
  });
  if (d.action === "desinscription") {
    if (d.cle && d.cle === await cleDesinscription(email)) {
      await db(`clients?email=eq.${encodeURIComponent(email)}`, {
        method: "PATCH",
        body: JSON.stringify({
          consentement_marketing: false,
          consentement_le: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
      return json(req, {
        desinscrit: true
      });
    }
    const [abonne] = await db(`clients?email=eq.${encodeURIComponent(email)}&consentement_marketing=eq.true&select=id`);
    if (abonne) await envoyerEmail({
      a: email,
      ...await emailConfirmerDesinscription(email)
    });
    return json(req, {
      confirmation_envoyee: true
    });
  }
  const type = [
    "devis",
    "contact",
    "newsletter"
  ].includes(d.type) ? d.type : "contact";
  const nomSaisi = texte2(d.nom, 120);
  const nom = nomSaisi || (type === "newsletter" ? email.split("@")[0] : "");
  const message = texte2(d.message, 4e3);
  if (type !== "newsletter" && nom.length < 2) throw new ErreurClient("Indiquez votre nom.");
  if (type !== "newsletter" && message.length < 5) throw new ErreurClient("D\xE9crivez votre demande en quelques mots.");
  const annonces = type === "newsletter" || !Array.isArray(d.fichiers) ? [] : d.fichiers;
  if (annonces.length > FICHIERS_MAX) throw new ErreurClient(`${FICHIERS_MAX} fichiers au plus par demande.`);
  const id = crypto.randomUUID();
  const fichiers = annonces.map((f, i) => {
    const nomLisible = texte2(f?.nom, 120) || `fichier-${i + 1}`;
    const taille = Math.trunc(Number(f?.taille));
    if (!FICHIER_TYPES.includes(String(f?.type))) throw new ErreurClient(`\xAB ${nomLisible} \xBB : format non accept\xE9. Envoyez des photos (JPEG, PNG, WebP, HEIC) ou un PDF.`);
    if (!(taille > 0)) throw new ErreurClient(`\xAB ${nomLisible} \xBB est vide.`);
    if (taille > FICHIER_TAILLE_MAX) throw new ErreurClient(`\xAB ${nomLisible} \xBB d\xE9passe 15 Mo.`);
    return {
      chemin: `devis/${id}/${i + 1}-${nomFichier(nomLisible)}`,
      nom: nomLisible,
      type: String(f.type),
      taille
    };
  });
  const envois = await Promise.all(fichiers.map(async (f, i) => ({
    fichier: i,
    url: await urlEnvoiPhoto(f.chemin)
  })));
  const fiche = await enregistrerClient({
    nom: nomSaisi,
    email,
    tel: texte2(d.tel, 30),
    source: type === "newsletter" ? "newsletter" : "site",
    consentement: type === "newsletter" || !!d.consentement_marketing
  });
  const [demande] = await db("demandes", {
    method: "POST",
    body: JSON.stringify({
      id,
      type,
      nom: nomSaisi || fiche?.nom || nom,
      email,
      tel: texte2(d.tel, 30),
      sujet: texte2(d.sujet, 120),
      message,
      quantite: Number.isFinite(Number(d.quantite)) && Number(d.quantite) > 0 ? Math.trunc(Number(d.quantite)) : null,
      client_id: fiche?.id ?? null,
      statut: type === "newsletter" ? "archivee" : "nouvelle",
      fichiers
    })
  });
  const boutique = env("BOUTIQUE_EMAIL") || (await catalogue()).site?.email;
  await Promise.allSettled([
    type !== "newsletter" ? envoyerEmail({
      a: boutique,
      ...emailDemandeBoutique(demande),
      repondreA: email
    }) : null,
    envoyerEmail({
      a: email,
      ...await emailAccuseDemande(demande),
      repondreA: boutique
    })
  ]);
  return json(req, {
    recu: true,
    envois
  }, 201);
});
if (false) Deno.serve(traiter3);

// supabase/functions/admin/index.ts
async function verifierAdmin(req) {
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) throw new ErreurClient("Connexion requise.", 401);
  const r = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: env("SUPABASE_ANON_KEY", env("SUPABASE_SERVICE_ROLE_KEY")),
      Authorization: `Bearer ${jeton}`
    }
  });
  if (!r.ok) throw new ErreurClient("Session expir\xE9e : reconnectez-vous.", 401);
  const utilisateur = await r.json();
  const admins = await db(`admins?user_id=eq.${utilisateur.id}&select=user_id`);
  if (!admins.length) throw new ErreurClient("Ce compte n'a pas acc\xE8s \xE0 la gestion des commandes.", 403);
  return utilisateur;
}
var FICHIER_CONTENU = "data/donnees.js";
async function github(chemin, init = {}) {
  const jeton = env("CONTENU_GITHUB_TOKEN");
  if (!jeton || !env("CONTENU_DEPOT")) throw new ErreurClient("La publication depuis le serveur n'est pas encore configur\xE9e (onglet Installation).", 503);
  const r = await fetch(`https://api.github.com/repos/${env("CONTENU_DEPOT")}/contents/${chemin}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jeton}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "mon-truc-en-bois",
      ...init.body ? {
        "Content-Type": "application/json"
      } : {}
    }
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 409 || r.status === 422) throw new ErreurClient("Le site a \xE9t\xE9 modifi\xE9 ailleurs entre-temps : rechargez la page.", 409);
  if (r.status === 401) throw new ErreurClient("La cl\xE9 de publication a expir\xE9 ou a \xE9t\xE9 r\xE9voqu\xE9e : pr\xE9venez votre agence.", 502);
  if (!r.ok) throw new ErreurClient(`Publication impossible (GitHub ${r.status}) : pr\xE9venez votre agence.`, 502);
  return {
    d,
    expiration: r.headers.get("github-authentication-token-expiration")
  };
}
var branche = () => env("CONTENU_BRANCHE", "main");
var auteur = (u) => ({
  name: `Admin ${String(u.email ?? "").split("@")[0]}`.slice(0, 60),
  email: u.email || "admin@boutique.invalid"
});
function verifierContenu(base64) {
  if (!base64 || base64.length > 3e6) throw new ErreurClient("Contenu manquant ou trop volumineux.");
  const texte4 = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  const i = texte4.search(/^window\.DONNEES = /m);
  if (i < 0) throw new ErreurClient("Contenu invalide.");
  if (texte4.slice(0, i).split("\n").some((l) => l.trim() && !l.trim().startsWith("//"))) throw new ErreurClient("Contenu invalide.");
  let d;
  try {
    d = JSON.parse(texte4.slice(i + "window.DONNEES = ".length).trim().replace(/;\s*$/, ""));
  } catch {
    throw new ErreurClient("Contenu invalide (JSON).");
  }
  if (!d?.site || !Array.isArray(d.produits)) throw new ErreurClient("Contenu invalide.");
}
var arrondi2 = (n) => Math.round(n * 100) / 100;
var texte3 = (v, max) => String(v ?? "").trim().slice(0, max);
async function creerVente(v) {
  if (!Array.isArray(v.lignes) || !v.lignes.length) throw new ErreurClient("Ajoutez au moins un article.");
  const D = await catalogue();
  if (D.site?.legal?.regimeTva === "assujetti" && v.paiement_statut === "paye" && v.paiement_moyen === "especes") throw new ErreurClient("Les paiements en esp\xE8ces doivent \xEAtre enregistr\xE9s sur votre caisse certifi\xE9e.");
  const lignes = v.lignes.map((l) => {
    const p = l.id ? (D.produits ?? []).find((x) => x.id === l.id) : null;
    const nom = texte3(l.nom || p?.nom, 160);
    if (!nom) throw new ErreurClient("Chaque article doit avoir un nom.");
    const quantite = Math.trunc(Number(l.quantite ?? 1));
    if (!(quantite >= 1 && quantite <= 999)) throw new ErreurClient("Quantit\xE9 invalide.");
    const prix_unitaire = arrondi2(Number(l.prix_unitaire ?? p?.prix ?? NaN));
    if (!(prix_unitaire >= 0)) throw new ErreurClient(`Prix manquant pour \xAB ${nom} \xBB.`);
    return {
      id: p?.id ?? "",
      nom,
      quantite,
      prix_unitaire,
      total: arrondi2(prix_unitaire * quantite),
      variante: texte3(l.variante, 120),
      texte: texte3(l.texte, 200),
      police: "",
      remarque: texte3(l.remarque, 500),
      photo_nom: "",
      photo_type: "",
      photo_chemin: ""
    };
  });
  const sous_total = arrondi2(lignes.reduce((t, l) => t + l.total, 0));
  const port = arrondi2(Math.max(0, Number(v.port ?? 0)));
  const promo = texte3(v.code_promo, 30) ? await chercherCodePromo(v.code_promo, sous_total) : null;
  const remise = promo ? montantRemise(promo, sous_total) : arrondi2(Math.min(sous_total, Math.max(0, Number(v.remise ?? 0))));
  const c = v.client ?? {};
  const nomSaisi = texte3(c.nom, 120);
  const emailSaisi = texte3(c.email, 160).toLowerCase();
  if (nomSaisi && nomSaisi.length < 2) throw new ErreurClient("Le nom du client doit faire au moins 2 lettres.");
  if (emailSaisi && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailSaisi)) throw new ErreurClient("Adresse email du client invalide.");
  let fiche = null;
  if (c.id) [fiche] = await db(`clients?id=eq.${encodeURIComponent(c.id)}`);
  else if (nomSaisi || emailSaisi || texte3(c.tel, 30)) fiche = await enregistrerClient({
    nom: nomSaisi,
    email: emailSaisi,
    tel: texte3(c.tel, 30),
    adresse: texte3(c.adresse, 400),
    source: v.canal ?? "boutique",
    consentement: !!c.consentement
  });
  await compterUtilisation(promo);
  const canal = [
    "boutique",
    "telephone",
    "salon"
  ].includes(v.canal ?? "") ? v.canal : "boutique";
  const paye = v.paiement_statut === "paye";
  const [commande] = await db("commandes", {
    method: "POST",
    body: JSON.stringify({
      client_id: fiche?.id ?? null,
      canal,
      client_nom: (fiche?.nom && fiche.nom.length >= 2 ? fiche.nom : "") || nomSaisi || "Client en boutique",
      client_email: fiche?.email || emailSaisi || "sans-email@boutique.invalid",
      client_tel: fiche?.tel || texte3(c.tel, 30),
      adresse: v.mode_reception === "livraison" ? fiche?.adresse || texte3(c.adresse, 400) : "",
      mode_reception: v.mode_reception === "livraison" ? "livraison" : "retrait",
      lignes,
      sous_total,
      port,
      emballage: 0,
      remise,
      code_promo: promo?.code ?? "",
      total: arrondi2(Math.max(0, sous_total + port - remise)),
      paiement_mode: paye || canal === "boutique" ? "boutique" : "apres_validation",
      paiement_statut: paye ? "paye" : "en_attente",
      paiement_moyen: texte3(v.paiement_moyen, 30),
      // Réglée et remise sur place (boutique, salon) : terminée. Commande par téléphone ou à livrer : à traiter.
      statut: [
        "nouvelle",
        "maquette_envoyee",
        "retouche",
        "confirmee",
        "en_fabrication",
        "prete",
        "expediee",
        "terminee"
      ].includes(v.statut ?? "") ? v.statut : paye && canal !== "telephone" && v.mode_reception !== "livraison" ? "terminee" : "nouvelle",
      notes: texte3(v.notes, 2e3),
      cadeau: /^\d{4}-\d{2}-\d{2}$/.test(v.date_souhaitee ?? "") ? {
        date: v.date_souhaitee
      } : {}
    })
  });
  return commande;
}
var traiter4 = servir(async (req) => {
  const utilisateur = await verifierAdmin(req);
  const d = await lireJson(req, 6e6);
  if (d.action === "etat") {
    const cle = env("STRIPE_SECRET_KEY");
    return json(req, {
      stripe: !!cle,
      stripe_mode: cle ? cle.startsWith("sk_live_") || cle.startsWith("rk_live_") ? "production" : "test" : null,
      webhook: !!env("STRIPE_WEBHOOK_SECRET"),
      emails: !!fournisseurEmail(),
      emails_service: fournisseurEmail(),
      expediteur: fournisseurEmail() ? `${expediteur().nom} <${expediteur().email}>` : "",
      boutique_email: env("BOUTIQUE_EMAIL"),
      site_url: env("SITE_URL"),
      publication: !!(env("CONTENU_GITHUB_TOKEN") && env("CONTENU_DEPOT")),
      publication_expiration: env("CONTENU_GITHUB_TOKEN") && env("CONTENU_DEPOT") ? await github(`${FICHIER_CONTENU}?ref=${branche()}`).then((r) => r.expiration ?? "", () => "erreur") : null
    });
  }
  if (d.action === "contenu_lire") {
    const { d: f } = await github(`${FICHIER_CONTENU}?ref=${encodeURIComponent(branche())}&t=${Date.now()}`);
    return json(req, {
      content: f.content,
      sha: f.sha
    });
  }
  if (d.action === "contenu_publier") {
    verifierContenu(d.contenu ?? "");
    if (!/^[0-9a-f]{40}$/.test(d.sha ?? "")) throw new ErreurClient("Version du contenu manquante : rechargez la page.");
    const { d: r } = await github(FICHIER_CONTENU, {
      method: "PUT",
      body: JSON.stringify({
        message: texte3(d.message, 200) || "Mise \xE0 jour du contenu du site (admin)",
        content: d.contenu,
        sha: d.sha,
        branch: branche(),
        committer: auteur(utilisateur)
      })
    });
    return json(req, {
      content: {
        sha: r.content?.sha
      },
      commit: {
        sha: r.commit?.sha
      }
    });
  }
  if (d.action === "photo_publier") {
    const chemin = String(d.chemin ?? "");
    if (!/^img\/[a-z0-9-]{1,80}\.jpg$/.test(chemin)) throw new ErreurClient("Nom de photo invalide.");
    const contenu = String(d.contenu ?? "");
    if (!contenu || contenu.length > 4e6 || !contenu.startsWith("/9j/")) throw new ErreurClient("Photo invalide (JPEG de 3 Mo maximum).");
    const { d: r } = await github(chemin, {
      method: "PUT",
      body: JSON.stringify({
        message: `Ajout de la photo ${chemin} (admin)`,
        content: contenu,
        branch: branche(),
        committer: auteur(utilisateur)
      })
    });
    return json(req, {
      content: {
        sha: r.content?.sha
      }
    }, 201);
  }
  if (d.action === "creer_commande") {
    if (!d.vente) throw new ErreurClient("Vente manquante.");
    return json(req, {
      commande: await creerVente(d.vente)
    }, 201);
  }
  if (d.action === "email_client") {
    const email = texte3(d.email, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErreurClient("Adresse email invalide.");
    if (texte3(d.sujet, 160).length < 2 || texte3(d.message, 1e4).length < 2) throw new ErreurClient("Indiquez un sujet et un message.");
    const r = await envoyerEmail({
      a: email,
      ...emailLibre(texte3(d.nom, 120), texte3(d.sujet, 160), texte3(d.message, 1e4)),
      repondreA: env("BOUTIQUE_EMAIL") || void 0
    });
    if (!r.envoye) throw new ErreurClient(`Email non envoy\xE9 (${r.raison}).`);
    return json(req, {
      email_envoye: true
    });
  }
  if (d.action === "campagne") {
    const sujet = texte3(d.sujet, 160);
    const message = texte3(d.message, 1e4);
    if (sujet.length < 2 || message.length < 2) throw new ErreurClient("Indiquez un sujet et un message.");
    const lien = /^https:\/\/\S+$/.test(texte3(d.lien, 500)) ? texte3(d.lien, 500) : "";
    const contenu = {
      sujet,
      message,
      lien,
      texte_lien: texte3(d.texte_lien, 60)
    };
    const boutique = env("BOUTIQUE_EMAIL") || (await catalogue()).site?.email;
    if (d.essai) {
      const r2 = await envoyerEmail({
        ...await emailCampagne({
          ...contenu,
          email: boutique,
          nom: ""
        }),
        a: boutique
      });
      if (!r2.envoye) throw new ErreurClient(`Email d'essai non envoy\xE9 (${r2.raison}).`);
      return json(req, {
        essai: true,
        a: boutique
      });
    }
    const abonnes = await db("clients?consentement_marketing=eq.true&email=not.is.null&select=nom,email&limit=5000");
    if (!abonnes.length) throw new ErreurClient("Aucun client abonn\xE9 pour l'instant.");
    const r = await envoyerLot(await Promise.all(abonnes.map((c) => emailCampagne({
      ...contenu,
      email: c.email,
      nom: c.nom
    }))), boutique);
    if (r.raison && !r.envoyes) throw new ErreurClient(`Envoi impossible (${r.raison}).`);
    await db("campagnes", {
      method: "POST",
      body: JSON.stringify({
        sujet,
        message,
        lien,
        texte_lien: contenu.texte_lien,
        destinataires: r.envoyes
      })
    });
    return json(req, {
      envoyes: r.envoyes,
      total: abonnes.length,
      raison: r.raison ?? ""
    });
  }
  if (!/^[0-9a-f-]{36}$/i.test(d.commande_id ?? "")) throw new ErreurClient("Commande invalide.");
  const [commande] = await db(`commandes?id=eq.${d.commande_id}`);
  if (!commande) throw new ErreurClient("Commande introuvable.", 404);
  if (d.action === "lien_paiement") {
    if (!env("STRIPE_SECRET_KEY")) throw new ErreurClient("Le paiement en ligne n'est pas configur\xE9 (cl\xE9 Stripe manquante).");
    if (commande.paiement_statut === "paye") throw new ErreurClient("Cette commande est d\xE9j\xE0 pay\xE9e.");
    if (commande.paiement_statut === "rembourse") throw new ErreurClient("Cette commande a \xE9t\xE9 rembours\xE9e : cr\xE9ez une nouvelle vente si le client doit payer \xE0 nouveau.");
    if (commande.statut === "annulee") throw new ErreurClient("Cette commande est annul\xE9e.");
    const site2 = env("SITE_URL").replace(/\/$/, "");
    const url = await creerPaiementStripe(commande, `${site2}/suivi.html`);
    const email = d.envoyer && !commande.client_email.endsWith(".invalid") ? await envoyerEmail({
      a: commande.client_email,
      ...emailLienPaiement(commande, d.message)
    }) : null;
    return json(req, {
      url,
      lien: `${site2}/suivi.html?jeton=${commande.jeton_suivi}&payer=1`,
      email_envoye: !!email?.envoye
    });
  }
  if (d.action === "notifier") {
    if (commande.client_email.endsWith(".invalid")) throw new ErreurClient("Ce client n'a pas d'adresse email.");
    const email = await envoyerEmail({
      a: commande.client_email,
      ...emailStatut(commande, d.message)
    });
    if (!email.envoye) throw new ErreurClient(`Email non envoy\xE9 (${email.raison}).`);
    return json(req, {
      email_envoye: true
    });
  }
  if (d.action === "photos") {
    const photos = await Promise.all((commande.lignes ?? []).map(async (l, i) => l.photo_chemin ? {
      ligne: i,
      nom: l.photo_nom,
      url: await urlLecturePhoto(l.photo_chemin)
    } : null));
    return json(req, {
      photos: photos.filter(Boolean)
    });
  }
  throw new ErreurClient("Action inconnue.");
});
if (false) Deno.serve(traiter4);

// supabase/functions/stripe-webhook/index.ts
var traiter5 = servir(async (req) => {
  const corps = await req.text();
  if (!await signatureStripeValide(corps, req.headers.get("Stripe-Signature"), env("STRIPE_WEBHOOK_SECRET"))) return json(req, {
    erreur: "Signature invalide"
  }, 400);
  const evenement = JSON.parse(corps);
  const session = evenement.data?.object ?? {};
  const payee = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded"
  ].includes(evenement.type) && session.payment_status === "paid";
  const id = session.metadata?.commande_id;
  if (!payee || !id) return json(req, {
    recu: true
  });
  const [avant] = await db(`commandes?id=eq.${encodeURIComponent(id)}&select=paiement_statut,statut,numero,client_nom,total`);
  if (!avant) return json(req, {
    recu: true,
    inconnue: true
  });
  if (avant.paiement_statut === "paye") return json(req, {
    recu: true,
    deja: true
  });
  if (avant.paiement_statut === "rembourse" || avant.statut === "annulee") {
    await envoyerEmail({
      a: env("BOUTIQUE_EMAIL") || (await catalogue()).site?.email,
      ...emailPaiementInattendu(avant)
    });
    return json(req, {
      recu: true,
      a_verifier: true
    });
  }
  const [commande] = await db(`commandes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      paiement_statut: "paye",
      paye_le: (/* @__PURE__ */ new Date()).toISOString(),
      stripe_session_id: session.id
    })
  });
  await Promise.allSettled([
    envoyerEmail({
      a: commande.client_email,
      ...emailPaiementRecu(commande)
    }),
    envoyerEmail({
      a: env("BOUTIQUE_EMAIL") || (await catalogue()).site?.email,
      ...emailPaiementRecuBoutique(commande)
    })
  ]);
  return json(req, {
    recu: true,
    numero: commande.numero
  });
});
if (false) Deno.serve(traiter5);
export {
  traiter4 as admin,
  traiter as commande,
  traiter3 as contact,
  traiter2 as suivi,
  viderCacheCatalogue,
  traiter5 as webhook
};
