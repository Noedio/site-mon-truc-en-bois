// Onglet « Installation » de l'admin : assistant qui installe le serveur de la boutique (Supabase),
// le paiement par carte (Stripe) et les emails (Brevo), puis vérifie que tout fonctionne.
// Les clés secrètes sont chiffrées dans le navigateur et rangées dans les « secrets » GitHub du dépôt :
// elles ne sont jamais publiées sur le site. L'installation elle-même tourne dans GitHub Actions
// (.github/workflows/supabase.yml), lancée par l'enregistrement de supabase/installation.json.
(function () {
  const WORKFLOW = "supabase.yml";
  const SODIUM = "https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.15/+esm";
  const ETAPES_SERVEUR = [
    "Accès au projet Supabase",
    "Tests des fonctions",
    "Base de données (tables, droits, stockage des photos)",
    "Réglages de connexion (adresse du site, inscriptions fermées, email de mot de passe)",
    "Compte administrateur",
    "Réglages secrets des fonctions",
    "Déploiement des fonctions",
    "Webhook Stripe (confirmation automatique des paiements)",
  ];
  const FONCTIONS = { commande: "Commandes", suivi: "Suivi client", contact: "Devis et newsletter", admin: "Gestion", "stripe-webhook": "Confirmation des paiements" };

  let ctx = null;
  let zone = null;
  let gh = null; // { secrets: {NOM: date}, variables: {NOM: valeur}, droits: {secrets, variables}, dernier }
  let enCours = false;

  const e = (s) => ctx.echapper(s);
  const api = (chemin, o) => ctx.github.api(chemin, o);
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const date = (d) => (d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "");
  const cmd = () => ctx.D.site.commandes;
  const adresseSiteParDefaut = () => {
    const ici = location.origin + location.pathname.replace(/\/[^/]*$/, "");
    return /github\.io|^https:/.test(ici) && !/localhost|127\.0\.0\.1/.test(ici) ? ici : `https://${ctx.github.cfg.proprio.toLowerCase()}.github.io/${ctx.github.cfg.depot}`;
  };

  // ---------- Lecture de l'état GitHub (secrets, variables, dernière installation) ----------
  async function lireGithub() {
    const r = { secrets: {}, variables: {}, droits: { secrets: false, variables: false }, dernier: null };
    await Promise.all([
      api("/actions/secrets?per_page=100").then((x) => ((r.droits.secrets = true), x.secrets.forEach((s) => (r.secrets[s.name] = s.updated_at)))).catch(() => {}),
      api("/actions/variables?per_page=30").then((x) => ((r.droits.variables = true), x.variables.forEach((v) => (r.variables[v.name] = v.value)))).catch(() => {}),
      api(`/actions/workflows/${WORKFLOW}/runs?per_page=1`).then((x) => (r.dernier = x.workflow_runs[0] || null)).catch(() => {}),
    ]);
    return r;
  }

  // ---------- Vérifications en direct ----------
  const entetes = (cle) => ({ apikey: cle, ...(cle.startsWith("eyJ") ? { Authorization: `Bearer ${cle}` } : {}) });
  async function verifier() {
    const { supabaseUrl: url, supabaseCle: cle } = cmd();
    const res = { relie: !!(url && cle), cle: null, base: null, fonctions: {}, connecte: false, etat: null };
    if (!res.relie) return res;
    const base = url.replace(/\/$/, "");
    try {
      const r = await fetch(`${base}/auth/v1/settings`, { headers: entetes(cle) });
      res.cle = r.ok ? "ok" : r.status === 401 ? "refusee" : `erreur ${r.status}`;
    } catch {
      res.cle = "injoignable";
      return res;
    }
    try {
      const r = await fetch(`${base}/rest/v1/commandes?select=id&limit=1`, { headers: entetes(cle) });
      const t = await r.text();
      res.base = r.ok ? "ok" : /PGRST205|does not exist|schema cache/i.test(t) ? "absente" : `erreur ${r.status}`;
    } catch {
      res.base = "injoignable";
    }
    await Promise.all(
      Object.keys(FONCTIONS).map(async (f) => {
        try {
          const r = await fetch(`${base}/functions/v1/${f}`, { method: "POST", headers: { ...entetes(cle), "Content-Type": "application/json" }, body: "{}" });
          const d = await r.json().catch(() => ({}));
          res.fonctions[f] = [400, 401, 403].includes(r.status) ? "ok" : r.status === 404 ? "absente" : `erreur ${r.status}${d.erreur ? ` : ${d.erreur}` : ""}`;
        } catch {
          res.fonctions[f] = "absente";
        }
      })
    );
    res.connecte = await window.AdminServeur.connecte(ctx.D).catch(() => false);
    if (res.connecte) res.etat = await window.AdminServeur.appel(ctx.D, "etat").catch((x) => ({ erreur: x.message }));
    return res;
  }

  // ---------- Affichage ----------
  const expireBientot = (d) => d === "erreur" || (!!d && new Date(d.replace(" UTC", "Z").replace(" ", "T")) - Date.now() < 30 * 864e5);
  const pastille = (ok, texte, detail = "") =>
    `<li><span class="etat ${ok === true ? "ok" : ok === false ? "afaire" : "option"}">${ok === true ? "✓" : ok === false ? "!" : "·"}</span><span>${texte}${detail ? `<small>${detail}</small>` : ""}</span></li>`;

  function blocEtat(v) {
    if (!v) return `<section class="bloc" id="ins-etat"><div class="bloc-tete"><h2>État du serveur</h2></div><p class="aide">Vérification en cours…</p></section>`;
    if (!v.relie)
      return `<section class="bloc" id="ins-etat"><div class="bloc-tete"><h2>État du serveur</h2></div>
        <p>Le serveur n'est pas encore installé. Le site fonctionne déjà en vitrine : les commandes arrivent par email ou WhatsApp. Suivez l'assistant ci-dessous pour activer les commandes en ligne, le paiement par carte, le fichier clients et les devis.</p></section>`;
    const fns = Object.entries(FONCTIONS);
    const fnsOk = fns.filter(([f]) => v.fonctions[f] === "ok").length;
    const et = v.etat && !v.etat.erreur ? v.etat : null;
    const run = gh?.dernier;
    return `
      <section class="bloc" id="ins-etat">
        <div class="bloc-tete"><h2>État du serveur</h2><button class="btn btn-ligne" data-ins="verifier">Vérifier à nouveau</button></div>
        <ul class="checklist">
          ${pastille(v.cle === "ok", "Projet Supabase joignable", v.cle === "ok" ? e(cmd().supabaseUrl) : v.cle === "refusee" ? "La clé publique est refusée : recopiez-la depuis Supabase." : v.cle === "injoignable" ? "Projet introuvable ou en pause (un projet gratuit se met en pause après 7 jours sans visite : ouvrez supabase.com pour le réveiller)." : v.cle)}
          ${pastille(v.base === "ok", "Base de données", v.base === "ok" ? "Tables des commandes, clients, demandes et codes promo en place." : v.base === "absente" ? "Pas encore créée : lancez l'installation." : v.base || "")}
          ${pastille(fnsOk === fns.length, "Fonctions serveur", fns.map(([f, nom]) => `${v.fonctions[f] === "ok" ? "✓" : "✗"} ${nom}${v.fonctions[f] && v.fonctions[f] !== "ok" && v.fonctions[f] !== "absente" ? ` (${e(v.fonctions[f])})` : ""}`).join(" · "))}
          ${et ? pastille(et.publication ? expireBientot(et.publication_expiration) ? false : true : false, "Modification du site par le commerçant", et.publication ? (et.publication_expiration === "erreur" ? "La clé de publication est refusée par GitHub : créez-en une nouvelle (étape 3)." : et.publication_expiration ? `Clé de publication valable jusqu'au ${new Date(et.publication_expiration.replace(" UTC", "Z").replace(" ", "T")).toLocaleDateString("fr-FR")}${expireBientot(et.publication_expiration) ? " : à renouveler maintenant (étape 3)" : ""}.` : "Clé de publication sans date d'expiration.") : "Pas encore de clé de publication : le commerçant ne peut modifier le site qu'avec une clé GitHub (étape 3).") : ""}
          ${pastille(v.connecte, "Compte administrateur", v.connecte ? "Connecté sur cet appareil." : "Connectez-vous plus bas pour gérer commandes et clients.")}
          ${et ? pastille(et.stripe ? (et.webhook ? true : false) : null, "Paiement par carte (Stripe)", et.stripe ? `Mode ${et.stripe_mode === "production" ? "<strong>réel</strong>" : "<strong>test</strong> (cartes de test uniquement)"}${et.webhook ? " · confirmation automatique active" : " · confirmation automatique manquante : relancez l'installation"}${cmd().paiement?.enLigne ? "" : " · désactivé sur le site"}` : "Non configuré (facultatif).") : ""}
          ${et ? pastille(et.emails ? true : null, `Emails automatiques${et.emails_service ? ` (${et.emails_service === "brevo" ? "Brevo" : "Resend"})` : ""}`, et.emails ? `Expéditeur : ${e(et.expediteur)} · copie des commandes à ${e(et.boutique_email || ctx.D.site.email)}` : "Non configurés : ni la boutique ni les clients ne reçoivent d'email.") : ""}
          ${run ? pastille(run.status !== "completed" ? null : run.conclusion === "success", "Dernière installation", `${date(run.created_at)} · ${run.status !== "completed" ? "en cours" : run.conclusion === "success" ? "réussie" : "échouée"} · <a href="${run.html_url}" target="_blank" rel="noopener">journal</a>`) : ""}
        </ul>
        <div id="ins-connexion"></div>
      </section>`;
  }

  function champ(id, libelle, { type = "text", valeur = "", aide = "", placeholder = "", requis = false, auto = "off" } = {}) {
    return `<div class="champ large"><label for="${id}">${libelle}${requis ? "" : ' <span class="aide">(facultatif)</span>'}</label>
      <input id="${id}" type="${type}" value="${e(valeur)}" placeholder="${e(placeholder)}" autocomplete="${auto}" spellcheck="false">${aide ? `<small>${aide}</small>` : ""}</div>`;
  }
  const garde = (nom) => (gh?.secrets[nom] ? `Déjà enregistrée le ${date(gh.secrets[nom])} . Laissez vide pour la garder.` : "");

  function blocAssistant() {
    const v = gh?.variables || {};
    const D = ctx.D;
    const emailBoutique = D.site.email && D.site.email !== "contact@montrucenbois.fr" ? D.site.email : "";
    const droitsOk = gh?.droits.secrets && gh?.droits.variables;
    const premier = !v.SUPABASE_PROJECT_REF;
    return `
      <section class="bloc assistant">
        <div class="bloc-tete"><h2>${premier ? "Assistant d'installation" : "Réglages du serveur"}</h2></div>
        <p class="aide">${premier ? "Comptez 20 minutes, une seule fois. Trois comptes gratuits : <strong>Supabase</strong> (serveur et base de données), <strong>Stripe</strong> (paiement par carte, facultatif) et <strong>Brevo</strong> (emails automatiques et newsletter, recommandé)." : "Pour changer une clé (passer Stripe en mode réel, nouvelle clé Brevo, nouveau mot de passe…), remplissez seulement le champ concerné puis relancez l'installation. Les champs secrets laissés vides gardent leur valeur."}</p>

        <ol class="etapes-ins">
          <li class="${droitsOk ? "fait" : ""}">
            <h3>1. Autoriser l'admin à installer le serveur</h3>
            ${droitsOk ? `<p class="message">✓ Votre clé GitHub a les droits nécessaires.</p>` : `
            <p>Votre clé d'accès GitHub doit aussi pouvoir ranger les clés secrètes du serveur. Une seule fois :</p>
            <ol>
              <li>Ouvrez <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener">github.com/settings/personal-access-tokens</a> et cliquez sur votre clé « Admin site » puis <strong>Edit</strong>.</li>
              <li>Dans <strong>Repository permissions</strong>, réglez sur <em>Read and write</em> : <strong>Secrets</strong> et <strong>Variables</strong> (Contents l'est déjà). Réglez <strong>Actions</strong> sur <em>Read-only</em>.</li>
              <li>Cliquez sur <strong>Update</strong> (la clé reste la même), puis sur « Vérifier ».</li>
            </ol>
            <button class="btn btn-ligne" data-ins="droits">Vérifier</button>`}
          </li>

          <li>
            <h3>2. Créer le serveur Supabase</h3>
            <ol>
              <li>Sur <a href="https://supabase.com/dashboard/sign-up" target="_blank" rel="noopener">supabase.com</a>, créez un compte (le plus simple : <em>Continue with GitHub</em>).</li>
              <li><strong>New project</strong> : nom « mon-truc-en-bois », mot de passe de base de données : cliquez sur <em>Generate a password</em> (inutile de le noter), région <strong>Europe (Paris)</strong>, puis <strong>Create new project</strong>. Patientez 2 minutes.</li>
              <li>Cliquez sur <strong>Connect</strong> (en haut) ou ouvrez <em>Project Settings → API Keys</em> : copiez l'<strong>adresse du projet</strong> (<code>https://….supabase.co</code>) et la clé <strong>anon public</strong> (onglet « Legacy API Keys » ; elle commence par <code>eyJ</code>).</li>
              <li>Ouvrez <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener">Account → Access Tokens</a>, <strong>Generate new token</strong> (nom « Installation site », expiration la plus longue), copiez-le (il commence par <code>sbp_</code>).</li>
            </ol>
            <div class="grille-champs">
              ${champ("ins-url", "Adresse du projet Supabase", { type: "url", valeur: cmd().supabaseUrl || v.SUPABASE_URL || "", placeholder: "https://abcdefghijklmnopqrst.supabase.co", requis: true })}
              ${champ("ins-cle", "Clé publique « anon public »", { valeur: cmd().supabaseCle || "", placeholder: "eyJhbGciOiJIUzI1NiIs…", requis: true, aide: "Clé publique : elle sera visible dans le site, c'est normal. Ne collez jamais ici la clé « service_role » ou « secret »." })}
              ${champ("ins-jeton", "Jeton d'accès Supabase", { type: "password", placeholder: "sbp_…", requis: premier || !gh?.secrets.SUPABASE_ACCESS_TOKEN, aide: garde("SUPABASE_ACCESS_TOKEN") || "Secret : rangé chiffré dans GitHub, jamais sur le site." })}
            </div>
          </li>

          <li>
            <h3>3. Compte du commerçant</h3>
            <p class="aide">Son seul identifiant : il se connecte à l'admin avec cet email et ce mot de passe, depuis n'importe quel appareil, sans jamais voir GitHub.</p>
            <div class="grille-champs">
              ${champ("ins-admin", "Email administrateur", { type: "email", valeur: v.ADMIN_EMAIL || emailBoutique, requis: true, auto: "username" })}
              ${champ("ins-mdp", premier || !v.ADMIN_EMAIL ? "Mot de passe (10 caractères minimum)" : "Nouveau mot de passe", { type: "password", requis: premier || !v.ADMIN_EMAIL, auto: "new-password", aide: premier || !v.ADMIN_EMAIL ? "" : "Laissez vide pour garder le mot de passe actuel." })}
              ${champ("ins-mdp2", "Mot de passe (confirmation)", { type: "password", requis: premier || !v.ADMIN_EMAIL, auto: "new-password" })}
            </div>
            <details ${gh?.secrets.CONTENU_GITHUB_TOKEN ? "" : "open"}><summary><strong>Clé de publication</strong> : permet au commerçant de modifier le site</summary>
              <ol style="margin-top:.6rem">
                <li>Sur <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>, créez une <strong>deuxième</strong> clé : nom « Publication commerçant », expiration 1 an, dépôt <code>${e(ctx.github.cfg.depot)}</code> uniquement.</li>
                <li>Permissions : <strong>Contents</strong> sur <em>Read and write</em>, <strong>rien d'autre</strong>. Elle ne sert qu'à publier le catalogue et les photos.</li>
                <li>Notez la date d'expiration dans l'agenda de l'agence : l'état du serveur l'affiche aussi et prévient 30 jours avant.</li>
              </ol>
              <div class="grille-champs">${champ("ins-publication", "Clé de publication", { type: "password", placeholder: "github_pat_…", aide: garde("CONTENU_GITHUB_TOKEN") || "Rangée chiffrée dans les secrets du serveur, jamais sur le site." })}</div>
            </details>
          </li>

          <li>
            <h3>4. Paiement par carte : Stripe</h3>
            <ol>
              <li>Créez un compte sur <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener">stripe.com</a>. Pour commencer, restez en <strong>mode test</strong> : aucun vrai paiement, cartes de test.</li>
              <li><em>Développeurs → Clés API</em> : copiez la <strong>clé secrète</strong> (<code>sk_test_…</code>). Quand Stripe a validé votre compte (pièce d'identité, IBAN), revenez coller la clé <code>sk_live_…</code> : les vrais paiements sont alors activés.</li>
            </ol>
            <div class="grille-champs">
              ${champ("ins-stripe", "Clé secrète Stripe", { type: "password", placeholder: "sk_test_… ou sk_live_…", aide: garde("STRIPE_SECRET_KEY") || "Le webhook (confirmation automatique des paiements) est créé tout seul." })}
              <label class="case large"><input type="checkbox" id="ins-carte" ${cmd().paiement?.enLigne || !gh?.secrets.STRIPE_SECRET_KEY ? "checked" : ""}> <span>Proposer le paiement par carte sur le site</span></label>
            </div>
          </li>

          <li>
            <h3>5. Emails automatiques et newsletter : Brevo</h3>
            <ol>
              <li>Créez un compte gratuit sur <a href="https://onboarding.brevo.com/account/register" target="_blank" rel="noopener">brevo.com</a> <strong>avec l'email de la boutique</strong> (il devient l'expéditeur validé).</li>
              <li>Menu du compte → <em>SMTP &amp; API</em> → onglet <em>Clés API</em> → <strong>Générer une nouvelle clé API</strong>, copiez-la (<code>xkeysib-…</code>).</li>
              <li>Même page, onglet <em>SMTP</em> : copiez l'<strong>identifiant</strong> (<code>…@smtp-brevo.com</code>) et générez une <strong>clé SMTP</strong> (<code>xsmtpsib-…</code>). Elles servent à l'email « mot de passe oublié » de l'admin.</li>
              <li>Avec votre nom de domaine : <em>Expéditeurs, domaines et IP dédiées</em> → <em>Domaines</em> → <strong>Authentifier le domaine</strong> (Brevo indique les lignes DNS à copier), puis indiquez ici une adresse de ce domaine, par exemple <code>Mon Truc en Bois &lt;bonjour@montrucenbois.fr&gt;</code>.</li>
            </ol>
            <div class="grille-champs">
              ${champ("ins-brevo", "Clé Brevo", { type: "password", placeholder: "xkeysib-…", aide: garde("BREVO_API_KEY") || (gh?.secrets.RESEND_API_KEY ? "Les emails passent actuellement par Resend : une clé Brevo le remplace." : "") })}
              ${champ("ins-smtp-login", "Identifiant SMTP Brevo", { valeur: v.BREVO_SMTP_LOGIN || "", placeholder: "9a1b2c001@smtp-brevo.com" })}
              ${champ("ins-smtp-cle", "Clé SMTP Brevo", { type: "password", placeholder: "xsmtpsib-…", aide: garde("BREVO_SMTP_CLE") || "Sans elle, l'email « mot de passe oublié » n'arrive qu'aux membres du projet Supabase." })}
              ${champ("ins-expediteur", "Expéditeur des emails", { valeur: v.EMAIL_EXPEDITEUR || "", placeholder: "Vide = « Mon Truc en Bois » avec l'email de la boutique" })}
              ${champ("ins-boutique", "Email qui reçoit les commandes et devis", { type: "email", valeur: v.BOUTIQUE_EMAIL || emailBoutique, requis: true })}
            </div>
          </li>

          <li>
            <h3>6. Lancer l'installation</h3>
            <details><summary>Adresse du site (avancé)</summary>
              <div class="grille-champs" style="margin-top:.8rem">
                ${champ("ins-site", "Adresse publique du site", { type: "url", valeur: v.SITE_URL || adresseSiteParDefaut(), requis: true, aide: "À changer seulement si le site passe sur votre propre nom de domaine." })}
              </div>
            </details>
            <p class="aide">L'installation prend 2 à 4 minutes. Vous pouvez la relancer autant de fois que nécessaire : elle ne supprime rien.</p>
            <div class="raccourcis"><button class="btn" data-ins="installer" ${droitsOk ? "" : "disabled"}>${premier ? "Installer le serveur" : "Enregistrer et relancer l'installation"}</button></div>
            <div id="ins-progression" aria-live="polite"></div>
          </li>
        </ol>
      </section>`;
  }

  async function afficher() {
    zone.innerHTML = blocEtat(null) + `<p class="aide">Lecture des réglages…</p>`;
    gh = await lireGithub();
    // Mot de passe temporaire laissé par une installation terminée : on l'efface.
    if (gh.secrets.ADMIN_MOT_DE_PASSE && gh.dernier?.status === "completed") api("/actions/secrets/ADMIN_MOT_DE_PASSE", { method: "DELETE" }).catch(() => {});
    zone.innerHTML = blocEtat(null) + blocAssistant();
    actualiserEtat();
  }

  async function actualiserEtat() {
    const v = await verifier();
    const el = zone.querySelector("#ins-etat");
    if (!el) return;
    el.outerHTML = blocEtat(v);
    const c = zone.querySelector("#ins-connexion");
    if (c && v.relie && v.cle === "ok" && v.base === "ok" && !v.connecte) window.AdminServeur.ecranConnexion(c, ctx, actualiserEtat);
  }

  // ---------- Installation ----------
  function valeurs() {
    const val = (id) => zone.querySelector(`#${id}`)?.value.trim() ?? "";
    return {
      url: val("ins-url"), cle: val("ins-cle"), jeton: val("ins-jeton"),
      publication: val("ins-publication"),
      admin: val("ins-admin").toLowerCase(), mdp: zone.querySelector("#ins-mdp").value, mdp2: zone.querySelector("#ins-mdp2").value,
      stripe: val("ins-stripe"), carte: zone.querySelector("#ins-carte").checked,
      brevo: val("ins-brevo"), smtpLogin: val("ins-smtp-login"), smtpCle: val("ins-smtp-cle"), expediteur: val("ins-expediteur"), boutique: val("ins-boutique").toLowerCase(),
      site: val("ins-site").replace(/\/+$/, ""),
    };
  }

  function controler(x) {
    const v = gh.variables;
    const ref = x.url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/)?.[1] || x.url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{20})/)?.[1];
    if (!ref) return "Adresse du projet Supabase : elle ressemble à https://abcdefghijklmnopqrst.supabase.co (Project Settings → API).";
    let role = "";
    try {
      role = x.cle.startsWith("eyJ") ? JSON.parse(atob(x.cle.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role : "";
    } catch {}
    if (role === "service_role" || x.cle.startsWith("sb_secret_")) return "Vous avez collé la clé SECRÈTE de Supabase : collez la clé « anon public » à la place (et ne communiquez jamais la clé secrète).";
    if (!(role === "anon" || x.cle.startsWith("sb_publishable_"))) return "Clé publique Supabase : collez la clé « anon public » (elle commence par eyJ).";
    if (x.jeton && !/^sbp_[A-Za-z0-9_]{20,}$/.test(x.jeton)) return "Le jeton d'accès Supabase commence par sbp_ (Account → Access Tokens).";
    if (!x.jeton && !gh.secrets.SUPABASE_ACCESS_TOKEN) return "Collez le jeton d'accès Supabase (étape 2, point 4).";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x.admin)) return "Indiquez l'email administrateur.";
    if ((x.mdp || !v.ADMIN_EMAIL || v.ADMIN_EMAIL !== x.admin) && x.mdp.length < 10) return "Choisissez un mot de passe administrateur d'au moins 10 caractères.";
    if (x.mdp !== x.mdp2) return "Les deux mots de passe ne sont pas identiques.";
    if (x.stripe && /^pk_/.test(x.stripe)) return "C'est la clé « publiable » de Stripe : il faut la clé secrète (sk_test_… ou sk_live_…).";
    if (x.stripe && !/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(x.stripe)) return "La clé secrète Stripe commence par sk_test_ ou sk_live_.";
    if (x.carte && !x.stripe && !gh.secrets.STRIPE_SECRET_KEY) return "Pour proposer le paiement par carte, collez la clé secrète Stripe (ou décochez la case).";
    if (x.publication && !/^github_pat_\w{20,}$/.test(x.publication)) return "La clé de publication commence par github_pat_.";
    if (x.publication && x.publication === ctx.github.cfg.cle) return "Créez une clé de publication distincte de la clé de l'agence, avec la seule permission Contents.";
    if (x.smtpCle && !/^xsmtpsib-[A-Za-z0-9-]{20,}$/.test(x.smtpCle)) return "La clé SMTP Brevo commence par xsmtpsib- (onglet SMTP).";
    if (x.smtpLogin && !/@smtp-brevo\.com$/.test(x.smtpLogin)) return "L'identifiant SMTP Brevo se termine par @smtp-brevo.com.";
    if (x.brevo && !/^xkeysib-[A-Za-z0-9-]{20,}$/.test(x.brevo)) return "La clé Brevo commence par xkeysib- (menu SMTP & API → Clés API).";
    if (x.expediteur && !/@/.test(x.expediteur)) return "Expéditeur : une adresse email, par exemple « Mon Truc en Bois <bonjour@votre-domaine.fr> ».";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x.boutique)) return "Indiquez l'email qui reçoit les commandes.";
    if (!/^https:\/\/[^/]+/.test(x.site)) return "Adresse du site : elle doit commencer par https://.";
    return { ref };
  }

  let sodium = null;
  async function chiffrer(cle, texte) {
    if (!sodium) {
      sodium = (await import(SODIUM)).default;
      await sodium.ready;
    }
    const v = sodium.base64_variants.ORIGINAL;
    return sodium.to_base64(sodium.crypto_box_seal(sodium.from_string(texte), sodium.from_base64(cle.key, v)), v);
  }
  async function ecrireVariable(nom, valeur) {
    if (gh.variables[nom] === valeur) return;
    if (nom in gh.variables) await api(`/actions/variables/${nom}`, { method: "PATCH", body: JSON.stringify({ name: nom, value: valeur }) });
    else await api("/actions/variables", { method: "POST", body: JSON.stringify({ name: nom, value: valeur }) });
    gh.variables[nom] = valeur;
  }

  function progression(lignes, fin = "") {
    const el = zone.querySelector("#ins-progression");
    if (!el) return;
    el.innerHTML = `<ul class="checklist progression">${lignes
      .map(([etat, texte, detail]) => `<li><span class="etat ${etat === "ok" ? "ok" : etat === "ko" ? "afaire" : etat === "encours" ? "encours" : "option"}">${etat === "ok" ? "✓" : etat === "ko" ? "✗" : etat === "encours" ? "" : "·"}</span><span>${texte}${detail ? `<small>${detail}</small>` : ""}</span></li>`)
      .join("")}</ul>${fin}`;
  }

  async function installer() {
    if (enCours) return;
    const x = valeurs();
    const ok = controler(x);
    if (typeof ok === "string") return ctx.toast(ok, true);
    const url = `https://${ok.ref}.supabase.co`;
    if (ctx.estModifie() && !confirm("Des modifications du site ne sont pas encore publiées : elles seront publiées en même temps. Continuer ?")) return;
    enCours = true;
    const bouton = zone.querySelector('[data-ins="installer"]');
    bouton.disabled = true;
    const lignes = [
      ["encours", "Vérification du projet Supabase"],
      ["attente", "Rangement des clés secrètes dans GitHub (chiffrées)"],
      ["attente", "Enregistrement des réglages"],
      ["attente", "Publication de l'adresse du serveur sur le site"],
      ["attente", "Installation sur Supabase (2 à 4 minutes)"],
    ];
    const etape = (i, etat, detail) => {
      lignes[i] = [etat, lignes[i][1], detail];
      if (etat === "ok" && lignes[i + 1]) lignes[i + 1][0] = "encours";
      progression(lignes);
    };
    progression(lignes);
    try {
      // 1. Projet joignable et clé publique acceptée
      const r = await fetch(`${url}/auth/v1/settings`, { headers: entetes(x.cle) }).catch(() => null);
      if (!r) throw new Error("Projet Supabase injoignable : vérifiez l'adresse (et que le projet a fini de se créer).");
      if (r.status === 401) throw new Error("Supabase refuse la clé publique : recopiez la clé « anon public » de ce projet.");
      etape(0, "ok", url);

      // 2. Secrets chiffrés
      const cle = await api("/actions/secrets/public-key");
      const secrets = { SUPABASE_ACCESS_TOKEN: x.jeton, STRIPE_SECRET_KEY: x.stripe, BREVO_API_KEY: x.brevo, BREVO_SMTP_CLE: x.smtpCle, CONTENU_GITHUB_TOKEN: x.publication, ADMIN_MOT_DE_PASSE: x.mdp };
      for (const [nom, valeur] of Object.entries(secrets)) {
        if (!valeur) continue;
        await api(`/actions/secrets/${nom}`, { method: "PUT", body: JSON.stringify({ encrypted_value: await chiffrer(cle, valeur), key_id: cle.key_id }) });
      }
      etape(1, "ok", Object.entries(secrets).filter(([, v]) => v).map(([n]) => n).join(", ") || "Aucune nouvelle clé (les clés enregistrées sont gardées).");

      // 3. Réglages publics (variables)
      const origine = new URL(x.site).origin;
      const vars = {
        SUPABASE_PROJECT_REF: ok.ref, SUPABASE_URL: url, SUPABASE_ANON_KEY: x.cle, SITE_URL: x.site,
        SITE_ORIGINES: [...new Set([origine, location.origin].filter((o) => /^https:/.test(o)))].join(","),
        BOUTIQUE_EMAIL: x.boutique, ...(x.smtpLogin ? { BREVO_SMTP_LOGIN: x.smtpLogin } : {}), EMAIL_EXPEDITEUR: x.expediteur || `Mon Truc en Bois <${x.boutique}>`, ADMIN_EMAIL: x.admin,
      };
      for (const [nom, valeur] of Object.entries(vars)) await ecrireVariable(nom, valeur);
      etape(2, "ok");

      // 4. Le site connaît l'adresse du serveur
      const c = cmd();
      const avant = JSON.stringify(c) + ctx.D.site.url;
      c.supabaseUrl = url;
      c.supabaseCle = x.cle;
      c.paiement ||= {};
      c.paiement.enLigne = x.carte && !!(x.stripe || gh.secrets.STRIPE_SECRET_KEY);
      ctx.D.site.url = x.site;
      if (JSON.stringify(c) + ctx.D.site.url !== avant || ctx.estModifie()) {
        ctx.marquerModifie();
        if (!(await ctx.publier("Installation du serveur : adresse Supabase (admin)"))) throw new Error("Publication du site impossible.");
      }
      etape(3, "ok");

      // 5. Lancement de l'installation (commit de supabase/installation.json)
      const chemin = "supabase/installation.json";
      let shaFichier;
      try {
        shaFichier = (await api(`${ctx.github.cheminContenu(chemin)}?ref=${encodeURIComponent(ctx.github.cfg.branche)}`)).sha;
      } catch {}
      const contenu = JSON.stringify({ demande_le: new Date().toISOString(), projet: ok.ref, paiement_carte: c.paiement.enLigne, par: "admin" }, null, 2) + "\n";
      const envoi = await ctx.github.envoyerFichier(chemin, ctx.github.versBase64(contenu), "Installation du serveur Supabase [installation] (admin)", shaFichier);
      await suivreInstallation(envoi.commit.sha, lignes, 4);
    } catch (err) {
      const i = lignes.findIndex(([etat]) => etat === "encours");
      if (i >= 0) lignes[i] = ["ko", lignes[i][1], err.status === 403 ? "GitHub refuse : vérifiez les permissions de la clé (étape 1)." : e(err.detail || err.message)];
      progression(lignes);
      bouton.disabled = false;
    } finally {
      enCours = false;
    }
  }

  async function suivreInstallation(shaCommit, lignes, i) {
    let run = null;
    for (let n = 0; n < 60 && !run; n++) {
      await pause(n ? 4000 : 6000);
      run = (await api(`/actions/workflows/${WORKFLOW}/runs?head_sha=${shaCommit}&per_page=1`).catch(() => ({ workflow_runs: [] }))).workflow_runs[0] || null;
    }
    if (!run) throw new Error("L'installation n'a pas démarré. Vérifiez que GitHub Actions est activé (onglet Actions du dépôt).");
    lignes[i][2] = `<a href="${run.html_url}" target="_blank" rel="noopener">Voir le journal détaillé</a>`;
    const debut = Date.now();
    while (Date.now() - debut < 20 * 60_000) {
      const [r, jobs] = await Promise.all([api(`/actions/runs/${run.id}`), api(`/actions/runs/${run.id}/jobs`).catch(() => ({ jobs: [] }))]);
      const pas = (jobs.jobs[0]?.steps || []).filter((s) => ETAPES_SERVEUR.includes(s.name));
      const detail = pas
        .map((s) => `${s.conclusion === "success" ? "✓" : s.conclusion === "skipped" ? "–" : s.conclusion === "failure" ? "✗" : s.status === "in_progress" ? "…" : "·"} ${e(s.name)}`)
        .join("<br>");
      lignes[i] = [r.status === "completed" ? (r.conclusion === "success" ? "ok" : "ko") : "encours", lignes[i][1], `${detail || (r.status === "queued" ? "En file d'attente…" : "Démarrage…")}<br><a href="${r.html_url}" target="_blank" rel="noopener">Voir le journal détaillé</a>`];
      if (r.status === "completed") {
        api("/actions/secrets/ADMIN_MOT_DE_PASSE", { method: "DELETE" }).catch(() => {});
        delete gh.secrets.ADMIN_MOT_DE_PASSE;
        if (r.conclusion === "success") {
          progression(lignes, `<p class="message">Installation terminée. Le site utilisera le serveur d'ici 1 à 2 minutes (le temps que GitHub publie la page). Connectez-vous ci-dessus avec votre email et votre mot de passe administrateur.</p>`);
          ctx.toast("Serveur installé !");
          zone.querySelector("#ins-mdp").value = zone.querySelector("#ins-mdp2").value = "";
          gh = await lireGithub();
          actualiserEtat();
        } else {
          const echec = pas.find((s) => s.conclusion === "failure");
          progression(lignes, `<p class="message message-alerte">L'installation a échoué${echec ? ` à l'étape « ${e(echec.name)} »` : ""}. Ouvrez le journal détaillé : le message en rouge explique la cause (jeton Supabase expiré, clé Stripe erronée…). Corrigez le champ concerné puis relancez.</p>`);
          zone.querySelector('[data-ins="installer"]').disabled = false;
        }
        return;
      }
      progression(lignes);
      await pause(5000);
    }
    throw new Error("L'installation prend plus de temps que prévu : consultez le journal détaillé.");
  }

  // ---------- Montage ----------
  async function monter(element, contexte) {
    ctx = contexte;
    zone = element;
    if (!enCours) return afficher();
    zone.innerHTML = blocEtat(null) + blocAssistant(); // installation en cours : la progression reprend ici
    actualiserEtat();
  }
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-ins]");
    if (!b || !zone?.contains(b)) return;
    if (b.dataset.ins === "verifier") {
      b.disabled = true;
      gh = await lireGithub();
      actualiserEtat();
    }
    if (b.dataset.ins === "droits") afficher();
    if (b.dataset.ins === "installer") installer();
  });

  window.AdminInstallation = { monter, verifier };
})();
