// Gestion commerciale dans l'admin (serveur Supabase requis) :
//   Caisse     : js/admin-caisse.js, affichée ici avec les données et les outils partagés
//   Clients    : fichier clients en tableau triable, fiche dans un tiroir latéral (historique, demandes, notes, actions)
//   Demandes   : boîte de réception (à répondre, répondues, classées), réponse et fichiers joints dans le tiroir
//   Marketing  : codes promo, emails aux abonnés
//   + statistiques de ventes sur le tableau de bord
(function () {
  const MOYENS = { carte: "Carte bancaire (TPE)", especes: "Espèces", cheque: "Chèque", virement: "Virement", paypal: "PayPal", autre: "Autre" };
  const CANAUX = { boutique: "En boutique", telephone: "Par téléphone", salon: "Salon / marché" };
  const CANAUX_STATS = { site: "Site internet", boutique: "Boutique", telephone: "Téléphone", salon: "Salons" };
  const SOURCES = { site: "Site internet", boutique: "Boutique", telephone: "Téléphone", salon: "Salon / marché", newsletter: "Newsletter", autre: "Autre" };
  const ST_DEM = { nouvelle: "Nouvelle", en_cours: "À répondre", repondue: "Répondue", convertie: "Devenue commande", archivee: "Classée" };
  const TYPES_DEM = { devis: "Devis", contact: "Message", newsletter: "Newsletter" };
  const STATUTS_CMD = { nouvelle: "À maquetter", maquette_envoyee: "Maquette envoyée", retouche: "Maquette en retouche", confirmee: "Maquette validée", en_fabrication: "En fabrication", prete: "Prête", expediee: "Expédiée", terminee: "Terminée", annulee: "Annulée" };
  const SEGMENTS = {
    tous: ["Tous", () => true],
    abonnes: ["Abonnés newsletter", (c) => c.consentement_marketing],
    fideles: ["Fidèles (2 achats ou +)", (c, s) => s.n >= 2],
    inactifs: ["Sans achat depuis 6 mois", (c, s) => s.n && Date.now() - new Date(s.derniere) > 182 * 864e5],
    prospects: ["Jamais commandé", (c, s) => !s.n],
  };
  // Boîte de réception des demandes : ce qui attend une réponse d'abord
  const BOITES = {
    a_repondre: ["À répondre", (d) => d.type !== "newsletter" && ["nouvelle", "en_cours"].includes(d.statut)],
    repondues: ["Répondues", (d) => d.type !== "newsletter" && ["repondue", "convertie"].includes(d.statut)],
    classees: ["Classées", (d) => d.type !== "newsletter" && d.statut === "archivee"],
    newsletter: ["Inscriptions newsletter", (d) => d.type === "newsletter"],
  };

  let ctx = null;
  let zone = null;
  let vue = "";
  const donnees = { clients: [], commandes: [], demandes: [], promos: [], campagnes: [] };
  const etat = { q: "", segment: "tous", etiquette: "", tri: { col: "derniere", sens: -1 }, boite: "a_repondre", qDem: "", ouvert: "" };

  const S = () => window.AdminServeur;
  const sb = () => S().client(ctx.D);
  const e = (s) => ctx.echapper(s);
  const euros = (n) => ctx.euros(n);
  const arrondi = (n) => Math.round(Number(n || 0) * 100) / 100;
  const date = (d, heure = false) => (d ? new Date(d).toLocaleString("fr-FR", heure ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" }) : "");
  const fenetre = () => document.getElementById("fenetre");
  const lien = (tel) => String(tel || "").replace(/[^\d+]/g, "");
  const sansEmail = (email) => !email || email.endsWith(".invalid");
  const ICO_X = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  // Adresse du site pour les liens envoyés aux clients : l'adresse publique réglée dans Infos boutique, sinon le dossier
  // de cette page (Cloudflare Pages sert l'admin à « /admin » sans « .html » : on ne peut pas se fier au nom de la page).
  const adresseSite = () => (ctx.D.site.url ? ctx.D.site.url.replace(/\/*$/, "/") : location.origin + location.pathname.replace(/[^/]*$/, ""));

  // ---------- Recherche : sans accents ni majuscules, téléphone par ses chiffres, résultats surlignés ----------
  const normaliser = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const chiffresTel = (tel) => lien(tel).replace(/^\+33/, "0").replace(/\D/g, ""); // « 06 12 » et « +33 6 12 » se retrouvent
  // Entoure de <mark> les caractères de texte qui correspondent aux positions marquées (texte échappé)
  function marquer(caracteres, marques) {
    let html = "";
    let dedans = false;
    caracteres.forEach((c, i) => {
      if (marques[i] && !dedans) html += "<mark>";
      if (!marques[i] && dedans) html += "</mark>";
      dedans = marques[i];
      html += e(c);
    });
    return html + (dedans ? "</mark>" : "");
  }
  function surligner(texte, q) {
    const caracteres = [...String(texte ?? "")];
    const cherche = normaliser(String(q ?? "").trim());
    if (!cherche) return e(texte);
    let norm = "";
    const carte = [];
    caracteres.forEach((c, i) => {
      for (const x of normaliser(c)) {
        norm += x;
        carte.push(i);
      }
    });
    const marques = caracteres.map(() => false);
    for (let k = norm.indexOf(cherche); k >= 0; k = norm.indexOf(cherche, k + cherche.length)) for (let j = k; j < k + cherche.length; j++) marques[carte[j]] = true;
    return marquer(caracteres, marques);
  }
  function surlignerTel(tel, q) {
    const chiffres = String(q ?? "").replace(/\D/g, "");
    if (chiffres.length < 3 || /[a-z@]/i.test(q)) return surligner(tel, q);
    const caracteres = [...String(tel ?? "")];
    const positions = caracteres.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
    const suite = positions.map((i) => caracteres[i]).join("");
    const marques = caracteres.map(() => false);
    const k = suite.indexOf(chiffres.startsWith("33") ? "0" + chiffres.slice(2) : chiffres);
    if (k >= 0) for (let j = k; j < k + chiffres.length && j < positions.length; j++) marques[positions[j]] = true;
    return marquer(caracteres, marques);
  }

  async function lire(table, select = "*", ordre = "cree_le") {
    const { data, error } = await sb().from(table).select(select).order(ordre, { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    return data;
  }
  const LECTEURS = {
    clients: () => lire("clients"),
    commandes: () => lire("commandes", "id,numero,cree_le,total,statut,paiement_statut,client_id,canal"),
    demandes: () => lire("demandes"),
    promos: () => lire("codes_promo"),
    campagnes: () => lire("campagnes"),
  };
  const recharger = (besoins) => Promise.all(besoins.map(async (b) => (donnees[b] = await LECTEURS[b]())));
  async function charger() {
    const besoins = {
      caisse: ["clients", "promos"],
      clients: ["clients", "commandes", "demandes"],
      demandes: ["demandes", "clients"],
      marketing: ["promos", "campagnes", "clients"],
    }[vue];
    await recharger(besoins);
    majCompteurDemandes();
  }
  function majCompteurDemandes() {
    const n = donnees.demandes.filter((d) => d.statut === "nouvelle" && d.type !== "newsletter").length;
    window.AdminPastille?.("demandes", n);
  }
  // Données et outils prêtés à la caisse (js/admin-caisse.js)
  const outilsCaisse = () => ({ ctx, donnees, sb, S, recharger, vue: () => vue, normaliser, chiffresTel, surligner, surlignerTel, libellePromo, promoValide, MOYENS, CANAUX });

  async function monter(nomVue, element, contexte) {
    ctx = contexte;
    zone = element;
    vue = nomVue;
    fermerTiroir(false);
    if (!S().client(ctx.D) || !(await S().connecte(ctx.D))) return S().ecranConnexion(zone, ctx, () => monter(nomVue, element, contexte));
    zone.innerHTML = `<p class="aide" style="padding:2rem 0">Chargement…</p>`;
    try {
      await charger();
    } catch (x) {
      zone.innerHTML = `<p class="message message-alerte">Lecture impossible (${e(x.message)}). Vérifiez l'installation (onglet Installation → Vérifier).</p>`;
      return;
    }
    afficher();
  }
  function afficher() {
    if (!zone || !document.contains(zone)) return;
    if (vue === "caisse") return window.AdminCaisse.monter(zone, outilsCaisse());
    zone.innerHTML = { clients: vueClients, demandes: vueDemandes, marketing: vueMarketing }[vue]();
  }
  const exporterCsv = (nom, entetes, lignes) => {
    const champ = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [entetes, ...lignes].map((l) => l.map(champ).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
  };

  // =====================================================================
  //  TIROIR LATÉRAL : fiche client ou demande, sans quitter la liste
  // =====================================================================
  let ouvreur = null;
  function tiroir() {
    let t = document.getElementById("crm-tiroir");
    if (!t) {
      t = document.createElement("dialog");
      t.id = "crm-tiroir";
      t.className = "tiroir";
      t.setAttribute("aria-labelledby", "tiroir-titre");
      document.body.append(t);
    }
    return t;
  }
  function ouvrirTiroir(html, cle) {
    const t = tiroir();
    if (!t.open) ouvreur = document.activeElement;
    t.innerHTML = html;
    t.scrollTop = 0;
    if (!t.open) t.show();
    document.body.classList.add("tiroir-ouvert");
    etat.ouvert = cle;
    marquerOuvert();
    t.querySelector("#tiroir-titre")?.focus({ preventScroll: true });
  }
  function fermerTiroir(rendreFocus = true) {
    const t = document.getElementById("crm-tiroir");
    etat.ouvert = "";
    document.body.classList.remove("tiroir-ouvert");
    marquerOuvert();
    if (!t?.open) return;
    t.close();
    if (rendreFocus && ouvreur && document.contains(ouvreur)) ouvreur.focus();
    ouvreur = null;
  }
  // La ligne dont la fiche est ouverte reste repérée dans la liste
  function marquerOuvert() {
    zone?.querySelectorAll("[data-ligne-id]").forEach((x) => (x.dataset.ligneId === etat.ouvert ? x.setAttribute("aria-current", "true") : x.removeAttribute("aria-current")));
  }
  const teteTiroir = (titre, sousTitre, surTitre = "") => `
    <div class="tiroir-tete">
      <div>${surTitre ? `<p class="etiquette">${surTitre}</p>` : ""}<h2 id="tiroir-titre" tabindex="-1">${titre}</h2>${sousTitre ? `<p class="aide">${sousTitre}</p>` : ""}</div>
      <button type="button" class="mini" data-crm="fermer-tiroir" aria-label="Fermer (Échap)">${ICO_X}</button>
    </div>`;

  // =====================================================================
  //  CLIENTS
  // =====================================================================
  function statsClients() {
    const s = {};
    for (const c of donnees.commandes) {
      if (!c.client_id || c.statut === "annulee") continue;
      const x = (s[c.client_id] ??= { n: 0, total: 0, derniere: null });
      x.n++;
      x.total += Number(c.total);
      if (!x.derniere || c.cree_le > x.derniere) x.derniere = c.cree_le;
    }
    return (id) => s[id] || { n: 0, total: 0, derniere: null };
  }
  function clientsFiltres(st) {
    const q = normaliser(etat.q.trim());
    const chiffres = etat.q.replace(/\D/g, "");
    const { col, sens } = etat.tri;
    const valeur = { nom: (c) => normaliser(c.nom), achats: (c) => st(c.id).n, total: (c) => st(c.id).total, derniere: (c) => st(c.id).derniere || "", depuis: (c) => c.cree_le || "" }[col];
    return donnees.clients
      .filter((c) => SEGMENTS[etat.segment][1](c, st(c.id)))
      .filter((c) => !etat.etiquette || (c.etiquettes || []).includes(etat.etiquette))
      .filter((c) => !q || normaliser(`${c.nom} ${c.email ?? ""} ${(c.etiquettes || []).join(" ")}`).includes(q) || (chiffres.length >= 3 && chiffresTel(c.tel).includes(chiffres)))
      .sort((a, b) => {
        const x = valeur(a);
        const y = valeur(b);
        return (x > y ? 1 : x < y ? -1 : 0) * sens || String(b.cree_le).localeCompare(String(a.cree_le));
      });
  }
  function vueClients() {
    const st = statsClients();
    const etiquettes = [...new Set(donnees.clients.flatMap((c) => c.etiquettes || []))].sort();
    const abonnes = donnees.clients.filter((c) => c.consentement_marketing).length;
    const recurrents = donnees.clients.filter((c) => st(c.id).n >= 2).length;
    const acheteurs = donnees.clients.filter((c) => st(c.id).n).length;
    const ca = donnees.clients.reduce((t, c) => t + st(c.id).total, 0);
    const entete = (col, nom, classe = "") => {
      const trie = etat.tri.col === col;
      return `<th scope="col" class="${classe}" ${trie ? `aria-sort="${etat.tri.sens > 0 ? "ascending" : "descending"}"` : ""}><button type="button" class="crm-tri" data-crm="trier" data-valeur="${col}">${nom}<span class="crm-tri-sens" aria-hidden="true">${trie ? (etat.tri.sens > 0 ? "↑" : "↓") : ""}</span></button></th>`;
    };
    return `
      <div class="chiffres-admin">
        <div class="chiffre"><strong>${donnees.clients.length}</strong><span>clients</span></div>
        <div class="chiffre"><strong>${abonnes}</strong><span>abonnés aux nouveautés</span></div>
        <div class="chiffre"><strong>${acheteurs ? Math.round((recurrents / acheteurs) * 100) : 0} %</strong><span>de clients fidèles (2 achats ou +)</span></div>
        <div class="chiffre"><strong>${euros(acheteurs ? ca / acheteurs : 0)}</strong><span>dépensés en moyenne par client</span></div>
      </div>
      <section class="bloc crm-bloc">
        <div class="crm-outils">
          <input type="search" data-crm-q value="${e(etat.q)}" placeholder="Nom, email, téléphone, étiquette" aria-label="Rechercher un client" aria-controls="crm-clients">
          <div class="raccourcis">
            <button class="btn" data-crm="nouveau-client">Nouveau client</button>
            <button class="btn btn-ligne" data-crm="export-clients">Exporter</button>
          </div>
        </div>
        <div class="filtres" role="group" aria-label="Listes de clients">${Object.entries(SEGMENTS).map(([k, [nom, f]]) => `<button class="filtre" data-crm="segment" data-valeur="${k}" aria-pressed="${etat.segment === k}">${nom} <small>${donnees.clients.filter((c) => f(c, st(c.id))).length}</small></button>`).join("")}</div>
        ${etiquettes.length ? `<div class="crm-etiquettes"><span class="aide">Étiquettes :</span>${etiquettes.map((t) => `<button class="lien-bouton" data-crm="etiquette" data-valeur="${e(t)}" aria-pressed="${etat.etiquette === t}">${e(t)}</button>`).join("")}</div>` : ""}
        <table class="crm-table crm-clients">
          <caption class="cs-annonce">Clients, triés par ${{ nom: "nom", achats: "nombre d'achats", total: "total dépensé", derniere: "date du dernier achat", depuis: "ancienneté" }[etat.tri.col]}</caption>
          <thead><tr>${entete("nom", "Client")}<th scope="col" class="crm-col-contact">Contact</th>${entete("achats", "Achats", "n crm-col-achats")}${entete("total", "Dépensé", "n")}${entete("derniere", "Dernier achat", "crm-col-date")}<th scope="col" class="crm-col-suivi">Suivi</th></tr></thead>
          <tbody id="crm-clients">${lignesClients(st)}</tbody>
        </table>
      </section>`;
  }
  function lignesClients(st = statsClients()) {
    const liste = clientsFiltres(st);
    const lignes = liste
      .slice(0, 300)
      .map((c) => {
        const s = st(c.id);
        const suivi = [c.consentement_marketing ? "abonné" : "", ...(c.etiquettes || [])].filter(Boolean);
        return `<tr data-crm="client" data-id="${c.id}" data-ligne-id="${c.id}" ${etat.ouvert === c.id ? 'aria-current="true"' : ""}>
          <td class="crm-col-nom"><button type="button" class="crm-lien" data-crm="client" data-id="${c.id}">${surligner(c.nom || "(sans nom)", etat.q)}</button><span class="crm-sous">${c.email ? surligner(c.email, etat.q) : c.tel ? surlignerTel(c.tel, etat.q) : "aucun contact"}</span></td>
          <td class="crm-col-contact">${c.email ? `<span>${surligner(c.email, etat.q)}</span>` : ""}${c.tel ? `<span>${surlignerTel(c.tel, etat.q)}</span>` : ""}${!c.email && !c.tel ? `<span class="aide">aucun</span>` : ""}</td>
          <td class="n crm-col-achats">${s.n || `<span class="aide">0</span>`}</td>
          <td class="n crm-montant">${s.total ? euros(s.total) : `<span class="aide">0</span>`}</td>
          <td class="crm-col-date">${s.derniere ? date(s.derniere) : `<span class="aide">jamais</span>`}</td>
          <td class="crm-col-suivi">${suivi.map(e).join(", ")}</td>
        </tr>`;
      })
      .join("");
    if (!lignes) return `<tr class="crm-vide"><td colspan="6">${donnees.clients.length ? `Aucun client ${etat.q ? `pour « ${e(etat.q)} »` : "dans cette liste"}.` : "Aucun client pour l'instant : ils sont ajoutés automatiquement à chaque commande, vente, devis ou inscription."}</td></tr>`;
    return lignes + (liste.length > 300 ? `<tr class="crm-vide"><td colspan="6">300 premiers affichés sur ${liste.length} : affinez la recherche.</td></tr>` : "");
  }
  const majLignesClients = () => {
    const corps = zone?.querySelector("#crm-clients");
    if (corps) corps.innerHTML = lignesClients();
  };

  function formulaireClient(c, nouveau) {
    return `
      <form class="pile" data-crm-form="client" data-id="${nouveau ? "" : c.id}">
        <div class="grille-champs">
          <div class="champ large"><label for="cl-nom">Nom</label><input id="cl-nom" name="nom" value="${e(c.nom)}" required maxlength="120"></div>
          <div class="champ"><label for="cl-tel">Téléphone</label><input id="cl-tel" name="tel" type="tel" value="${e(c.tel)}"></div>
          <div class="champ"><label for="cl-email">Email</label><input id="cl-email" name="email" type="email" value="${e(c.email || "")}"></div>
          <div class="champ large"><label for="cl-adresse">Adresse</label><textarea id="cl-adresse" name="adresse" rows="2">${e(c.adresse)}</textarea></div>
          <div class="champ large"><label for="cl-etiquettes">Étiquettes</label><input id="cl-etiquettes" name="etiquettes" value="${e((c.etiquettes || []).join(", "))}" placeholder="pro, mariage 2026, club de foot…"><small>Séparées par des virgules : pour retrouver et cibler un groupe de clients.</small></div>
          ${nouveau ? `<div class="champ"><label for="cl-source">Connu par</label><select id="cl-source" name="source">${Object.entries(SOURCES).map(([k, v]) => `<option value="${k}" ${c.source === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
          <div class="champ large"><label for="cl-notes">Notes</label><textarea id="cl-notes" name="notes" rows="3" placeholder="Préférences, tailles, dates importantes (anniversaire, mariage…)">${e(c.notes)}</textarea></div>` : ""}
          <label class="case large"><input type="checkbox" name="consentement" ${c.consentement_marketing ? "checked" : ""}> <span>Accepte de recevoir les nouveautés et promotions par email${c.consentement_le ? `<br><small class="aide">Choix enregistré le ${date(c.consentement_le, true)}</small>` : ""}</span></label>
        </div>
        <div class="raccourcis"><button class="btn">${nouveau ? "Créer la fiche" : "Enregistrer"}</button>${nouveau ? `<button type="button" class="btn btn-ligne" data-crm="fermer-tiroir">Annuler</button>` : ""}</div>
      </form>`;
  }
  function tiroirClient(id) {
    if (!id) {
      const vide = { nom: "", email: "", tel: "", adresse: "", notes: "", etiquettes: [], source: "boutique", consentement_marketing: false };
      return ouvrirTiroir(`${teteTiroir("Nouveau client", "Les clients des commandes, ventes et demandes sont ajoutés automatiquement.")}<div class="tiroir-corps">${formulaireClient(vide, true)}</div>`, "nouveau");
    }
    const c = donnees.clients.find((x) => x.id === id);
    if (!c) return;
    const st = statsClients()(c.id);
    const achats = donnees.commandes.filter((x) => x.client_id === c.id);
    const demandes = donnees.demandes.filter((d) => d.client_id === c.id);
    const tel = lien(c.tel);
    const wa = tel ? `https://wa.me/${tel.startsWith("0") ? "33" + tel.slice(1) : tel.replace("+", "")}` : "";
    const fait = (nom, valeur) => `<div><dt>${nom}</dt><dd>${valeur}</dd></div>`;
    ouvrirTiroir(
      `${teteTiroir(e(c.nom || "Client"), `Client depuis le ${date(c.cree_le)} · ${e(SOURCES[c.source] || c.source)}`)}
      <div class="tiroir-corps">
        <div class="raccourcis">
          <button class="btn" type="button" data-crm="vendre" data-id="${c.id}">Nouvelle vente</button>
          ${c.email ? `<button class="btn btn-ligne" type="button" data-crm="ecrire" data-id="${c.id}">Écrire</button>` : ""}
          ${tel ? `<a class="btn btn-ligne" href="tel:${e(tel)}">Appeler</a>` : ""}
          ${wa ? `<a class="btn btn-ligne" target="_blank" rel="noopener" href="${e(wa)}">WhatsApp</a>` : ""}
        </div>
        <dl class="tiroir-faits">
          ${fait("Achats", st.n)}${fait("Dépensé", euros(st.total))}${fait("Panier moyen", st.n ? euros(st.total / st.n) : "aucun")}${fait("Dernier achat", st.derniere ? new Date(st.derniere).toLocaleDateString("fr-FR") : "jamais")}
        </dl>
        <dl class="tiroir-contact">
          <div><dt>Email</dt><dd>${c.email ? `<a href="mailto:${e(c.email)}">${e(c.email)}</a>` : `<span class="aide">non renseigné</span>`}</dd></div>
          <div><dt>Téléphone</dt><dd>${c.tel ? `<a href="tel:${e(tel)}">${e(c.tel)}</a>` : `<span class="aide">non renseigné</span>`}</dd></div>
          ${c.adresse ? `<div><dt>Adresse</dt><dd style="white-space:pre-line">${e(c.adresse)}</dd></div>` : ""}
          <div><dt>Nouveautés</dt><dd>${c.consentement_marketing ? `accepte les emails${c.consentement_le ? ` depuis le ${date(c.consentement_le)}` : ""}` : `<span class="aide">pas d'accord pour les emails</span>`}</dd></div>
          ${(c.etiquettes || []).length ? `<div><dt>Étiquettes</dt><dd>${c.etiquettes.map(e).join(", ")}</dd></div>` : ""}
        </dl>
        <div class="champ">
          <label for="cl-notes-${c.id}">Notes</label>
          <textarea id="cl-notes-${c.id}" data-crm-notes="${c.id}" rows="3" placeholder="Préférences, tailles, dates importantes (anniversaire, mariage…)">${e(c.notes)}</textarea>
          <small class="tiroir-etat" aria-live="polite">Enregistrées dès que vous quittez le champ.</small>
        </div>
        <section class="tiroir-section">
          <h3>Commandes et ventes <span class="aide">(${achats.length})</span></h3>
          ${achats.length ? `<ul class="tiroir-liste">${achats.map((a) => `<li><span class="tiroir-num">${e(a.numero)}</span><span>${date(a.cree_le)} · ${e(CANAUX_STATS[a.canal] || "Site internet")}</span><span class="${a.paiement_statut === "en_attente" && a.statut !== "annulee" ? "manque" : "aide"}">${e(STATUTS_CMD[a.statut] || a.statut)}${a.paiement_statut === "en_attente" && a.statut !== "annulee" ? " · à régler" : ""}</span><strong>${euros(a.total)}</strong></li>`).join("")}</ul>` : `<p class="aide">Pas encore d'achat.</p>`}
        </section>
        ${demandes.length ? `<section class="tiroir-section"><h3>Demandes <span class="aide">(${demandes.length})</span></h3><ul class="tiroir-liste tiroir-liste-demandes">${demandes.map((d) => `<li><button type="button" class="lien-bouton" data-crm="demande" data-id="${d.id}">${e(TYPES_DEM[d.type])}${d.sujet ? ` · ${e(d.sujet)}` : ""}</button><span>${date(d.cree_le)}</span><span class="aide">${e(ST_DEM[d.statut])}</span></li>`).join("")}</ul></section>` : ""}
        <details class="coordonnees"><summary>Modifier les coordonnées, les étiquettes, l'accord pour les emails</summary>${formulaireClient(c, false)}</details>
        <p><button type="button" class="lien-bouton danger" data-crm="supprimer-client" data-id="${c.id}">Supprimer la fiche</button></p>
      </div>`,
      c.id
    );
  }

  function ecrire({ email, nom, sujet = "", message = "", apres }) {
    const f = fenetre();
    f.innerHTML = `
      <form method="dialog" class="pile" style="max-width:640px">
        <h2 style="font-size:1.35rem">Email à ${e(nom || email)}</h2>
        <p class="aide">Envoyé depuis l'adresse de la boutique, avec le logo. La réponse du client arrivera dans votre messagerie.</p>
        <div class="champ"><label for="em-sujet">Sujet</label><input id="em-sujet" value="${e(sujet)}" required></div>
        <div class="champ"><label for="em-message">Message</label><textarea id="em-message" rows="9" required>${e(message)}</textarea><small>« Bonjour ${e(String(nom || "").split(" ")[0])}, » et la signature sont ajoutés automatiquement.</small></div>
        <div class="raccourcis"><button class="btn" value="ok">Envoyer</button><button class="btn btn-ligne" value="annuler" formnovalidate>Annuler</button></div>
      </form>`;
    f.querySelector("form").onsubmit = async (ev) => {
      if (ev.submitter?.value !== "ok") return;
      ev.preventDefault();
      ev.submitter.disabled = true;
      try {
        await S().appel(ctx.D, "email_client", { email, nom, sujet: f.querySelector("#em-sujet").value, message: f.querySelector("#em-message").value });
        f.close();
        ctx.toast("Email envoyé.");
        await apres?.();
      } catch (x) {
        ev.submitter.disabled = false;
        ctx.toast(x.message, true);
      }
    };
    if (!f.open) f.showModal();
    f.querySelector("#em-message").focus();
  }

  // =====================================================================
  //  DEMANDES (devis, messages) : boîte de réception
  // =====================================================================
  const fichiersDe = (d) => (Array.isArray(d?.fichiers) ? d.fichiers.filter((f) => f && f.chemin) : []);
  const taille = (o) => (!o ? "" : o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${String(Math.round(o / 104857.6) / 10).replace(".", ",")} Mo`);
  function quand(d) {
    const x = new Date(d);
    const jours = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    if (jours === 0) return x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (jours === 1) return "hier";
    return x.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(jours > 300 ? { year: "numeric" } : {}) });
  }
  function demandesFiltrees() {
    const q = normaliser(etat.qDem.trim());
    return donnees.demandes.filter(BOITES[etat.boite][1]).filter((d) => !q || normaliser(`${d.nom} ${d.email} ${d.tel} ${d.sujet} ${d.message}`).includes(q));
  }
  function vueDemandes() {
    return `
      <section class="bloc crm-bloc">
        <div class="crm-outils">
          <input type="search" data-crm-qdem value="${e(etat.qDem)}" placeholder="Nom, email, sujet, message" aria-label="Rechercher une demande" aria-controls="crm-boite">
          <button class="btn btn-ligne" data-crm="actualiser">Actualiser</button>
        </div>
        <div class="filtres" role="group" aria-label="Boîtes">${Object.entries(BOITES).map(([k, [nom, f]]) => `<button class="filtre" data-crm="boite" data-valeur="${k}" aria-pressed="${etat.boite === k}">${nom} <small>${donnees.demandes.filter(f).length}</small></button>`).join("")}</div>
        <ul class="crm-boite" id="crm-boite">${lignesDemandes()}</ul>
      </section>`;
  }
  function lignesDemandes() {
    const liste = demandesFiltrees();
    return (
      liste
        .map((d) => {
          const n = fichiersDe(d).length;
          const details = [TYPES_DEM[d.type], d.sujet ? surligner(d.sujet, etat.qDem) : "", d.quantite ? `${d.quantite} pièce${d.quantite > 1 ? "s" : ""}` : "", n ? `${n} fichier${n > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
          return `<li><button type="button" class="crm-demande ${d.statut === "nouvelle" ? "non-lue" : ""}" data-crm="demande" data-id="${d.id}" data-ligne-id="${d.id}" ${etat.ouvert === d.id ? 'aria-current="true"' : ""}>
            <span class="crm-demande-haut"><strong>${surligner(d.nom || d.email, etat.qDem)}</strong>${d.statut === "nouvelle" ? `<span class="crm-nouvelle">Nouvelle</span>` : ""}<time datetime="${e(d.cree_le)}">${quand(d.cree_le)}</time></span>
            <span class="crm-demande-sujet">${details}</span>
            ${d.message ? `<span class="crm-demande-extrait">${surligner(d.message.slice(0, 160), etat.qDem)}</span>` : ""}
          </button></li>`;
        })
        .join("") ||
      `<li class="crm-vide">${etat.qDem ? `Aucune demande pour « ${e(etat.qDem)} ».` : etat.boite === "a_repondre" ? "Rien à répondre pour l'instant. Les devis et messages du site arrivent ici." : "Aucune demande dans cette boîte."}</li>`
    );
  }
  const majLignesDemandes = () => {
    const l = zone?.querySelector("#crm-boite");
    if (l) l.innerHTML = lignesDemandes();
  };
  async function changerStatutDemande(d, statut) {
    const { error } = await sb().from("demandes").update({ statut }).eq("id", d.id);
    if (error) return ctx.toast(error.message, true), false;
    d.statut = statut;
    majCompteurDemandes();
    if (vue === "demandes") {
      zone.querySelectorAll('[data-crm="boite"] small').forEach((s) => (s.textContent = donnees.demandes.filter(BOITES[s.parentElement.dataset.valeur][1]).length));
      majLignesDemandes();
    }
    return true;
  }
  function tiroirDemande(id) {
    const d = donnees.demandes.find((x) => x.id === id);
    if (!d) return;
    // Ouvrir une demande nouvelle la passe « à répondre » (la pastille du menu baisse)
    if (d.statut === "nouvelle" && d.type !== "newsletter") changerStatutDemande(d, "en_cours");
    const tel = lien(d.tel);
    const fichiers = fichiersDe(d);
    const repondue = ["repondue", "convertie"].includes(d.statut);
    const prenom = String(d.nom || "").split(" ")[0];
    ouvrirTiroir(
      `${teteTiroir(e(d.sujet || (d.type === "devis" ? "Demande de devis" : d.type === "newsletter" ? "Inscription à la newsletter" : "Message")), `Reçue le ${date(d.cree_le, true)} · ${e(ST_DEM[d.statut === "nouvelle" && d.type !== "newsletter" ? "en_cours" : d.statut])}`, e(TYPES_DEM[d.type]))}
      <div class="tiroir-corps">
        <p class="tiroir-qui"><strong>${e(d.nom || "Sans nom")}</strong>${d.email ? `<a href="mailto:${e(d.email)}">${e(d.email)}</a>` : ""}${d.tel ? `<a href="tel:${e(tel)}">${e(d.tel)}</a>` : ""}${d.quantite ? `<span>Quantité : <strong>${d.quantite}</strong></span>` : ""}${d.client_id ? `<button type="button" class="lien-bouton" data-crm="client" data-id="${d.client_id}">Fiche client</button>` : ""}</p>
        ${d.message ? `<div class="tiroir-message">${e(d.message)}</div>` : ""}
        ${fichiers.length ? `<section class="tiroir-section"><h3>Fichiers joints <span class="aide">(${fichiers.length})</span></h3><ul class="crm-fichiers" data-fichiers="${d.id}">${fichiers.map((f, i) => `<li class="crm-fichier" data-i="${i}"><span class="crm-fichier-apercu">${/^image\//.test(f.type || "") ? "Chargement…" : "PDF"}</span><span class="crm-fichier-nom">${e(f.nom || f.chemin.split("/").pop())}<small>${taille(f.taille)}</small></span></li>`).join("")}</ul></section>` : ""}
        ${d.type !== "newsletter" && d.email ? `
        <form class="tiroir-reponse pile" data-crm-form="reponse" data-id="${d.id}">
          <h3>${repondue ? "Écrire à nouveau" : "Répondre"}</h3>
          <div class="champ"><label for="rp-sujet">Sujet</label><input id="rp-sujet" name="sujet" value="${e(`Votre demande${d.sujet ? ` : ${d.sujet}` : ""} · ${ctx.D.site.nom || "Mon Truc en Bois"}`)}" required></div>
          <div class="champ"><label for="rp-message">Message</label><textarea id="rp-message" name="message" rows="6" required>${repondue ? "" : `Merci pour votre ${d.type === "devis" ? "demande de devis" : "message"}.\n\n`}</textarea><small>« Bonjour${prenom ? ` ${e(prenom)}` : ""}, » et la signature sont ajoutés. Envoyé depuis l'adresse de la boutique ; la réponse du client arrive dans votre messagerie.</small></div>
          <div class="raccourcis"><button class="btn">Envoyer la réponse</button></div>
        </form>` : ""}
        <div class="raccourcis">
          ${d.type !== "newsletter" ? `<button type="button" class="btn btn-ligne" data-crm="convertir" data-id="${d.id}">Transformer en vente</button>` : ""}
          ${d.statut === "archivee" ? `<button type="button" class="btn btn-ligne" data-crm="desarchiver" data-id="${d.id}">Remettre à répondre</button>` : d.type !== "newsletter" ? `<button type="button" class="btn btn-ligne" data-crm="archiver" data-id="${d.id}">Classer</button>` : ""}
        </div>
        <div class="champ">
          <label for="dm-notes-${d.id}">Notes internes</label>
          <textarea id="dm-notes-${d.id}" data-crm-notes-demande="${d.id}" rows="3" placeholder="Prix proposé, délai, maquette envoyée…">${e(d.notes)}</textarea>
          <small class="tiroir-etat" aria-live="polite">Enregistrées dès que vous quittez le champ.</small>
        </div>
      </div>`,
      d.id
    );
    if (fichiers.length) chargerFichiers(d);
  }
  // Fichiers joints (bucket privé photos-clients) : liens temporaires d'une heure, comme les photos des commandes
  async function chargerFichiers(d) {
    const liste = document.querySelector(`#crm-tiroir [data-fichiers="${d.id}"]`);
    if (!liste) return;
    await Promise.all(
      fichiersDe(d).map(async (f, i) => {
        const li = liste.querySelector(`[data-i="${i}"]`);
        const nom = e(f.nom || f.chemin.split("/").pop());
        try {
          const { data, error } = await sb().storage.from("photos-clients").createSignedUrl(f.chemin, 3600);
          if (error) throw error;
          const url = window.MTB_DEMO ? await window.MTB_DEMO.lienPhoto(data.signedUrl) : data.signedUrl; // démo : fichier gardé dans ce navigateur
          const image = /^image\//.test(f.type || "") || /\.(jpe?g|png|webp|gif)$/i.test(f.chemin);
          li.innerHTML = `<a href="${e(url)}" target="_blank" rel="noopener" class="crm-fichier-lien">${image ? `<img src="${e(url)}" alt="${nom}" loading="lazy">` : `<span class="crm-fichier-apercu">PDF</span>`}<span class="crm-fichier-nom">${nom}<small>${taille(f.taille)}${image ? "" : " · ouvrir"}</small></span></a>`;
        } catch {
          li.innerHTML = `<span class="crm-fichier-apercu">Indisponible</span><span class="crm-fichier-nom">${nom}<small>lien impossible à créer</small></span>`;
        }
      })
    );
  }

  // =====================================================================
  //  MARKETING : codes promo et emails aux abonnés
  // =====================================================================
  const libellePromo = (p) => (p.type === "pourcentage" ? `−${String(Number(p.valeur)).replace(".", ",")} %` : `−${euros(p.valeur)}`);
  const promoValide = (p) => {
    const auj = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    if (!p.actif) return [false, "Désactivé"];
    if (p.debut && auj < p.debut) return [false, `À partir du ${date(p.debut)}`];
    if (p.fin && auj > p.fin) return [false, "Expiré"];
    if (p.utilisations_max && p.utilisations >= p.utilisations_max) return [false, "Épuisé"];
    return [true, "Actif"];
  };
  const dateCourte = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  function vueMarketing() {
    const abonnes = donnees.clients.filter((c) => c.consentement_marketing && c.email).length;
    const site = adresseSite();
    // Les codes utilisables d'abord, puis les autres (programmés, expirés, désactivés)
    const promos = [...donnees.promos].sort((a, b) => Number(promoValide(b)[0]) - Number(promoValide(a)[0]));
    return `
      <section class="bloc">
        <div class="bloc-tete"><h2>Codes promo</h2><button class="btn" data-crm="nouveau-code">Nouveau code</button></div>
        <p class="aide">Sur le site, le client saisit un code dans son panier : un seul par commande, remise calculée par le serveur. En caisse, vous pouvez cumuler plusieurs codes et vos propres remises sur la même vente.</p>
        ${promos.length ? `
        <table class="crm-table crm-codes">
          <thead><tr><th scope="col">Code</th><th scope="col">Remise</th><th scope="col">Conditions</th><th scope="col">Période</th><th scope="col" class="n">Utilisations</th><th scope="col">État</th><th scope="col"><span class="cs-annonce">Actions</span></th></tr></thead>
          <tbody>
            ${promos
              .map((p) => {
                const [ok, txt] = promoValide(p);
                const periode = p.debut && p.fin ? `du ${dateCourte(p.debut)} au ${dateCourte(p.fin)}` : p.debut ? `à partir du ${dateCourte(p.debut)}` : p.fin ? `jusqu'au ${dateCourte(p.fin)}` : "sans limite";
                return `<tr class="${ok ? "" : "crm-inactif"}">
                  <td class="crm-col-nom"><span class="crm-code">${e(p.code)}</span><span class="crm-sous">${e(p.description) || "sans description"}</span></td>
                  <td class="crm-remise">${libellePromo(p)}</td>
                  <td data-label="Conditions">${Number(p.minimum) ? `dès ${euros(p.minimum)} d'achat` : `<span class="aide">aucune</span>`}</td>
                  <td data-label="Période">${periode}</td>
                  <td class="n" data-label="Utilisations">${p.utilisations || 0}${p.utilisations_max ? ` / ${p.utilisations_max}` : ""}</td>
                  <td><span class="crm-etat ${ok ? "ok" : txt.startsWith("À partir") ? "bientot" : ""}">${txt}</span></td>
                  <td class="crm-actions">
                    <button class="mini" data-crm="modifier-code" data-code="${e(p.code)}">Modifier</button>
                    <button class="mini" data-crm="basculer-code" data-code="${e(p.code)}">${p.actif ? "Désactiver" : "Activer"}</button>
                    <details class="plus-actions">
                      <summary class="mini" aria-label="Plus d'actions pour ${e(p.code)}">…</summary>
                      <div class="plus-menu">
                        <button data-crm="partager-code" data-code="${e(p.code)}">Copier un texte à partager</button>
                        <button class="danger" data-crm="supprimer-code" data-code="${e(p.code)}">Supprimer le code</button>
                      </div>
                    </details>
                  </td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>` : `<p class="aide" style="padding:1rem 0">Aucun code pour l'instant. Un code de bienvenue (par exemple BIENVENUE10) est un bon début.</p>`}
      </section>

      <section class="bloc">
        <div class="bloc-tete"><h2>Email aux abonnés <span class="aide">(${abonnes} abonné${abonnes > 1 ? "s" : ""})</span></h2></div>
        <p class="aide">Nouveautés, idées cadeaux avant une fête, code promo… Envoyé uniquement aux clients qui l'ont accepté, avec un lien de désinscription. Offre gratuite Brevo : 300 emails par jour (emails des commandes compris).</p>
        <form class="pile" data-crm-form="campagne">
          <div class="champ"><label for="ca-sujet">Sujet</label><input id="ca-sujet" name="sujet" required placeholder="Fête des mères : nos idées cadeaux personnalisées"></div>
          <div class="champ"><label for="ca-message">Message</label><textarea id="ca-message" name="message" rows="7" required placeholder="Pour la fête des mères, offrez une planche gravée à son prénom…&#10;&#10;Avec le code MAMAN10, profitez de 10 % de remise jusqu'au 25 mai."></textarea></div>
          <div class="grille-champs">
            <div class="champ"><label for="ca-lien">Bouton vers</label><select id="ca-lien" name="lien">
              <option value="">Pas de bouton</option>
              <option value="${e(site)}boutique.html">La boutique</option>
              <option value="${e(site)}idees-cadeaux.html">Les idées cadeaux</option>
              ${ctx.D.occasions.map((o) => `<option value="${e(site)}boutique.html?occasion=${e(o.id)}">Occasion : ${e(o.nom)}</option>`).join("")}
              ${ctx.D.produits.filter((p) => p.visible !== false).map((p) => `<option value="${e(site)}produit.html?id=${e(p.id)}">Produit : ${e(p.nom)}</option>`).join("")}
            </select></div>
            <div class="champ"><label for="ca-texte">Texte du bouton</label><input id="ca-texte" name="texte_lien" placeholder="Voir les idées fête des mères"></div>
          </div>
          <div class="raccourcis">
            <button class="btn btn-ligne" value="essai">M'envoyer un essai</button>
            <button class="btn" value="envoyer" ${abonnes ? "" : "disabled"}>Envoyer à ${abonnes} abonné${abonnes > 1 ? "s" : ""}</button>
          </div>
        </form>
        ${donnees.campagnes.length ? `<h3 style="margin-top:1.2rem">Déjà envoyés</h3><div class="liste">${donnees.campagnes.map((c) => `<div class="ligne ligne-simple"><span class="ligne-texte"><strong>${e(c.sujet)}</strong><span>${date(c.cree_le, true)} · ${c.destinataires} destinataire${c.destinataires > 1 ? "s" : ""}</span></span><button class="mini" data-crm="reprendre-campagne" data-id="${c.id}">Réutiliser</button></div>`).join("")}</div>` : ""}
      </section>

      <section class="bloc">
        <div class="bloc-tete"><h2>Autres outils</h2></div>
        <div class="raccourcis">
          <button class="btn btn-ligne" data-crm="export-abonnes">Exporter les abonnés (tableur)</button>
          <button class="btn btn-ligne" data-aller="avis">Carte QR « Laissez-nous un avis »</button>
          <button class="btn btn-ligne" data-aller="textes">Annonce en haut du site</button>
        </div>
      </section>`;
  }
  function ficheCode(code) {
    const p = code ? donnees.promos.find((x) => x.code === code) : { code: "", description: "", type: "pourcentage", valeur: 10, minimum: 0, debut: "", fin: "", utilisations_max: null, actif: true };
    const f = fenetre();
    // Réglages groupés : le code, la remise, les conditions, la période
    f.innerHTML = `
      <form method="dialog" class="pile crm-fiche-code">
        <h2 style="font-size:1.6rem">${code ? `Code ${e(code)}` : "Nouveau code promo"}</h2>
        <fieldset><legend>Le code</legend><div class="grille-champs">
          <div class="champ"><label for="cp-code">Code</label><input id="cp-code" name="code" value="${e(p.code)}" ${code ? "readonly" : ""} required pattern="[A-Za-z0-9_\\-]{3,30}" placeholder="NOEL10" style="text-transform:uppercase" autocomplete="off"><small>3 à 30 lettres ou chiffres, sans espace.${code ? " Ne peut plus changer." : ""}</small></div>
          <div class="champ"><label for="cp-desc">Description vue par le client</label><input id="cp-desc" name="description" value="${e(p.description)}" placeholder="10 % pour Noël" maxlength="120"></div>
        </div></fieldset>
        <fieldset><legend>La remise</legend><div class="grille-champs">
          <div class="champ"><label for="cp-valeur">Valeur</label><span class="avec-unite"><input id="cp-valeur" name="valeur" type="number" step="0.01" min="0.01" value="${Number(p.valeur)}" required><select name="type" aria-label="Unité"><option value="pourcentage" ${p.type === "pourcentage" ? "selected" : ""}>%</option><option value="montant" ${p.type === "montant" ? "selected" : ""}>€</option></select></span></div>
          <div class="champ"><label for="cp-min">Dès un achat de (€)</label><input id="cp-min" name="minimum" type="number" step="0.01" min="0" value="${Number(p.minimum) || ""}" placeholder="aucun minimum"></div>
        </div></fieldset>
        <fieldset><legend>Utilisation</legend><div class="grille-champs">
          <div class="champ"><label for="cp-debut">Valable du</label><input id="cp-debut" name="debut" type="date" value="${e(p.debut || "")}"></div>
          <div class="champ"><label for="cp-fin">Au (inclus)</label><input id="cp-fin" name="fin" type="date" value="${e(p.fin || "")}"></div>
          <div class="champ"><label for="cp-max">Nombre d'utilisations au plus</label><input id="cp-max" name="utilisations_max" type="number" min="1" value="${p.utilisations_max ?? ""}" placeholder="illimité">${code ? `<small>Déjà utilisé ${p.utilisations || 0} fois.</small>` : ""}</div>
          <label class="case"><input type="checkbox" name="actif" ${p.actif ? "checked" : ""}> <span>Actif</span></label>
        </div></fieldset>
        <div class="raccourcis"><button class="btn" value="ok">Enregistrer</button><button class="btn btn-ligne" value="annuler" formnovalidate>Annuler</button></div>
      </form>`;
    f.querySelector("form").onsubmit = async (ev) => {
      if (ev.submitter?.value !== "ok") return;
      ev.preventDefault();
      const x = Object.fromEntries(new FormData(ev.target));
      const fiche = {
        description: x.description.trim(),
        type: x.type,
        valeur: Number(x.valeur),
        minimum: Number(x.minimum || 0),
        utilisations_max: x.utilisations_max ? Number(x.utilisations_max) : null,
        debut: x.debut || null,
        fin: x.fin || null,
        actif: !!x.actif,
      };
      if (fiche.type === "pourcentage" && fiche.valeur > 100) return ctx.toast("Un pourcentage ne peut pas dépasser 100 %.", true);
      if (fiche.debut && fiche.fin && fiche.fin < fiche.debut) return ctx.toast("La date de fin est avant la date de début.", true);
      const r = code
        ? await sb().from("codes_promo").update(fiche).eq("code", code).select().single()
        : await sb().from("codes_promo").insert({ ...fiche, code: x.code.trim().toUpperCase() }).select().single();
      if (r.error) return ctx.toast(/duplicate|unique|existe/i.test(r.error.message) ? "Ce code existe déjà." : r.error.message, true);
      if (code) Object.assign(p, r.data);
      else donnees.promos.unshift(r.data);
      f.close();
      ctx.toast("Code enregistré.");
      afficher();
    };
    if (!f.open) f.showModal();
  }
  async function copier(texte) {
    try {
      await navigator.clipboard.writeText(texte);
      ctx.toast("Texte copié : collez-le sur Facebook, Instagram ou WhatsApp.");
    } catch {
      prompt("Copiez ce texte :", texte);
    }
  }

  // =====================================================================
  //  Statistiques du tableau de bord
  // =====================================================================
  async function statistiques(el, contexte) {
    ctx = contexte;
    if (!el || !S().client(ctx.D) || !(await S().connecte(ctx.D).catch(() => false))) return;
    const [stats, nbClients] = await Promise.all([sb().from("stats_ventes").select("*"), sb().from("clients").select("id", { count: "exact", head: true })]);
    if (stats.error) return;
    const mois = (decalage) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - decalage);
      return d.toLocaleDateString("sv-SE").slice(0, 7);
    };
    const parMois = {};
    for (const s of stats.data) {
      const m = String(s.mois).slice(0, 7);
      const x = (parMois[m] ??= { ca: 0, n: 0, encaisse: 0, canaux: {} });
      x.ca += Number(s.chiffre_affaires);
      x.n += s.commandes;
      x.encaisse += Number(s.encaisse);
      x.canaux[s.canal] = (x.canaux[s.canal] || 0) + Number(s.chiffre_affaires);
    }
    const ce = parMois[mois(0)] || { ca: 0, n: 0, encaisse: 0, canaux: {} };
    const avant = parMois[mois(1)] || { ca: 0 };
    const douze = Array.from({ length: 12 }, (_, i) => mois(11 - i));
    const max = Math.max(1, ...douze.map((m) => parMois[m]?.ca || 0));
    const annee = douze.reduce((t, m) => t + (parMois[m]?.ca || 0), 0);
    const canauxAnnee = {};
    douze.forEach((m) => Object.entries(parMois[m]?.canaux || {}).forEach(([k, v]) => (canauxAnnee[k] = (canauxAnnee[k] || 0) + v)));
    el.innerHTML = `
      <div class="bloc-tete"><h2>Vos ventes</h2></div>
      <div class="chiffres-admin" style="margin:0 0 1rem">
        <div class="chiffre"><strong>${euros(ce.ca)}</strong><span>chiffre d'affaires ce mois-ci, dont ${euros(ce.encaisse)} encaissés${avant.ca ? ` · mois dernier : ${euros(avant.ca)}` : ""}</span></div>
        <div class="chiffre"><strong>${ce.n}</strong><span>ventes ce mois-ci</span></div>
        <div class="chiffre"><strong>${euros(ce.n ? ce.ca / ce.n : 0)}</strong><span>panier moyen</span></div>
        <div class="chiffre"><strong>${nbClients.count ?? 0}</strong><span>clients dans le fichier</span></div>
      </div>
      <div class="graphe" role="img" aria-label="Chiffre d'affaires des 12 derniers mois">
        ${douze.map((m) => `<div class="barre-mois" title="${new Date(m + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} : ${euros(parMois[m]?.ca || 0)}"><span style="height:${Math.round(((parMois[m]?.ca || 0) / max) * 100)}%"></span><small>${new Date(m + "-01").toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</small></div>`).join("")}
      </div>
      <p class="aide">Ventes du site, de la boutique, du téléphone et des salons, hors commandes annulées ou remboursées. 12 derniers mois : <strong>${euros(annee)}</strong>${Object.keys(canauxAnnee).length ? " · " + Object.entries(canauxAnnee).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${CANAUX_STATS[k] || k} ${Math.round((v / (annee || 1)) * 100)} %`).join(" · ") : ""}</p>`;
    el.hidden = false;
  }

  // =====================================================================
  //  Événements
  // =====================================================================
  const dansZone = (el) => zone && vue !== "caisse" && (zone.contains(el) || fenetre().contains(el) || tiroir().contains(el));
  // Le tiroir se referme quand on change d'onglet
  document.addEventListener("click", (ev) => {
    if (ev.target.closest(".onglets [data-onglet], .barre-mobile [data-onglet], [data-aller]")) fermerTiroir(false);
  }, true);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && document.getElementById("crm-tiroir")?.open && !fenetre().open && !ev.target.closest?.(".plus-actions[open]")) {
      ev.preventDefault();
      fermerTiroir();
    }
  });

  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-crm]");
    if (!b || !dansZone(b)) return;
    const a = b.dataset.crm;
    const v = b.dataset.valeur;
    if (a === "fermer-tiroir") return fermerTiroir();
    if (a === "segment") etat.segment = v;
    if (a === "etiquette") etat.etiquette = etat.etiquette === v ? "" : v;
    if (a === "trier") etat.tri = { col: v, sens: etat.tri.col === v ? -etat.tri.sens : v === "nom" ? 1 : -1 };
    if (a === "boite") etat.boite = v;
    if (["segment", "etiquette", "trier", "boite"].includes(a)) {
      afficher();
      return zone.querySelector(`[data-crm="${a}"][data-valeur="${CSS.escape(v)}"]`)?.focus();
    }
    if (a === "actualiser") return monter(vue, zone, ctx);
    if (a === "client") {
      if (!donnees.commandes.length && vue !== "clients") donnees.commandes = await LECTEURS.commandes().catch(() => []);
      return tiroirClient(b.dataset.id);
    }
    if (a === "nouveau-client") return tiroirClient(null);
    if (a === "ecrire") {
      const c = donnees.clients.find((x) => x.id === b.dataset.id);
      return ecrire({ email: c.email, nom: c.nom });
    }
    if (a === "vendre") {
      const choisi = donnees.clients.find((x) => x.id === b.dataset.id);
      fermerTiroir(false);
      window.AdminCaisse.preparer({ clientId: b.dataset.id, consentement: !!choisi?.consentement_marketing, adresse: choisi?.adresse || "" });
      return ctx.allerA("caisse");
    }
    if (a === "supprimer-client") {
      const c = donnees.clients.find((x) => x.id === b.dataset.id);
      if (!confirm(`Supprimer définitivement la fiche de ${c.nom} ? Ses commandes sont conservées (obligation comptable), sans lien vers la fiche.`)) return;
      const { error } = await sb().from("clients").delete().eq("id", c.id);
      if (error) return ctx.toast(error.message, true);
      donnees.clients = donnees.clients.filter((x) => x.id !== c.id);
      fermerTiroir(false);
      ctx.toast("Fiche supprimée.");
      return afficher();
    }
    if (a === "export-clients" || a === "export-abonnes") {
      const st = statsClients();
      const liste = a === "export-abonnes" ? donnees.clients.filter((c) => c.consentement_marketing && c.email) : donnees.clients;
      return exporterCsv(a === "export-abonnes" ? "abonnes" : "clients", ["Nom", "Email", "Téléphone", "Adresse", "Étiquettes", "Abonné", "Achats", "Total dépensé", "Dernier achat", "Client depuis", "Source", "Notes"],
        liste.map((c) => { const s = st(c.id); return [c.nom, c.email, c.tel, c.adresse, (c.etiquettes || []).join(", "), c.consentement_marketing ? "oui" : "non", s.n, String(arrondi(s.total)).replace(".", ","), date(s.derniere), date(c.cree_le), SOURCES[c.source] || c.source, c.notes]; }));
    }
    if (a === "demande") {
      if (!donnees.demandes.length && vue !== "demandes") donnees.demandes = await LECTEURS.demandes().catch(() => []);
      return tiroirDemande(b.dataset.id);
    }
    if (a === "archiver" || a === "desarchiver") {
      const d = donnees.demandes.find((x) => x.id === b.dataset.id);
      if (!(await changerStatutDemande(d, a === "archiver" ? "archivee" : "en_cours"))) return;
      ctx.toast(a === "archiver" ? "Demande classée." : "Demande remise dans « À répondre ».");
      return a === "archiver" ? fermerTiroir() : tiroirDemande(d.id);
    }
    if (a === "convertir") {
      const d = donnees.demandes.find((x) => x.id === b.dataset.id);
      fermerTiroir(false);
      const fiche = donnees.clients.find((x) => x.id === d.client_id);
      window.AdminCaisse.preparer({
        clientId: fiche ? fiche.id : "",
        nouveau: fiche ? null : { nom: d.nom, email: d.email, tel: d.tel },
        consentement: !!fiche?.consentement_marketing,
        canal: "telephone",
        notes: [d.sujet, d.message].filter(Boolean).join(" · ").slice(0, 1500),
        demandeId: d.id,
      });
      ctx.toast("Ajoutez les articles puis enregistrez : la demande passera en « Devenue commande ».");
      return ctx.allerA("caisse");
    }

    if (a === "nouveau-code") return ficheCode(null);
    if (a === "modifier-code") return ficheCode(b.dataset.code);
    if (a === "basculer-code" || a === "supprimer-code") {
      const p = donnees.promos.find((x) => x.code === b.dataset.code);
      if (a === "supprimer-code") {
        if (!confirm(`Supprimer le code ${p.code} ? Les ventes qui l'ont utilisé le gardent.`)) return;
        const { error } = await sb().from("codes_promo").delete().eq("code", p.code);
        if (error) return ctx.toast(error.message, true);
        donnees.promos = donnees.promos.filter((x) => x !== p);
      } else {
        const { error } = await sb().from("codes_promo").update({ actif: !p.actif }).eq("code", p.code);
        if (error) return ctx.toast(error.message, true);
        p.actif = !p.actif;
      }
      return afficher();
    }
    if (a === "partager-code") {
      const p = donnees.promos.find((x) => x.code === b.dataset.code);
      const site = adresseSite();
      return copier(`${p.description || "Offre spéciale"} chez Mon Truc en Bois ! Avec le code ${p.code}, profitez de ${p.type === "pourcentage" ? `${Number(p.valeur)} % de remise` : `${euros(p.valeur)} de remise`}${Number(p.minimum) ? ` dès ${euros(p.minimum)} d'achat` : ""}${p.fin ? ` jusqu'au ${new Date(p.fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}. Cadeaux personnalisés gravés à Auchel ${site}boutique.html`);
    }
    if (a === "reprendre-campagne") {
      const c = donnees.campagnes.find((x) => x.id === b.dataset.id);
      zone.querySelector("#ca-sujet").value = c.sujet;
      zone.querySelector("#ca-message").value = c.message;
      zone.querySelector("#ca-lien").value = c.lien;
      zone.querySelector("#ca-texte").value = c.texte_lien || "";
      zone.querySelector("#ca-sujet").focus();
    }
  });

  // Recherche instantanée : seule la liste est redessinée, le champ garde le focus
  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!dansZone(el)) return;
    if (el.dataset.crmQ !== undefined) {
      etat.q = el.value;
      return majLignesClients();
    }
    if (el.dataset.crmQdem !== undefined) {
      etat.qDem = el.value;
      return majLignesDemandes();
    }
  });
  // Notes d'une fiche client ou d'une demande : enregistrées en quittant le champ
  document.addEventListener("change", async (ev) => {
    const el = ev.target;
    if (!dansZone(el)) return;
    const idClient = el.dataset.crmNotes;
    const idDemande = el.dataset.crmNotesDemande;
    if (!idClient && !idDemande) return;
    const fiche = idClient ? donnees.clients.find((x) => x.id === idClient) : donnees.demandes.find((x) => x.id === idDemande);
    const notes = el.value.trim();
    const { error } = await sb().from(idClient ? "clients" : "demandes").update({ notes }).eq("id", fiche.id);
    const statut = el.parentElement.querySelector(".tiroir-etat");
    if (error) return ctx.toast(error.message, true);
    fiche.notes = notes;
    if (statut) statut.textContent = `Notes enregistrées à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`;
  });
  document.addEventListener("submit", async (ev) => {
    const f = ev.target;
    if (!dansZone(f)) return;
    if (f.dataset.crmForm === "client") {
      ev.preventDefault();
      const id = f.dataset.id;
      const c = id ? donnees.clients.find((x) => x.id === id) : {};
      const x = Object.fromEntries(new FormData(f));
      const email = String(x.email || "").trim().toLowerCase();
      const fiche = {
        nom: String(x.nom).trim(),
        email: email || null,
        tel: String(x.tel || "").trim(),
        adresse: String(x.adresse || "").trim(),
        etiquettes: [...new Set(String(x.etiquettes || "").split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))],
        consentement_marketing: !!x.consentement,
        ...(id ? {} : { source: x.source, notes: String(x.notes || "").trim() }),
      };
      if (!!x.consentement !== !!c.consentement_marketing) fiche.consentement_le = new Date().toISOString();
      const r = id ? await sb().from("clients").update(fiche).eq("id", id).select().single() : await sb().from("clients").insert(fiche).select().single();
      if (r.error) return ctx.toast(/duplicate|unique/i.test(r.error.message) ? "Un autre client a déjà cet email." : r.error.message, true);
      if (id) Object.assign(c, r.data);
      else donnees.clients.unshift(r.data);
      ctx.toast(id ? "Fiche enregistrée." : "Fiche créée.");
      if (vue === "clients") afficher();
      return tiroirClient(r.data.id);
    }
    if (f.dataset.crmForm === "reponse") {
      ev.preventDefault();
      const d = donnees.demandes.find((x) => x.id === f.dataset.id);
      const bouton = f.querySelector("button");
      bouton.disabled = true;
      try {
        await S().appel(ctx.D, "email_client", { email: d.email, nom: d.nom, sujet: f.querySelector("#rp-sujet").value, message: f.querySelector("#rp-message").value });
        if (d.statut !== "convertie") await changerStatutDemande(d, "repondue");
        ctx.toast(`Réponse envoyée à ${d.email}.`);
        tiroirDemande(d.id);
      } catch (x) {
        bouton.disabled = false;
        ctx.toast(x.message, true);
      }
      return;
    }
    if (f.dataset.crmForm === "campagne") {
      ev.preventDefault();
      const essai = ev.submitter?.value === "essai";
      const x = Object.fromEntries(new FormData(f));
      const n = donnees.clients.filter((c) => c.consentement_marketing && c.email).length;
      if (!essai && !confirm(`Envoyer « ${x.sujet} » à ${n} abonné${n > 1 ? "s" : ""} ? Conseil : envoyez-vous d'abord un essai.`)) return;
      ev.submitter.disabled = true;
      try {
        const r = await S().appel(ctx.D, "campagne", { ...x, essai });
        if (essai) ctx.toast(`Essai envoyé à ${r.a}. Vérifiez votre boîte de réception.`);
        else {
          ctx.toast(`Email envoyé à ${r.envoyes} abonné${r.envoyes > 1 ? "s" : ""}${r.raison ? ` (arrêt : ${r.raison})` : ""}.`, !!r.raison);
          donnees.campagnes = await lire("campagnes").catch(() => donnees.campagnes);
          afficher();
        }
      } catch (err) {
        ctx.toast(err.message, true);
      } finally {
        if (ev.submitter) ev.submitter.disabled = false;
      }
    }
  });

  window.AdminCRM = { monter, statistiques };
})();
