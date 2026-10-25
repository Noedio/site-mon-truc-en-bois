// Mode démo : tout le site fonctionne sans aucun compte (Supabase, Stripe, Brevo, GitHub).
// Les vraies fonctions serveur (js/demo-serveur.js, compilé depuis supabase/functions) tournent dans le navigateur ;
// ce fichier leur fournit une fausse base de données, un faux paiement par carte, une boîte mail simulée et
// une fausse publication du contenu. Tout reste dans ce navigateur (localStorage et IndexedDB).
// Activer : demo.html (« Lancer la démo ») ou ?demo=1 sur n'importe quelle page ; quitter : ?demo=0.
// Chargé juste après data/donnees.js, avant tout autre script.
(function () {
  const CLE = "mtb-demo";
  const CLE_BASE = "mtb-demo-base";
  const CLE_PHOTO = "mtb-demo-photo:";
  try {
    const p = new URLSearchParams(location.search);
    if (p.get("demo") === "1") localStorage.setItem(CLE, "1");
    if (p.get("demo") === "0") localStorage.removeItem(CLE);
    if (localStorage.getItem(CLE) !== "1") return;
  } catch {
    return;
  }

  const SCRIPT = document.currentScript?.src || new URL("js/demo.js", location.href).href;
  const BASE = SCRIPT.replace(/js\/demo\.js.*$/, ""); // adresse du site, avec « / » final
  const SITE = BASE.replace(/\/$/, "");
  // Adresses des pages de démo : celles de l'ancien site par défaut, réglables par le nouveau site (window.MTB_DEMO_PAGES).
  const PAGES = Object.assign({ guide: `${BASE}demo.html`, paiement: `${SITE}/demo-paiement.html`, quitter: `${BASE}index.html?demo=0` }, window.MTB_DEMO_PAGES || {});
  const SUPA = "https://demo.supabase.local";
  const ANON = "demo-anon";
  const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
  const COMPTE = { email: "demo@montrucenbois.fr", mdp: "demo1234" };
  const BOUTIQUE = "boutique@demo.montrucenbois.fr";
  const ENV = {
    SITE_URL: SITE,
    SITE_ORIGINES: "*",
    SUPABASE_URL: SUPA,
    SUPABASE_ANON_KEY: ANON,
    SUPABASE_SERVICE_ROLE_KEY: "demo-service",
    STRIPE_SECRET_KEY: "sk_test_demo",
    STRIPE_WEBHOOK_SECRET: "whsec_demo",
    BREVO_API_KEY: "xkeysib-demo",
    BOUTIQUE_EMAIL: BOUTIQUE,
    EMAIL_EXPEDITEUR: "Mon Truc en Bois <contact@montrucenbois.fr>",
    CONTENU_GITHUB_TOKEN: "demo",
    CONTENU_DEPOT: "demo/site",
    CONTENU_BRANCHE: "demo",
  };
  // Les fonctions serveur lisent leurs réglages avec Deno.env.get()
  globalThis.Deno ??= { env: { get: (k) => ENV[k] } };

  const ORIGINAL = structuredClone(window.DONNEES);
  const uuid = () => crypto.randomUUID();
  const maintenant = () => new Date().toISOString();
  const annee = () => new Date().toLocaleDateString("fr-FR", { year: "numeric", timeZone: "Europe/Paris" });
  const pad = (n) => String(n).padStart(4, "0");

  // ---------- Base de démonstration (localStorage) ----------
  let base = null;
  // Version des données d'exemple : quand elle change, la démo repart de zéro pour montrer les nouveaux exemples
  const EXEMPLES = 2;
  function charger() {
    try {
      base = JSON.parse(localStorage.getItem(CLE_BASE) || "null");
    } catch {}
    if (!base || base.exemples !== EXEMPLES) {
      base = { exemples: EXEMPLES, tables: { commandes: [], clients: [], demandes: [], codes_promo: [], campagnes: [], admins: [{ user_id: ADMIN_ID }] }, seq: { commandes: 0, factures: 0 }, emails: [], sessions: {}, coupons: {}, contenu: null, sha: "0".repeat(40) };
      remplirExemples();
      sauver();
    }
  }
  function sauver() {
    try {
      localStorage.setItem(CLE_BASE, JSON.stringify(base));
    } catch {
      console.warn("Démo : stockage du navigateur plein, réinitialisez la démo.");
    }
  }

  // ---------- Contenu du site publié en démo ----------
  // Au départ : le contenu réel, commandes ouvertes et paiement par carte activé. Ensuite : ce que l'admin publie.
  function contenu() {
    const d = structuredClone(base.contenu || ORIGINAL);
    if (!base.contenu) {
      d.site.apercu = false;
      d.site.prixVerifies = true;
      d.site.emailVerifie = true;
      d.site.url = SITE;
      d.site.commandes = { ...(d.site.commandes || {}), paiement: { enLigne: true, apresValidation: true, boutique: true } };
    }
    d.site.commandes = { ...(d.site.commandes || {}), supabaseUrl: SUPA, supabaseCle: ANON };
    return d;
  }
  // Photos ajoutées depuis l'admin pendant la démo : gardées dans le navigateur, affichées à la place du fichier img/…
  function avecPhotos(valeur) {
    if (typeof valeur === "string") {
      if (!valeur.startsWith("img/")) return valeur;
      try {
        return localStorage.getItem(CLE_PHOTO + valeur) || valeur;
      } catch {
        return valeur;
      }
    }
    if (Array.isArray(valeur)) return valeur.map(avecPhotos);
    if (valeur && typeof valeur === "object") return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, avecPhotos(v)]));
    return valeur;
  }

  // ---------- Photos envoyées par les clients (IndexedDB : elles peuvent être lourdes) ----------
  const idb = () =>
    new Promise((ok, ko) => {
      const r = indexedDB.open("mtb-demo", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  async function photoClient(chemin, blob) {
    const bd = await idb();
    return new Promise((ok, ko) => {
      const t = bd.transaction("photos", blob ? "readwrite" : "readonly");
      const r = blob ? t.objectStore("photos").put(blob, chemin) : t.objectStore("photos").get(chemin);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }

  // ---------- Réponses HTTP ----------
  const reponse = (corps, status = 200, entetes = {}) =>
    new Response(corps === null ? null : JSON.stringify(corps), { status, headers: { "Content-Type": "application/json", ...entetes } });
  const texteBase64 = (t) => {
    const o = new TextEncoder().encode(t);
    let b = "";
    for (let i = 0; i < o.length; i += 0x8000) b += String.fromCharCode(...o.subarray(i, i + 0x8000));
    return btoa(b);
  };
  const base64Texte = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

  // ---------- Fausse base de données (API REST de Supabase, sous-ensemble utilisé par le site) ----------
  const TABLES = ["commandes", "clients", "demandes", "codes_promo", "campagnes", "admins", "stats_ventes"];
  const valeurFiltre = (v) => v.replace(/^"|"$/g, ""); // déjà décodée par URLSearchParams
  function correspond(ligne, colonne, expr) {
    const v = ligne[colonne];
    const [op, ...reste] = expr.split(".");
    const x = reste.join(".");
    if (op === "not") return !correspond(ligne, colonne, x);
    if (op === "is") return x === "null" ? v === null || v === undefined : String(v) === x;
    if (op === "in") return x.replace(/^\(|\)$/g, "").split(",").map(valeurFiltre).includes(String(v));
    const s = valeurFiltre(x);
    if (op === "eq") return String(v) === s;
    if (op === "neq") return String(v) !== s;
    const n = (a) => (isNaN(Number(a)) ? a : Number(a));
    if (op === "gt") return n(v) > n(s);
    if (op === "gte") return n(v) >= n(s);
    if (op === "lt") return n(v) < n(s);
    if (op === "lte") return n(v) <= n(s);
    return true;
  }
  const erreur = (status, message, code = "") => reponse({ message, code, details: null, hint: null }, status);

  function avantEcriture(table, ligne, ancienne) {
    const t = maintenant();
    if (table === "commandes") {
      if (!ancienne) {
        base.seq.commandes++;
        ligne = {
          id: uuid(), numero: `MTB-${annee()}-${pad(base.seq.commandes)}`, jeton_suivi: uuid(), cree_le: t, statut: "nouvelle",
          client_tel: "", adresse: "", message: "", cadeau: {}, port: 0, emballage: 0, remise: 0, code_promo: "", paiement_mode: "apres_validation",
          paiement_statut: "en_attente", paye_le: null, stripe_session_id: null, stripe_url: null, facture_numero: null, suivi_colis: "", notes: "",
          client_id: null, canal: "site", paiement_moyen: "", remises: [], paiements: [], echeance: null, relance_le: null, ...ligne,
        };
        ligne.historique = [{ date: ligne.cree_le, statut: ligne.statut }];
      } else if (ligne.statut !== ancienne.statut) ligne.historique = [...(ancienne.historique || []), { date: t, statut: ligne.statut }];
      if (String(ligne.client_nom || "").length < 2) throw Object.assign(new Error('new row violates check constraint "commandes_client_nom_check"'), { code: "23514" });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ligne.client_email || "")) throw Object.assign(new Error('new row violates check constraint "commandes_client_email_check"'), { code: "23514" });
      ligne.maj_le = t;
      if (ligne.paiement_statut === "paye" && !ligne.facture_numero) {
        base.seq.factures++;
        ligne.facture_numero = `F-${annee()}-${pad(base.seq.factures)}`;
        ligne.paye_le ??= t;
      }
      return ligne;
    }
    if (table === "clients") {
      if (!ancienne) ligne = { id: uuid(), cree_le: t, nom: "", email: null, tel: "", adresse: "", notes: "", etiquettes: [], source: "site", consentement_marketing: false, consentement_le: null, ...ligne };
      if (ligne.email) ligne.email = String(ligne.email).toLowerCase();
      if (ligne.email && base.tables.clients.some((c) => c.email === ligne.email && c.id !== ligne.id))
        throw Object.assign(new Error('duplicate key value violates unique constraint "clients_email_key"'), { code: "23505", status: 409 });
      ligne.maj_le = t;
      return ligne;
    }
    if (table === "demandes" && !ancienne) return { id: uuid(), cree_le: t, type: "contact", statut: "nouvelle", nom: "", email: "", tel: "", sujet: "", message: "", quantite: null, notes: "", client_id: null, fichiers: [], ...ligne };
    if (table === "codes_promo") {
      if (!ancienne) ligne = { cree_le: t, description: "", type: "pourcentage", minimum: 0, debut: null, fin: null, utilisations_max: null, utilisations: 0, actif: true, ...ligne };
      ligne.code = String(ligne.code || "").toUpperCase();
      if (!/^[A-Z0-9_-]{3,30}$/.test(ligne.code)) throw Object.assign(new Error('new row violates check constraint "codes_promo_code_check"'), { code: "23514" });
      if (base.tables.codes_promo.some((p) => p.code === ligne.code && p !== ancienne)) throw Object.assign(new Error("Ce code existe déjà."), { code: "23505", status: 409 });
      return ligne;
    }
    if (table === "campagnes" && !ancienne) return { id: uuid(), cree_le: t, message: "", lien: "", texte_lien: "", destinataires: 0, ...ligne };
    return ligne;
  }

  function statsVentes() {
    const groupes = {};
    for (const c of base.tables.commandes) {
      if (c.statut === "annulee" || c.paiement_statut === "rembourse") continue;
      const d = new Date(c.cree_le);
      const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const g = (groupes[`${mois}|${c.canal}`] ??= { mois, canal: c.canal, commandes: 0, chiffre_affaires: 0, encaisse: 0 });
      g.commandes++;
      g.chiffre_affaires += Number(c.total);
      if (c.paiement_statut === "paye") g.encaisse += Number(c.total);
    }
    return Object.values(groupes);
  }

  function rest(table, url, methode, entetes, corps) {
    if (!TABLES.includes(table)) return erreur(404, `relation "public.${table}" does not exist`, "42P01");
    const lignes = table === "stats_ventes" ? statsVentes() : base.tables[table];
    const filtres = [...url.searchParams].filter(([k]) => !["select", "order", "limit", "offset", "columns", "on_conflict"].includes(k));
    const garde = (l) => filtres.every(([col, expr]) => correspond(l, col, expr));
    const objet = (entetes.get("Accept") || "").includes("vnd.pgrst.object");
    const prefer = entetes.get("Prefer") || "";
    try {
      if (methode === "GET" || methode === "HEAD") {
        let r = lignes.filter(garde);
        const total = r.length;
        const ordre = url.searchParams.get("order");
        if (ordre)
          for (const o of ordre.split(",").reverse()) {
            const [col, sens] = o.split(".");
            r = [...r].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (sens === "desc" ? -1 : 1));
          }
        const limite = Number(url.searchParams.get("limit") || 0);
        if (limite) r = r.slice(0, limite);
        const colonnes = (url.searchParams.get("select") || "*").split(",").map((c) => c.trim());
        if (!colonnes.includes("*")) r = r.map((l) => Object.fromEntries(colonnes.map((c) => [c, l[c] ?? null])));
        const entetesCompte = /count=/.test(prefer) ? { "Content-Range": `${r.length ? `0-${r.length - 1}` : "*"}/${total}` } : {};
        if (methode === "HEAD") return new Response(null, { status: 200, headers: entetesCompte });
        if (objet) return r.length === 1 ? reponse(structuredClone(r[0]), 200, entetesCompte) : erreur(406, "JSON object requested, multiple (or no) rows returned", "PGRST116");
        return reponse(structuredClone(r), 200, entetesCompte);
      }
      if (table === "stats_ventes") return erreur(405, "cannot change a view");
      let modifiees = [];
      if (methode === "POST") {
        const nouvelles = [].concat(JSON.parse(corps || "[]"));
        modifiees = nouvelles.map((n) => avantEcriture(table, structuredClone(n), null));
        base.tables[table].push(...modifiees);
      } else if (methode === "PATCH") {
        const modif = JSON.parse(corps || "{}");
        const cibles = lignes.filter(garde);
        const calculees = cibles.map((l) => avantEcriture(table, { ...structuredClone(l), ...modif }, l));
        cibles.forEach((l, i) => Object.assign(l, calculees[i]));
        modifiees = cibles;
      } else if (methode === "DELETE") {
        modifiees = lignes.filter(garde);
        base.tables[table] = lignes.filter((l) => !garde(l));
        if (table === "clients") {
          const ids = new Set(modifiees.map((c) => c.id));
          for (const t of ["commandes", "demandes"]) base.tables[t].forEach((l) => ids.has(l.client_id) && (l.client_id = null));
        }
      } else return erreur(405, "Méthode non gérée en démo");
      sauver();
      const status = methode === "POST" ? 201 : 200;
      if (!/return=representation/.test(prefer)) return new Response(null, { status: methode === "POST" ? 201 : 204 });
      if (objet) return modifiees.length === 1 ? reponse(structuredClone(modifiees[0]), status) : erreur(406, "JSON object requested, multiple (or no) rows returned", "PGRST116");
      return reponse(structuredClone(modifiees), status);
    } catch (e) {
      return erreur(e.status || 400, e.message, e.code || "");
    }
  }

  // ---------- Faux service de connexion (Supabase Auth) ----------
  const b64url = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const UTILISATEUR = { id: ADMIN_ID, aud: "authenticated", role: "authenticated", email: COMPTE.email, email_confirmed_at: "2026-10-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
  function session() {
    const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
    const jeton = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: ADMIN_ID, email: COMPTE.email, role: "authenticated", aud: "authenticated", exp })}.demo`;
    return { access_token: jeton, token_type: "bearer", expires_in: 30 * 86400, expires_at: exp, refresh_token: "demo-" + uuid(), user: UTILISATEUR };
  }
  const jetonValide = (entetes) => /^Bearer .+\..+\.demo$/.test(entetes.get("Authorization") || "");
  function auth(url, methode, entetes, corps) {
    const chemin = url.pathname.replace("/auth/v1/", "");
    if (chemin === "token") {
      if (url.searchParams.get("grant_type") === "refresh_token") return reponse(session());
      const d = JSON.parse(corps || "{}");
      if (String(d.email).trim().toLowerCase() === COMPTE.email && d.password === COMPTE.mdp) return reponse(session());
      return reponse({ code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
    }
    if (chemin === "user") return jetonValide(entetes) ? reponse(UTILISATEUR) : reponse({ code: 401, msg: "invalid JWT" }, 401);
    if (chemin === "logout") return new Response(null, { status: 204 });
    if (chemin === "recover") {
      ajouterEmail({ a: JSON.parse(corps || "{}").email || COMPTE.email, sujet: "Mon Truc en Bois : choisir un nouveau mot de passe", html: `<p>En démo, le mot de passe reste <strong>${COMPTE.mdp}</strong>. Sur le vrai site, ce bouton ouvre l'admin pour en choisir un nouveau.</p><p><a href="${SITE}/admin.html">Ouvrir l'admin</a></p>` });
      return reponse({});
    }
    return reponse({});
  }

  // ---------- Stockage des photos clients ----------
  async function stockage(url, methode, corps) {
    const chemin = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(upload\/)?sign\/photos-clients\//, ""));
    if (url.pathname.startsWith("/storage/v1/object/upload/sign/")) {
      if (methode === "PUT") {
        await photoClient(chemin, corps instanceof Blob ? corps : new Blob([corps], { type: "image/jpeg" }));
        return reponse({ Key: `photos-clients/${chemin}` });
      }
      return reponse({ url: `/object/upload/sign/photos-clients/${encodeURI(chemin)}?token=envoi-demo` });
    }
    if (url.pathname.startsWith("/storage/v1/object/sign/")) return reponse({ signedURL: `/object/sign/photos-clients/${encodeURI(chemin)}?token=lecture-demo` });
    return erreur(404, "Objet introuvable");
  }

  // ---------- Faux Stripe (page de paiement de démonstration) ----------
  function stripe(url, corps) {
    const f = new URLSearchParams(corps || "");
    if (url.pathname === "/v1/coupons") {
      const id = "coupon_demo_" + uuid().slice(0, 8);
      base.coupons[id] = Number(f.get("amount_off") || 0);
      sauver();
      return reponse({ id });
    }
    if (url.pathname === "/v1/checkout/sessions") {
      let total = 0;
      const articles = [];
      for (let i = 0; f.has(`line_items[${i}][quantity]`); i++) {
        const q = Number(f.get(`line_items[${i}][quantity]`));
        const pu = Number(f.get(`line_items[${i}][price_data][unit_amount]`));
        total += q * pu;
        articles.push({ nom: f.get(`line_items[${i}][price_data][product_data][name]`), quantite: q, montant: q * pu });
      }
      const remise = base.coupons[f.get("discounts[0][coupon]")] || 0;
      const id = "cs_demo_" + uuid().replace(/-/g, "").slice(0, 16);
      base.sessions[id] = {
        id, total: Math.max(0, total - remise), remise, articles, email: f.get("customer_email"), numero: f.get("metadata[numero]"),
        commande_id: f.get("metadata[commande_id]"), success_url: f.get("success_url"), cancel_url: f.get("cancel_url"), cree_le: maintenant(),
      };
      sauver();
      return reponse({ id, url: `${PAGES.paiement}?session=${id}` });
    }
    return erreur(404, "Stripe (démo) : appel non simulé");
  }
  async function payer(id) {
    const s = base.sessions[id];
    if (!s) throw new Error("Paiement introuvable");
    const evenement = JSON.stringify({ type: "checkout.session.completed", data: { object: { id, payment_status: "paid", metadata: { commande_id: s.commande_id, numero: s.numero } } } });
    const t = Math.floor(Date.now() / 1000);
    const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(ENV.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${t}.${evenement}`)));
    const signature = `t=${t},v1=${[...mac].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    const r = await fetch(`${SUPA}/functions/v1/stripe-webhook`, { method: "POST", headers: { "Stripe-Signature": signature, "Content-Type": "application/json" }, body: evenement });
    if (!r.ok) throw new Error("La confirmation du paiement a échoué.");
    return s.success_url;
  }

  // ---------- Boîte mail simulée (Brevo) ----------
  function ajouterEmail({ a, sujet, html, de = ENV.EMAIL_EXPEDITEUR, repondreA = "" }) {
    base.emails.unshift({ id: uuid(), date: maintenant(), a, de, sujet, html, repondreA, lu: false });
    base.emails = base.emails.slice(0, 200);
    sauver();
    document.dispatchEvent(new CustomEvent("mtb-demo-email"));
  }
  function brevo(corps) {
    const d = JSON.parse(corps || "{}");
    ajouterEmail({ a: d.to?.[0]?.email || "", sujet: d.subject || "", html: d.htmlContent || "", de: `${d.sender?.name || ""} <${d.sender?.email || ""}>`, repondreA: d.replyTo?.email || "" });
    return reponse({ messageId: `<${uuid()}@demo>` }, 201);
  }

  // ---------- Fausse publication du contenu (API GitHub du serveur) ----------
  let serveur = null;
  // Même numéro de version que js/demo.js : après une mise à jour, le navigateur recharge aussi le serveur de démo
  const VERSION = new URL(SCRIPT).searchParams.get("v") || "";
  const chargerServeur = () => (serveur ??= import(`${BASE}js/demo-serveur.js${VERSION ? `?v=${VERSION}` : ""}`));
  async function github(url, methode, corps) {
    const chemin = decodeURIComponent(url.pathname.replace("/repos/demo/site/contents/", ""));
    const expiration = { "github-authentication-token-expiration": "2027-10-01 00:00:00 UTC" };
    if (chemin === "data/donnees.js" && methode === "GET")
      return reponse({ sha: base.sha, content: texteBase64(`window.DONNEES = ${JSON.stringify(contenu(), null, 2)};\n`) }, 200, expiration);
    if (methode !== "PUT") return reponse({ message: "Not Found" }, 404);
    const d = JSON.parse(corps || "{}");
    if (chemin === "data/donnees.js") {
      if (d.sha !== base.sha) return reponse({ message: "conflict" }, 409);
      const texte = base64Texte(d.content);
      base.contenu = JSON.parse(texte.slice(texte.search(/^window\.DONNEES = /m) + "window.DONNEES = ".length).trim().replace(/;\s*$/, ""));
      base.sha = [...crypto.getRandomValues(new Uint8Array(20))].map((b) => b.toString(16).padStart(2, "0")).join("");
      sauver();
      (await chargerServeur()).viderCacheCatalogue();
      return reponse({ content: { sha: base.sha }, commit: { sha: base.sha } }, 200);
    }
    if (/^img\/[a-z0-9-]+\.jpg$/.test(chemin)) {
      try {
        localStorage.setItem(CLE_PHOTO + chemin, `data:image/jpeg;base64,${d.content}`);
      } catch {
        return reponse({ message: "Stockage du navigateur plein : réinitialisez la démo pour ajouter d'autres photos." }, 422);
      }
      return reponse({ content: { sha: uuid().replace(/-/g, "") } }, 201);
    }
    return reponse({ message: "Not Found" }, 404);
  }

  // ---------- Aiguillage de toutes les requêtes ----------
  const FONCTIONS = { commande: "commande", suivi: "suivi", contact: "contact", admin: "admin", "stripe-webhook": "webhook" };
  const vraiFetch = window.fetch.bind(window);
  window.fetch = async (entree, init = {}) => {
    const req = entree instanceof Request ? entree : null;
    const url = new URL(req ? req.url : String(entree), location.href);
    const methode = String(init.method || req?.method || "GET").toUpperCase();
    const entetes = new Headers(init.headers || req?.headers || {});
    let corps = init.body;
    if (corps === undefined && req && !["GET", "HEAD"].includes(methode)) corps = await req.clone().text();
    if (url.href.split("?")[0] === `${SITE}/data/donnees.js`) return new Response(`window.DONNEES = ${JSON.stringify(contenu())};\n`, { headers: { "Content-Type": "text/javascript" } });
    if (url.origin === SUPA) {
      const fn = url.pathname.match(/^\/functions\/v1\/([a-z-]+)/)?.[1];
      if (fn) {
        if (!FONCTIONS[fn]) return erreur(404, "Fonction inconnue");
        const module = await chargerServeur();
        return module[FONCTIONS[fn]](new Request(url.href, { method: methode, headers: entetes, body: ["GET", "HEAD"].includes(methode) ? undefined : corps }));
      }
      if (url.pathname.startsWith("/auth/v1/")) return auth(url, methode, entetes, typeof corps === "string" ? corps : "");
      if (url.pathname === "/rest/v1/rpc/utiliser_code_promo") {
        const p = base.tables.codes_promo.find((x) => x.code === JSON.parse(corps || "{}").p_code);
        if (!p || !p.actif || (p.utilisations_max && p.utilisations >= p.utilisations_max)) return reponse(false);
        p.utilisations++;
        sauver();
        return reponse(true);
      }
      const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
      if (table) return rest(table, url, methode, entetes, typeof corps === "string" ? corps : "");
      if (url.pathname.startsWith("/storage/v1/")) return stockage(url, methode, corps);
      return erreur(404, "Démo : adresse non simulée");
    }
    if (url.origin === "https://api.stripe.com") return stripe(url, typeof corps === "string" ? corps : String(corps || ""));
    if (url.href === "https://api.brevo.com/v3/smtp/email") return brevo(corps);
    if (url.href.startsWith("https://api.github.com/repos/demo/site/contents/")) return github(url, methode, corps);
    return vraiFetch(entree, init);
  };

  // ---------- Données d'exemple (une boutique qui tourne déjà) ----------
  function remplirExemples() {
    const P = (id, quantite = 1, extra = {}) => {
      const p = ORIGINAL.produits.find((x) => x.id === id) || ORIGINAL.produits[0];
      return { id: p.id, nom: p.nom, quantite, prix_unitaire: p.prix, total: Math.round(p.prix * quantite * 100) / 100, variante: "", texte: "", police: "", remarque: "", photo_nom: "", photo_type: "", photo_chemin: "", ...extra };
    };
    const ilYa = (jours, heures = 0) => new Date(Date.now() - jours * 86400e3 - heures * 3600e3).toISOString();
    const dans = (jours) => new Date(Date.now() + jours * 86400e3).toISOString().slice(0, 10);
    const client = (c) => {
      const l = avantEcriture("clients", c, null);
      base.tables.clients.push(l);
      return l;
    };
    const marie = client({ nom: "Marie Lefebvre", email: "marie.lefebvre@exemple.fr", tel: "06 12 34 56 78", adresse: "12 rue des Tilleuls, 62260 Auchel", etiquettes: ["mariage"], consentement_marketing: true, consentement_le: ilYa(60), cree_le: ilYa(60) });
    const club = client({ nom: "Club de foot d'Auchel", email: "contact@club-auchel.exemple", tel: "03 21 00 00 00", etiquettes: ["club", "pro"], source: "site", cree_le: ilYa(150), notes: "Commande chaque année les médailles du tournoi de juin." });
    const julien = client({ nom: "Julien Martin", tel: "07 11 22 33 44", source: "boutique", cree_le: ilYa(45) });
    const sophie = client({ nom: "Sophie Dubois", email: "sophie.dubois@exemple.fr", source: "newsletter", consentement_marketing: true, consentement_le: ilYa(20), cree_le: ilYa(20) });
    // Date AAAA-MM-JJ à n jours ouvrés d'aujourd'hui (lundi au vendredi ; les fériés sont ignorés ici)
    const ouvre = (n) => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      for (let reste = Math.abs(n); reste > 0; ) {
        d.setDate(d.getDate() + Math.sign(n));
        if (d.getDay() % 6) reste--;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    // etapes : [[statut, date], …] pour un historique réaliste ; le dernier statut est celui de la commande
    const commande = ({ etapes, ...c }) => {
      const lignes = c.lignes;
      const sous_total = Math.round(lignes.reduce((t, l) => t + l.total, 0) * 100) / 100;
      const total = Math.round((sous_total + (c.port || 0) - (c.remise || 0)) * 100) / 100;
      const ligne = avantEcriture("commandes", { sous_total, total, ...c, ...(etapes ? { statut: etapes.at(-1)[0], cree_le: etapes[0][1] } : {}) }, null);
      if (etapes) ligne.historique = etapes.map(([statut, date]) => ({ date, statut }));
      base.tables.commandes.push(ligne);
    };
    commande({ client_id: julien.id, client_nom: julien.nom, client_email: "sans-email@boutique.invalid", client_tel: julien.tel, canal: "boutique", mode_reception: "retrait", lignes: [P("porte-cles-grave", 2, { texte: "Julien" })], paiement_mode: "boutique", paiement_statut: "paye", paiement_moyen: "carte", statut: "terminee", cree_le: ilYa(140) });
    commande({ client_id: club.id, client_nom: club.nom, client_email: club.email, client_tel: club.tel, canal: "telephone", mode_reception: "retrait", lignes: [P("plaque-message", 6, { texte: "Tournoi des jeunes 2026" })], paiement_mode: "boutique", paiement_statut: "paye", paiement_moyen: "virement", statut: "terminee", cree_le: ilYa(120) });
    commande({ client_nom: "Client en boutique", client_email: "sans-email@boutique.invalid", canal: "salon", mode_reception: "retrait", lignes: [P("dessous-de-verre", 4), P("decapsuleur-mural")], paiement_mode: "boutique", paiement_statut: "paye", paiement_moyen: "especes", statut: "terminee", cree_le: ilYa(75) });
    commande({ client_id: marie.id, client_nom: marie.nom, client_email: marie.email, client_tel: marie.tel, canal: "site", mode_reception: "livraison", adresse: marie.adresse, port: 5.9, lignes: [P("cadre-mariage", 1, { texte: "Marie & Thomas — 14 juin 2026", police: "Manuscrite" })], paiement_mode: "en_ligne", paiement_statut: "paye", statut: "expediee", suivi_colis: "6A12345678901", cree_le: ilYa(40) });
    commande({ client_id: julien.id, client_nom: julien.nom, client_email: "sans-email@boutique.invalid", client_tel: julien.tel, canal: "boutique", mode_reception: "retrait", lignes: [P("mug-personnalise", 1, { texte: "Meilleur papa" })], paiement_mode: "boutique", paiement_statut: "paye", paiement_moyen: "carte", statut: "terminee", cree_le: ilYa(12) });
    // Commandes en cours, à des étapes et des dates variées : liste « À faire » et plan de charge de l'admin.
    // Les produits n'ont pas encore de délai : les dates « prête le » sont fixées à la main (echeance), sauf une.
    commande({ client_id: club.id, client_nom: club.nom, client_email: club.email, client_tel: club.tel, canal: "telephone", mode_reception: "retrait", lignes: [P("porte-cles-grave", 12, { texte: "AS Auchel · Tournoi 2026" })], paiement_mode: "apres_validation", etapes: [["nouvelle", ilYa(8)], ["maquette_envoyee", ilYa(6)]] });
    commande({ client_nom: "Laura Fontaine", client_email: "laura.fontaine@exemple.fr", client_tel: "06 23 45 67 89", canal: "site", mode_reception: "retrait", lignes: [P("accroche-porte", 3, { texte: "Lou, Léo, Zoé", police: "Classique" })], paiement_mode: "apres_validation", stripe_url: `${PAGES.paiement}?session=exemple`, relance_le: ilYa(5), echeance: ouvre(3), etapes: [["nouvelle", ilYa(9)], ["maquette_envoyee", ilYa(8)], ["confirmee", ilYa(6)], ["en_fabrication", ilYa(5)]] });
    commande({ client_nom: "Nadia Benali", client_email: "nadia.benali@exemple.fr", client_tel: "06 45 67 89 01", canal: "site", mode_reception: "retrait", lignes: [P("plaque-message", 1, { texte: "Bienvenue chez Nadia et Karim", police: "Classique" })], paiement_mode: "apres_validation", etapes: [["nouvelle", ilYa(5, 3)]] });
    commande({ client_id: sophie.id, client_nom: sophie.nom, client_email: sophie.email, canal: "site", mode_reception: "retrait", lignes: [P("plaque-naissance-bois", 1, { texte: "Léa — 3 octobre 2026", police: "Arrondie" })], paiement_mode: "en_ligne", paiement_statut: "paye", echeance: ouvre(2), etapes: [["nouvelle", ilYa(4)], ["maquette_envoyee", ilYa(3)], ["confirmee", ilYa(2)], ["en_fabrication", ilYa(1)]] });
    commande({ client_nom: "Camille Roux", client_email: "camille.roux@exemple.fr", canal: "site", mode_reception: "livraison", adresse: "5 place de la Mairie, 62700 Bruay-la-Buissière", port: 5.9, lignes: [P("verres-graves", 2, { texte: "Camille & Hugo", police: "Manuscrite" })], paiement_mode: "apres_validation", notes: "Retouche : prénoms plus gros (réponse du client par email).", etapes: [["nouvelle", ilYa(4, 1)], ["maquette_envoyee", ilYa(3)], ["retouche", ilYa(1)]] });
    commande({ client_nom: "Inès Moreau", client_email: "ines.moreau@exemple.fr", client_tel: "07 12 34 56 78", canal: "telephone", mode_reception: "retrait", lignes: [P("tableau-scrabble", 1, { texte: "MOREAU" })], paiement_mode: "boutique", echeance: ouvre(-1), etapes: [["nouvelle", ilYa(7)], ["maquette_envoyee", ilYa(6)], ["confirmee", ilYa(5)], ["en_fabrication", ilYa(3)]] });
    commande({ client_nom: "Thomas Petit", client_email: "thomas.petit@exemple.fr", client_tel: "06 87 65 43 21", canal: "site", mode_reception: "retrait", lignes: [P("planche-aperitif", 1, { texte: "Chez Thomas", police: "Atelier" }), P("dessous-de-verre", 4)], paiement_mode: "apres_validation", echeance: ouvre(3), etapes: [["nouvelle", ilYa(5)], ["maquette_envoyee", ilYa(4)], ["confirmee", ilYa(2)]] });
    commande({ client_nom: "Gérard Lemaire", client_email: "sans-email@boutique.invalid", client_tel: "06 98 76 54 32", canal: "telephone", mode_reception: "retrait", lignes: [P("panneau-directionnel", 1, { texte: "La Cabane" })], paiement_mode: "boutique", etapes: [["nouvelle", ilYa(10)], ["confirmee", ilYa(9)], ["en_fabrication", ilYa(4)], ["prete", ilYa(1)]] });
    commande({ client_nom: "Hugo Lambert", client_email: "hugo.lambert@exemple.fr", client_tel: "06 55 44 33 22", canal: "site", mode_reception: "livraison", adresse: "18 rue Pasteur, 59000 Lille", port: 5.9, lignes: [P("bracelet-jonc", 2, { texte: "H & L" })], paiement_mode: "en_ligne", paiement_statut: "paye", echeance: ouvre(1), etapes: [["nouvelle", ilYa(6)], ["maquette_envoyee", ilYa(5)], ["confirmee", ilYa(4)], ["en_fabrication", ilYa(2)]] });
    commande({ client_nom: "Élodie Garnier", client_email: "elodie.garnier@exemple.fr", canal: "site", mode_reception: "retrait", lignes: [P("cadre-mariage", 1, { texte: "Élodie & Maxime", police: "Manuscrite" })], cadeau: { emballage: true, message: "", date: dans(10) }, paiement_mode: "en_ligne", paiement_statut: "paye", etapes: [["nouvelle", ilYa(3)], ["maquette_envoyee", ilYa(2)], ["confirmee", ilYa(0, 2)]] });
    commande({ client_id: marie.id, client_nom: marie.nom, client_email: marie.email, client_tel: marie.tel, canal: "site", mode_reception: "retrait", lignes: [P("planche-aperitif", 1, { texte: "Famille Lefebvre", police: "Classique" })], cadeau: { emballage: false, message: "", date: dans(12) }, paiement_mode: "apres_validation", paiement_statut: "en_attente", statut: "nouvelle", message: "Est-il possible d'ajouter un petit cœur après le nom ?", cree_le: ilYa(0, 5) });
    const demande = (d) => base.tables.demandes.push(avantEcriture("demandes", d, null));
    demande({ type: "devis", nom: club.nom, email: club.email, tel: club.tel, sujet: "Médailles gravées", message: "Bonjour, nous aurions besoin de 40 médailles gravées pour le tournoi de juin, avec le logo du club au dos. Quel délai et quel prix ?", quantite: 40, client_id: club.id, cree_le: ilYa(1) });
    demande({ type: "contact", nom: "Paul Renard", email: "paul.renard@exemple.fr", sujet: "Délais pour Noël", message: "Jusqu'à quelle date peut-on commander une planche gravée pour l'avoir avant Noël ?", cree_le: ilYa(0, 3) });
    demande({ type: "newsletter", nom: sophie.nom, email: sophie.email, statut: "archivee", client_id: sophie.id, cree_le: ilYa(20) });
    // Demandes de devis avec fichiers joints (photos du site rangées sous exemples/, voir lienPhoto)
    const fichier = (nom, image, taille) => ({ chemin: `exemples/${image}`, nom, type: "image/jpeg", taille });
    demande({ type: "devis", nom: "Nathalie Caron", email: "nathalie.caron@exemple.fr", tel: "06 45 67 89 10", sujet: "Plaque pour l'entrée du cabinet", message: "Bonjour, je voudrais une plaque dans ce style, environ 30 × 20 cm, avec le nom du cabinet et les horaires. Je vous joins le modèle qui me plaît et une photo de l'entrée.", quantite: 1, fichiers: [fichier("modele-plaque.jpg", "plaque-message.jpg", 95833), fichier("entree-cabinet.jpg", "panneau-bienvenue.jpg", 78592)], cree_le: ilYa(0, 1) });
    demande({ type: "devis", nom: marie.nom, email: marie.email, tel: marie.tel, sujet: "Photo gravée pour les 80 ans de ma grand-mère", message: "Est-il possible de graver cette photo sur une planche, avec « Joyeux anniversaire Mamie » en dessous ? Il me la faudrait pour le 15 novembre.", fichiers: [fichier("photo-famille.jpg", "photo-gravee-bois.jpg", 144811)], client_id: marie.id, statut: "repondue", cree_le: ilYa(3) });
    base.tables.codes_promo.push(avantEcriture("codes_promo", { code: "BIENVENUE10", description: "10 % pour votre première commande", type: "pourcentage", valeur: 10, cree_le: ilYa(30) }, null));
  }

  // ---------- Bandeau « mode démo » sur chaque page ----------
  function bandeau() {
    const n = base.emails.filter((e) => !e.lu).length;
    let b = document.getElementById("bandeau-demo");
    if (!b) {
      b = document.createElement("div");
      b.id = "bandeau-demo";
      b.setAttribute("role", "note");
      b.style.cssText = "background:#a4471c;color:#fff;font:400 13px/1.4 'Courier Prime','Courier New',monospace;padding:0 max(16px,env(safe-area-inset-left,0px));display:flex;gap:0 16px;flex-wrap:wrap;align-items:center;justify-content:center;text-align:center";
      document.body.prepend(b);
    }
    const lien = "color:#fff;font-weight:700;text-decoration:underline;display:inline-flex;align-items:center;min-height:44px";
    if (document.body.firstElementChild !== b) document.body.prepend(b);
    b.innerHTML = `<span><strong>Démo</strong> : rien n'est envoyé ni payé</span>
      <a style="${lien}" href="${PAGES.guide}#boite">Boîte mail${n ? ` (${n})` : ""}</a>
      <a style="${lien}" href="${PAGES.guide}">Guide</a>
      <a style="${lien}" href="${BASE}admin.html">Admin</a>
      <a style="${lien}" href="${PAGES.quitter}">Quitter</a>`;
  }
  function pageAdmin() {
    // Identifiants de démo déjà remplis, et pas d'accès agence (il passerait par le vrai GitHub).
    // Seulement sur l'écran de connexion de l'admin : le panier a aussi un champ « c-email ».
    if (!document.getElementById("form-commercant")) return;
    const email = document.getElementById("c-email");
    const mdp = document.getElementById("c-mdp");
    if (email && !email.value) email.value = COMPTE.email;
    if (mdp && !mdp.value) mdp.value = COMPTE.mdp;
    document.getElementById("acces-agence")?.setAttribute("hidden", "");
    const aide = document.getElementById("form-commercant");
    if (aide && !document.getElementById("aide-demo")) aide.insertAdjacentHTML("afterbegin", `<p id="aide-demo" class="message">Démo : identifiants <strong>${COMPTE.email}</strong> / <strong>${COMPTE.mdp}</strong>, déjà remplis.</p>`);
  }

  charger();
  window.DONNEES = avecPhotos(contenu());
  window.MTB_DEMO = {
    actif: true,
    base: BASE,
    compte: COMPTE,
    boutique: BOUTIQUE,
    emails: () => base.emails,
    marquerLu: (id) => {
      const e = base.emails.find((x) => x.id === id);
      if (e && !e.lu) {
        e.lu = true;
        sauver();
        bandeau();
      }
    },
    session: (id) => base.sessions[id],
    payer,
    photo(chemin) {
      try {
        return localStorage.getItem(CLE_PHOTO + chemin) || "";
      } catch {
        return "";
      }
    },
    async lienPhoto(url) {
      const chemin = decodeURIComponent(new URL(url).pathname.replace(/^\/storage\/v1\/object\/sign\/photos-clients\//, ""));
      const blob = await photoClient(chemin).catch(() => null);
      if (blob) return URL.createObjectURL(blob);
      // Fichiers des demandes d'exemple : des photos du site (img/)
      return chemin.startsWith("exemples/") ? `${BASE}img/${chemin.slice("exemples/".length)}` : url;
    },
    reinitialiser() {
      try {
        Object.keys(localStorage).filter((k) => k.startsWith(CLE_PHOTO) || ["mtb-demo-supabase", "brouillon-mtb-demo"].includes(k)).forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(CLE_BASE);
        indexedDB.deleteDatabase("mtb-demo");
      } catch {}
      base = null;
      charger();
    },
  };
  // Après les autres scripts de la page (annonce, bandeaux du site) : le bandeau de démo reste tout en haut
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(() => {
      bandeau();
      pageAdmin();
    })
  );
  document.addEventListener("mtb-demo-email", () => document.body && bandeau());
})();
