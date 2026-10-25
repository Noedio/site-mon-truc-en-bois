// Administration du site : lit data/donnees.js, le modifie via des formulaires, puis le republie.
// Deux façons de se connecter :
//   - le commerçant : email + mot de passe (serveur Supabase), qui publie pour lui avec une clé GitHub
//     limitée au contenu, gardée côté serveur ;
//   - l'agence : sa clé GitHub, qui donne aussi accès à l'onglet Installation.
// Les photos ajoutées sont envoyées dans img/.
(function () {
  const FICHIER = "data/donnees.js";
  const PREFIXE = "window.DONNEES = ";
  const ENTETE =
    "// ============================================================\n" +
    "//  DONNÉES DU SITE — modifiées depuis la page admin (admin.html).\n" +
    "//  On peut aussi éditer ce fichier à la main : il doit rester du JSON valide après « window.DONNEES = ».\n" +
    "// ============================================================\n";
  // Réglages posés par la page qui sert l'admin : le nouveau site (site/scripts/copier-medias.mjs) y indique
  // la branche d'où il est construit, pour que les publications de l'agence l'alimentent.
  const REGLAGES = window.MTB_ADMIN || {};
  const DEFAUT = { proprio: "Noedio", depot: "site-mon-truc-en-bois", branche: REGLAGES.branche || "site-vitrine-boutique" };
  const CLE_STOCKAGE = "admin-mtb";
  const CLE_BROUILLON = window.MTB_DEMO ? "brouillon-mtb-demo" : "brouillon-mtb"; // aussi lu par le site pour la prévisualisation
  const BADGES = { "": "Aucun", nouveau: "Nouveau", promo: "Promo", best: "Best-seller", edition: "Édition limitée" };
  const DISPOS = { disponible: "Disponible", commande: "Fabriqué sur commande", epuise: "Épuisé" };

  const $ = (s, el = document) => el.querySelector(s);
  const echapper = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const euros = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const slug = (s) =>
    String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "element";

  // ---------- Réglages de connexion ----------
  let cfg = { ...DEFAUT, cle: "" };
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE) || sessionStorage.getItem(CLE_STOCKAGE);
    if (brut) cfg = { ...cfg, ...JSON.parse(brut) };
  } catch {}
  // La branche imposée par la page qui sert l'admin passe avant celle gardée dans ce navigateur.
  if (REGLAGES.branche) cfg.branche = REGLAGES.branche;
  function enregistrerCfg(souvenir) {
    try {
      localStorage.removeItem(CLE_STOCKAGE);
      sessionStorage.removeItem(CLE_STOCKAGE);
      const aGarder = REGLAGES.branche ? { ...cfg, branche: undefined } : cfg; // branche imposée : pas gardée
      (souvenir ? localStorage : sessionStorage).setItem(CLE_STOCKAGE, JSON.stringify(aGarder));
    } catch {}
  }
  const lienGithub = (chemin) => `https://github.com/${cfg.proprio}/${cfg.depot}/${chemin}`;
  let mode = cfg.cle && !window.MTB_DEMO ? "github" : "serveur"; // en démo : toujours le compte du commerçant
  // Serveur de la boutique : son adresse est dans le contenu publié du site (data/donnees.js, chargé par la page)
  const serveurDispo = () => !!(window.AdminServeur && window.DONNEES?.site?.commandes?.supabaseUrl && window.DONNEES?.site?.commandes?.supabaseCle);
  const dServeur = () => D || window.DONNEES;

  // ---------- API GitHub ----------
  async function api(chemin, options = {}) {
    const r = await fetch(`https://api.github.com/repos/${cfg.proprio}/${cfg.depot}${chemin}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${cfg.cle}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!r.ok) {
      const e = new Error(`GitHub ${r.status}`);
      e.status = r.status;
      try {
        e.detail = (await r.json()).message;
      } catch {}
      throw e;
    }
    const t = await r.text();
    return t ? JSON.parse(t) : null; // 201/204 : réponse parfois vide (secrets, variables)
  }
  const versBase64 = (texte) => {
    const octets = new TextEncoder().encode(texte);
    let bin = "";
    for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const depuisBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  const cheminContenu = (f) => `/contents/${f.split("/").map(encodeURIComponent).join("/")}`;

  async function chargerDonnees() {
    const f =
      mode === "serveur"
        ? await window.AdminServeur.appel(dServeur(), "contenu_lire")
        : await api(`${cheminContenu(FICHIER)}?ref=${encodeURIComponent(cfg.branche)}&t=${Date.now()}`);
    const texte = depuisBase64(f.content);
    // La ligne de données commence par « window.DONNEES = » (le commentaire d'en-tête aussi contient ces mots).
    const i = texte.search(/^window\.DONNEES = /m);
    if (i < 0) throw new Error("Le fichier de données n'a pas le format attendu.");
    const json = texte.slice(i + PREFIXE.length).trim().replace(/;\s*$/, "");
    return { donnees: JSON.parse(json), sha: f.sha };
  }
  async function envoyerFichier(chemin, contenuBase64, message, sha) {
    if (mode === "serveur")
      return chemin === FICHIER
        ? window.AdminServeur.appel(dServeur(), "contenu_publier", { contenu: contenuBase64, sha, message })
        : window.AdminServeur.appel(dServeur(), "photo_publier", { chemin, contenu: contenuBase64 });
    return api(cheminContenu(chemin), {
      method: "PUT",
      body: JSON.stringify({ message, content: contenuBase64, branch: cfg.branche, ...(sha ? { sha } : {}) }),
    });
  }

  // ---------- État ----------
  let D = null; // données en cours d'édition
  let sha = null;
  let modifie = false;
  // Publication impossible côté serveur (clé de publication expirée, GitHub injoignable…) : l'admin reste ouvert
  // pour les commandes, la caisse et les clients ; seule la modification du site est suspendue.
  let publicationBloquee = "";
  let onglet = "accueil";
  const apercusLocaux = {}; // chemin image → dataURL (photos envoyées mais pas encore en ligne)

  // Complète les champs ajoutés au fil des versions, pour que l'admin et le site s'y retrouvent.
  function normaliser(d) {
    d.site ||= {};
    d.site.horaires ||= [];
    d.site.emballage ||= { actif: false, prix: 0 };
    d.site.commandes ||= { supabaseUrl: "", supabaseCle: "", paiement: { enLigne: false, apresValidation: true, boutique: true } };
    d.site.commandes.paiement ||= { enLigne: false, apresValidation: true, boutique: true };
    d.site.plateformesAvis ||= {};
    d.site.mesure ||= { goatcounter: "" };
    d.site.legal ||= { exploitant: "", formeJuridique: "", regimeTva: "", tauxTva: 20, hebergeur: "github", plateformeFacturation: false };
    d.site.legal.mediateur ||= { nom: "", url: "", adresse: "" };
    d.site.plateformesAvis.facebook ||= { lien: "", taux: 100, nombre: 0 };
    d.site.plateformesAvis.google ||= { lien: "", lienAvis: "", note: 0, nombre: 0 };
    d.produits ||= [];
    d.categories ||= [];
    d.occasions ||= [];
    d.galerie ||= [];
    d.avis ||= [];
    d.faq ||= [];
    d.textes ||= {};
    d.annonce ||= { actif: false, texte: "", lien: "" };
    d.questionnaire ||= {};
    d.questionnaire.reponses ||= {};
    d.produits.forEach((p, i) => {
      p.images ||= p.image ? [p.image] : [];
      p.occasions ||= [];
      p.options ||= {};
      p.dispo ||= "disponible";
      // N° de pièce : celui que le nouveau site donne par défaut (rang dans le catalogue), figé à la première publication
      // pour qu'un produit ajouté ou déplacé ne renumérote pas les autres.
      if (!(p.numero > 0)) p.numero = i + 1;
    });
    return d;
  }

  // Brouillon local : protège contre une fermeture accidentelle et sert à la prévisualisation.
  let minuteurBrouillon;
  function garderBrouillon() {
    try {
      localStorage.setItem(CLE_BROUILLON, JSON.stringify({ donnees: D, sha, date: Date.now(), depot: `${cfg.proprio}/${cfg.depot}/${cfg.branche}` }));
    } catch {}
  }
  const oublierBrouillon = () => {
    try {
      localStorage.removeItem(CLE_BROUILLON);
    } catch {}
  };

  function marquerModifie() {
    modifie = true;
    majStatut();
    clearTimeout(minuteurBrouillon);
    minuteurBrouillon = setTimeout(garderBrouillon, 400);
  }
  function majStatut(texte) {
    const s = $("#statut");
    s.textContent = texte || (modifie ? "Modifications non publiées" : "Site à jour");
    s.classList.toggle("modifie", modifie && !texte);
    $("#publier").disabled = !modifie || !!publicationBloquee;
    // Le bouton n'apparaît que lorsqu'il y a quelque chose à publier (ou pendant la publication)
    $("#publier").hidden = !modifie && !texte;
    // Le nouveau site est construit à l'avance : il ne sait pas afficher un brouillon.
    $("#previsualiser").hidden = !modifie || !!REGLAGES.sansPrevisualisation;
    if (publicationBloquee && !texte) s.textContent = "Publication indisponible";
  }
  let minuteurToast;
  function toast(msg, erreur = false) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("erreur", erreur);
    t.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => (t.hidden = true), erreur ? 7000 : 4000);
  }
  const srcImage = (chemin) => apercusLocaux[chemin] || window.MTB_DEMO?.photo(chemin) || chemin;
  const vignette = (chemin) =>
    chemin ? `<span class="ligne-image"><img src="${echapper(srcImage(chemin))}" alt="" loading="lazy"></span>` : `<span class="ligne-image">Sans photo</span>`;
  const premiereImage = (p) => p.images?.[0] || p.image || "";
  const numeroLibre = () => Math.max(0, ...D.produits.map((p) => Number(p.numero) || 0)) + 1;

  // ---------- Photos : redimensionnement puis envoi dans img/ ----------
  function redimensionner(fichier, max = 1200) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * r);
        c.height = Math.round(img.height * r);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => ko(new Error("Image illisible"));
      img.src = URL.createObjectURL(fichier);
    });
  }
  async function envoyerPhoto(fichier, nomBase) {
    toast("Envoi de la photo…");
    const dataUrl = await redimensionner(fichier);
    const chemin = `img/${slug(nomBase)}-${Date.now().toString(36)}.jpg`;
    await envoyerFichier(chemin, dataUrl.split(",")[1], `Ajout de la photo ${chemin} (admin)`);
    apercusLocaux[chemin] = dataUrl;
    toast("Photo ajoutée.");
    return chemin;
  }

  // ---------- Connexion ----------
  function afficherConnexion(erreur, vue = serveurDispo() ? "commercant" : "agence") {
    $("#app").hidden = true;
    $("#connexion").hidden = false;
    $("#form-commercant").hidden = vue !== "commercant";
    $("#form-connexion").hidden = vue === "commercant";
    $("#vers-commercant").hidden = !serveurDispo();
    $("#erreur-commercant").innerHTML = vue === "commercant" && erreur ? `<p class="message message-alerte">${echapper(erreur)}</p>` : "";
    $("#cle").value = cfg.cle || "";
    $("#cfg-proprio").value = cfg.proprio;
    $("#cfg-depot").value = cfg.depot;
    $("#cfg-branche").value = cfg.branche;
    $("#erreur-connexion").innerHTML = vue !== "commercant" && erreur ? `<p class="message message-alerte">${echapper(erreur)}</p>` : "";
  }
  async function demarrer() {
    $(mode === "serveur" ? "#erreur-commercant" : "#erreur-connexion").innerHTML = `<p class="aide">Connexion…</p>`;
    try {
      if (mode === "github") {
        const depot = await api("");
        if (!depot.permissions?.push) throw Object.assign(new Error("droits"), { status: 403 });
      }
      publicationBloquee = "";
      ({ donnees: D, sha } = await chargerDonnees());
    } catch (e) {
      if (mode === "serveur" && e.status >= 500 && window.DONNEES) {
        // Le compte est valide mais le site ne peut pas être lu sur GitHub : on travaille sur le contenu en ligne.
        D = structuredClone(window.DONNEES);
        sha = null;
        publicationBloquee =
          e.status === 503
            ? "La modification du site depuis ce compte n'est pas encore activée : prévenez votre agence. Commandes, caisse, clients et demandes fonctionnent normalement."
            : `${e.message.replace(/\.$/, "")}. En attendant, commandes, caisse, clients et demandes fonctionnent normalement ; les modifications du site ne peuvent pas être publiées.`;
      } else if (mode === "serveur") {
        afficherConnexion(
          e.status === 403 ? "Ce compte n'a pas accès à l'administration."
          : e.status === 401 ? "Session expirée : reconnectez-vous."
          : e.message,
          "commercant"
        );
        return;
      } else {
        const msg =
          e.status === 401 ? "Clé refusée par GitHub : vérifiez qu'elle est complète et pas expirée."
          : e.status === 403 ? "Cette clé n'a pas le droit de modifier le dépôt : donnez-lui la permission « Contents : Read and write »."
          : e.status === 404 ? "Dépôt, branche ou fichier introuvable : vérifiez les réglages avancés et que la clé donne accès au dépôt."
          : `Connexion impossible (${e.message}).`;
        afficherConnexion(msg, "agence");
        return;
      }
    }
    normaliser(D);
    modifie = false;

    // Brouillon non publié laissé lors d'une session précédente ?
    try {
      const b = JSON.parse(localStorage.getItem(CLE_BROUILLON) || "null");
      const memeDepot = !b?.depot || b.depot === `${cfg.proprio}/${cfg.depot}/${cfg.branche}`;
      if (b && !memeDepot) localStorage.removeItem(CLE_BROUILLON); // brouillon fait pour une autre branche : pas proposé ici
      else if (b && JSON.stringify(b.donnees) !== JSON.stringify(D)) {
        const quand = new Date(b.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
        // Si le site a été publié ailleurs depuis (par l'agence, ou depuis un autre appareil), reprendre le brouillon
        // remplace ces changements-là : on le dit avant de demander.
        const question =
          b.sha === sha
            ? `Des modifications non publiées du ${quand} ont été retrouvées sur cet appareil. Les reprendre ?`
            : `Des modifications non publiées du ${quand} ont été retrouvées sur cet appareil, mais le site a été modifié ailleurs depuis.

OK : reprendre vos modifications (elles remplaceront celles faites ailleurs une fois publiées).
Annuler : les abandonner et partir du site tel qu'il est en ligne.`;
        if (confirm(question)) {
          D = normaliser(b.donnees);
          modifie = true;
          garderBrouillon(); // le brouillon repart de la version en ligne : la publication ne sera plus refusée
        } else oublierBrouillon();
      }
    } catch {}

    $("#connexion").hidden = true;
    $("#app").hidden = false;
    const bandeau = $("#bandeau-publication");
    bandeau.hidden = !publicationBloquee;
    bandeau.textContent = publicationBloquee;
    // Le commerçant ne voit pas l'onglet réservé à l'agence
    document.querySelector(".nav-agence").hidden = mode === "serveur";
    majStatut();
    majCompteurs().catch(() => {});
    const ancre = location.hash.slice(1);
    if (VUES[ancre]) return allerA(ancre);
    rendre();
  }

  // Pastilles des onglets Commandes et Demandes : dès l'arrivée sur l'admin, puis à chaque retour sur la page
  // et toutes les 5 minutes (les onglets les recalculent aussi quand on les ouvre).
  async function majCompteurs() {
    const S = window.AdminServeur;
    if (!D || !S?.client(dServeur()) || !(await S.connecte(dServeur()).catch(() => false))) return;
    const c = S.client(dServeur());
    const [cmd, dem] = await Promise.all([
      c.from("commandes").select("id", { count: "exact", head: true }).eq("statut", "nouvelle"),
      c.from("demandes").select("id", { count: "exact", head: true }).eq("statut", "nouvelle").neq("type", "newsletter"),
    ]);
    window.AdminPastille("commandes", cmd.count);
    window.AdminPastille("demandes", dem.count);
  }
  setInterval(() => majCompteurs().catch(() => {}), 5 * 60_000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && majCompteurs().catch(() => {}));

  $("#form-commercant").addEventListener("submit", async (e) => {
    e.preventDefault();
    const client = window.AdminServeur.client(window.DONNEES);
    $("#erreur-commercant").innerHTML = `<p class="aide">Connexion…</p>`;
    const { error } = await client.auth.signInWithPassword({ email: $("#c-email").value.trim(), password: $("#c-mdp").value });
    if (error) return afficherConnexion(/fetch|network/i.test(error.message) ? "Serveur injoignable : vérifiez votre connexion internet." : "Email ou mot de passe incorrect.", "commercant");
    mode = "serveur";
    demarrer();
  });
  $("#c-oubli").addEventListener("click", async () => {
    const email = $("#c-email").value.trim();
    if (!email) return toast("Indiquez d'abord votre email.", true);
    const { error } = await window.AdminServeur.client(window.DONNEES).auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
    toast(error ? "Envoi impossible, réessayez plus tard." : "Un email pour choisir un nouveau mot de passe vous a été envoyé.", !!error);
  });
  $("#vers-agence").addEventListener("click", () => afficherConnexion("", "agence"));
  $("#vers-commercant").addEventListener("click", () => afficherConnexion("", "commercant"));

  $("#form-connexion").addEventListener("submit", (e) => {
    e.preventDefault();
    mode = "github";
    cfg = {
      cle: $("#cle").value.trim(),
      proprio: $("#cfg-proprio").value.trim() || DEFAUT.proprio,
      depot: $("#cfg-depot").value.trim() || DEFAUT.depot,
      branche: $("#cfg-branche").value.trim() || DEFAUT.branche,
    };
    enregistrerCfg($("#souvenir").checked);
    demarrer();
  });
  $("#deconnexion").addEventListener("click", () => {
    if (modifie && !confirm("Des modifications ne sont pas publiées (elles restent gardées sur cet appareil). Se déconnecter quand même ?")) return;
    cfg.cle = "";
    try {
      localStorage.removeItem(CLE_STOCKAGE);
      sessionStorage.removeItem(CLE_STOCKAGE);
    } catch {}
    if (serveurDispo()) window.AdminServeur.deconnecter(dServeur()).catch(() => {});
    modifie = false;
    D = null;
    mode = "serveur";
    afficherConnexion();
  });
  addEventListener("beforeunload", (e) => {
    if (modifie) e.preventDefault();
  });

  // ---------- Prévisualisation et publication ----------
  $("#previsualiser").addEventListener("click", () => {
    garderBrouillon();
    open("index.html?brouillon=1", "_blank");
  });

  async function publier(message = "Mise à jour du contenu du site (admin)") {
    const b = $("#publier");
    b.disabled = true;
    majStatut("Publication…");
    try {
      D.produits.forEach((p) => (p.image = p.images?.[0] || ""));
      const texte = ENTETE + PREFIXE + JSON.stringify(D, null, 2) + ";\n";
      const r = await envoyerFichier(FICHIER, versBase64(texte), message, sha);
      sha = r.content.sha;
      modifie = false;
      oublierBrouillon();
      majStatut();
      return true;
    } catch (e) {
      majStatut();
      b.disabled = false;
      if (e.status === 409 || e.status === 422) {
        garderBrouillon();
        toast("Le site a été modifié ailleurs entre-temps. Rechargez la page admin : vos modifications vous seront proposées à nouveau.", true);
      }
      else toast(`Échec de la publication (${e.detail || e.message}).`, true);
      return false;
    }
  }
  $("#publier").addEventListener("click", async () => {
    if (!(await publier())) return;
    if (onglet === "accueil") rendre();
    toast("Publié ! Le site sera à jour d'ici quelques minutes (rechargez la page du site).");
  });

  // ---------- Navigation : menu latéral (PC), barre du bas et menu « Plus » (téléphone) ----------
  function menu(ouvert) {
    $("#admin-nav").classList.toggle("ouvert", ouvert);
    $("#admin-voile").hidden = !ouvert;
    $("#ouvrir-menu").setAttribute("aria-expanded", ouvert);
  }
  function allerA(nom) {
    if (nom === "installation" && mode === "serveur") nom = "accueil"; // réservé à l'agence
    onglet = nom;
    document.querySelectorAll("#app [data-onglet]").forEach((x) => (x.dataset.onglet === nom ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current")));
    const bouton = document.querySelector(`.onglets [data-onglet="${nom}"] .nav-libelle`);
    $("#titre-vue").textContent = bouton ? bouton.textContent : "";
    menu(false);
    rendre();
    scrollTo(0, 0);
  }
  document.querySelector("#app").addEventListener("click", (e) => {
    const b = e.target.closest(".onglets [data-onglet], .barre-mobile [data-onglet]");
    if (b) allerA(b.dataset.onglet);
    if (e.target.closest("#ouvrir-menu")) menu(!$("#admin-nav").classList.contains("ouvert"));
    if (e.target.closest("#admin-voile")) menu(false);
  });
  // Échap referme le menu « Plus » et rend le focus au bouton qui l'a ouvert
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$("#admin-nav").classList.contains("ouvert")) return;
    menu(false);
    $("#ouvrir-menu").focus();
  });
  // Un seul menu « … » ouvert à la fois ; un clic ailleurs (ou sur une action) le referme
  document.addEventListener("click", (e) => {
    document.querySelectorAll("details.plus-actions[open]").forEach((d) => {
      if (!d.contains(e.target) || e.target.closest(".plus-menu button")) d.open = false;
    });
  });
  // Pastille d'un onglet (commandes, demandes) dans le menu et dans la barre du téléphone
  window.AdminPastille = (nom, n) => {
    if (typeof n !== "number") return;
    document.querySelectorAll(`[data-compteur="${nom}"]`).forEach((el) => {
      el.textContent = n;
      el.hidden = !n;
    });
  };

  const VUES = {
    accueil: () => vueAccueil(),
    commandes: () => `<div id="zone-commandes"></div>`,
    installation: () => `<div id="zone-installation"></div>`,
    caisse: () => `<div id="zone-crm"></div>`,
    clients: () => `<div id="zone-crm"></div>`,
    demandes: () => `<div id="zone-crm"></div>`,
    marketing: () => `<div id="zone-crm"></div>`,
    produits: () => `<div id="zone-produits"></div>`,
    categories: () => vueCategories() + vueOccasions(),
    avis: () => vueAvis(),
    faq: () => vueFaq(),
    boutique: () => vueBoutique(),
    textes: () => vueTextes(),
    galerie: () => vueGalerie(),
    questionnaire: () => `<div id="zone-questionnaire"></div>`,
  };
  const contexte = () => ({
    D, toast, echapper, euros, marquerModifie, publier, allerA,
    github: { api, cfg, envoyerFichier, versBase64, cheminContenu, lien: lienGithub },
    srcImage,
    mode,
    estModifie: () => modifie,
  });
  function rendre() {
    $("#contenu").innerHTML = VUES[onglet]();
    if (onglet === "commandes") window.AdminCommandes?.monter($("#zone-commandes"), contexte());
    if (onglet === "installation") window.AdminInstallation?.monter($("#zone-installation"), contexte());
    if (["caisse", "clients", "demandes", "marketing"].includes(onglet)) window.AdminCRM?.monter(onglet, $("#zone-crm"), contexte());
    if (onglet === "questionnaire") window.AdminQuestionnaire?.monter($("#zone-questionnaire"), contexte());
    if (onglet === "produits") window.AdminProduits?.monter($("#zone-produits"), outilsProduits());
    if (onglet === "accueil") {
      actionsDuJour().catch(() => ($("#jour-actions").innerHTML = ""));
      window.AdminCRM?.statistiques($("#stats-ventes"), contexte()).catch(() => {});
    }
  }
  // Accueil : ce qu'il y a à faire et quand (liste « À faire » et plan de charge de js/admin-commandes.js)
  async function actionsDuJour() {
    const el = $("#jour-actions");
    if (!el) return;
    if (!(await window.AdminCommandes?.accueil(el, contexte())))
      el.innerHTML = `<p class="aide">Les commandes, la caisse et les clients apparaîtront ici une fois le serveur de la boutique installé.</p>`;
  }

  // Champs simples liés aux données : data-chemin="site.telephone", data-type="nombre|lignes|case"
  const lire = (chemin) => chemin.split(".").reduce((o, k) => o?.[k], D);
  function ecrire(chemin, valeur) {
    const cles = chemin.split(".");
    const dernier = cles.pop();
    const cible = cles.reduce((o, k) => (o[k] ??= {}), D);
    cible[dernier] = valeur;
  }
  function champ(chemin, libelle, { type = "text", aide = "", large = false, lignes = 0, placeholder = "" } = {}) {
    const v = lire(chemin);
    const id = "f-" + chemin.replace(/\./g, "-");
    let entree;
    if (type === "case")
      return `<label class="case ${large ? "large" : ""}"><input type="checkbox" id="${id}" data-chemin="${chemin}" data-type="case" ${v ? "checked" : ""}> <span>${libelle}${aide ? `<br><small class="aide">${aide}</small>` : ""}</span></label>`;
    if (type === "lignes")
      entree = `<textarea id="${id}" data-chemin="${chemin}" data-type="lignes" rows="${lignes || 7}">${echapper((v || []).join("\n"))}</textarea>`;
    else if (type === "zone") entree = `<textarea id="${id}" data-chemin="${chemin}" rows="${lignes || 3}">${echapper(v)}</textarea>`;
    else
      entree = `<input type="${type === "nombre" ? "number" : type}" ${type === "nombre" ? 'step="0.01" min="0" data-type="nombre"' : ""} id="${id}" data-chemin="${chemin}" value="${echapper(v)}" placeholder="${echapper(placeholder)}">`;
    return `<div class="champ ${large ? "large" : ""}"><label for="${id}">${libelle}</label>${entree}${aide ? `<small>${aide}</small>` : ""}</div>`;
  }

  // Saisie dans les onglets : champs simples, listes éditables (avis, FAQ, occasions)
  $("#contenu").addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.chemin) {
      const t = el.dataset.type;
      const v = t === "case" ? el.checked : t === "nombre" ? Number(el.value || 0) : t === "lignes" ? el.value.split("\n").map((x) => x.trim()).filter(Boolean) : el.value;
      ecrire(el.dataset.chemin, v);
      if (el.dataset.chemin === "site.email") D.site.emailVerifie = false; // nouvelle adresse : à vérifier de nouveau
      marquerModifie();
      if (el.dataset.rendre !== undefined) rendre();
    } else if (el.dataset.liste) {
      const item = D[el.dataset.liste][el.dataset.i];
      item[el.dataset.champ] = el.dataset.type === "nombre" ? Number(el.value || 0) : el.value;
      marquerModifie();
    }
  });
  $("#contenu").addEventListener("change", async (e) => {
    const el = e.target;
    if (el.id === "g-ajout") {
      for (const fichier of el.files) {
        try {
          D.galerie.push(await envoyerPhoto(fichier, "realisation"));
          marquerModifie();
        } catch (err) {
          toast(`Échec de l'envoi d'une photo (${err.detail || err.message}).`, true);
        }
      }
      rendre();
    }
    if (el.id === "restaurer") {
      const fichier = el.files[0];
      if (!fichier) return;
      try {
        const d = JSON.parse(await fichier.text());
        if (!Array.isArray(d.produits) || !Array.isArray(d.categories) || !d.site) throw new Error("format");
        if (!confirm(`Remplacer tout le contenu actuel par la sauvegarde « ${fichier.name} » ? (Rien n'est publié tant que vous ne cliquez pas sur « Publier ».)`)) return;
        D = normaliser(d);
        marquerModifie();
        rendre();
        toast("Sauvegarde chargée. Vérifiez puis publiez.");
      } catch {
        toast("Ce fichier n'est pas une sauvegarde du site.", true);
      }
    }
  });

  // ---------- Vue : Tableau de bord ----------
  function blocQuestionnaire() {
    const Q = window.AdminQuestionnaire;
    if (!Q) return "";
    const a = Q.avancement(D);
    if (a.fini) return "";
    return `
      <section class="bloc bloc-questionnaire">
        <div class="bloc-tete">
          <h2>Questionnaire de démarrage</h2>
          <button class="btn" data-aller="questionnaire">${a.repondues ? "Continuer le questionnaire" : "Commencer le questionnaire"}</button>
        </div>
        <p>${a.total} questions pour compléter le nouveau site : délais, occasions, fiches techniques des produits, polices, paiement, livraison et mentions légales. Chaque réponse remplit directement le bon champ.</p>
        ${Q.barre(D)}
      </section>`;
  }
  function vueAccueil() {
    const visibles = D.produits.filter((p) => p.visible !== false);
    const sansPhoto = D.produits.filter((p) => !premiereImage(p));
    // L'email de la boutique doit être vérifié une fois (un message envoyé à cette adresse arrive bien) : commandes et devis y arrivent.
    const emailValide = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(D.site.email || "");
    const emailOk = emailValide && !!D.site.emailVerifie;
    const L = D.site.legal;
    const legalOk = !!(L.exploitant && L.formeJuridique && D.site.siret && L.regimeTva);
    const mediateurOk = !!L.mediateur.nom;
    // Les points légaux restent signalés ci-dessous mais ne bloquent pas l'ouverture (à régler avec le client).
    const pret = emailOk && D.site.prixVerifies;
    const etape = (etat, titre, detail, action = "") =>
      `<li><span class="etat ${etat}">${etat === "ok" ? "✓" : etat === "afaire" ? "!" : "·"}</span><span>${titre}${detail ? `<small>${detail}</small>` : ""}</span>${action}</li>`;
    const aller = (o, t) => `<button class="mini" data-aller="${o}">${t}</button>`;
    const maintenant = new Date();
    const salut = maintenant.getHours() >= 18 ? "Bonsoir" : "Bonjour";
    const jour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const aRevoir = [!emailOk, !D.site.prixVerifies, !legalOk, !mediateurOk, !L.plateformeFacturation].filter(Boolean).length;
    // Une fois les commandes ouvertes, la liste de vérification se replie : l'accueil commence par le travail du jour.
    const ouverte = D.site.apercu ? "open" : "";
    return `
      <section class="jour">
        <div class="jour-tete"><h2>${salut} !</h2><p>On est ${jour}. Voici ce qui vous attend.</p></div>
        <div class="jour-afaire" id="jour-actions"><p class="aide">Chargement…</p></div>
      </section>

      ${blocQuestionnaire()}

      <section class="bloc" id="stats-ventes" hidden></section>

      <details class="bloc bloc-repli" ${ouverte}>
        <summary class="bloc-tete">
          <h2>${D.site.apercu ? "Avant d'ouvrir les commandes" : "Réglages de la boutique"}</h2>
          <span class="aide">${aRevoir ? `${aRevoir} point${aRevoir > 1 ? "s" : ""} à revoir` : "Tout est en ordre"}</span>
        </summary>
        <div class="bloc-tete">
          <p class="aide">${D.site.apercu ? "Les commandes en ligne s'ouvrent quand l'email et les prix sont vérifiés." : "Ce qui rend la boutique complète et en règle."}</p>
          ${D.site.apercu ? `<button class="btn" data-action="ouvrir-commandes" ${pret ? "" : "disabled"} title="${pret ? "" : "Complétez d'abord l'email de la boutique et la vérification des prix"}">Ouvrir les commandes</button>` : `<span class="pastille ok">Commandes ouvertes</span>`}
        </div>
        <ul class="checklist">
          ${etape(emailOk ? "ok" : "afaire", "Adresse email de la boutique", emailOk ? echapper(D.site.email) : emailValide ? `${echapper(D.site.email)} : envoyez-y un message depuis une autre adresse et vérifiez qu'il arrive, sinon commandes et devis s'y perdraient.` : "Indiquez l'adresse où arrivent les commandes et les devis.", emailValide ? `<label class="case"><input type="checkbox" data-chemin="site.emailVerifie" data-type="case" data-rendre ${D.site.emailVerifie ? "checked" : ""}> Vérifiée</label>` : aller("boutique", "Corriger"))}
          ${etape(D.site.prixVerifies ? "ok" : "afaire", "Prix vérifiés", "Les prix de départ sont des exemples.", `<label class="case"><input type="checkbox" data-chemin="site.prixVerifies" data-type="case" data-rendre ${D.site.prixVerifies ? "checked" : ""}> Vérifiés</label>`)}
          ${etape(sansPhoto.length ? "afaire" : "ok", "Photos des produits", sansPhoto.length ? `${sansPhoto.length} produit(s) sans photo : ${sansPhoto.slice(0, 3).map((p) => echapper(p.nom)).join(", ")}${sansPhoto.length > 3 ? "…" : ""}` : "Tous les produits ont une photo.", sansPhoto.length ? aller("produits", "Voir") : "")}
          ${etape(D.avis.length >= 3 ? "ok" : "afaire", "Avis clients", D.avis.length >= 3 ? `${D.avis.length} avis affichés sur l'accueil.` : "Recopiez 3 avis de votre page Facebook : ils rassurent les nouveaux clients.", aller("avis", D.avis.length ? "Gérer" : "Ajouter"))}
          ${etape(D.site.plateformesAvis.google.lienAvis || D.site.plateformesAvis.google.lien ? "ok" : "option", "Avis Google reliés au site", D.site.plateformesAvis.google.lienAvis || D.site.plateformesAvis.google.lien ? "Les boutons « Laisser un avis Google » et la carte QR sont actifs." : "Ajoutez le lien de votre fiche Google : bouton « Laisser un avis » et carte QR à imprimer.", aller("avis", "Régler"))}
          ${etape(D.site.commandes?.supabaseUrl ? "ok" : "option", "Commandes en ligne et paiement par carte", D.site.commandes?.supabaseUrl ? `Reliées à Supabase${D.site.commandes?.paiement?.enLigne ? " · paiement par carte activé" : " · paiement par carte désactivé"}.` : "Recommandé : commandes enregistrées ici avec les photos, paiement par carte, fichier clients, suivi pour le client.", mode === "serveur" ? "" : aller("installation", D.site.commandes?.supabaseUrl ? "Vérifier" : "Installer"))}
          ${etape(D.site.formulaireCommande ? "ok" : "option", "Réception des commandes par email (Formspree)", D.site.formulaireCommande ? "Activée." : "Recommandé : sans cela, le client doit envoyer lui-même l'email depuis sa messagerie.", D.site.formulaireCommande ? "" : aller("boutique", "Régler"))}
          ${etape(D.site.whatsapp ? "ok" : "option", "Commandes et questions par WhatsApp", D.site.whatsapp ? `Numéro : ${echapper(D.site.whatsapp)}` : "Facultatif : ajoute un bouton « Commander par WhatsApp » et un bouton de contact.", D.site.whatsapp ? "" : aller("boutique", "Ajouter"))}
          ${etape(legalOk ? "ok" : "afaire", "Informations légales", legalOk ? `${echapper(L.formeJuridique)} · SIRET ${echapper(D.site.siret)} · ${L.regimeTva === "franchise" ? "franchise de TVA" : "assujetti à la TVA"} · reprises dans les CGV, les mentions légales et les factures.` : "Exploitant, forme juridique, SIRET et régime de TVA : obligatoires dans les CGV, les mentions légales et sur les factures.", legalOk ? "" : aller("boutique", "Compléter"))}
          ${etape(mediateurOk ? "ok" : "afaire", "Médiateur de la consommation", mediateurOk ? echapper(L.mediateur.nom) : "Obligatoire pour vendre aux particuliers (amende jusqu'à 3 000 €) : adhésion de 30 à 150 € auprès d'un médiateur référencé par la CECMC.", mediateurOk ? "" : aller("boutique", "Renseigner"))}
          ${etape(L.plateformeFacturation ? "ok" : "afaire", "Factures électroniques", L.plateformeFacturation ? "Compte ouvert sur une plateforme agréée." : "Obligatoire depuis le 1er septembre 2026 : pouvoir recevoir les factures de vos fournisseurs sur une plateforme agréée (souvent proposée par la banque ou le logiciel comptable). L'émission suivra en septembre 2027.", `<label class="case"><input type="checkbox" data-chemin="site.legal.plateformeFacturation" data-type="case" data-rendre ${L.plateformeFacturation ? "checked" : ""}> Fait</label>`)}
        </ul>
      </details>

      <section class="bloc">
        <div class="bloc-tete"><h2>Votre site</h2><span class="aide">${visibles.length} produits en ligne · ${D.produits.filter((p) => p.vedette).length} coups de cœur · ${D.avis.length} avis affichés</span></div>
        <div class="raccourcis">
          ${D.site.commandes?.supabaseUrl ? `<button class="btn btn-ligne" data-aller="marketing">Créer un code promo</button>` : ""}
          <button class="btn ${D.site.commandes?.supabaseUrl ? "btn-ligne" : ""}" data-action="nouveau-produit">+ Ajouter un produit</button>
          <button class="btn btn-ligne" data-aller="textes">Écrire une annonce (fermeture, salon…)</button>
          <a class="btn btn-ligne" href="index.html" target="_blank" rel="noopener">Voir le site en ligne</a>
        </div>
      </section>

      <section class="bloc">
        <div class="bloc-tete"><h2>Sauvegarde et historique</h2></div>
        <p class="aide">Chaque publication est conservée par GitHub : en cas d'erreur, l'historique permet de retrouver une ancienne version. Vous pouvez aussi garder une copie du contenu sur votre ordinateur.</p>
        <div class="raccourcis">
          <button class="btn btn-ligne" data-action="telecharger">Télécharger une sauvegarde</button>
          <span class="btn btn-ligne bouton-fichier">Restaurer une sauvegarde<input type="file" accept="application/json,.json" id="restaurer" aria-label="Restaurer une sauvegarde"></span>
          ${mode === "github" ? `<a class="btn btn-ligne" href="${lienGithub(`commits/${cfg.branche}/${FICHIER}`)}" target="_blank" rel="noopener">Historique des publications</a>` : ""}
        </div>
      </section>`;
  }

  // ---------- Vue : Produits (liste et éditeur : js/admin-produits.js) ----------
  // Le module reçoit le contexte commun, plus l'envoi des photos, les identifiants, le n° de pièce libre et les libellés.
  const outilsProduits = () => ({ ...contexte(), envoyerPhoto, idUnique, numeroLibre, BADGES, DISPOS });
  const editerProduit = (index) => window.AdminProduits.editer(index, outilsProduits());

  function idUnique(base, liste, sauf = -1) {
    let id = slug(base);
    let n = 2;
    while (liste.some((x, i) => x.id === id && i !== sauf)) id = `${slug(base)}-${n++}`;
    return id;
  }

  // ---------- Vue : Catégories et occasions ----------
  function vueCategories() {
    return `
      <section class="bloc">
        <div class="bloc-tete">
          <h2>Catégories</h2>
          <button class="btn" data-action="nouvelle-categorie">+ Ajouter une catégorie</button>
        </div>
        <div class="liste">
          ${D.categories
            .map((c, i) => {
              const n = D.produits.filter((p) => p.categorie === c.id).length;
              return `
            <div class="ligne">
              ${vignette(c.image)}
              <div class="ligne-texte"><strong>${echapper(c.nom)}</strong><span>${n} produit${n > 1 ? "s" : ""} · ${echapper(c.description)}</span></div>
              <div class="ligne-boutons">
                <button class="mini" data-action="cat-monter" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
                <button class="mini" data-action="cat-descendre" data-i="${i}" ${i === D.categories.length - 1 ? "disabled" : ""} aria-label="Descendre">↓</button>
                <button class="mini" data-action="modifier-categorie" data-i="${i}">Modifier</button>
                <button class="mini danger" data-action="supprimer-categorie" data-i="${i}">Supprimer</button>
              </div>
            </div>`;
            })
            .join("")}
        </div>
      </section>`;
  }
  function vueOccasions() {
    return `
      <section class="bloc">
        <div class="bloc-tete">
          <h2>Occasions</h2>
          <button class="btn btn-ligne" data-action="nouvelle-occasion">+ Ajouter une occasion</button>
        </div>
        <p class="aide">Elles alimentent la page des occasions et les filtres de la boutique. Cochez les occasions de chaque produit dans sa fiche. Jours ouvrés : temps à prévoir entre la commande et la remise (maquette, fabrication, envoi), du lundi au vendredi hors jours fériés. Date et date limite seulement pour une fête à date fixe (Noël…) : sans date limite, elle est calculée avec les jours ouvrés. Noël, la fête des mères et la fête des pères sont datées automatiquement.</p>
        <div class="liste">
          ${D.occasions
            .map((o, i) => {
              const n = D.produits.filter((p) => (p.occasions || []).includes(o.id)).length;
              return `
            <div class="ligne ligne-occasion">
              <div class="champ"><label for="occ-nom-${i}">Occasion</label><input type="text" id="occ-nom-${i}" value="${echapper(o.nom)}" data-liste="occasions" data-i="${i}" data-champ="nom"></div>
              <div class="champ"><label for="occ-date-${i}">Date de l'occasion</label><input type="date" id="occ-date-${i}" value="${echapper(o.date || "")}" data-liste="occasions" data-i="${i}" data-champ="date"></div>
              <div class="champ"><label for="occ-jours-${i}">Jours ouvrés</label><input type="number" min="0" step="1" inputmode="numeric" id="occ-jours-${i}" value="${o.delaiJours > 0 ? o.delaiJours : ""}" placeholder="jours" data-liste="occasions" data-i="${i}" data-champ="delaiJours" data-type="nombre"></div>
              <div class="champ"><label for="occ-limite-${i}">Commander avant le</label><input type="date" id="occ-limite-${i}" value="${echapper(o.dateLimite || "")}" data-liste="occasions" data-i="${i}" data-champ="dateLimite"></div>
              <span class="aide">${n} produit${n > 1 ? "s" : ""}</span>
              <div class="ligne-boutons">
                <button class="mini" data-action="occ-monter" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
                <button class="mini danger" data-action="supprimer-occasion" data-i="${i}">Supprimer</button>
              </div>
            </div>`;
            })
            .join("")}
        </div>
      </section>`;
  }
  function editerCategorie(index) {
    const nouveau = index < 0;
    const c = nouveau ? { id: "", nom: "", description: "", image: "" } : structuredClone(D.categories[index]);
    const f = $("#fenetre");
    f.innerHTML = `
      <form method="dialog" id="form-cat">
        <h2 style="font-size:1.35rem">${nouveau ? "Nouvelle catégorie" : "Modifier la catégorie"}</h2>
        <div class="image-champ">
          <span class="ligne-image" id="c-vignette">${c.image ? `<img src="${echapper(srcImage(c.image))}" alt="">` : "Sans photo"}</span>
          <div class="pile" style="gap:.5rem">
            <span class="btn btn-ligne bouton-fichier">Choisir une photo<input type="file" accept="image/*" id="c-photo" aria-label="Choisir une photo"></span>
            <small class="aide">Affichée sur la tuile de la page d'accueil.</small>
          </div>
        </div>
        <div class="champ"><label for="c-nom">Nom *</label><input type="text" id="c-nom" required value="${echapper(c.nom)}"></div>
        <div class="champ"><label for="c-desc">Description courte</label><textarea id="c-desc" rows="2">${echapper(c.description)}</textarea></div>
        <div class="fenetre-pied">
          <button type="button" class="btn btn-ligne" id="c-annuler">Annuler</button>
          <button type="submit" class="btn">Valider</button>
        </div>
      </form>`;
    $("#c-photo", f).onchange = async (e) => {
      const fichier = e.target.files[0];
      if (!fichier) return;
      try {
        c.image = await envoyerPhoto(fichier, "categorie-" + ($("#c-nom", f).value || "photo"));
        $("#c-vignette", f).innerHTML = `<img src="${echapper(srcImage(c.image))}" alt="">`;
      } catch (err) {
        toast(`Échec de l'envoi de la photo (${err.detail || err.message}).`, true);
      }
    };
    $("#c-annuler", f).onclick = () => f.close();
    $("#form-cat", f).onsubmit = (e) => {
      e.preventDefault();
      c.nom = $("#c-nom", f).value.trim();
      c.description = $("#c-desc", f).value.trim();
      if (nouveau) {
        c.id = idUnique(c.nom, D.categories);
        D.categories.push(c);
      } else D.categories[index] = c;
      f.close();
      marquerModifie();
      rendre();
    };
    f.showModal();
  }

  // ---------- Vue : Avis clients ----------
  function vueAvis() {
    const pg = D.site.plateformesAvis;
    const produits = [["", "Aucun produit précis"], ...D.produits.map((p) => [p.id, p.nom])];
    return `
      <section class="bloc">
        <div class="bloc-tete"><h2>Vos pages d'avis</h2></div>
        <p class="aide">Ces liens et chiffres s'affichent sur le site (accueil, fiches produit, page « Avis ») avec des boutons « Laisser un avis ». Mettez les chiffres à jour de temps en temps.</p>
        <div class="grille-champs">
          ${champ("site.plateformesAvis.facebook.lien", "Page des avis Facebook", { type: "url", large: true })}
          ${champ("site.plateformesAvis.facebook.taux", "Facebook : % de recommandation", { type: "nombre" })}
          ${champ("site.plateformesAvis.facebook.nombre", "Facebook : nombre d'avis", { type: "nombre" })}
          ${champ("site.plateformesAvis.google.lien", "Fiche Google (lien vers vos avis)", { type: "url", large: true, placeholder: "https://maps.app.goo.gl/…", aide: "Sur Google Maps, ouvrez votre fiche → Partager → copier le lien." })}
          ${champ("site.plateformesAvis.google.lienAvis", "Lien « Laisser un avis » Google", { type: "url", large: true, placeholder: "https://g.page/r/…/review", aide: "Dans votre fiche d'établissement Google (Google Business Profile) → « Demander des avis » → copier le lien. C'est ce lien que le QR code ci-dessous utilisera." })}
          ${champ("site.plateformesAvis.google.note", "Google : note moyenne (sur 5)", { type: "nombre", placeholder: "4.9" })}
          ${champ("site.plateformesAvis.google.nombre", "Google : nombre d'avis", { type: "nombre" })}
        </div>
      </section>

      <section class="bloc">
        <div class="bloc-tete">
          <h2>Carte « Laissez-nous un avis » à imprimer</h2>
          <button class="btn" data-action="carte-qr" ${pg.google.lienAvis || pg.google.lien || pg.facebook.lien ? "" : "disabled"}>Créer la carte</button>
        </div>
        <p class="aide">Une carte avec un QR code à poser sur le comptoir ou à glisser dans les paquets : les clients scannent et arrivent directement sur votre page d'avis${pg.google.lienAvis || pg.google.lien ? " Google" : pg.facebook.lien ? " Facebook" : ""}. Format A6 (10,5 × 14,8 cm), à imprimer en couleur.</p>
        <div id="carte-qr"></div>
      </section>

      <section class="bloc">
        <div class="bloc-tete">
          <h2>Avis affichés <span class="aide">(${D.avis.length})</span></h2>
          <button class="btn" data-action="nouvel-avis">+ Ajouter un avis</button>
        </div>
        <p class="aide">Recopiez de vrais avis (Facebook, Google…). Les 3 premiers s'affichent sur l'accueil, tous sur la page « Avis ». Liez un avis à un produit pour l'afficher aussi sur sa fiche.</p>
        <div>
          ${D.avis
            .map(
              (a, i) => `
            <div class="ligne-edit">
              <div class="grille-avis">
                <div class="champ"><label>Prénom et initiale</label><input type="text" value="${echapper(a.nom)}" data-liste="avis" data-i="${i}" data-champ="nom" placeholder="Sophie L."></div>
                <div class="champ"><label>Source</label><select data-liste="avis" data-i="${i}" data-champ="source">${[["facebook", "Facebook"], ["google", "Google"], ["autre", "Autre"]].map(([k, v]) => `<option value="${k}" ${a.source === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
                <div class="champ"><label>Note${a.source === "facebook" ? " (non affichée)" : ""}</label><select data-liste="avis" data-i="${i}" data-champ="note" data-type="nombre">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${Number(a.note || 5) === n ? "selected" : ""}>${"★".repeat(n)}</option>`).join("")}</select></div>
                <div class="champ"><label>Date</label><input type="text" value="${echapper(a.date)}" data-liste="avis" data-i="${i}" data-champ="date" placeholder="Septembre 2026"></div>
              </div>
              <div class="champ"><label>Texte de l'avis</label><textarea rows="2" data-liste="avis" data-i="${i}" data-champ="texte">${echapper(a.texte)}</textarea></div>
              <div class="ligne-edit-tete">
                <div class="champ" style="flex:1 1 260px"><label>Produit concerné (facultatif)</label><select data-liste="avis" data-i="${i}" data-champ="produit">${produits.map(([k, v]) => `<option value="${echapper(k)}" ${(a.produit || "") === k ? "selected" : ""}>${echapper(v)}</option>`).join("")}</select></div>
                <div class="ligne-boutons">
                  <button class="mini" data-action="avis-monter" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
                  <button class="mini danger" data-action="supprimer-avis" data-i="${i}">Supprimer</button>
                </div>
              </div>
            </div>`
            )
            .join("") || `<p class="aide" style="padding:1rem 0">Aucun avis pour l'instant.</p>`}
        </div>
      </section>

      <section class="bloc">
        <div class="bloc-tete"><h2>Avis Google et Facebook automatiques (facultatif)</h2></div>
        <p class="aide">Pour que les nouveaux avis apparaissent tout seuls, créez un widget sur un service spécialisé (par exemple Trustindex ou Elfsight, qui ont des formules gratuites limitées : vérifiez leurs conditions), connectez-y votre fiche Google et votre page Facebook, puis collez ici le code qu'il vous donne. Il s'affichera en haut de la page « Avis ».</p>
        ${champ("widgetAvis", "Code du widget", { type: "zone", lignes: 4, placeholder: "<script src=…></script>" })}
      </section>`;
  }

  // Carte A6 avec QR code vers la page d'avis (dessinée sur un canvas, à imprimer ou télécharger en PNG)
  let carteQR = "";
  function imprimerCarteQR() {
    const w = open("", "_blank");
    if (!w) return toast("Autorisez l'ouverture de fenêtres pour imprimer la carte.", true);
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carte avis · Mon Truc en Bois</title>
      <style>@page{size:A6;margin:0}html,body{margin:0}img{display:block;width:105mm;height:148mm}</style></head>
      <body><img src="${carteQR}" alt="Carte « Laissez-nous un avis »"></body></html>`);
    w.document.close();
    w.onload = () => (w.focus(), w.print());
  }
  async function creerCarteQR() {
    await Promise.all(["800 92px 'Big Shoulders'", "400 46px Literata", "600 48px Literata"].map((f) => document.fonts?.load(f).catch(() => {})));
    const pg = D.site.plateformesAvis;
    const google = pg.google.lienAvis || pg.google.lien;
    const lien = google || pg.facebook.lien;
    if (!lien || !window.qrcode) return toast("Ajoutez d'abord le lien de votre page d'avis.", true);
    const qr = qrcode(0, "M");
    qr.addData(lien);
    qr.make();
    const W = 1240, H = 1748; // A6 à 300 dpi
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#efe6d8";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#231a14";
    g.lineWidth = 4;
    g.strokeRect(40, 40, W - 80, H - 80);
    const logo = await new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ok(null);
      i.src = "img/logo.webp";
    });
    if (logo) g.drawImage(logo, (W - 460) / 2, 90, 460, (460 * logo.height) / logo.width);
    g.fillStyle = "#231a14";
    g.textAlign = "center";
    g.font = "800 112px 'Big Shoulders', 'Arial Narrow', sans-serif";
    g.fillText("VOTRE AVIS COMPTE", W / 2, 640);
    g.font = "400 46px Literata, Georgia, serif";
    g.fillStyle = "#6b5a4a";
    g.fillText(`Scannez pour laisser un avis ${google ? "sur Google" : "sur Facebook"}`, W / 2, 720);
    const n = qr.getModuleCount();
    const taille = 640;
    const pas = Math.floor(taille / (n + 8));
    const x0 = (W - pas * (n + 8)) / 2;
    const y0 = 780;
    g.fillStyle = "#fff";
    g.fillRect(x0, y0, pas * (n + 8), pas * (n + 8));
    g.fillStyle = "#231a14";
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect(x0 + (k + 4) * pas, y0 + (r + 4) * pas, pas, pas);
    g.fillStyle = "#231a14";
    g.font = "600 48px Literata, Georgia, serif";
    g.fillText("Merci pour votre confiance", W / 2, y0 + pas * (n + 8) + 110);
    g.fillStyle = "#6b5a4a";
    g.font = "400 38px Literata, Georgia, serif";
    g.fillText(`${D.site.adresse} · ${D.site.telephone}`, W / 2, H - 110);
    const url = c.toDataURL("image/png");
    carteQR = url;
    $("#carte-qr").innerHTML = `
      <div class="pile" style="gap:.8rem;justify-items:start">
        <img src="${url}" alt="Aperçu de la carte" style="width:min(280px,100%);border:1px solid var(--brule)">
        <span class="raccourcis"><button class="btn" type="button" data-action="imprimer-carte-qr">Imprimer la carte</button><a class="btn btn-ligne" href="${url}" download="carte-avis-mon-truc-en-bois.png">Télécharger (PNG)</a></span>
        <small class="aide">Le QR code mène à : ${echapper(lien)}</small>
      </div>`;
  }

  // ---------- Vue : FAQ ----------
  function vueFaq() {
    return `
      <section class="bloc">
        <div class="bloc-tete">
          <h2>Questions fréquentes <span class="aide">(${D.faq.length})</span></h2>
          <button class="btn" data-action="nouvelle-question">+ Ajouter une question</button>
        </div>
        <p class="aide">Affichées sur la page « Questions » du site. Une bonne FAQ évite beaucoup d'appels et de messages.</p>
        <div>
          ${D.faq
            .map(
              (x, i) => `
            <div class="ligne-edit">
              <div class="champ"><label>Question</label><input type="text" value="${echapper(x.q)}" data-liste="faq" data-i="${i}" data-champ="q"></div>
              <div class="champ"><label>Réponse</label><textarea rows="3" data-liste="faq" data-i="${i}" data-champ="r">${echapper(x.r)}</textarea></div>
              <div class="ligne-boutons" style="justify-content:flex-end">
                <button class="mini" data-action="faq-monter" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
                <button class="mini danger" data-action="supprimer-question" data-i="${i}">Supprimer</button>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  // ---------- Vue : Infos boutique ----------
  function vueBoutique() {
    return `
      <section class="bloc">
        <div class="bloc-tete"><h2>Mise en ligne</h2></div>
        ${champ("site.apercu", "Mode « site en construction »", { type: "case", aide: "Affiche un bandeau et bloque l'envoi des commandes et des devis. Décochez quand les prix et l'email sont vérifiés." })}
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Coordonnées</h2></div>
        <div class="grille-champs">
          ${champ("site.nom", "Nom de la boutique")}
          ${champ("site.telephone", "Téléphone", { type: "tel" })}
          ${champ("site.email", "Email (reçoit les commandes et devis)", { type: "email" })}
          ${champ("site.whatsapp", "Numéro WhatsApp (facultatif)", { type: "tel", placeholder: "07 83 39 40 28", aide: "Ajoute « Commander par WhatsApp » au panier et un bouton de contact sur le site." })}
          ${champ("site.adresse", "Adresse", { large: true })}
          ${champ("site.facebook", "Lien de la page Facebook", { type: "url", large: true })}
          ${champ("site.instagram", "Lien du compte Instagram (facultatif)", { type: "url", large: true })}
          ${champ("site.slogan", "Slogan (pied de page)", { large: true })}
          ${champ("site.avis", "Mention des avis (accueil)", { aide: "Ex. : Recommandé à 100 % · 16 avis" })}
        </div>
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Informations légales</h2></div>
        <p class="aide">Reprises automatiquement dans les conditions générales de vente, les mentions légales et les factures.</p>
        <div class="grille-champs">
          ${champ("site.legal.exploitant", "Nom et prénom de l'exploitant", { placeholder: "Prénom Nom" })}
          ${champ("site.legal.formeJuridique", "Forme juridique", { placeholder: "Micro-entreprise (entreprise individuelle)" })}
          ${champ("site.siret", "SIRET", { placeholder: "14 chiffres" })}
          <div class="champ"><label for="f-regime">Régime de TVA</label><select id="f-regime" data-chemin="site.legal.regimeTva" data-rendre>
            <option value="" ${!D.site.legal.regimeTva ? "selected" : ""}>À choisir</option>
            <option value="franchise" ${D.site.legal.regimeTva === "franchise" ? "selected" : ""}>Franchise en base (TVA non applicable)</option>
            <option value="assujetti" ${D.site.legal.regimeTva === "assujetti" ? "selected" : ""}>Assujetti à la TVA</option>
          </select><small>À confirmer avec le comptable. Il change les factures et la caisse (espèces).</small></div>
          ${D.site.legal.regimeTva === "assujetti" ? champ("site.legal.tauxTva", "Taux de TVA (%)", { type: "nombre", aide: "Factures : montant HT, TVA et TTC (les prix du site sont TTC)." }) : ""}
          ${champ("site.mentionTva", "Mention particulière sur les factures (facultatif)", { placeholder: D.site.legal.regimeTva === "franchise" ? "TVA non applicable, art. 293 B du CGI (ajoutée automatiquement)" : "", large: true })}
          ${champ("site.legal.immatriculation", "Immatriculation (RM ou RCS)", { placeholder: "RM, chambre de métiers, ou RCS et ville" })}
          ${champ("site.legal.directeurPublication", "Directeur ou directrice de la publication", { placeholder: "Prénom Nom", aide: "Mentions légales. Souvent l'exploitant." })}
          ${champ("site.legal.mediateur.nom", "Médiateur de la consommation", { placeholder: "Nom du médiateur", aide: "Liste officielle : economie.gouv.fr/mediation-conso (CECMC)." })}
          ${champ("site.legal.mediateur.url", "Site du médiateur", { type: "url", placeholder: "https://…" })}
          ${champ("site.legal.mediateur.adresse", "Adresse postale du médiateur", { large: true })}
          <div class="champ"><label for="f-hebergeur">Hébergement du site</label><select id="f-hebergeur" data-chemin="site.legal.hebergeur">
            <option value="github" ${D.site.legal.hebergeur !== "cloudflare" ? "selected" : ""}>GitHub Pages</option>
            <option value="cloudflare" ${D.site.legal.hebergeur === "cloudflare" ? "selected" : ""}>Cloudflare Pages</option>
          </select><small>Mentionné dans les mentions légales.</small></div>
        </div>
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Référencement Google et statistiques de visite</h2></div>
        <p class="aide">Chaque produit a sa propre page optimisée pour Google et pour le partage sur Facebook/WhatsApp (photo, prix, description), recréée automatiquement à chaque publication. Pensez à déclarer le site dans <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Google Search Console</a> avec le plan du site <code>sitemap.xml</code>, et à mettre le lien du site sur votre fiche Google et votre page Facebook.</p>
        <div class="grille-champs">
          ${champ("site.url", "Adresse publique du site", { type: "url", large: true, placeholder: "https://noedio.github.io/site-mon-truc-en-bois", aide: "À changer si vous prenez votre propre nom de domaine (ex. https://www.montrucenbois.fr)." })}
          ${champ("site.mesure.goatcounter", "Statistiques de visite : code GoatCounter (facultatif)", { large: true, placeholder: "montrucenbois", aide: 'Gratuit et sans cookie (pas de bandeau à afficher) : créez un compte sur <a href="https://www.goatcounter.com/signup" target="_blank" rel="noopener">goatcounter.com</a>, puis indiquez ici le code choisi (la partie avant « .goatcounter.com »). Visites, pages vues, ajouts au panier, commandes et demandes de devis apparaissent ensuite sur votre tableau GoatCounter.' })}
        </div>
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Horaires</h2></div>
        ${champ("site.horaires", "Une ligne par jour, au format « Jour : horaires »", { type: "lignes" })}
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Commandes en ligne et paiement</h2></div>
        <p class="aide">${D.site.commandes.supabaseUrl ? "Serveur installé : les commandes arrivent dans l'onglet Commandes." : "Le serveur des commandes n'est pas encore installé : les commandes arrivent par email ou WhatsApp."} ${mode === "serveur" ? "Clés, emails automatiques et paiement par carte sont réglés par votre agence." : `Clés, emails automatiques et paiement par carte se règlent dans l'onglet <button class="mini" data-aller="installation">Installation</button>.`}</p>
        <div class="grille-champs">
          ${champ("site.commandes.paiement.enLigne", "Proposer le paiement par carte à la commande (Stripe)", { type: "case", large: true, aide: "Nécessite la clé Stripe (onglet Installation)." })}
          ${champ("site.commandes.paiement.apresValidation", "Proposer « payer après validation de la maquette » (lien envoyé depuis l'admin)", { type: "case", large: true })}
          ${champ("site.commandes.paiement.boutique", "Proposer « payer à la boutique au retrait »", { type: "case", large: true })}
          <div class="champ"><label for="f-maquette">Maquette envoyée au client</label><select id="f-maquette" data-chemin="site.commandes.maquette">
            <option value="" ${!D.site.commandes.maquette ? "selected" : ""}>À préciser</option>
            <option value="toujours" ${D.site.commandes.maquette === "toujours" ? "selected" : ""}>Pour chaque commande</option>
            <option value="si-besoin" ${D.site.commandes.maquette === "si-besoin" ? "selected" : ""}>Seulement quand c'est nécessaire</option>
          </select></div>
          ${champ("site.commandes.delaiReponse", "Délai de réponse annoncé (commandes, devis)", { placeholder: "48 h", aide: "Vide : aucun délai promis." })}
        </div>
        <details style="margin-top:1rem"><summary>Réglages techniques (remplis par l'assistant d'installation)</summary>
          <div class="grille-champs" style="margin-top:.8rem">
            ${champ("site.commandes.supabaseUrl", "Adresse du projet Supabase", { type: "url", large: true, placeholder: "https://xxxxxxxx.supabase.co" })}
            ${champ("site.commandes.supabaseCle", "Clé publique Supabase (anon public)", { large: true, placeholder: "eyJhbGciOi…", aide: "Ne collez jamais la clé « service_role » ici : le site est public." })}
          </div>
        </details>
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Livraison, cadeau et commandes</h2></div>
        <div class="grille-champs">
          ${champ("site.livraison", "Frais de livraison (€)", { type: "nombre" })}
          ${champ("site.livraisonOfferteDes", "Livraison offerte à partir de (€)", { type: "nombre" })}
          ${champ("site.expedition.transporteur", "Transporteur", { placeholder: "La Poste, Mondial Relay…" })}
          ${champ("site.expedition.zones", "Zones livrées", { placeholder: "France métropolitaine…" })}
          ${champ("site.emballage.actif", "Proposer un emballage cadeau", { type: "case" })}
          ${champ("site.emballage.prix", "Prix de l'emballage cadeau (€)", { type: "nombre" })}
          ${champ("site.formulaireCommande", "Adresse Formspree (facultatif)", { type: "url", large: true, aide: "Créez un formulaire gratuit sur formspree.io et collez son adresse : les commandes arriveront directement par email. Vide = la messagerie du client s'ouvre." })}
        </div>
      </section>`;
  }

  // ---------- Vue : Textes et annonce ----------
  function vueTextes() {
    return `
      <section class="bloc">
        <div class="bloc-tete"><h2>Annonce en haut du site</h2></div>
        <p class="aide">Pour prévenir d'une fermeture, d'un salon, d'une date limite de commande pour Noël…</p>
        ${champ("annonce.actif", "Afficher l'annonce", { type: "case" })}
        ${champ("annonce.texte", "Texte de l'annonce", { aide: "Ex. : Commandes de Noël : passez commande avant le 10 décembre." })}
        ${champ("annonce.lien", "Lien au clic (facultatif)", { placeholder: "boutique.html?occasion=noel", aide: "Une page du site (ex. boutique.html?occasion=noel) ou une adresse complète." })}
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Page d'accueil</h2></div>
        ${champ("textes.heroTitre", "Grand titre", { type: "zone", lignes: 2 })}
        ${champ("textes.heroTexte", "Texte d'introduction", { type: "zone", lignes: 3 })}
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Page « Qui sommes-nous ? »</h2></div>
        ${champ("textes.equipe", "Prénoms affichés", { aide: "Ex. : Christophe et Laetitia. Laissez vide pour ne rien afficher." })}
        ${champ("textes.aPropos", "Présentation (un paragraphe par ligne)", { type: "lignes", lignes: 8 })}
      </section>`;
  }

  // ---------- Vue : Galerie ----------
  function vueGalerie() {
    return `
      <section class="bloc">
        <div class="bloc-tete">
          <h2>Galerie « Réalisations » <span class="aide">(${D.galerie.length} photos)</span></h2>
          <span class="btn bouton-fichier">+ Ajouter des photos<input type="file" accept="image/*" multiple id="g-ajout" aria-label="Ajouter des photos"></span>
        </div>
        <p class="aide">Affichée sur la page « Qui sommes-nous ? ». Utilisez les flèches pour changer l'ordre.</p>
        <div class="galerie-admin">
          ${D.galerie
            .map(
              (src, i) => `
            <figure>
              <img src="${echapper(srcImage(src))}" alt="" loading="lazy">
              <div class="ligne-boutons">
                <button class="mini" data-action="g-gauche" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Avancer">←</button>
                <button class="mini" data-action="g-droite" data-i="${i}" ${i === D.galerie.length - 1 ? "disabled" : ""} aria-label="Reculer">→</button>
                <button class="mini danger" data-action="g-suppr" data-i="${i}">Retirer</button>
              </div>
            </figure>`
            )
            .join("")}
        </div>
      </section>`;
  }

  // ---------- Actions des boutons ----------
  const echanger = (t, a, b) => ([t[a], t[b]] = [t[b], t[a]]);
  function telechargerSauvegarde() {
    const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde-site-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $("#contenu").addEventListener("click", (e) => {
    const vers = e.target.closest("[data-aller]");
    if (vers) return allerA(vers.dataset.aller);
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const i = Number(b.dataset.i);
    const a = b.dataset.action;
    if (a === "nouveau-produit") return editerProduit(-1);
    if (a === "nouvelle-categorie") return editerCategorie(-1);
    if (a === "modifier-categorie") return editerCategorie(i);
    if (a === "telecharger") return telechargerSauvegarde();
    if (a === "carte-qr") return creerCarteQR();
    if (a === "imprimer-carte-qr") return imprimerCarteQR();
    if (a === "ouvrir-commandes") {
      if (!confirm("Ouvrir les commandes ? Le bandeau « site en construction » disparaîtra et les clients pourront envoyer leurs commandes.")) return;
      D.site.apercu = false;
      toast("Commandes ouvertes : cliquez sur « Publier les modifications » pour l'appliquer au site.");
    }
    if (a === "cat-monter") echanger(D.categories, i, i - 1);
    if (a === "cat-descendre") echanger(D.categories, i, i + 1);
    if (a === "supprimer-categorie") {
      const c = D.categories[i];
      const n = D.produits.filter((p) => p.categorie === c.id).length;
      if (n) return toast(`Impossible : ${n} produit(s) sont dans « ${c.nom} ». Déplacez-les d'abord dans une autre catégorie.`, true);
      if (!confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
      D.categories.splice(i, 1);
    }
    if (a === "nouvelle-occasion") D.occasions.push({ id: idUnique("occasion", D.occasions), nom: "Nouvelle occasion" });
    if (a === "occ-monter") echanger(D.occasions, i, i - 1);
    if (a === "supprimer-occasion") {
      const o = D.occasions[i];
      if (!confirm(`Supprimer l'occasion « ${o.nom} » ? Elle sera retirée des produits.`)) return;
      D.produits.forEach((p) => (p.occasions = (p.occasions || []).filter((x) => x !== o.id)));
      D.occasions.splice(i, 1);
    }
    if (a === "nouvel-avis") D.avis.unshift({ nom: "", note: 5, texte: "", date: "", source: "facebook" });
    if (a === "avis-monter") echanger(D.avis, i, i - 1);
    if (a === "supprimer-avis") {
      if (!confirm("Supprimer cet avis ?")) return;
      D.avis.splice(i, 1);
    }
    if (a === "nouvelle-question") D.faq.push({ q: "", r: "" });
    if (a === "faq-monter") echanger(D.faq, i, i - 1);
    if (a === "supprimer-question") {
      if (!confirm("Supprimer cette question ?")) return;
      D.faq.splice(i, 1);
    }
    if (a === "g-gauche") echanger(D.galerie, i, i - 1);
    if (a === "g-droite") echanger(D.galerie, i, i + 1);
    if (a === "g-suppr") D.galerie.splice(i, 1);
    marquerModifie();
    rendre();
  });

  // ---------- Démarrage ----------
  // Retour depuis l'email « mot de passe oublié » : choix du nouveau mot de passe, puis entrée dans l'admin
  if (serveurDispo())
    window.AdminServeur.surveillerRecuperation(window.DONNEES, { toast }, () => {
      if (!$("#app").hidden) return;
      mode = "serveur";
      demarrer();
    });
  if (cfg.cle) demarrer();
  else if (serveurDispo())
    window.AdminServeur.connecte(window.DONNEES)
      .then((ok) => (ok ? demarrer() : afficherConnexion()))
      .catch(() => afficherConnexion());
  else afficherConnexion();
})();
