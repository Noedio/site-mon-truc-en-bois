// Tests des fonctions serveur avec des services simulés (Supabase, Stripe, Resend, site).
// Lancer : deno test --allow-env --allow-read supabase/tests/
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { traiter as commande } from "../functions/commande/index.ts";
import { traiter as webhook } from "../functions/stripe-webhook/index.ts";
import { traiter as suivi } from "../functions/suivi/index.ts";
import { traiter as admin } from "../functions/admin/index.ts";
import { traiter as contact } from "../functions/contact/index.ts";
import { cleDesinscription, viderCacheCatalogue } from "../functions/_shared/outils.ts";

const SITE = "https://boutique.test";
const SUPA = "https://projet.supabase.test";
Deno.env.set("SITE_URL", SITE);
Deno.env.set("SUPABASE_URL", SUPA);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "cle-service");
Deno.env.set("RESEND_API_KEY", "re_test");
Deno.env.set("BOUTIQUE_EMAIL", "boutique@test.fr");
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_x");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_test");

// ---------- Catalogue publié ----------
const fichier = await Deno.readTextFile(new URL("../../data/donnees.js", import.meta.url));
const base = JSON.parse(fichier.slice(fichier.search(/^window\.DONNEES = /m) + 17).trim().replace(/;\s*$/, ""));
let D: any;
function catalogueOuvert(modif: (d: any) => void = () => {}) {
  D = structuredClone(base);
  D.site.apercu = false;
  D.site.livraison = 5.9;
  D.site.livraisonOfferteDes = 60;
  D.site.emballage = { actif: true, prix: 2.5 };
  D.site.commandes = { paiement: { enLigne: true, apresValidation: true, boutique: true } };
  modif(D);
  viderCacheCatalogue();
}

// ---------- Services simulés ----------
let commandes: any[] = [];
let tables: Record<string, any[]> = {};
let appels: { url: string; methode: string; corps: any }[] = [];
let numero = 0;
const ADMIN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const JETONS: Record<string, string> = { "jeton-admin": ADMIN, "jeton-client": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" };

const reponse = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });
// Filtres de l'API REST de Supabase : « colonne=eq.valeur » et « colonne=not.is.null » (les autres paramètres sont ignorés)
function filtre(url: URL) {
  const conditions = [...url.searchParams].filter(([k]) => !["select", "limit", "order"].includes(k));
  return (c: any) =>
    conditions.every(([cle, valeur]) =>
      valeur === "not.is.null" ? c[cle] !== null && c[cle] !== undefined : String(c[cle]) === decodeURIComponent(valeur.replace(/^eq\./, ""))
    );
}
let stripeEnPanne = false;
let stockageEnPanne = false;
globalThis.fetch = async (entree: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(entree instanceof Request ? entree.url : String(entree));
  const methode = (init.method ?? "GET").toUpperCase();
  const brut = init.body ? String(init.body) : "";
  let corps: any = brut;
  try { corps = JSON.parse(brut); } catch { corps = Object.fromEntries(new URLSearchParams(brut)); }
  appels.push({ url: url.href, methode, corps });

  if (url.origin === SITE) return new Response(`// en-tête window.DONNEES = ici\nwindow.DONNEES = ${JSON.stringify(D)};\n`);
  if (url.href.startsWith(`${SUPA}/rest/v1/commandes`)) {
    if (methode === "POST") {
      numero++;
      const c = { statut: "nouvelle", paiement_statut: "en_attente", notes: "note interne", ...corps, numero: `MTB-2026-${String(numero).padStart(4, "0")}`, jeton_suivi: crypto.randomUUID(), historique: [{ statut: corps.statut ?? "nouvelle" }], suivi_colis: "", stripe_url: null };
      if (c.paiement_statut === "paye") c.facture_numero = "F-2026-0001";
      commandes.push(c);
      return reponse([c], 201);
    }
    const trouvees = commandes.filter(filtre(url));
    if (methode === "PATCH") {
      trouvees.forEach((c) => {
        Object.assign(c, corps);
        if (c.paiement_statut === "paye" && !c.facture_numero) c.facture_numero = "F-2026-0001";
      });
    }
    return reponse(trouvees);
  }
  if (url.href === `${SUPA}/rest/v1/rpc/utiliser_code_promo`) {
    const promo = tables.codes_promo.find((p) => p.code === corps.p_code);
    if (!promo || !promo.actif || (promo.utilisations_max && promo.utilisations >= promo.utilisations_max)) return reponse(false);
    promo.utilisations++;
    return reponse(true);
  }
  if (url.href.startsWith(`${SUPA}/rest/v1/admins`)) return reponse(url.searchParams.get("user_id") === `eq.${ADMIN}` ? [{ user_id: ADMIN }] : []);
  const t = url.pathname.match(/^\/rest\/v1\/(clients|demandes|codes_promo|campagnes)$/)?.[1];
  if (t) {
    tables[t] ??= [];
    if (methode === "POST") {
      const ligne = { id: crypto.randomUUID(), consentement_marketing: false, ...corps };
      if (t === "clients" && ligne.email && tables[t].some((c) => c.email === ligne.email)) return reponse({ message: "duplicate" }, 409);
      tables[t].push(ligne);
      return reponse([ligne], 201);
    }
    const trouvees = [...url.searchParams].some(([k]) => k !== "select") ? tables[t].filter(filtre(url)) : tables[t];
    if (methode === "PATCH") trouvees.forEach((x) => Object.assign(x, corps));
    return reponse(trouvees);
  }
  if (url.href.startsWith(`${SUPA}/auth/v1/user`)) {
    const id = JETONS[(new Headers(init.headers).get("Authorization") ?? "").replace("Bearer ", "")];
    return id ? reponse({ id, email: id === ADMIN ? "boutique@test.fr" : "client@test.fr" }) : reponse({ msg: "invalid" }, 401);
  }
  if (url.href.startsWith(`${SUPA}/storage/v1/`) && stockageEnPanne) return reponse({ message: "indisponible" }, 503);
  if (url.href.startsWith(`${SUPA}/storage/v1/object/upload/sign/`)) return reponse({ url: url.pathname.replace("/storage/v1", "") + "?token=envoi" });
  if (url.href.startsWith(`${SUPA}/storage/v1/object/sign/`)) return reponse({ signedURL: url.pathname.replace("/storage/v1", "") + "?token=lecture" });
  if (url.href.startsWith("https://api.stripe.com/") && stripeEnPanne) return reponse({ error: { message: "API indisponible" } }, 503);
  if (url.href === "https://api.stripe.com/v1/checkout/sessions") return reponse({ id: "cs_test_1", url: "https://checkout.stripe.test/cs_test_1" });
  if (url.href === "https://api.stripe.com/v1/coupons") return reponse({ id: "coupon_1" });
  if (url.href === "https://api.resend.com/emails") return reponse({ id: "email_1" });
  if (url.href.startsWith("https://api.github.com/repos/agence/site/contents/")) {
    const auth = (init.headers as any)?.Authorization;
    if (auth !== "Bearer github_pat_contenu") return reponse({ message: "Bad credentials" }, 401);
    const chemin = decodeURIComponent(url.pathname.replace("/repos/agence/site/contents/", ""));
    if (methode === "GET") return chemin === "data/donnees.js" ? new Response(JSON.stringify({ sha: "a".repeat(40), content: btoa("window.DONNEES = {}") }), { headers: { "github-authentication-token-expiration": "2027-10-01 00:00:00 UTC" } }) : reponse({}, 404);
    if (corps.sha && corps.sha !== "a".repeat(40)) return reponse({ message: "conflict" }, 409);
    return reponse({ content: { sha: "b".repeat(40) }, commit: { sha: "c".repeat(40) } }, corps.sha ? 200 : 201);
  }
  if (url.href === "https://api.brevo.com/v3/smtp/email") return init.headers && (init.headers as any)["api-key"] === "xkeysib-test" ? reponse({ messageId: "<1@brevo>" }, 201) : reponse({ code: "unauthorized" }, 401);
  return reponse({ erreur: `non simulé : ${url.href}` }, 500);
};
function reinitialiser() {
  commandes = [];
  tables = { clients: [], demandes: [], codes_promo: [{ code: "NOEL10", type: "pourcentage", valeur: 10, minimum: 20, actif: true, utilisations: 0, utilisations_max: 2, description: "10 % pour Noël" }, { code: "VIEUX", type: "montant", valeur: 5, minimum: 0, actif: true, utilisations: 0, fin: "2020-01-01" }] };
  appels = [];
  numero = 0;
  stripeEnPanne = false;
  stockageEnPanne = false;
  catalogueOuvert();
}
const post = (fn: (r: Request) => Promise<Response>, corps: unknown, entetes: Record<string, string> = {}) =>
  fn(new Request("https://fonction.test", { method: "POST", headers: { "Content-Type": "application/json", Origin: SITE, ...entetes }, body: typeof corps === "string" ? corps : JSON.stringify(corps) }));
const emails = () => appels.filter((a) => a.url === "https://api.resend.com/emails").map((a) => a.corps);

const demande = (modif: Record<string, unknown> = {}) => ({
  client: { nom: "Marie Test", email: "Marie@Test.fr", tel: "06 12 34 56 78", adresse: "12 rue des Fleurs, 62260 Auchel" },
  mode_reception: "livraison",
  lignes: [
    { id: "planche-aperitif", quantite: 2, variante: 1, texte: "Papa", police: "Classique", prix: 0.01 }, // prix envoyé : ignoré
    { id: "mug-personnalise", quantite: 1, photo: { nom: "photo été.jpg", type: "image/jpeg" } },
  ],
  cadeau: { emballage: true, message: "Bonne fête", date: "2026-12-20" },
  paiement_mode: "apres_validation",
  retour: `${SITE}/commande.html`,
  ...modif,
});

// ---------- Commande ----------
Deno.test("commande : prix recalculés depuis le catalogue, livraison, emballage, photo, emails", async () => {
  reinitialiser();
  const r = await post(commande, demande());
  const c = await r.json();
  assertEquals(r.status, 201);
  assertEquals(c.numero, "MTB-2026-0001");
  const enregistree = commandes[0];
  // planche apéro : 24,90 + 8 (grande) = 32,90 × 2 = 65,80 ; mug 14,90 → 80,70 ; livraison offerte dès 60 € ; emballage 2,50
  assertEquals(enregistree.lignes[0].prix_unitaire, 32.9);
  assertEquals(enregistree.sous_total, 80.7);
  assertEquals(enregistree.port, 0);
  assertEquals(enregistree.emballage, 2.5);
  assertEquals(enregistree.total, 83.2);
  assertEquals(enregistree.client_email, "marie@test.fr");
  assertMatch(enregistree.lignes[1].photo_chemin, /^[0-9a-f-]{36}\/2-photo-ete\.jpg$/);
  assertEquals(c.envois_photos.length, 1);
  assertMatch(c.envois_photos[0].url, /^https:\/\/projet\.supabase\.test\/storage\/v1\/object\/upload\/sign\/photos-clients\/.+\?token=envoi$/);
  assertEquals(c.paiement_url, null);
  const e = emails();
  assertEquals(e.length, 2);
  assertEquals(e.map((x) => x.to[0]).sort(), ["boutique@test.fr", "marie@test.fr"]);
  assert(e.some((x) => x.subject.startsWith("Nouvelle commande MTB-2026-0001")));
});

Deno.test("commande : petite commande livrée → frais de port", async () => {
  reinitialiser();
  await post(commande, demande({ lignes: [{ id: "porte-cles-grave", quantite: 1 }], cadeau: {} }));
  assertEquals(commandes[0].port, 5.9);
  assertEquals(commandes[0].total, 15.8);
});

Deno.test("commande : paiement en ligne → session Stripe en centimes", async () => {
  reinitialiser();
  const r = await post(commande, demande({ paiement_mode: "en_ligne" }));
  const c = await r.json();
  assertEquals(c.paiement_url, "https://checkout.stripe.test/cs_test_1");
  const s = appels.find((a) => a.url.includes("stripe.com"))!.corps;
  assertEquals(s["line_items[0][price_data][unit_amount]"], "3290");
  assertEquals(s["line_items[0][quantity]"], "2");
  assertEquals(s["line_items[2][price_data][product_data][name]"], "Emballage cadeau");
  assertEquals(s["metadata[commande_id]"], commandes[0].id);
  assertMatch(s.success_url, /^https:\/\/boutique\.test\/commande\.html\?jeton=.+&paiement=ok$/);
  assertEquals(commandes[0].stripe_session_id, "cs_test_1");
});

Deno.test("commande : refus si site en construction, produit inconnu, email invalide, mode de paiement incohérent", async () => {
  reinitialiser();
  catalogueOuvert((d) => (d.site.apercu = true));
  assertEquals((await post(commande, demande())).status, 403);
  catalogueOuvert();
  assertEquals((await post(commande, demande({ lignes: [{ id: "nexiste-pas", quantite: 1 }] }))).status, 400);
  assertEquals((await post(commande, demande({ client: { nom: "A B", email: "faux", tel: "0612345678" } }))).status, 400);
  assertEquals((await post(commande, demande({ paiement_mode: "boutique" }))).status, 400); // boutique = retrait uniquement
  assertEquals((await post(commande, demande({ lignes: [{ id: "planche-aperitif", quantite: 0 }] }))).status, 400);
  catalogueOuvert((d) => (d.site.commandes.paiement.enLigne = false));
  assertEquals((await post(commande, demande({ paiement_mode: "en_ligne" }))).status, 400);
  assertEquals(commandes.length, 0);
});

// ---------- Webhook Stripe ----------
async function signer(corps: string, secret = "whsec_test") {
  const t = Math.floor(Date.now() / 1000);
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${t}.${corps}`)));
  return `t=${t},v1=${[...mac].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
Deno.test("webhook Stripe : signature vérifiée, commande marquée payée une seule fois", async () => {
  reinitialiser();
  await post(commande, demande({ paiement_mode: "en_ligne" }));
  const evenement = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", metadata: { commande_id: commandes[0].id } } } });
  assertEquals((await post(webhook, evenement, { "Stripe-Signature": await signer(evenement, "mauvais") })).status, 400);
  assertEquals(commandes[0].paiement_statut, "en_attente");
  appels = [];
  const r = await post(webhook, evenement, { "Stripe-Signature": await signer(evenement) });
  assertEquals(r.status, 200);
  assertEquals(commandes[0].paiement_statut, "paye");
  assertEquals(emails().length, 2);
  appels = [];
  const deja = await (await post(webhook, evenement, { "Stripe-Signature": await signer(evenement) })).json();
  assertEquals(deja.deja, true);
  assertEquals(emails().length, 0);
});

// ---------- Suivi client ----------
Deno.test("suivi : par lien ou numéro + email, sans les notes internes", async () => {
  reinitialiser();
  await post(commande, demande({ paiement_mode: "en_ligne" }));
  const c = commandes[0];
  const parJeton = await (await post(suivi, { jeton: c.jeton_suivi })).json();
  assertEquals(parJeton.numero, "MTB-2026-0001");
  assertEquals(parJeton.statut_libelle, "Commande reçue");
  assertEquals(parJeton.notes, undefined);
  assertEquals(parJeton.client_email, undefined);
  assertEquals(parJeton.paiement_possible, true);
  assertEquals((await post(suivi, { numero: "mtb-2026-0001", email: "autre@test.fr" })).status, 404);
  assertEquals((await (await post(suivi, { numero: "mtb-2026-0001", email: "MARIE@test.fr" })).json()).numero, "MTB-2026-0001");
  const payer = await (await post(suivi, { jeton: c.jeton_suivi, action: "payer", retour: `${SITE}/suivi.html` })).json();
  assertEquals(payer.paiement_url, "https://checkout.stripe.test/cs_test_1");
});

Deno.test("suivi : paiement après validation possible seulement une fois le lien envoyé par la boutique", async () => {
  reinitialiser();
  await post(commande, demande());
  const c = commandes[0];
  assertEquals((await (await post(suivi, { jeton: c.jeton_suivi })).json()).paiement_possible, false);
  assertEquals((await post(suivi, { jeton: c.jeton_suivi, action: "payer" })).status, 400);
});

// ---------- Actions admin ----------
Deno.test("admin : accès refusé sans compte admin, lien de paiement, email, photos", async () => {
  reinitialiser();
  await post(commande, demande());
  const id = commandes[0].id;
  assertEquals((await post(admin, { action: "photos", commande_id: id })).status, 401);
  assertEquals((await post(admin, { action: "photos", commande_id: id }, { Authorization: "Bearer jeton-client" })).status, 403);
  const auth = { Authorization: "Bearer jeton-admin" };
  appels = [];
  const lien = await (await post(admin, { action: "lien_paiement", commande_id: id, envoyer: true, message: "Maquette validée, merci !" }, auth)).json();
  assertEquals(lien.url, "https://checkout.stripe.test/cs_test_1");
  assertEquals(lien.lien, `${SITE}/suivi.html?jeton=${commandes[0].jeton_suivi}&payer=1`);
  assertEquals(lien.email_envoye, true);
  assertMatch(emails()[0].subject, /votre lien de paiement/);
  // Le bouton passe par la page de suivi (paiement neuf à chaque clic), pas par la session Stripe qui expire
  assert(emails()[0].html.includes(`${SITE}/suivi.html?jeton=${commandes[0].jeton_suivi}&amp;payer=1`));
  assert(!emails()[0].html.includes("checkout.stripe.test"));
  assertEquals((await (await post(suivi, { jeton: commandes[0].jeton_suivi })).json()).paiement_possible, true);
  commandes[0].statut = "prete";
  const notif = await (await post(admin, { action: "notifier", commande_id: id }, auth)).json();
  assertEquals(notif.email_envoye, true);
  assertMatch(emails().at(-1).subject, /Prête à retirer/);
  const photos = await (await post(admin, { action: "photos", commande_id: id }, auth)).json();
  assertEquals(photos.photos.length, 1);
  assertMatch(photos.photos[0].url, /\/storage\/v1\/object\/sign\/photos-clients\/.+\?token=lecture$/);
});

Deno.test("CORS : réponse au pré-contrôle du navigateur", async () => {
  const r = await commande(new Request("https://fonction.test", { method: "OPTIONS", headers: { Origin: SITE } }));
  assertEquals(r.status, 200);
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), "*");
});

// ---------- Version 2 : promo, clients, demandes, ventes boutique ----------
Deno.test("simulation : totaux exacts du serveur, code promo valide ou refusé, rien n'est enregistré", async () => {
  reinitialiser();
  const ok = await (await post(commande, { ...demande({ code_promo: "noel10" }), simulation: true })).json();
  assertEquals(ok.sous_total, 80.7);
  assertEquals(ok.remise, 8.07);
  assertEquals(ok.total, 75.13); // 80,70 − 8,07 + emballage 2,50 (livraison offerte)
  assertEquals(ok.erreur_code, "");
  const expire = await (await post(commande, { ...demande({ code_promo: "VIEUX" }), simulation: true })).json();
  assertEquals(expire.remise, 0);
  assertMatch(expire.erreur_code, /pas valable/);
  const minimum = await (await post(commande, { ...demande({ code_promo: "NOEL10", lignes: [{ id: "porte-cles-grave", quantite: 1 }] }), simulation: true })).json();
  assertMatch(minimum.erreur_code, /dès 20,00/);
  assertEquals(commandes.length, 0);
});

Deno.test("commande avec code promo : remise enregistrée, utilisation comptée, coupon Stripe, fiche client", async () => {
  reinitialiser();
  await post(commande, demande({ code_promo: "NOEL10", paiement_mode: "en_ligne", consentement_marketing: true }));
  const c = commandes[0];
  assertEquals(c.remise, 8.07);
  assertEquals(c.code_promo, "NOEL10");
  assertEquals(c.total, 75.13);
  assertEquals(tables.codes_promo[0].utilisations, 1);
  const s = appels.find((a) => a.url.endsWith("/checkout/sessions"))!.corps;
  assertEquals(s["discounts[0][coupon]"], "coupon_1");
  assertEquals(appels.find((a) => a.url.endsWith("/coupons"))!.corps.amount_off, "807");
  assertEquals(tables.clients.length, 1);
  assertEquals(tables.clients[0].email, "marie@test.fr");
  assertEquals(tables.clients[0].consentement_marketing, true);
  assertEquals(c.client_id, tables.clients[0].id);
  assertEquals(c.canal, "site");
  // Deuxième commande du même client, sans consentement : même fiche, consentement conservé
  await post(commande, demande());
  assertEquals(tables.clients.length, 1);
  assertEquals(tables.clients[0].consentement_marketing, true);
  assertEquals(commandes[1].client_id, tables.clients[0].id);
  // Code refusé à la vraie commande
  assertEquals((await post(commande, demande({ code_promo: "VIEUX" }))).status, 400);
});

Deno.test("contact : devis, newsletter, désinscription, robot ignoré", async () => {
  reinitialiser();
  const r = await post(contact, { type: "devis", nom: "Club de foot", email: "Club@Test.fr", tel: "0600000000", sujet: "Gravure", message: "40 médailles gravées", quantite: 40 });
  assertEquals(r.status, 201);
  assertEquals(tables.demandes[0].type, "devis");
  assertEquals(tables.demandes[0].quantite, 40);
  assertEquals(tables.demandes[0].statut, "nouvelle");
  assertEquals(tables.clients[0].email, "club@test.fr");
  assertEquals(tables.clients[0].consentement_marketing, false);
  assertEquals(emails().length, 2);
  appels = [];
  await post(contact, { type: "newsletter", email: "fan@test.fr" });
  const fan = tables.clients.find((c) => c.email === "fan@test.fr");
  assertEquals(fan.consentement_marketing, true);
  assertEquals(fan.source, "newsletter");
  assertEquals(emails().length, 1); // seulement la confirmation au client
  // Sans la clé du lien personnel : un email de confirmation, pas de désinscription
  appels = [];
  const sansCle = await (await post(contact, { action: "desinscription", email: "fan@test.fr" })).json();
  assertEquals(sansCle.confirmation_envoyee, true);
  assertEquals(fan.consentement_marketing, true);
  assertEquals(emails().length, 1);
  assertMatch(emails()[0].html, /cle=[0-9a-f]{32}/);
  assertEquals((await (await post(contact, { action: "desinscription", email: "fan@test.fr", cle: "0".repeat(32) })).json()).desinscrit, undefined);
  // Avec la clé : désinscription immédiate
  const avecCle = await (await post(contact, { action: "desinscription", email: "fan@test.fr", cle: await cleDesinscription("fan@test.fr") })).json();
  assertEquals(avecCle.desinscrit, true);
  assertEquals(fan.consentement_marketing, false);
  // Adresse inconnue : même réponse, aucun email
  appels = [];
  assertEquals((await (await post(contact, { action: "desinscription", email: "inconnu@test.fr" })).json()).confirmation_envoyee, true);
  assertEquals(emails().length, 0);
  const avant = tables.demandes.length;
  await post(contact, { type: "contact", nom: "Robot", email: "r@r.fr", message: "spam spam", site_web: "http://spam" });
  assertEquals(tables.demandes.length, avant);
  assertEquals((await post(contact, { type: "contact", nom: "A", email: "pas-un-email", message: "bonjour" })).status, 400);
});

Deno.test("admin : état du serveur, vente en boutique payée, message libre au client", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const etat = await (await post(admin, { action: "etat" }, auth)).json();
  assertEquals(etat.stripe, true);
  assertEquals(etat.stripe_mode, "test");
  assertEquals(etat.emails, true);
  assertEquals((await post(admin, { action: "etat" })).status, 401);

  const r = await post(admin, {
    action: "creer_commande",
    vente: {
      client: { nom: "Mme Dupont", tel: "0611111111" },
      lignes: [{ id: "mug-personnalise", quantite: 2 }, { nom: "Gravure sur mesure (plaque de porte)", prix_unitaire: 18, quantite: 1 }],
      canal: "boutique",
      paiement_statut: "paye",
      paiement_moyen: "carte",
      remise: 3,
    },
  }, auth);
  assertEquals(r.status, 201);
  const v = commandes[0];
  assertEquals(v.canal, "boutique");
  assertEquals(v.sous_total, 47.8); // 2 × 14,90 + 18
  assertEquals(v.total, 44.8);
  assertEquals(v.paiement_statut, "paye");
  assertEquals(v.statut, "terminee");
  assertEquals(v.paiement_moyen, "carte");
  assertEquals(tables.clients[0].nom, "Mme Dupont");
  assertEquals(tables.clients[0].email, undefined);
  assertEquals(v.client_id, tables.clients[0].id);
  assertEquals((await post(admin, { action: "creer_commande", vente: { lignes: [{ nom: "Sans prix", quantite: 1 }] } }, auth)).status, 400);

  appels = [];
  const m = await (await post(admin, { action: "email_client", email: "marie@test.fr", nom: "Marie", sujet: "Votre maquette", message: "Voici la maquette." }, auth)).json();
  assertEquals(m.email_envoye, true);
  assertEquals(emails()[0].subject, "Votre maquette");
});

Deno.test("admin : email aux abonnés (essai, puis envoi avec lien de désinscription personnel)", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const corps = { action: "campagne", sujet: "Nouveautés de Noël", message: "Découvrez nos idées cadeaux.", lien: "https://boutique.test/idees-cadeaux.html", texte_lien: "Voir les idées" };
  assertEquals((await post(admin, corps, auth)).status, 400); // aucun abonné
  tables.clients.push({ id: "c1", nom: "Marie Durand", email: "marie@test.fr", consentement_marketing: true }, { id: "c2", nom: "Paul", email: "paul@test.fr", consentement_marketing: false });
  const essai = await (await post(admin, { ...corps, essai: true }, auth)).json();
  assertEquals(essai.a, "boutique@test.fr");
  assertEquals(emails()[0].to, ["boutique@test.fr"]);
  const r = await (await post(admin, corps, auth)).json();
  assertEquals(r.envoyes, 1);
  const lot = emails().filter((e) => e.to[0] !== "boutique@test.fr");
  assertEquals(lot.length, 1);
  assertEquals(lot[0].to, ["marie@test.fr"]);
  assertMatch(lot[0].html, /Bonjour Marie/);
  assertMatch(lot[0].html, /newsletter\.html\?desinscription=1&email=marie%40test\.fr&cle=[0-9a-f]{32}/);
  assertMatch(lot[0].headers["List-Unsubscribe"], /desinscription/);
  assertEquals(tables.campagnes[0].destinataires, 1);
});

Deno.test("emails par Brevo : expéditeur, destinataire, réponse, désinscription ; refus du service signalé", async () => {
  reinitialiser();
  Deno.env.set("BREVO_API_KEY", "xkeysib-test");
  try {
    await post(commande, demande());
    const envoi = appels.filter((a) => a.url === "https://api.brevo.com/v3/smtp/email").map((a) => a.corps);
    assertEquals(envoi.length, 2);
    assertEquals(envoi[0].sender, { name: "Mon Truc en Bois", email: "boutique@test.fr" });
    assertEquals(envoi[1].to, [{ email: "marie@test.fr" }]);
    assertEquals(envoi[1].replyTo, { email: "boutique@test.fr" });
    assertMatch(envoi[1].htmlContent, /MTB-2026-0001/);
    assertEquals(appels.some((a) => a.url.startsWith("https://api.resend.com")), false);
    const auth = { Authorization: "Bearer jeton-admin" };
    const etat = await (await post(admin, { action: "etat" }, auth)).json();
    assertEquals(etat.emails_service, "brevo");
    Deno.env.set("EMAIL_EXPEDITEUR", "Atelier MTB <bonjour@montrucenbois.fr>");
    tables.clients.push({ id: "c1", nom: "Marie Durand", email: "marie@test.fr", consentement_marketing: true });
    appels = [];
    const r = await (await post(admin, { action: "campagne", sujet: "Noël", message: "Nos idées." }, auth)).json();
    assertEquals(r.envoyes, 1);
    const c = appels.find((a) => a.url.includes("brevo"))!.corps;
    assertEquals(c.sender, { name: "Atelier MTB", email: "bonjour@montrucenbois.fr" });
    assertMatch(c.headers["List-Unsubscribe"], /desinscription=1&email=marie%40test\.fr/);
    Deno.env.set("BREVO_API_KEY", "mauvaise-cle");
    const ko = await post(admin, { action: "email_client", email: "marie@test.fr", nom: "Marie", sujet: "Test", message: "Bonjour" }, auth);
    assertEquals(ko.status, 400);
    assertMatch((await ko.json()).erreur, /Brevo 401/);
  } finally {
    Deno.env.delete("BREVO_API_KEY");
    Deno.env.delete("EMAIL_EXPEDITEUR");
  }
});

Deno.test("publication du contenu par le serveur : réservée aux admins, contenu vérifié, auteur tracé", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const b64 = (t: string) => btoa(String.fromCharCode(...new TextEncoder().encode(t)));
  const valide = b64("// en-tête\nwindow.DONNEES = " + JSON.stringify({ site: { nom: "Mon Truc en Bois — été" }, produits: [] }) + ";\n");
  assertEquals((await post(admin, { action: "contenu_lire" }, auth)).status, 503); // pas encore configuré
  Deno.env.set("CONTENU_GITHUB_TOKEN", "github_pat_contenu");
  Deno.env.set("CONTENU_DEPOT", "agence/site");
  Deno.env.set("CONTENU_BRANCHE", "site-vitrine-boutique");
  try {
    assertEquals((await post(admin, { action: "contenu_lire" })).status, 401);
    assertEquals((await post(admin, { action: "contenu_lire" }, { Authorization: "Bearer jeton-client" })).status, 403);
    const lu = await (await post(admin, { action: "contenu_lire" }, auth)).json();
    assertEquals(lu.sha, "a".repeat(40));
    const etat = await (await post(admin, { action: "etat" }, auth)).json();
    assertEquals(etat.publication, true);
    assertMatch(etat.publication_expiration, /^2027-10-01/);

    const r = await post(admin, { action: "contenu_publier", contenu: valide, sha: "a".repeat(40), message: "Nouveaux prix" }, auth);
    assertEquals(r.status, 200);
    const put = appels.find((a) => a.methode === "PUT" && a.url.includes("/contents/data/donnees.js"))!;
    assertEquals(put.corps.branch, "site-vitrine-boutique");
    assertEquals(put.corps.committer.email, "boutique@test.fr");
    assertEquals(put.corps.message, "Nouveaux prix");

    const piege = b64("fetch('https://pirate.test');\nwindow.DONNEES = {\"site\":{},\"produits\":[]};");
    assertEquals((await post(admin, { action: "contenu_publier", contenu: piege, sha: "a".repeat(40) }, auth)).status, 400);
    const piege2 = b64("window.DONNEES = {\"site\":{},\"produits\":[]}; alert(1)");
    assertEquals((await post(admin, { action: "contenu_publier", contenu: piege2, sha: "a".repeat(40) }, auth)).status, 400);
    assertEquals((await post(admin, { action: "contenu_publier", contenu: valide, sha: "d".repeat(40) }, auth)).status, 409);

    const jpeg = "/9j/" + "A".repeat(100);
    assertEquals((await post(admin, { action: "photo_publier", chemin: "img/mug-noel.jpg", contenu: jpeg }, auth)).status, 201);
    assertEquals((await post(admin, { action: "photo_publier", chemin: "js/main.js", contenu: jpeg }, auth)).status, 400);
    assertEquals((await post(admin, { action: "photo_publier", chemin: "img/../index.jpg", contenu: jpeg }, auth)).status, 400);
    assertEquals((await post(admin, { action: "photo_publier", chemin: "img/x.jpg", contenu: btoa("<svg/>") }, auth)).status, 400);

    Deno.env.set("CONTENU_GITHUB_TOKEN", "expiree");
    const exp = await post(admin, { action: "contenu_lire" }, auth);
    assertEquals(exp.status, 502);
    assertMatch((await exp.json()).erreur, /expiré/);
  } finally {
    for (const v of ["CONTENU_GITHUB_TOKEN", "CONTENU_DEPOT", "CONTENU_BRANCHE"]) Deno.env.delete(v);
  }
});

Deno.test("caisse : espèces refusées si la boutique est assujettie à la TVA, acceptées en franchise", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const vente = { lignes: [{ id: "mug-personnalise", quantite: 1 }], canal: "boutique", paiement_statut: "paye", paiement_moyen: "especes" };
  catalogueOuvert((d) => (d.site.legal = { regimeTva: "assujetti", tauxTva: 20 }));
  assertEquals((await post(admin, { action: "creer_commande", vente }, auth)).status, 400);
  assertEquals((await post(admin, { action: "creer_commande", vente: { ...vente, paiement_moyen: "carte" } }, auth)).status, 201);
  catalogueOuvert((d) => (d.site.legal = { regimeTva: "franchise" }));
  assertEquals((await post(admin, { action: "creer_commande", vente }, auth)).status, 201);
  catalogueOuvert();
});

Deno.test("contrôle de santé pour la surveillance : 200 si la base répond, 503 sinon", async () => {
  reinitialiser();
  const r = await suivi(new Request("https://f.test/suivi?sante=1"));
  assertEquals(r.status, 200);
  assertEquals((await r.json()).ok, true);
  const avant = globalThis.fetch;
  globalThis.fetch = async () => new Response("panne", { status: 500 });
  try {
    assertEquals((await suivi(new Request("https://f.test/suivi?sante=1"))).status, 503);
  } finally {
    globalThis.fetch = avant;
  }
  assertEquals((await suivi(new Request("https://f.test/suivi"))).status, 405);
});

// ---------- Corrections avant l'ouverture ----------
Deno.test("commande : Stripe en panne → commande gardée, emails envoyés, paiement depuis le suivi", async () => {
  reinitialiser();
  stripeEnPanne = true;
  const r = await post(commande, demande({ paiement_mode: "en_ligne" }));
  assertEquals(r.status, 201);
  assertEquals((await r.json()).paiement_url, null);
  assertEquals(commandes.length, 1);
  const e = emails();
  assertEquals(e.length, 2);
  const confirmation = e.find((x) => x.to[0] === "marie@test.fr");
  assert(confirmation.html.includes(`suivi.html?jeton=${commandes[0].jeton_suivi}&amp;payer=1`));
  stripeEnPanne = false;
  assertEquals((await (await post(suivi, { jeton: commandes[0].jeton_suivi })).json()).paiement_possible, true);
});

Deno.test("commande : stockage des photos en panne → rien n'est enregistré (pas de doublon au nouvel essai)", async () => {
  reinitialiser();
  stockageEnPanne = true;
  assertEquals((await post(commande, demande({ code_promo: "NOEL10" }))).status, 500);
  assertEquals(commandes.length, 0);
  assertEquals(tables.clients.length, 0);
  assertEquals(tables.codes_promo[0].utilisations, 0);
});

Deno.test("code promo : le maximum d'utilisations n'est jamais dépassé", async () => {
  reinitialiser();
  tables.codes_promo[0].utilisations_max = 1;
  assertEquals((await post(commande, demande({ code_promo: "NOEL10" }))).status, 201);
  // Deuxième commande lue « valable » puis refusée au moment de compter (commande simultanée)
  tables.codes_promo[0].utilisations_max = 2;
  const r1 = post(commande, demande({ code_promo: "NOEL10" }));
  const r2 = post(commande, demande({ code_promo: "NOEL10" }));
  const statuts = [(await r1).status, (await r2).status].sort();
  assertEquals(statuts, [201, 400]);
  assertEquals(tables.codes_promo[0].utilisations, 2);
  assertEquals(commandes.length, 2);
});

Deno.test("fiche client : une inscription à la newsletter sans prénom garde le nom connu", async () => {
  reinitialiser();
  await post(commande, demande());
  assertEquals(tables.clients[0].nom, "Marie Test");
  await post(contact, { type: "newsletter", email: "marie@test.fr" });
  assertEquals(tables.clients.length, 1);
  assertEquals(tables.clients[0].nom, "Marie Test");
  assertEquals(tables.demandes.at(-1).nom, "Marie Test"); // la demande « newsletter » reprend le nom connu
  assertEquals(tables.clients[0].consentement_marketing, true);
  await post(contact, { type: "newsletter", email: "nouveau@test.fr" });
  assertEquals(tables.clients[1].nom, "nouveau");
});

Deno.test("paiement : pas de lien pour une commande remboursée ou annulée, et un paiement tardif ne la remet pas « payée »", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  await post(commande, demande({ paiement_mode: "en_ligne" }));
  const c = commandes[0];
  c.paiement_statut = "rembourse";
  assertEquals((await post(admin, { action: "lien_paiement", commande_id: c.id }, auth)).status, 400);
  appels = [];
  const evenement = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", metadata: { commande_id: c.id } } } });
  const r = await (await post(webhook, evenement, { "Stripe-Signature": await signer(evenement) })).json();
  assertEquals(r.a_verifier, true);
  assertEquals(c.paiement_statut, "rembourse");
  assertEquals(emails().length, 1);
  assertEquals(emails()[0].to, ["boutique@test.fr"]);
  assertMatch(emails()[0].subject, /À vérifier/);
  c.paiement_statut = "en_attente";
  c.statut = "annulee";
  assertEquals((await post(admin, { action: "lien_paiement", commande_id: c.id }, auth)).status, 400);
});

Deno.test("caisse : nom trop court refusé sans fiche orpheline, pas de fiche pour une simple adresse, accord gardé avec le téléphone seul", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const vente = (client: Record<string, unknown>, modif: Record<string, unknown> = {}) =>
    post(admin, { action: "creer_commande", vente: { client, lignes: [{ id: "mug-personnalise", quantite: 1 }], canal: "boutique", paiement_statut: "paye", paiement_moyen: "carte", ...modif } }, auth);
  assertEquals((await vente({ nom: "A" })).status, 400);
  assertEquals(tables.clients.length, 0);
  assertEquals(commandes.length, 0);
  assertEquals((await vente({ adresse: "3 rue des Lilas, Auchel" }, { mode_reception: "livraison", port: 5.9 })).status, 201);
  assertEquals(tables.clients.length, 0);
  assertEquals(commandes[0].client_nom, "Client en boutique");
  assertEquals((await vente({ tel: "0611223344", consentement: true })).status, 201);
  assertEquals(tables.clients.length, 1);
  assertEquals(tables.clients[0].consentement_marketing, true);
  assertEquals(commandes[1].client_id, tables.clients[0].id);
});

Deno.test("email aux abonnés : un envoi entièrement raté n'est pas gardé dans l'historique", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  tables.clients.push({ id: "c1", nom: "Marie", email: "marie@test.fr", consentement_marketing: true });
  Deno.env.set("BREVO_API_KEY", "xkeysib-refusee");
  try {
    assertEquals((await post(admin, { action: "campagne", sujet: "Noël", message: "Nos idées cadeaux" }, auth)).status, 400);
    assertEquals(tables.campagnes?.length ?? 0, 0);
  } finally {
    Deno.env.delete("BREVO_API_KEY");
  }
  await post(admin, { action: "campagne", sujet: "Noël", message: "Nos idées cadeaux", lien: "https://boutique.test/", texte_lien: "Voir" }, auth);
  assertEquals(tables.campagnes[0].texte_lien, "Voir");
});

Deno.test("caisse : vente réglée sur un salon terminée, commande par téléphone réglée encore à traiter", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const vente = (canal: string, paiement_statut: string) =>
    post(admin, { action: "creer_commande", vente: { lignes: [{ id: "mug-personnalise", quantite: 1 }], canal, paiement_statut, paiement_moyen: paiement_statut === "paye" ? "carte" : "" } }, auth);
  await vente("salon", "paye");
  await vente("telephone", "paye");
  await vente("salon", "en_attente");
  assertEquals(commandes.map((c) => [c.statut, c.paiement_mode]), [["terminee", "boutique"], ["nouvelle", "boutique"], ["nouvelle", "apres_validation"]]);
});

Deno.test("caisse : code promo vérifié, compté et enregistré ; code invalide refusé", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const vente = (code_promo: string, quantite = 2) =>
    post(admin, { action: "creer_commande", vente: { lignes: [{ id: "mug-personnalise", quantite }], canal: "boutique", paiement_statut: "paye", paiement_moyen: "carte", remise: 1, code_promo } }, auth);
  assertEquals((await vente("NOEL10")).status, 201); // 2 × 14,90 = 29,80 → −10 % = 2,98 (la remise saisie à la main est ignorée)
  assertEquals(commandes[0].remise, 2.98);
  assertEquals(commandes[0].code_promo, "NOEL10");
  assertEquals(commandes[0].total, 26.82);
  assertEquals(tables.codes_promo[0].utilisations, 1);
  assertEquals((await vente("NOEL10", 1)).status, 400); // 14,90 € : sous le minimum de 20 €
  assertEquals((await vente("VIEUX")).status, 400); // expiré
  assertEquals(commandes.length, 1);
});

// ---------- Organisation de l'atelier ----------
Deno.test("relances : maquette à valider puis paiement, date du rappel gardée ; rien à rappeler sinon", async () => {
  reinitialiser();
  await post(commande, demande());
  const c = commandes[0];
  const auth = { Authorization: "Bearer jeton-admin" };
  const relancer = () => post(admin, { action: "notifier", commande_id: c.id, relance: true }, auth);

  assertEquals((await relancer()).status, 400); // commande à maquetter : rien à rappeler
  assertEquals(c.relance_le, undefined);

  c.statut = "maquette_envoyee";
  c.historique.push({ date: "2026-10-20T09:00:00Z", statut: "maquette_envoyee" });
  appels = [];
  const r = await (await relancer()).json();
  assertEquals(r.email_envoye, true);
  assertEquals(c.relance_le, r.relance_le);
  assertMatch(emails()[0].subject, /votre maquette attend votre réponse/);
  assert(emails()[0].html.includes("le 20 octobre"));

  // Maquette validée, lien de paiement envoyé : l'envoi du lien compte comme premier rappel
  c.statut = "confirmee";
  c.relance_le = null;
  await post(admin, { action: "lien_paiement", commande_id: c.id, envoyer: true }, auth);
  assert(c.relance_le);
  appels = [];
  assertEquals((await relancer()).status, 200);
  assertMatch(emails()[0].subject, /rappel de paiement/);
  assert(emails()[0].html.includes("&amp;payer=1"));

  c.paiement_statut = "paye";
  assertEquals((await relancer()).status, 400); // déjà payée
});

Deno.test("caisse : date « prête le » fixée à la vente, ignorée si invalide", async () => {
  reinitialiser();
  const auth = { Authorization: "Bearer jeton-admin" };
  const vente = (echeance: string) => post(admin, { action: "creer_commande", vente: { lignes: [{ id: "mug-personnalise", quantite: 1 }], canal: "telephone", echeance } }, auth);
  assertEquals((await vente("2026-11-06")).status, 201);
  assertEquals((await vente("demain")).status, 201);
  assertEquals((await vente("2026-13-45")).status, 201);
  assertEquals(commandes.map((c) => c.echeance), ["2026-11-06", undefined, undefined]);
});
