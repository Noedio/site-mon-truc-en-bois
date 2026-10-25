// Caisse de l'admin : vente en boutique, commande prise par téléphone ou sur un salon (serveur Supabase requis).
//   Parcours : articles (recherche, catégories) → ticket (client, quantités, options, personnalisation, note, remises,
//   codes promo) → encaissement (carte, espèces avec rendu, chèque, plusieurs moyens) ou « à régler plus tard »
//   → ticket à imprimer ou à envoyer par email → nouvelle vente.
//   Remises : plusieurs sur une ligne ou sur le ticket, en % ou en €, et plusieurs codes promo, cumulés dans cet ordre
//   (le même que le serveur, qui recalcule tout) : remises de ligne, puis remises du ticket, puis codes promo.
//   Chaque remise porte sur ce qui reste à payer à son tour et ne peut pas le dépasser : jamais de total négatif.
//   Chargé avant admin-crm.js, qui l'affiche dans l'onglet Caisse et lui passe ses données (AdminCaisse.monter).
(function () {
  let o = null; // outils et données partagés par admin-crm.js
  let zone = null;
  let dernierCanal = "boutique"; // un jour de salon, chaque nouvelle vente repart de « Salon / marché »
  let numero = 0;
  const nouvelleCle = () => `c${++numero}`;
  const nouvelleVente = () => ({ lignes: [], remises: [], codes: [], clientId: "", nouveau: null, consentement: false, canal: dernierCanal, reception: "retrait", port: 0, adresse: "", date: "", notes: "", demandeId: "", ajout: "", options: false, fini: null });
  let vente = nouvelleVente();
  const filtre = { q: "", categorie: "" };
  const combo = { q: "", ouvert: false, actif: -1 };
  let paiement = null; // fenêtre d'encaissement : { mode, recu, parts }

  const e = (s) => o.ctx.echapper(s);
  const euros = (n) => o.ctx.euros(n);
  const arrondi = (n) => Math.round(Number(n || 0) * 100) / 100;
  const fenetre = () => document.getElementById("fenetre");
  const produit = (id) => (id ? o.ctx.D.produits.find((p) => p.id === id) : null);
  const clientChoisi = () => o.donnees.clients.find((c) => c.id === vente.clientId);
  const sansEmail = (email) => !email || email.endsWith(".invalid");
  // Assujetti à la TVA : les paiements en espèces doivent passer par un logiciel de caisse certifié (art. 286 du CGI).
  const especesInterdites = () => o.ctx.D.site.legal?.regimeTva === "assujetti";
  const ICO_X = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  const surTactile = () => matchMedia("(hover: none)").matches;

  // =====================================================================
  //  Calcul du ticket (même ordre que le serveur)
  // =====================================================================
  function totaux() {
    const lignes = vente.lignes.map((l) => ({ ...l, total: arrondi(arrondi(l.prix) * l.quantite) }));
    const sous = arrondi(lignes.reduce((t, l) => t + l.total, 0));
    const restes = new Map(lignes.map((l) => [l.cle, l.total]));
    const montant = (mode, valeur, base) => arrondi(Math.min(base, mode === "pourcent" ? (base * Number(valeur)) / 100 : Number(valeur)));
    const detail = [];
    for (const r of vente.remises.filter((x) => x.portee === "ligne")) {
      const m = montant(r.mode, r.valeur, restes.get(r.ligne) ?? 0);
      restes.set(r.ligne, arrondi((restes.get(r.ligne) ?? 0) - m));
      detail.push({ ...r, montant: m });
    }
    let reste = arrondi([...restes.values()].reduce((t, x) => t + x, 0));
    for (const r of vente.remises.filter((x) => x.portee === "ticket")) {
      const m = montant(r.mode, r.valeur, reste);
      reste = arrondi(reste - m);
      detail.push({ ...r, montant: m });
    }
    for (const p of vente.codes) {
      const m = montant(p.type === "pourcentage" ? "pourcent" : "euros", p.valeur, reste);
      reste = arrondi(reste - m);
      detail.push({ cle: `code-${p.code}`, portee: "code", code: p.code, mode: p.type === "pourcentage" ? "pourcent" : "euros", valeur: Number(p.valeur), montant: m });
    }
    const remise = arrondi(detail.reduce((t, r) => t + r.montant, 0));
    const port = vente.reception === "livraison" ? arrondi(vente.port) : 0;
    return { lignes, sous, detail, remise, port, total: arrondi(Math.max(0, sous - remise + port)), articles: vente.lignes.reduce((t, l) => t + l.quantite, 0) };
  }
  const valeurRemise = (r) => (r.mode === "pourcent" ? `−${String(Number(r.valeur)).replace(".", ",")} %` : `−${euros(r.valeur)}`);
  function libelleRemise(r) {
    if (r.portee === "code") return `Code ${r.code} (${valeurRemise(r)})`;
    if (r.portee === "ligne") return `${r.libelle || "Remise"} sur ${vente.lignes.find((l) => l.cle === r.ligne)?.nom || "un article"}${r.mode === "pourcent" ? ` (${valeurRemise(r)})` : ""}`;
    return `${r.libelle || "Remise sur le ticket"}${r.mode === "pourcent" ? ` (${valeurRemise(r)})` : ""}`;
  }

  // =====================================================================
  //  Affichage
  // =====================================================================
  // Remplace une partie de l'écran en gardant le champ en cours de saisie (repéré par data-focus) et son curseur
  function majPartie(id, html) {
    const el = zone?.querySelector(`#${id}`);
    if (!el) return;
    const actif = document.activeElement;
    const repere = el.contains(actif) ? actif.dataset.focus : null;
    let selection = null;
    try {
      selection = repere && actif.selectionStart != null ? [actif.selectionStart, actif.selectionEnd] : null;
    } catch {}
    el.innerHTML = html;
    if (!repere) return;
    const n = el.querySelector(`[data-focus="${repere}"]`);
    if (!n) return;
    n.focus({ preventScroll: true });
    try {
      if (selection) n.setSelectionRange(...selection);
    } catch {}
  }
  function annoncer(texte) {
    const a = zone?.querySelector("#cs-annonce");
    if (a) a.textContent = texte;
  }

  function vue() {
    if (vente.fini) return vueFinie();
    return `
      <div class="cs">
        <section class="cs-articles" aria-label="Articles">
          <div class="cs-recherche">
            <input type="search" id="cs-q" data-focus="q" value="${e(filtre.q)}" placeholder="Rechercher un produit" aria-label="Rechercher un produit par son nom ou son n° de pièce" aria-controls="cs-tuiles" aria-keyshortcuts="/" autocomplete="off">
          </div>
          <div class="filtres cs-categories" id="cs-categories" role="group" aria-label="Catégories">${categoriesHtml()}</div>
          <div class="cs-tuiles" id="cs-tuiles">${tuilesHtml()}</div>
          <details class="cs-libre">
            <summary>Article hors catalogue</summary>
            <form class="cs-libre-form" data-cs-form="libre">
              <input name="nom" placeholder="Désignation (ex. : gravure plaque de porte)" required aria-label="Désignation" maxlength="160">
              <span class="cs-prix-libre"><input name="prix" type="number" step="0.01" min="0" placeholder="Prix" required aria-label="Prix unitaire en euros"><span aria-hidden="true">€</span></span>
              <button class="btn btn-ligne">Ajouter</button>
            </form>
          </details>
          <p class="cs-raccourcis aide"><kbd>/</kbd> produit · <kbd>C</kbd> client · <kbd>R</kbd> remise · <kbd>P</kbd> code promo · <kbd>Ctrl</kbd>+<kbd>Entrée</kbd> encaisser · <kbd>Échap</kbd> fermer</p>
        </section>

        <section class="cs-ticket" id="cs-ticket" aria-label="Ticket">
          <div class="cs-client" id="cs-client">${clientHtml()}</div>
          <div class="cs-defile">
            <ol class="cs-lignes" id="cs-lignes" aria-label="Articles du ticket">${lignesHtml()}</ol>
            <div class="cs-ajouts" id="cs-ajouts">${ajoutsHtml()}</div>
            <div id="cs-options">${optionsHtml()}</div>
          </div>
          <div class="cs-pied" id="cs-pied">${piedHtml()}</div>
        </section>
      </div>
      <p class="cs-annonce" id="cs-annonce" aria-live="polite"></p>
      <a class="caisse-barre" id="cs-barre" href="#cs-ticket" ${vente.lignes.length ? "" : "hidden"}>${barreHtml()}</a>`;
  }
  function afficher() {
    if (!zone || !document.contains(zone)) return;
    zone.innerHTML = vue();
    if (vente.fini) {
      scrollTo(0, 0); // le rendu de monnaie d'abord
      return zone.querySelector('[data-cs="nouvelle"]')?.focus({ preventScroll: true });
    }
    // Téléphone : la barre « Ticket » s'efface quand le pied du ticket (total, encaisser) est à l'écran
    const barre = zone.querySelector("#cs-barre");
    const pied = zone.querySelector("#cs-pied");
    if (barre && pied && "IntersectionObserver" in window) new IntersectionObserver(([x]) => barre.classList.toggle("cachee", x.isIntersecting)).observe(pied);
  }
  // Après un changement du ticket : tout ce qui en dépend, sans toucher à la colonne des articles
  function majTicket() {
    majPartie("cs-client", clientHtml());
    majPartie("cs-lignes", lignesHtml());
    majPartie("cs-ajouts", ajoutsHtml());
    majPartie("cs-options", optionsHtml());
    majMontants();
    majPartie("cs-tuiles", tuilesHtml());
  }
  // Pendant la saisie d'un prix ou d'une quantité : seulement les montants
  function majMontants() {
    const t = totaux();
    majPartie("cs-pied", piedHtml(t));
    for (const l of t.lignes) {
      const x = zone.querySelector(`[data-total="${l.cle}"]`);
      if (x) x.textContent = euros(l.total);
    }
    for (const r of t.detail.filter((x) => x.portee === "ligne")) {
      const x = zone.querySelector(`[data-montant-remise="${r.cle}"]`);
      if (x) x.textContent = `−${euros(r.montant)}`;
    }
    const barre = zone.querySelector("#cs-barre");
    if (barre) {
      barre.hidden = !vente.lignes.length;
      barre.innerHTML = barreHtml(t);
    }
  }
  const barreHtml = (t = totaux()) => `<span>Ticket · ${t.articles} article${t.articles > 1 ? "s" : ""}</span><strong>${euros(t.total)}</strong>`;

  // ---------- Articles ----------
  const vendables = () => o.ctx.D.produits.filter((p) => p.visible !== false);
  function produitsFiltres() {
    const q = o.normaliser(filtre.q.trim());
    const chiffres = q.replace(/\D/g, "");
    return vendables().filter(
      (p) => (!filtre.categorie || p.categorie === filtre.categorie) && (!q || o.normaliser(p.nom).includes(q) || (chiffres && /^\d+$/.test(q.replace(/^n°?\s*/, "")) && String(p.numero || "") === String(Number(chiffres))))
    );
  }
  function categoriesHtml() {
    const tout = vendables();
    const bouton = (id, nom, n) => `<button type="button" class="filtre" data-cs="categorie" data-valeur="${e(id)}" aria-pressed="${filtre.categorie === id}" data-focus="cat-${e(id)}">${e(nom)} <small>${n}</small></button>`;
    return bouton("", "Tout", tout.length) + o.ctx.D.categories.map((c) => [c, tout.filter((p) => p.categorie === c.id).length]).filter(([, n]) => n).map(([c, n]) => bouton(c.id, c.nom, n)).join("");
  }
  function tuilesHtml() {
    const liste = produitsFiltres();
    const dans = (id) => vente.lignes.filter((l) => l.id === id).reduce((t, l) => t + l.quantite, 0);
    return (
      liste
        .map((p) => {
          const img = p.images?.[0] || p.image;
          const supplement = (p.variantes?.choix || []).some((c) => Number(c.prix) > 0);
          const n = dans(p.id);
          return `<button type="button" class="cs-tuile" data-cs="ajouter" data-id="${e(p.id)}" data-focus="t-${e(p.id)}" aria-label="Ajouter ${e(p.nom)}, ${euros(p.prix)}${n ? `, ${n} déjà sur le ticket` : ""}">
            ${img ? `<img src="${e(o.ctx.srcImage ? o.ctx.srcImage(img) : img)}" alt="" loading="lazy" width="160" height="120">` : `<span class="cs-sans-photo">Sans photo</span>`}
            <span class="cs-tuile-nom">${o.surligner(p.nom, filtre.q)}</span>
            <span class="cs-tuile-prix">${supplement ? "dès " : ""}${euros(p.prix)}${p.dispo === "epuise" ? ` <small>épuisé</small>` : ""}</span>
            ${n ? `<span class="cs-tuile-n" aria-hidden="true">× ${n}</span>` : ""}
          </button>`;
        })
        .join("") || `<p class="aide cs-vide">Aucun produit ${filtre.q ? `pour « ${e(filtre.q)} »` : "dans cette catégorie"}. Ajoutez-le comme article hors catalogue, en bas de la liste.</p>`
    );
  }
  function ajouterProduit(id) {
    const p = produit(id);
    if (!p) return;
    const choix = p.variantes?.choix || [];
    // Même produit sans option ni texte : on augmente la quantité au lieu d'ajouter une ligne
    const existante = !choix.length && !p.options?.texte && vente.lignes.find((l) => l.id === id && !l.texte && !l.note);
    if (existante) existante.quantite++;
    else vente.lignes.push({ cle: nouvelleCle(), id, nom: p.nom, prix: arrondi(Number(p.prix) + Number(choix[0]?.prix || 0)), quantite: 1, texte: "", note: "", variante: choix.length ? 0 : null, details: false });
    annoncer(`${p.nom} ajouté au ticket.`);
  }

  // ---------- Client : recherche maison (motif ARIA combobox + listbox) ----------
  function resultatsClients() {
    const q = o.normaliser(combo.q.trim());
    const chiffres = combo.q.replace(/\D/g, "");
    const clients = o.donnees.clients;
    if (!q) return [...clients].sort((a, b) => String(b.maj_le || b.cree_le).localeCompare(String(a.maj_le || a.cree_le))).slice(0, 6);
    const score = (c) => {
      const nom = o.normaliser(c.nom);
      if (nom.startsWith(q)) return 0;
      if (nom.split(/[\s'-]+/).some((m) => m.startsWith(q))) return 1;
      if (nom.includes(q)) return 2;
      if (o.normaliser(c.email).includes(q)) return 3;
      if (chiffres.length >= 3 && o.chiffresTel(c.tel).includes(chiffres)) return 4;
      return 9;
    };
    return clients.map((c) => [c, score(c)]).filter(([, s]) => s < 9).sort((a, b) => a[1] - b[1] || a[0].nom.localeCompare(b[0].nom)).slice(0, 8).map(([c]) => c);
  }
  function clientHtml() {
    const c = clientChoisi();
    if (c)
      return `<p class="cs-etiquette">Client</p>
        <div class="cs-client-choisi">
          <div class="cs-client-texte"><strong>${e(c.nom || "(sans nom)")}</strong><span>${[c.email, c.tel].filter(Boolean).map(e).join(" · ") || "aucun contact"}</span>${c.notes ? `<span class="cs-client-note">${e(c.notes.slice(0, 140))}${c.notes.length > 140 ? "…" : ""}</span>` : ""}</div>
          <button type="button" class="mini" data-cs="changer-client" data-focus="changer">Changer</button>
        </div>
        ${c.consentement_marketing ? "" : `<label class="case cs-case"><input type="checkbox" data-cs-champ="consentement" ${vente.consentement ? "checked" : ""}> <span>Accepte de recevoir nos nouveautés par email</span></label>`}`;
    if (vente.nouveau) {
      const n = vente.nouveau;
      return `<p class="cs-etiquette">Nouveau client</p>
        <div class="cs-nouveau">
          <div class="champ"><label for="cs-n-nom">Nom</label><input id="cs-n-nom" data-cs-nouveau="nom" data-focus="n-nom" value="${e(n.nom)}" autocomplete="off" maxlength="120"></div>
          <div class="champ"><label for="cs-n-tel">Téléphone</label><input id="cs-n-tel" type="tel" data-cs-nouveau="tel" data-focus="n-tel" value="${e(n.tel)}" autocomplete="off"></div>
          <div class="champ cs-large"><label for="cs-n-email">Email (facture et suivi)</label><input id="cs-n-email" type="email" data-cs-nouveau="email" data-focus="n-email" value="${e(n.email)}" autocomplete="off"></div>
          <label class="case cs-case cs-large"><input type="checkbox" data-cs-champ="consentement" ${vente.consentement ? "checked" : ""}> <span>Accepte de recevoir nos nouveautés par email</span></label>
          <p class="aide cs-large">La fiche est créée à l'enregistrement de la vente. <button type="button" class="lien-bouton" data-cs="annuler-nouveau">Chercher un client existant</button></p>
        </div>`;
    }
    const res = combo.ouvert ? resultatsClients() : [];
    const creer = combo.q.trim().length >= 2;
    const n = res.length + (creer ? 1 : 0);
    const actif = combo.actif >= 0 && combo.actif < n ? combo.actif : -1;
    return `<label class="cs-etiquette" for="cs-client-q">Client <span class="cs-facultatif">· facultatif, sinon client de passage</span></label>
      <div class="combo">
        <input id="cs-client-q" type="text" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="cs-clients" aria-expanded="${combo.ouvert && n > 0}" ${actif >= 0 ? `aria-activedescendant="cs-opt-${actif}"` : ""} aria-keyshortcuts="C" data-focus="client" value="${e(combo.q)}" placeholder="Rechercher : nom, email, téléphone" autocomplete="off" spellcheck="false">
        <ul class="combo-liste" id="cs-clients" role="listbox" aria-label="Clients trouvés" ${combo.ouvert && n > 0 ? "" : "hidden"}>
          ${!combo.q.trim() && res.length ? `<li class="combo-titre" role="presentation">Derniers clients</li>` : ""}
          ${res.map((c, i) => `<li role="option" id="cs-opt-${i}" data-cs="choisir-client" data-id="${c.id}" aria-selected="${i === actif}"><strong>${o.surligner(c.nom || "(sans nom)", combo.q)}</strong><span>${[c.email ? o.surligner(c.email, combo.q) : "", c.tel ? o.surlignerTel(c.tel, combo.q) : ""].filter(Boolean).join(" · ") || "aucun contact"}</span></li>`).join("")}
          ${creer ? `<li role="option" id="cs-opt-${res.length}" class="combo-creer" data-cs="creer-client" aria-selected="${res.length === actif}"><strong>Nouveau client : « ${e(combo.q.trim())} »</strong><span>Créer la fiche sans quitter la caisse</span></li>` : ""}
        </ul>
      </div>
      ${combo.ouvert && combo.q.trim() && !n ? `<p class="aide">Aucun client trouvé.</p>` : ""}`;
  }
  function choisirClient(id) {
    const c = o.donnees.clients.find((x) => x.id === id);
    if (!c) return;
    Object.assign(vente, { clientId: c.id, nouveau: null, consentement: !!c.consentement_marketing });
    if (c.adresse && !vente.adresse) vente.adresse = c.adresse;
    Object.assign(combo, { q: "", ouvert: false, actif: -1 });
    majPartie("cs-client", clientHtml());
    majPartie("cs-options", optionsHtml());
    annoncer(`Client : ${c.nom}.`);
    zone.querySelector('[data-cs="changer-client"]')?.focus();
  }
  function creerClient() {
    const q = combo.q.trim();
    const n = { nom: "", tel: "", email: "" };
    if (/@/.test(q)) n.email = q;
    else if (q.replace(/[\s.+-]/g, "").match(/^\d{6,}$/)) n.tel = q;
    else n.nom = q;
    Object.assign(vente, { nouveau: n, clientId: "" });
    Object.assign(combo, { q: "", ouvert: false, actif: -1 });
    majPartie("cs-client", clientHtml());
    zone.querySelector(n.nom ? (n.tel ? "#cs-n-email" : "#cs-n-tel") : "#cs-n-nom")?.focus();
  }

  // ---------- Lignes du ticket ----------
  function lignesHtml() {
    if (!vente.lignes.length) return `<li class="cs-ticket-vide aide">Ticket vide : touchez un produit, ou tapez son nom puis Entrée.</li>`;
    const t = totaux();
    return t.lignes
      .map((l) => {
        const p = produit(l.id);
        const choix = p?.variantes?.choix || [];
        const nom = e(l.nom);
        const remises = t.detail.filter((r) => r.portee === "ligne" && r.ligne === l.cle);
        const resume = [l.texte ? `« ${e(l.texte)} »` : "", l.note ? e(l.note) : ""].filter(Boolean).join(" · ");
        return `<li class="cs-ligne" data-cle="${l.cle}">
          <div class="cs-ligne-haut"><span class="cs-ligne-nom">${nom}</span><strong class="cs-ligne-total" data-total="${l.cle}">${euros(l.total)}</strong><button type="button" class="mini danger cs-retirer-ligne" data-cs="retirer" data-cle="${l.cle}" data-focus="x-${l.cle}" aria-label="Retirer ${nom} du ticket">${ICO_X}</button></div>
          ${choix.length ? `<select class="cs-variante" data-cs-champ="variante" data-cle="${l.cle}" data-focus="v-${l.cle}" aria-label="${e(p.variantes.nom || "Option")} de ${nom}">${choix.map((c, j) => `<option value="${j}" ${l.variante === j ? "selected" : ""}>${e(p.variantes.nom || "Option")} : ${e(c.nom)}${Number(c.prix) ? ` (+${euros(c.prix)})` : ""}</option>`).join("")}</select>` : ""}
          <div class="cs-ligne-bas">
            <span class="cs-quantite" role="group" aria-label="Quantité de ${nom}">
              <button type="button" class="mini" data-cs="moins" data-cle="${l.cle}" data-focus="m-${l.cle}" aria-label="Un de moins">−</button>
              <input type="number" inputmode="numeric" min="1" max="999" step="1" value="${l.quantite}" data-cs-champ="quantite" data-cle="${l.cle}" data-focus="q-${l.cle}" aria-label="Quantité de ${nom}">
              <button type="button" class="mini" data-cs="plus" data-cle="${l.cle}" data-focus="p-${l.cle}" aria-label="Un de plus">+</button>
            </span>
            <label class="cs-pu"><span aria-hidden="true">×</span><input type="number" inputmode="decimal" step="0.01" min="0" value="${arrondi(l.prix).toFixed(2)}" data-cs-champ="prix" data-cle="${l.cle}" data-focus="pu-${l.cle}" aria-label="Prix unitaire de ${nom}"><span aria-hidden="true">€</span></label>
            <button type="button" class="mini cs-details" data-cs="details" data-cle="${l.cle}" data-focus="d-${l.cle}" aria-expanded="${!!l.details}">Détails</button>
          </div>
          ${resume && !l.details ? `<p class="cs-ligne-resume">${resume}</p>` : ""}
          ${l.details ? `
          <div class="cs-ligne-details">
            <div class="champ"><label for="cs-t-${l.cle}">Texte à graver ou personnalisation</label><input id="cs-t-${l.cle}" data-cs-champ="texte" data-cle="${l.cle}" data-focus="t-${l.cle}" value="${e(l.texte)}" maxlength="200"></div>
            <div class="champ"><label for="cs-no-${l.cle}">Note pour l'atelier</label><input id="cs-no-${l.cle}" data-cs-champ="note" data-cle="${l.cle}" data-focus="no-${l.cle}" value="${e(l.note)}" maxlength="500" placeholder="Police, couleur, à préparer pour samedi…"></div>
            <form class="cs-remise-form" data-cs-form="remise-ligne" data-cle="${l.cle}">
              <label for="cs-rl-${l.cle}">Remise sur cette ligne</label>
              <span class="avec-unite"><input id="cs-rl-${l.cle}" name="valeur" type="number" inputmode="decimal" step="0.01" min="0.01" required data-focus="rl-${l.cle}"><select name="mode" aria-label="Unité de la remise"><option value="pourcent">%</option><option value="euros">€</option></select></span>
              <button class="btn btn-ligne">Appliquer</button>
            </form>
          </div>` : ""}
          ${remises.map((r) => `<p class="cs-ligne-remise"><span>${e(r.libelle || "Remise")}${r.mode === "pourcent" ? ` ${valeurRemise(r)}` : ""}</span><span data-montant-remise="${r.cle}">−${euros(r.montant)}</span></p>`).join("")}
        </li>`;
      })
      .join("");
  }
  const ligne = (cle) => vente.lignes.find((l) => l.cle === cle);
  function retirerLigne(cle) {
    vente.lignes = vente.lignes.filter((l) => l.cle !== cle);
    vente.remises = vente.remises.filter((r) => r.ligne !== cle);
  }

  // ---------- Remises et codes promo ----------
  function ajoutsHtml() {
    const valables = o.donnees.promos.filter((p) => o.promoValide(p)[0] && !vente.codes.some((c) => c.code === p.code));
    return `<div class="cs-ajouts-boutons">
        <button type="button" class="mini" data-cs="ajout" data-valeur="remise" aria-expanded="${vente.ajout === "remise"}" aria-keyshortcuts="R" data-focus="aj-remise">Remise sur le ticket</button>
        <button type="button" class="mini" data-cs="ajout" data-valeur="code" aria-expanded="${vente.ajout === "code"}" aria-keyshortcuts="P" data-focus="aj-code">Code promo</button>
      </div>
      ${vente.ajout === "remise" ? `
      <form class="cs-ajout-form" data-cs-form="remise-ticket">
        <div class="champ"><label for="cs-rt">Remise</label><span class="avec-unite"><input id="cs-rt" name="valeur" type="number" inputmode="decimal" step="0.01" min="0.01" required data-focus="rt"><select name="mode" aria-label="Unité de la remise"><option value="pourcent">%</option><option value="euros">€</option></select></span></div>
        <div class="champ"><label for="cs-rt-motif">Motif (facultatif)</label><input id="cs-rt-motif" name="libelle" maxlength="60" placeholder="Geste commercial, fidélité…" data-focus="rt-motif"></div>
        <div class="cs-ajout-actions"><button class="btn">Appliquer</button><button type="button" class="btn btn-ligne" data-cs="ajout" data-valeur="">Annuler</button></div>
      </form>` : ""}
      ${vente.ajout === "code" ? `
      <form class="cs-ajout-form" data-cs-form="code">
        <div class="champ"><label for="cs-code">Code donné par le client</label><span class="code-promo"><input id="cs-code" name="code" autocomplete="off" maxlength="30" required data-focus="code" spellcheck="false"><button class="btn">Appliquer</button></span></div>
        ${valables.length ? `<div class="cs-codes"><span class="aide">Codes en cours :</span>${valables.map((p) => `<button type="button" class="mini" data-cs="appliquer-code" data-code="${e(p.code)}"><strong>${e(p.code)}</strong> ${o.libellePromo(p)}${Number(p.minimum) ? ` dès ${euros(p.minimum)}` : ""}</button>`).join("")}</div>` : ""}
        <div class="cs-ajout-actions"><button type="button" class="btn btn-ligne" data-cs="ajout" data-valeur="">Fermer</button></div>
      </form>` : ""}`;
  }
  function appliquerCode(saisi) {
    const code = String(saisi || "").trim().toUpperCase();
    if (!code) return o.ctx.toast("Tapez le code donné par le client.", true);
    const p = o.donnees.promos.find((x) => x.code === code);
    if (!p) return o.ctx.toast(`Le code ${code} n'existe pas (onglet Marketing).`, true);
    if (vente.codes.some((c) => c.code === code)) return o.ctx.toast(`Le code ${code} est déjà sur ce ticket.`, true);
    const [valable, etat] = o.promoValide(p);
    if (!valable) return o.ctx.toast(`Le code ${code} n'est pas utilisable : ${etat.toLowerCase()}.`, true);
    if (totaux().sous < Number(p.minimum || 0)) return o.ctx.toast(`Le code ${code} s'applique dès ${euros(p.minimum)} d'achat.`, true);
    vente.codes.push(p);
    vente.ajout = "";
    majTicket();
    annoncer(`Code ${code} appliqué.`);
  }

  // ---------- Options de la vente : canal, livraison, date, notes ----------
  function optionsHtml() {
    const c = clientChoisi();
    const resume = [o.CANAUX[vente.canal], vente.reception === "livraison" ? "à livrer" : "retrait en boutique", vente.date ? `pour le ${new Date(vente.date).toLocaleDateString("fr-FR")}` : "", vente.notes ? "note interne" : ""].filter(Boolean).join(" · ");
    return `<details class="cs-options" ${vente.options ? "open" : ""}>
      <summary><span>Vente</span><span class="cs-options-resume">${e(resume)}</span></summary>
      <div class="cs-options-corps">
        <div class="filtres" role="group" aria-label="Canal de vente">${Object.entries(o.CANAUX).map(([k, v]) => `<button type="button" class="filtre" data-cs="canal" data-valeur="${k}" aria-pressed="${vente.canal === k}" data-focus="canal-${k}">${v}</button>`).join("")}</div>
        <label class="case cs-case"><input type="checkbox" data-cs-champ="livraison" ${vente.reception === "livraison" ? "checked" : ""}> <span>À livrer</span></label>
        ${vente.reception === "livraison" ? `
        <div class="cs-livraison">
          <div class="champ"><label for="cs-port">Frais de livraison (€)</label><input id="cs-port" type="number" inputmode="decimal" step="0.01" min="0" data-cs-champ="port" data-focus="port" value="${vente.port || ""}"></div>
          <div class="champ"><label for="cs-adresse">Adresse de livraison</label><textarea id="cs-adresse" rows="2" data-cs-champ="adresse" data-focus="adresse">${e(vente.adresse || c?.adresse || "")}</textarea></div>
        </div>` : ""}
        <div class="champ"><label for="cs-date">Pour le (facultatif)</label><input id="cs-date" type="date" data-cs-champ="date" data-focus="date" value="${e(vente.date)}"></div>
        <div class="champ"><label for="cs-notes">Notes internes</label><textarea id="cs-notes" rows="2" data-cs-champ="notes" data-focus="notes" placeholder="Jamais montrées au client">${e(vente.notes)}</textarea></div>
      </div>
    </details>`;
  }

  // ---------- Récapitulatif, toujours visible en bas du ticket ----------
  function piedHtml(t = totaux()) {
    const somme = (libelle, montant, classe = "", bouton = "") => `<div class="ticket-somme cs-somme ${classe}"><span>${libelle}</span><span class="cs-somme-montant">${montant}${bouton}</span></div>`;
    const vide = !vente.lignes.length;
    return `<div class="cs-recap">
        ${somme(`Sous-total${t.articles ? ` · ${t.articles} article${t.articles > 1 ? "s" : ""}` : ""}`, euros(t.sous))}
        ${t.detail.map((r) => somme(e(libelleRemise(r)), `−${euros(r.montant)}`, "remise", `<button type="button" class="cs-retirer" data-cs="retirer-remise" data-cle="${e(r.cle)}" aria-label="Retirer : ${e(libelleRemise(r))}" data-focus="rr-${e(r.cle)}">${ICO_X}</button>`)).join("")}
        ${t.port ? somme("Livraison", euros(t.port)) : ""}
        ${somme("Total", euros(t.total), "total")}
        ${t.remise ? `<p class="cs-economies">Économies : <strong>${euros(t.remise)}</strong></p>` : ""}
      </div>
      <div class="cs-boutons">
        <button type="button" class="btn cs-encaisser" data-cs="encaisser" aria-keyshortcuts="Control+Enter" ${vide ? "disabled" : ""} data-focus="encaisser">Encaisser ${euros(t.total)}</button>
        <button type="button" class="btn btn-ligne" data-cs="plus-tard" ${vide ? "disabled" : ""} data-focus="plus-tard">À régler plus tard</button>
        ${vide ? "" : `<button type="button" class="lien-bouton cs-vider" data-cs="vider">Vider le ticket</button>`}
      </div>`;
  }

  // =====================================================================
  //  Encaissement
  // =====================================================================
  const moyensPermis = () => Object.entries(o.MOYENS).filter(([k]) => k !== "especes" || !especesInterdites());
  function ouvrirPaiement() {
    if (!vente.lignes.length) return;
    const t = totaux();
    const autre = moyensPermis().find(([k]) => k !== "carte")?.[0] || "cheque";
    paiement = { mode: paiement?.mode && paiement.mode !== "plusieurs" ? paiement.mode : "carte", recu: "", parts: [{ moyen: "carte", montant: t.total }, { moyen: autre, montant: 0 }] };
    if (!moyensPermis().some(([k]) => k === paiement.mode)) paiement.mode = "carte";
    rendrePaiement();
    const f = fenetre();
    if (!f.open) f.showModal();
    (f.querySelector("#cs-recu") || f.querySelector("#cs-valider"))?.focus();
  }
  const reste = (t) => arrondi(t.total - paiement.parts.reduce((s, p) => s + arrondi(p.montant), 0));
  function rendrePaiement() {
    const t = totaux();
    const f = fenetre();
    const c = clientChoisi();
    const qui = c ? c.nom : vente.nouveau?.nom || "Client de passage";
    const recu = Number(paiement.recu || 0);
    // Billets proposés : le compte juste, puis les montants ronds au-dessus du total
    const billets = [...new Set([t.total, Math.ceil(t.total / 5) * 5, Math.ceil(t.total / 10) * 10, 20, 50, 100].filter((x) => x >= t.total).map(arrondi))].slice(0, 5);
    const r = reste(t);
    const peutValider = paiement.mode === "especes" ? !paiement.recu || recu >= t.total : paiement.mode === "plusieurs" ? Math.abs(r) < 0.005 : true;
    f.innerHTML = `
      <form method="dialog" class="pile cs-paiement" data-cs-form="paiement">
        <div class="cs-paiement-tete"><h2 style="font-size:1.6rem">Encaisser</h2><strong>${euros(t.total)}</strong></div>
        <p class="aide">${e(qui)} · ${t.articles} article${t.articles > 1 ? "s" : ""}${t.remise ? ` · ${euros(t.remise)} de remise` : ""}</p>
        <fieldset class="cs-moyens">
          <legend>Moyen de paiement</legend>
          <div class="filtres">${[...moyensPermis(), ["plusieurs", "Plusieurs moyens"]].map(([k, v]) => `<button type="button" class="filtre" data-cs="moyen" data-valeur="${k}" aria-pressed="${paiement.mode === k}">${v}</button>`).join("")}</div>
        </fieldset>
        ${paiement.mode === "especes" ? `
        <div class="cs-especes">
          <div class="champ"><label for="cs-recu">Montant reçu</label><input id="cs-recu" type="number" inputmode="decimal" step="0.01" min="0" value="${e(paiement.recu)}" placeholder="${String(t.total).replace(".", ",")}"></div>
          <div class="filtres" role="group" aria-label="Montants rapides">${billets.map((b) => `<button type="button" class="filtre" data-cs="billet" data-valeur="${b}">${b === t.total ? "Compte juste" : euros(b)}</button>`).join("")}</div>
          <p class="cs-rendu" aria-live="polite">${paiement.recu ? (recu >= t.total ? `À rendre : <strong>${euros(recu - t.total)}</strong>` : `Il manque <strong>${euros(t.total - recu)}</strong>`) : "Compte juste si vous laissez vide."}</p>
        </div>` : ""}
        ${paiement.mode === "plusieurs" ? `
        <div class="cs-parts">
          ${paiement.parts.map((p, i) => `<div class="cs-part">
            <select data-cs-part="moyen" data-i="${i}" aria-label="Moyen ${i + 1}">${moyensPermis().map(([k, v]) => `<option value="${k}" ${p.moyen === k ? "selected" : ""}>${v}</option>`).join("")}</select>
            <span class="cs-prix-libre"><input type="number" inputmode="decimal" step="0.01" min="0" value="${p.montant || ""}" data-cs-part="montant" data-i="${i}" aria-label="Montant ${i + 1}"><span aria-hidden="true">€</span></span>
            ${paiement.parts.length > 2 ? `<button type="button" class="mini danger" data-cs="retirer-part" data-i="${i}" aria-label="Retirer ce moyen">${ICO_X}</button>` : ""}
          </div>`).join("")}
          ${paiement.parts.length < 4 ? `<button type="button" class="mini" data-cs="ajouter-part" style="justify-self:start">Ajouter un moyen</button>` : ""}
          <p class="cs-rendu" aria-live="polite">${Math.abs(r) < 0.005 ? "Le total est réparti." : r > 0 ? `Reste à répartir : <strong>${euros(r)}</strong>` : `Trop perçu : <strong>${euros(-r)}</strong>`}</p>
        </div>` : ""}
        ${especesInterdites() ? `<p class="aide">Espèces : à enregistrer sur votre caisse certifiée (obligation des commerces assujettis à la TVA, art. 286 du CGI).</p>` : ""}
        <div class="raccourcis">
          <button class="btn" value="ok" id="cs-valider" ${peutValider ? "" : "disabled"}>Valider le paiement</button>
          <button class="btn btn-ligne" value="annuler" formnovalidate>Retour au ticket</button>
        </div>
      </form>`;
  }
  function paiementsSaisis() {
    const t = totaux();
    if (paiement.mode === "plusieurs") return paiement.parts.filter((p) => arrondi(p.montant) > 0).map((p) => ({ moyen: p.moyen, montant: arrondi(p.montant) }));
    if (paiement.mode === "especes") return [{ moyen: "especes", montant: t.total, ...(Number(paiement.recu) > t.total ? { recu: arrondi(paiement.recu) } : {}) }];
    return [{ moyen: paiement.mode, montant: t.total }];
  }

  async function enregistrer(paye, paiements = []) {
    const client = clientChoisi();
    const n = vente.nouveau;
    if (n?.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.email)) return o.ctx.toast("Email du nouveau client invalide.", true);
    if (n && n.nom && n.nom.length < 2) return o.ctx.toast("Le nom du client doit faire au moins 2 lettres.", true);
    const adresse = String(vente.adresse || client?.adresse || "").trim();
    if (vente.reception === "livraison" && !adresse) {
      vente.options = true;
      majPartie("cs-options", optionsHtml());
      zone.querySelector("#cs-adresse")?.focus();
      return o.ctx.toast("Indiquez l'adresse de livraison.", true);
    }
    const index = new Map(vente.lignes.map((l, i) => [l.cle, i]));
    const corps = {
      client: client ? { id: client.id } : n && (n.nom || n.email || n.tel) ? { ...n, consentement: vente.consentement } : undefined,
      lignes: vente.lignes.map((l) => {
        const p = produit(l.id);
        const c = l.variante != null ? p?.variantes?.choix?.[l.variante] : null;
        return { id: l.id || undefined, nom: l.nom, prix_unitaire: arrondi(l.prix), quantite: l.quantite, texte: l.texte, remarque: l.note, variante: c ? `${p.variantes.nom || "Option"} : ${c.nom}` : "" };
      }),
      remises: vente.remises.map((r) => ({ portee: r.portee, ligne: r.portee === "ligne" ? index.get(r.ligne) : undefined, mode: r.mode, valeur: r.valeur, libelle: r.libelle })),
      codes: vente.codes.map((p) => p.code),
      paiements,
      canal: vente.canal,
      mode_reception: vente.reception,
      paiement_statut: paye ? "paye" : "en_attente",
      paiement_moyen: paye && paiements.length === 1 ? paiements[0].moyen : "",
      port: totaux().port,
      notes: vente.notes,
      date_souhaitee: vente.date,
    };
    const boutons = [...zone.querySelectorAll('[data-cs="encaisser"], [data-cs="plus-tard"]'), fenetre().querySelector("#cs-valider")].filter(Boolean);
    boutons.forEach((b) => (b.disabled = true));
    try {
      if (client && vente.consentement && !client.consentement_marketing)
        await o.sb().from("clients").update({ consentement_marketing: true, consentement_le: new Date().toISOString() }).eq("id", client.id);
      if (vente.reception === "livraison") {
        if (client && adresse !== client.adresse) await o.sb().from("clients").update({ adresse }).eq("id", client.id);
        if (!client) corps.client = { ...(corps.client || {}), adresse };
      }
      const { commande } = await o.S().appel(o.ctx.D, "creer_commande", { vente: corps });
      if (vente.demandeId) await o.sb().from("demandes").update({ statut: "convertie", client_id: commande.client_id }).eq("id", vente.demandeId);
      dernierCanal = vente.canal;
      if (fenetre().open) fenetre().close();
      vente = { ...nouvelleVente(), fini: commande };
      Object.assign(filtre, { q: "", categorie: "" });
      o.ctx.toast(`Vente ${commande.numero} enregistrée.`);
      afficher();
      // Fichier clients et utilisations des codes à jour pour la vente suivante
      o.recharger(["clients", "promos"]).catch(() => {});
    } catch (x) {
      boutons.forEach((b) => (b.disabled = false));
      o.ctx.toast(x.message, true);
    }
  }

  // =====================================================================
  //  Vente enregistrée : rendu, ticket à imprimer ou à envoyer, nouvelle vente
  // =====================================================================
  const libelleMoyen = (m) => o.MOYENS[m] || m;
  function vueFinie() {
    const c = vente.fini;
    const especes = (c.paiements || []).find((p) => p.moyen === "especes" && p.recu);
    const rendu = especes ? arrondi(especes.recu - especes.montant) : 0;
    const fiche = o.donnees.clients.find((x) => x.id === c.client_id);
    const email = !sansEmail(c.client_email) ? c.client_email : "";
    const paye = c.paiement_statut === "paye";
    return `
      <section class="bloc cs-fini">
        <div class="cs-fini-tete">
          <div>
            <h2>Vente enregistrée</h2>
            <p class="aide">${e(c.numero)}${c.facture_numero ? ` · facture ${e(c.facture_numero)}` : ""} · ${e(c.client_nom)}</p>
          </div>
          ${rendu > 0 ? `<p class="cs-fini-rendu">À rendre <strong>${euros(rendu)}</strong><small>sur ${euros(especes.recu)} reçus</small></p>` : ""}
        </div>
        <div class="cs-fini-grille">
          <div class="cs-recu">
            ${c.lignes.map((l) => `<div class="ticket-somme"><span>${l.quantite} × ${e(l.nom)}${l.variante ? ` <small>${e(l.variante)}</small>` : ""}${l.texte ? ` <small>« ${e(l.texte)} »</small>` : ""}</span><span>${euros(l.total)}</span></div>`).join("")}
            ${Number(c.remise) ? `<div class="ticket-somme"><span>Sous-total</span><span>${euros(c.sous_total)}</span></div>` : ""}
            ${(c.remises?.length ? c.remises : Number(c.remise) ? [{ libelle: c.code_promo ? `Code ${c.code_promo}` : "Remise", montant: c.remise }] : []).map((r) => `<div class="ticket-somme remise"><span>${e(r.libelle)}${r.mode === "pourcent" ? ` (−${String(r.valeur).replace(".", ",")} %)` : ""}</span><span>−${euros(r.montant)}</span></div>`).join("")}
            ${Number(c.port) ? `<div class="ticket-somme"><span>Livraison</span><span>${euros(c.port)}</span></div>` : ""}
            <div class="ticket-somme total"><span>Total</span><span>${euros(c.total)}</span></div>
            <p class="cs-fini-paiement">${paye ? `Réglée : ${(c.paiements?.length ? c.paiements : [{ moyen: c.paiement_moyen, montant: c.total }]).map((p) => `${e(libelleMoyen(p.moyen))} ${euros(p.montant)}`).join(" + ")}` : "À régler : lien de paiement par carte depuis l'onglet Commandes, ou en boutique."}</p>
          </div>
          <div class="cs-fini-actions">
            <button class="btn" data-cs="nouvelle">Nouvelle vente</button>
            ${c.facture_numero ? `<button class="btn btn-ligne" data-cs="imprimer" data-type="facture">Imprimer la facture</button>` : ""}
            <button class="btn btn-ligne" data-cs="imprimer" data-type="bon">${c.facture_numero ? "Bon pour l'atelier" : "Imprimer le bon de commande"}</button>
            <form class="cs-envoi" data-cs-form="envoi">
              <label for="cs-envoi-email">Envoyer le ticket par email</label>
              <span class="cs-champ-bouton"><input id="cs-envoi-email" type="email" required value="${e(email || fiche?.email || "")}" placeholder="email du client"><button class="btn btn-ligne">Envoyer</button></span>
            </form>
            <button class="lien-bouton" data-aller="commandes">Voir dans les commandes</button>
          </div>
        </div>
      </section>`;
  }
  function messageTicket(c) {
    const S = o.ctx.D.site;
    const lignes = c.lignes.map((l) => `${l.quantite} × ${l.nom}${l.variante ? ` (${l.variante})` : ""}${l.texte ? `, texte « ${l.texte} »` : ""} : ${euros(l.total)}`);
    const remises = (c.remises || []).map((r) => `${r.libelle} : −${euros(r.montant)}`);
    const paiements = (c.paiements?.length ? c.paiements : c.paiement_moyen ? [{ moyen: c.paiement_moyen, montant: c.total }] : []).map((p) => `${libelleMoyen(p.moyen)} ${euros(p.montant)}`);
    return [
      `Merci pour votre achat du ${new Date(c.cree_le || Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`,
      "",
      ...lignes,
      ...(remises.length || Number(c.port) ? [`Sous-total : ${euros(c.sous_total)}`, ...remises, ...(Number(c.port) ? [`Livraison : ${euros(c.port)}`] : [])] : []),
      `Total : ${euros(c.total)}`,
      c.paiement_statut === "paye" ? `Réglé : ${paiements.join(" + ")}.` : "À régler.",
      "",
      `Vente ${c.numero}${c.facture_numero ? `, facture ${c.facture_numero}` : ""}.`,
      [S.nom, S.adresse, S.telephone].filter(Boolean).join(" · "),
    ].join("\n");
  }
  async function envoyerTicket(email, bouton) {
    const c = vente.fini;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return o.ctx.toast("Adresse email invalide.", true);
    bouton.disabled = true;
    try {
      await o.S().appel(o.ctx.D, "email_client", { email, nom: c.client_nom === "Client en boutique" ? "" : c.client_nom, sujet: `Votre ticket ${c.numero} · ${o.ctx.D.site.nom || "Mon Truc en Bois"}`, message: messageTicket(c) });
      // Client sans email dans sa fiche : on garde celui qu'il vient de donner
      const fiche = o.donnees.clients.find((x) => x.id === c.client_id);
      if (fiche && !fiche.email) {
        const { error } = await o.sb().from("clients").update({ email: email.toLowerCase() }).eq("id", fiche.id);
        if (!error) fiche.email = email.toLowerCase();
      }
      o.ctx.toast(`Ticket envoyé à ${email}.`);
    } catch (x) {
      o.ctx.toast(x.message, true);
    } finally {
      bouton.disabled = false;
    }
  }

  // =====================================================================
  //  Événements
  // =====================================================================
  const active = () => zone && document.contains(zone) && o.vue() === "caisse";
  const dansCaisse = (el) => active() && (zone.contains(el) || (fenetre().contains(el) && paiement && fenetre().querySelector('[data-cs-form="paiement"]')));

  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-cs]");
    if (!b || !dansCaisse(b)) return;
    const a = b.dataset.cs;
    const v = b.dataset.valeur;
    const l = b.dataset.cle ? ligne(b.dataset.cle) : null;
    if (a === "ajouter") {
      ajouterProduit(b.dataset.id);
      return majTicket();
    }
    if (a === "categorie") {
      filtre.categorie = v;
      majPartie("cs-categories", categoriesHtml());
      return majPartie("cs-tuiles", tuilesHtml());
    }
    if (a === "plus" && l) l.quantite = Math.min(999, l.quantite + 1);
    if (a === "moins" && l) {
      if (l.quantite > 1) l.quantite--;
      else return retirerLigne(l.cle), majTicket(), zone.querySelector("#cs-q")?.focus();
    }
    if (a === "retirer" && l) {
      retirerLigne(l.cle);
      annoncer(`${l.nom} retiré du ticket.`);
      majTicket();
      return zone.querySelector("#cs-q")?.focus();
    }
    if (a === "details" && l) {
      l.details = !l.details;
      majPartie("cs-lignes", lignesHtml());
      if (l.details) {
        zone.querySelector(`#cs-t-${l.cle}`)?.focus();
        zone.querySelector(`[data-cle="${l.cle}"] .cs-ligne-details`)?.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    if (["plus", "moins"].includes(a)) return majTicket();
    if (a === "choisir-client") return choisirClient(b.dataset.id);
    if (a === "creer-client") return creerClient();
    if (a === "changer-client" || a === "annuler-nouveau") {
      Object.assign(vente, { clientId: "", nouveau: null, consentement: false });
      Object.assign(combo, { q: "", ouvert: false, actif: -1 });
      majPartie("cs-client", clientHtml());
      return zone.querySelector("#cs-client-q")?.focus();
    }
    if (a === "ajout") {
      vente.ajout = vente.ajout === v ? "" : v;
      majPartie("cs-ajouts", ajoutsHtml());
      const champ = zone.querySelector(v === "remise" ? "#cs-rt" : v === "code" ? "#cs-code" : null);
      if (!champ) return zone.querySelector('[data-focus="aj-remise"]')?.focus();
      champ.focus();
      return zone.querySelector(".cs-ajout-form")?.scrollIntoView({ block: "nearest" });
    }
    if (a === "appliquer-code") return appliquerCode(b.dataset.code);
    if (a === "retirer-remise") {
      const cle = b.dataset.cle;
      vente.remises = vente.remises.filter((r) => r.cle !== cle);
      vente.codes = vente.codes.filter((p) => `code-${p.code}` !== cle);
      majTicket();
      return zone.querySelector('[data-cs="encaisser"]')?.focus();
    }
    if (a === "canal") {
      vente.canal = v;
      return majPartie("cs-options", optionsHtml());
    }
    if (a === "vider") {
      if (!confirm("Vider le ticket ? Articles, client et remises seront retirés.")) return;
      vente = { ...nouvelleVente() };
      return afficher();
    }
    if (a === "encaisser") return ouvrirPaiement();
    if (a === "plus-tard") return enregistrer(false);
    if (a === "moyen") {
      paiement.mode = v;
      rendrePaiement();
      return (fenetre().querySelector("#cs-recu") || fenetre().querySelector(`[data-cs="moyen"][data-valeur="${v}"]`))?.focus();
    }
    if (a === "billet") {
      paiement.recu = v;
      rendrePaiement();
      return fenetre().querySelector("#cs-valider")?.focus();
    }
    if (a === "ajouter-part") {
      paiement.parts.push({ moyen: moyensPermis().find(([k]) => !paiement.parts.some((p) => p.moyen === k))?.[0] || "autre", montant: Math.max(0, reste(totaux())) });
      rendrePaiement();
      return fenetre().querySelectorAll('[data-cs-part="montant"]')[paiement.parts.length - 1]?.focus();
    }
    if (a === "retirer-part") {
      paiement.parts.splice(+b.dataset.i, 1);
      return rendrePaiement();
    }
    if (a === "nouvelle") {
      vente = nouvelleVente();
      afficher();
      return zone.querySelector("#cs-q")?.focus();
    }
    if (a === "imprimer") return window.AdminCommandes?.imprimer(vente.fini, b.dataset.type === "facture" ? "facture" : "bon", o.ctx);
  });

  // Clic dans la liste des clients : on garde le focus dans le champ (le clic est traité au relâchement)
  document.addEventListener("mousedown", (ev) => {
    if (ev.target.closest("#cs-clients") && dansCaisse(ev.target)) ev.preventDefault();
  });
  document.addEventListener("focusin", (ev) => {
    if (ev.target.id === "cs-client-q" && dansCaisse(ev.target) && !combo.ouvert) {
      combo.ouvert = true;
      majPartie("cs-client", clientHtml());
    }
  });
  document.addEventListener("focusout", (ev) => {
    if (ev.target.id !== "cs-client-q" || !dansCaisse(ev.target)) return;
    // Laisse passer un clic sur une option avant de refermer la liste
    setTimeout(() => {
      if (document.activeElement?.id === "cs-client-q" || !combo.ouvert) return;
      combo.ouvert = false;
      combo.actif = -1;
      majPartie("cs-client", clientHtml());
    }, 120);
  });

  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!dansCaisse(el)) return;
    if (el.id === "cs-q") {
      filtre.q = el.value;
      return majPartie("cs-tuiles", tuilesHtml());
    }
    if (el.id === "cs-client-q") {
      Object.assign(combo, { q: el.value, ouvert: true, actif: el.value.trim() ? 0 : -1 });
      return majPartie("cs-client", clientHtml());
    }
    if (el.id === "cs-recu") {
      paiement.recu = el.value;
      const t = totaux();
      const recu = Number(el.value || 0);
      fenetre().querySelector(".cs-rendu").innerHTML = el.value ? (recu >= t.total ? `À rendre : <strong>${euros(recu - t.total)}</strong>` : `Il manque <strong>${euros(t.total - recu)}</strong>`) : "Compte juste si vous laissez vide.";
      fenetre().querySelector("#cs-valider").disabled = !!el.value && recu < t.total;
      return;
    }
    if (el.dataset.csPart) {
      const p = paiement.parts[+el.dataset.i];
      if (el.dataset.csPart === "montant") p.montant = Number(el.value || 0);
      const t = totaux();
      const r = reste(t);
      fenetre().querySelector(".cs-rendu").innerHTML = Math.abs(r) < 0.005 ? "Le total est réparti." : r > 0 ? `Reste à répartir : <strong>${euros(r)}</strong>` : `Trop perçu : <strong>${euros(-r)}</strong>`;
      fenetre().querySelector("#cs-valider").disabled = Math.abs(r) >= 0.005;
      return;
    }
    if (el.dataset.csNouveau) {
      vente.nouveau[el.dataset.csNouveau] = el.value.trim();
      return;
    }
    const champ = el.dataset.csChamp;
    const l = el.dataset.cle ? ligne(el.dataset.cle) : null;
    if (l && champ === "prix") l.prix = Math.max(0, Number(el.value || 0));
    if (l && champ === "quantite" && Number(el.value) >= 1) l.quantite = Math.min(999, Math.trunc(Number(el.value)));
    if (l && champ === "texte") return void (l.texte = el.value);
    if (l && champ === "note") return void (l.note = el.value);
    if (champ === "port") vente.port = Math.max(0, Number(el.value || 0));
    if (["adresse", "notes"].includes(champ)) return void (vente[champ] = el.value);
    majMontants();
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!dansCaisse(el)) return;
    const champ = el.dataset.csChamp;
    const l = el.dataset.cle ? ligne(el.dataset.cle) : null;
    if (el.dataset.csPart === "moyen") return void (paiement.parts[+el.dataset.i].moyen = el.value);
    if (l && champ === "variante") {
      const p = produit(l.id);
      l.variante = Number(el.value);
      l.prix = arrondi(Number(p.prix) + Number(p.variantes.choix[l.variante]?.prix || 0));
      return majTicket();
    }
    if (l && champ === "quantite") {
      if (!(Number(el.value) >= 1)) el.value = l.quantite;
      return majTicket();
    }
    if (champ === "consentement") vente.consentement = el.checked;
    if (champ === "date") {
      vente.date = el.value;
      return majPartie("cs-options", optionsHtml());
    }
    if (champ === "livraison") {
      vente.reception = el.checked ? "livraison" : "retrait";
      if (el.checked && !vente.port) vente.port = Number(o.ctx.D.site.livraison || 0);
      majPartie("cs-options", optionsHtml());
      if (el.checked) zone.querySelector("#cs-port")?.focus();
      return majMontants();
    }
    if (champ === "notes" || champ === "adresse") majPartie("cs-options", optionsHtml());
  });
  document.addEventListener(
    "toggle",
    (ev) => {
      if (ev.target.classList?.contains("cs-options") && dansCaisse(ev.target)) vente.options = ev.target.open;
    },
    true
  );

  document.addEventListener("submit", (ev) => {
    const f = ev.target;
    if (!dansCaisse(f)) return;
    const type = f.dataset.csForm;
    if (!type) return;
    if (type === "paiement") {
      if (ev.submitter?.value !== "ok") {
        paiement = null;
        return; // « Retour au ticket » : la fenêtre se ferme toute seule
      }
      ev.preventDefault();
      const t = totaux();
      if (paiement.mode === "especes" && paiement.recu && Number(paiement.recu) < t.total) return o.ctx.toast("Le montant reçu est inférieur au total.", true);
      if (paiement.mode === "plusieurs" && Math.abs(reste(t)) >= 0.005) return o.ctx.toast("Répartissez exactement le total entre les moyens de paiement.", true);
      return enregistrer(true, paiementsSaisis());
    }
    ev.preventDefault();
    const x = Object.fromEntries(new FormData(f));
    if (type === "libre") {
      vente.lignes.push({ cle: nouvelleCle(), id: "", nom: String(x.nom).trim(), prix: arrondi(x.prix), quantite: 1, texte: "", note: "", variante: null, details: false });
      f.reset();
      annoncer(`${x.nom} ajouté au ticket.`);
      majTicket();
      return f.querySelector("input")?.focus();
    }
    if (type === "remise-ligne" || type === "remise-ticket") {
      const valeur = arrondi(x.valeur);
      if (!(valeur > 0) || (x.mode === "pourcent" && valeur > 100)) return o.ctx.toast("Remise invalide : un montant positif, ou un pourcentage de 1 à 100.", true);
      vente.remises.push({ cle: nouvelleCle(), portee: type === "remise-ligne" ? "ligne" : "ticket", ligne: type === "remise-ligne" ? f.dataset.cle : undefined, mode: x.mode === "euros" ? "euros" : "pourcent", valeur, libelle: String(x.libelle || "").trim() });
      if (type === "remise-ticket") vente.ajout = "";
      else ligne(f.dataset.cle).details = false;
      majTicket();
      return zone.querySelector('[data-cs="encaisser"]')?.focus();
    }
    if (type === "code") return appliquerCode(x.code);
    if (type === "envoi") return envoyerTicket(String(f.querySelector("input").value).trim(), f.querySelector("button"));
  });

  document.addEventListener("keydown", (ev) => {
    if (!active()) return;
    const el = ev.target;
    // Liste des clients : flèches, Entrée, Échap
    if (el.id === "cs-client-q") {
      const n = (combo.ouvert ? resultatsClients().length : 0) + (combo.q.trim().length >= 2 ? 1 : 0);
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        if (!combo.ouvert) combo.ouvert = true;
        else if (n) combo.actif = ((combo.actif < 0 ? (ev.key === "ArrowDown" ? -1 : 0) : combo.actif) + (ev.key === "ArrowDown" ? 1 : -1) + n) % n;
        majPartie("cs-client", clientHtml());
        zone.querySelector(`#cs-opt-${combo.actif}`)?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (ev.key === "Enter" && combo.ouvert && n) {
        ev.preventDefault();
        const opt = zone.querySelector(`#cs-opt-${combo.actif >= 0 ? combo.actif : 0}`);
        return opt?.dataset.cs === "creer-client" ? creerClient() : choisirClient(opt?.dataset.id);
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        if (combo.ouvert) Object.assign(combo, { ouvert: false, actif: -1 });
        else Object.assign(combo, { q: "" });
        return majPartie("cs-client", clientHtml());
      }
    }
    // Recherche de produits : Entrée ajoute le premier résultat, flèche bas va dans la grille, Échap efface
    if (el.id === "cs-q") {
      if (ev.key === "Enter") {
        ev.preventDefault();
        const premier = produitsFiltres()[0];
        if (!premier) return;
        ajouterProduit(premier.id);
        filtre.q = "";
        el.value = "";
        return majTicket();
      }
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        return zone.querySelector(".cs-tuile")?.focus();
      }
      if (ev.key === "Escape" && el.value) {
        ev.preventDefault();
        filtre.q = "";
        el.value = "";
        return majPartie("cs-tuiles", tuilesHtml());
      }
    }
    // Grille des produits : flèches pour se déplacer, comme dans un tableau
    if (el.classList?.contains("cs-tuile") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) {
      const tuiles = [...zone.querySelectorAll(".cs-tuile")];
      const i = tuiles.indexOf(el);
      const colonnes = getComputedStyle(el.parentElement).gridTemplateColumns.split(" ").length;
      const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -colonnes, ArrowDown: colonnes }[ev.key];
      ev.preventDefault();
      if (i + pas < 0) return zone.querySelector("#cs-q")?.focus();
      return tuiles[Math.min(tuiles.length - 1, i + pas)]?.focus();
    }
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey) && !fenetre().open) {
      ev.preventDefault();
      return vente.fini ? zone.querySelector('[data-cs="nouvelle"]')?.click() : ouvrirPaiement();
    }
    if (ev.key === "Escape" && !fenetre().open && vente.ajout) {
      vente.ajout = "";
      majPartie("cs-ajouts", ajoutsHtml());
      return zone.querySelector('[data-focus="aj-remise"]')?.focus();
    }
    // Raccourcis d'une lettre : seulement hors des champs de saisie et sans fenêtre ouverte
    const saisie = el.closest?.("input, textarea, select, [contenteditable]");
    if (saisie || fenetre().open || ev.ctrlKey || ev.metaKey || ev.altKey || vente.fini) return;
    const touche = ev.key.toLowerCase();
    if (touche === "/") {
      ev.preventDefault();
      return zone.querySelector("#cs-q")?.focus();
    }
    if (touche === "c") {
      ev.preventDefault();
      if (vente.clientId || vente.nouveau) {
        Object.assign(vente, { clientId: "", nouveau: null, consentement: false });
        majPartie("cs-client", clientHtml());
      }
      return zone.querySelector("#cs-client-q")?.focus();
    }
    if (touche === "r" || touche === "p") {
      ev.preventDefault();
      vente.ajout = touche === "r" ? "remise" : "code";
      majPartie("cs-ajouts", ajoutsHtml());
      zone.querySelector(touche === "r" ? "#cs-rt" : "#cs-code")?.focus();
      return zone.querySelector(".cs-ajout-form")?.scrollIntoView({ block: "nearest" });
    }
  });

  // =====================================================================
  //  Branchement
  // =====================================================================
  function monter(element, outils) {
    o = outils;
    zone = element;
    combo.ouvert = false;
    afficher();
    if (!vente.fini && !surTactile()) zone.querySelector(vente.lignes.length ? '[data-cs="encaisser"]' : "#cs-q")?.focus({ preventScroll: true });
  }
  /** Prépare une vente depuis la fiche d'un client ou une demande de devis (avant d'ouvrir l'onglet Caisse). */
  function preparer(depart = {}) {
    vente = { ...nouvelleVente(), ...depart };
    Object.assign(combo, { q: "", ouvert: false, actif: -1 });
  }
  window.AdminCaisse = { monter, preparer, totaux: () => totaux() };
})();
