// Onglet « Commandes » de l'admin et liste « À faire » de l'accueil.
// - À faire : chaque commande ou demande en cours donne son action suivante et sa date, rangées par échéance
//   (en retard, aujourd'hui, cette semaine, plus tard), avec le plan de charge de la semaine (pièces à finir par jour).
//   Les gestes simples se font d'un clic depuis la liste (maquette envoyée, relance, lien de paiement…).
// - Toutes les commandes : tableau avec recherche et filtre ; fiche d'une commande dans un tiroir, avec en tête
//   l'action suivante selon le statut et des sections repliables. Bon de commande / facture, export tableur.
// Dates en jours ouvrés (js/jours-ouvres.js) : « prête le » = validation de la maquette + délai des produits,
// ou la date fixée à la main (colonne echeance).
(function () {
  const STATUTS = {
    nouvelle: "Nouvelle",
    maquette_envoyee: "Maquette envoyée",
    retouche: "Retouche demandée",
    confirmee: "Maquette validée",
    en_fabrication: "En fabrication",
    prete: "Prête (retrait)",
    expediee: "Expédiée",
    terminee: "Terminée",
    annulee: "Annulée",
  };
  // Noms courts du fil d'avancement : il tient sur une ligne, même dans le tiroir
  const ETAPES_FIL = { nouvelle: "Reçue", maquette_envoyee: "Maquette", retouche: "Retouche", confirmee: "Validée", en_fabrication: "Fabrication", prete: "Prête", expediee: "Expédiée", terminee: "Remise" };
  const PAIEMENTS = { en_attente: "À payer", paye: "Payée", rembourse: "Remboursée" };
  const MODES = { en_ligne: "En ligne", apres_validation: "Après validation", boutique: "Sur place" };
  const CANAUX = { boutique: "Vente en boutique", telephone: "Par téléphone", salon: "Salon / marché" };
  const MOYENS = { carte: "carte bancaire", especes: "espèces", cheque: "chèque", virement: "virement", paypal: "PayPal", autre: "autre moyen" };
  const EN_COURS = ["nouvelle", "maquette_envoyee", "retouche", "confirmee", "en_fabrication", "prete", "expediee"];
  const AVANT_VALIDATION = ["nouvelle", "maquette_envoyee", "retouche"];
  const A_FABRIQUER = [...AVANT_VALIDATION, "confirmee", "en_fabrication"];
  const FILTRES = {
    en_cours: ["En cours", (c) => EN_COURS.includes(c.statut)],
    a_encaisser: ["À encaisser", (c) => c.paiement_statut === "en_attente" && c.statut !== "annulee"],
    terminees: ["Terminées", (c) => c.statut === "terminee"],
    annulees: ["Annulées", (c) => c.statut === "annulee"],
    toutes: ["Toutes", () => true],
  };
  // Objectifs internes, en jours ouvrés, pour dater les gestes qui ne dépendent pas d'un délai produit :
  // maquette après réception, retouche, relance du client, réponse à une demande. Valeurs de départ, à régler avec l'atelier.
  const OBJECTIFS = { maquette: 2, retouche: 1, relance: 3, reponse: 2 };
  const GROUPES = { retard: "En retard", aujourdhui: "Aujourd'hui", semaine: "Cette semaine", sans_date: "Date à fixer", plus_tard: "Plus tard" };

  let ctx = null; // { D, toast, echapper, euros }
  let client = null; // client Supabase
  let commandes = [];
  let demandes = []; // devis et messages sans réponse (lus seulement : ils se traitent dans l'onglet Demandes)
  let vue = "a_faire"; // page Commandes : a_faire | liste
  let filtre = "en_cours";
  let recherche = "";
  let zone = null; // page Commandes
  let accueil = null; // encadré « À faire » de l'accueil
  let minuteur = null;

  const e = (s) => ctx.echapper(s);
  // « aujourd'hui à 9h30 », « hier à 17h05 », « jeudi à 11h », puis « 12 oct. »
  const quand = (d) => {
    const t = new Date(d);
    const jours = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
    const heure = t.toLocaleTimeString("fr-FR", { hour: "numeric", minute: "2-digit" }).replace(":", "h");
    if (jours === 0) return `aujourd'hui à ${heure}`;
    if (jours === 1) return `hier à ${heure}`;
    if (jours > 1 && jours < 7) return `${t.toLocaleDateString("fr-FR", { weekday: "long" })} à ${heure}`;
    return t.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: t.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  };
  const date = (d, heure = false) =>
    d ? new Date(d).toLocaleString("fr-FR", heure ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" }) : "";

  // ---------- Dates en jours (Date locales à midi, voir js/jours-ouvres.js) ----------
  const J = () => window.JoursOuvres;
  const jourDe = (v) => (!v ? null : J().lire(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : J().iso(new Date(v))));
  const aujourdhui = () => jourDe(new Date().toISOString());
  const jourCourt = (d) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const jourLong = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  // Dimanche qui termine « cette semaine » ; le week-end, c'est la semaine qui vient
  function finSemaine(t) {
    const j = t.getDay();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() + (j === 0 ? 7 : j === 6 ? 8 : 7 - j), 12);
  }
  function groupe(d) {
    if (!d) return "sans_date";
    const t = aujourdhui();
    return d < t ? "retard" : +d === +t ? "aujourdhui" : d <= finSemaine(t) ? "semaine" : "plus_tard";
  }

  // ---------- Ce qu'on sait d'une commande ----------
  const sansEmail = (c) => String(c.client_email || "").endsWith(".invalid");
  const pieces = (c) => c.lignes.reduce((n, l) => n + (Number(l.quantite) || 1), 0);
  const nPieces = (n) => `${n} pièce${n > 1 ? "s" : ""}`;
  const dateStatut = (c, statut) => [...(c.historique || [])].reverse().find((h) => h.statut === statut)?.date || null;
  const depuis = (c, statut) => jourDe(dateStatut(c, statut) || c.cree_le);
  const souhaitee = (c) => (c.cadeau?.date ? jourDe(c.cadeau.date) : null);
  const resumePieces = (c) =>
    `${c.lignes[0]?.nom || ""}${c.lignes[0]?.quantite > 1 ? ` × ${c.lignes[0].quantite}` : ""}${c.lignes.length > 1 ? ` et ${c.lignes.length - 1} autre${c.lignes.length > 2 ? "s" : ""}` : ""}`;
  const telephone = (c) => String(c.client_tel || "").replace(/[^\d+]/g, "");
  // Remises et paiements détaillés (caisse, colonnes remises et paiements) ; anciennes commandes : le montant global seul
  function remisesDe(c) {
    if (Array.isArray(c.remises) && c.remises.length)
      return c.remises.map((r) => ({ libelle: `${r.libelle || "Remise"}${r.mode === "pourcent" ? ` (${String(r.valeur).replace(".", ",")} %)` : ""}`, montant: Number(r.montant) || 0 }));
    return Number(c.remise) ? [{ libelle: `Remise${c.code_promo ? ` (code ${c.code_promo})` : ""}`, montant: Number(c.remise) }] : [];
  }
  const nomMoyen = (m) => MOYENS[m] || m || "moyen non précisé";
  // « carte bancaire 20,00 € et espèces 14,90 € (reçu 20,00 €, rendu 5,10 €) »
  const detailPaiements = (c) =>
    (Array.isArray(c.paiements) ? c.paiements : [])
      .map((p) => `${nomMoyen(p.moyen)} ${ctx.euros(p.montant)}${Number(p.recu) > Number(p.montant) ? ` (reçu ${ctx.euros(p.recu)}, rendu ${ctx.euros(Number(p.recu) - Number(p.montant))})` : ""}`)
      .join(" et ");
  const trouver = (id) => commandes.find((c) => c.id === id);

  /**
   * Date « prête le » d'une commande :
   * - fixée à la main (colonne echeance) ;
   * - sinon validation de la maquette (ou réception de la commande) + le plus long délai de ses produits, en jours ouvrés ;
   *   avant validation, c'est une date au plus tôt (si la maquette était validée aujourd'hui) ;
   * - date null si un produit n'a pas de délai renseigné : « délai à compléter », jamais une date inventée.
   */
  function fabrication(c) {
    if (c.echeance) return { date: jourDe(c.echeance), manuelle: true };
    const avant = AVANT_VALIDATION.includes(c.statut);
    const depart = avant ? aujourdhui() : depuis(c, "confirmee");
    const produits = ctx.D?.produits || [];
    const delais = c.lignes.map((l) => Number(produits.find((p) => p.id === l.id)?.delai) || 0);
    const manquants = c.lignes.filter((_, i) => !delais[i]).map((l) => l.nom);
    if (manquants.length) return { date: null, manquants, depart };
    const delai = Math.max(...delais);
    return { date: J().ajouter(depart, delai), delai, depart, auPlusTot: avant };
  }

  // Prochaine relance : OBJECTIFS.relance jours ouvrés après le dernier envoi (ou après le dernier rappel)
  const prochaineRelance = (c, base) => J().ajouter(c.relance_le && jourDe(c.relance_le) > base ? jourDe(c.relance_le) : base, OBJECTIFS.relance);

  /** Actions en attente pour une commande : [{ commande, titre, date, geste, second, … }]. */
  function actions(c) {
    const r = [];
    const ajout = (a) => r.push({ commande: c, ...a });
    const fab = fabrication(c);
    const n = pieces(c);
    switch (c.statut) {
      case "nouvelle":
        ajout({ titre: "Envoyer la maquette", date: J().ajouter(depuis(c, "nouvelle"), OBJECTIFS.maquette), geste: { libelle: "Maquette envoyée", statut: "maquette_envoyee" } });
        break;
      case "retouche":
        ajout({ titre: "Faire la retouche", date: J().ajouter(depuis(c, "retouche"), OBJECTIFS.retouche), geste: { libelle: "Nouvelle maquette envoyée", statut: "maquette_envoyee" } });
        break;
      case "maquette_envoyee":
        ajout({
          titre: "Faire valider la maquette",
          note: `envoyée le ${jourCourt(depuis(c, "maquette_envoyee"))}${c.relance_le ? `, relancé le ${jourCourt(jourDe(c.relance_le))}` : ""}`,
          date: prochaineRelance(c, depuis(c, "maquette_envoyee")),
          geste: { libelle: "Validée", statut: "confirmee" },
          second: sansEmail(c) ? null : { libelle: "Relancer", faire: "relance" },
        });
        break;
      case "confirmee":
        ajout({ titre: `Fabriquer ${nPieces(n)}`, date: fab.date, fabrication: fab, pieces: n, geste: { libelle: "Lancer la fabrication", statut: "en_fabrication" } });
        break;
      case "en_fabrication":
        if (c.mode_reception === "livraison") ajout({ titre: `Finir et expédier ${nPieces(n)}`, date: fab.date, fabrication: fab, pieces: n, geste: { libelle: "Expédiée", faire: "ouvrir", focus: "colis" } });
        else ajout({ titre: `Finir et préparer le retrait (${nPieces(n)})`, date: fab.date, fabrication: fab, pieces: n, geste: { libelle: "Prête au retrait", statut: "prete" } });
        break;
      case "prete":
        // Le client sans email n'a pas reçu l'avis « prête » : on l'appelle, puis on le note
        if (sansEmail(c) && !(c.relance_le && jourDe(c.relance_le) >= depuis(c, "prete")))
          ajout({ titre: "Prévenir le client par téléphone", date: depuis(c, "prete"), geste: { libelle: "Prévenu", faire: "prevenu" }, appel: true });
        break;
    }
    // Paiement, une fois la maquette validée (réglé sur place : rappelé dans la fiche, à encaisser au retrait)
    const apres = ["confirmee", "en_fabrication", "prete", "expediee", "terminee"].includes(c.statut);
    if (c.paiement_statut === "en_attente" && apres) {
      const valide = depuis(c, "confirmee");
      if (c.paiement_mode === "boutique") {
        if (c.statut === "terminee") ajout({ paiement: true, titre: "Encaisser la commande", date: depuis(c, "terminee"), geste: { libelle: "Marquer payée", faire: "ouvrir", focus: "paiement" } });
      } else if (c.paiement_mode === "apres_validation" && !c.stripe_url) {
        ajout({ paiement: true, titre: "Demander le paiement", date: valide, geste: sansEmail(c) ? { libelle: "Créer le lien", faire: "ouvrir", focus: "paiement" } : { libelle: "Envoyer le lien", faire: "lien" } });
      } else {
        ajout({
          paiement: true,
          titre: "Relancer pour le paiement",
          note: c.relance_le ? `dernier rappel le ${jourCourt(jourDe(c.relance_le))}` : "",
          date: prochaineRelance(c, c.paiement_mode === "en_ligne" ? depuis(c, "nouvelle") : valide),
          geste: sansEmail(c) ? { libelle: "Marquer payée", faire: "ouvrir", focus: "paiement" } : { libelle: "Relancer", faire: "relance" },
        });
      }
    }
    return r;
  }

  const actionDemande = (d) => ({
    demande: d,
    titre: d.type === "devis" ? "Répondre au devis" : "Répondre au message",
    date: J().ajouter(jourDe(d.cree_le), OBJECTIFS.reponse),
    geste: { libelle: "Ouvrir", aller: "demandes" },
  });

  function toutesActions() {
    const liste = commandes.flatMap(actions).concat(demandes.map(actionDemande));
    const cle = (a) => (a.date ? +a.date : Infinity);
    return liste.sort((a, b) => cle(a) - cle(b) || String(a.commande?.cree_le || a.demande?.cree_le).localeCompare(String(b.commande?.cree_le || b.demande?.cree_le)));
  }

  // ---------- Plan de charge : pièces à finir par jour ouvré de la semaine ----------
  function planCharge() {
    const t = aujourdhui();
    const fin = finSemaine(t);
    const jours = [6, 5, 4, 3, 2].map((i) => new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - i, 12)); // lundi → vendredi
    const p = { jours, charge: jours.map(() => 0), retard: 0, sansDate: 0 };
    for (const c of commandes) {
      // Avant validation, seules comptent les commandes dont la date a été fixée à la main
      if (!A_FABRIQUER.includes(c.statut) || (AVANT_VALIDATION.includes(c.statut) && !c.echeance)) continue;
      const f = fabrication(c);
      const n = pieces(c);
      if (!f.date) p.sansDate += n;
      else if (f.date < t) p.retard += n;
      else {
        const i = jours.findIndex((j) => +j === +f.date);
        if (i >= 0) p.charge[i] += n;
      }
    }
    return p;
  }

  function vuePlan(p) {
    const t = aujourdhui();
    const total = p.retard + p.sansDate + p.charge.reduce((a, b) => a + b, 0);
    if (!total) return `<p class="charge-vide aide">Aucune pièce à finir cette semaine.</p>`;
    const max = Math.max(1, p.retard, ...p.charge);
    const colonne = (classe, jour, n, texte = String(n)) =>
      `<li class="${classe}"><span class="charge-jour">${jour}</span><strong>${texte}</strong><span class="cmd-cache"> ${n > 1 ? "pièces" : "pièce"}</span><span class="charge-barre" aria-hidden="true"><span style="height:${Math.round((n / max) * 100)}%"></span></span></li>`;
    return `
      <section class="charge" aria-label="Plan de charge de la semaine">
        <div class="charge-tete"><h3>Pièces à finir</h3><span class="aide">semaine du ${p.jours[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span></div>
        <ol class="charge-jours">
          ${p.retard ? colonne("charge-retard", "Retard", p.retard) : ""}
          ${p.jours
            .map((j, i) => {
              const nom = j.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
              if (J().estFerie(j)) return `<li class="charge-ferie"><span class="charge-jour">${nom}</span><strong>férié</strong></li>`;
              if (j < t) return `<li class="charge-passe"><span class="charge-jour">${nom}</span><strong aria-hidden="true">·</strong><span class="cmd-cache">passé</span></li>`;
              return colonne(+j === +t ? "charge-auj" : "", +j === +t ? `${nom}, aujourd'hui` : nom, p.charge[i]);
            })
            .join("")}
        </ol>
        ${p.sansDate ? `<p class="aide">Et ${nPieces(p.sansDate)} sans date : délai du produit à compléter, ou date à fixer dans la commande.</p>` : ""}
      </section>`;
  }

  // ---------- Liste « À faire » ----------
  function ligneAction(a) {
    const c = a.commande;
    const d = a.demande;
    const g = groupe(a.date);
    const id = c ? c.id : d.id;
    let quand = a.date ? `<time datetime="${J().iso(a.date)}">${g === "aujourdhui" ? "aujourd'hui" : jourCourt(a.date)}</time>` : "";
    if (!a.date && c)
      quand = `<label class="af-fixer"><span>Fixer</span><input type="date" data-af-date="${c.id}" aria-label="Date « prête le » de la commande ${e(c.numero)}"></label>`;
    const notes = [];
    if (c) {
      notes.push(e(c.client_nom), e(resumePieces(c)), `<span class="af-num">${e(c.numero)}</span>`);
      if (a.note) notes.push(e(a.note));
      if (a.fabrication?.manquants) notes.push(c.lignes.length > 1 ? `délai à compléter : ${e(a.fabrication.manquants.join(", "))}` : "délai du produit à compléter");
      const s = souhaitee(c);
      if (s && a.fabrication && (!a.date || a.date > s)) notes.push(`<b>souhaitée pour le ${jourCourt(s)}</b>`);
      if (a.appel && c.client_tel) notes.push(e(c.client_tel));
    } else notes.push(e(d.nom), ...(d.sujet ? [e(d.sujet)] : []), ...(d.quantite ? [`${d.quantite} pièces`] : []));
    const bouton = (gs, principal) =>
      !gs ? ""
      : gs.aller ? `<button type="button" class="mini${principal ? " af-principal" : ""}" data-aller="${gs.aller}">${gs.libelle}</button>`
      : `<button type="button" class="mini${principal ? " af-principal" : ""}" data-af="${gs.statut ? "statut" : gs.faire}" data-id="${id}"${gs.statut ? ` data-statut="${gs.statut}"` : ""}${gs.focus ? ` data-focus="${gs.focus}"` : ""}>${gs.libelle}</button>`;
    return `
      <li class="af-ligne af-${g}">
        <span class="af-quand">${quand}</span>
        <button type="button" class="af-quoi" ${c ? `data-af="ouvrir" data-id="${id}"` : `data-aller="demandes"`}>
          <strong>${e(a.titre)}</strong><span>${notes.join(" · ")}</span>
        </button>
        <span class="af-gestes">${a.appel && c.client_tel ? `<a class="mini" href="tel:${e(telephone(c))}">Appeler</a>` : ""}${bouton(a.second, false)}${bouton(a.geste, true)}</span>
      </li>`;
  }

  function groupesHtml(liste, { replier = false } = {}) {
    const par = {};
    for (const a of liste) (par[groupe(a.date)] ??= []).push(a);
    return Object.keys(GROUPES)
      .filter((g) => par[g])
      .map((g) => {
        const tete = `<h3>${GROUPES[g]} <span class="af-compte">${par[g].length}</span></h3>${g === "sans_date" ? `<span class="aide">Délai du produit à compléter (onglet Produits), ou date à fixer ici.</span>` : ""}`;
        const corps = `<ul class="af-liste">${par[g].map(ligneAction).join("")}</ul>`;
        // « Plus tard » se replie quand il y a plus pressé
        if (g === "plus_tard" && replier && Object.keys(par).length > 1) return `<details class="af-groupe af-g-${g}"><summary class="af-tete">${tete}</summary>${corps}</details>`;
        return `<section class="af-groupe af-g-${g}"><div class="af-tete">${tete}</div>${corps}</section>`;
      })
      .join("");
  }

  const VIDE = `<p class="af-vide">Rien à faire pour l'instant : aucune commande en attente, aucune demande sans réponse.</p>`;

  function vueAFaire() {
    const liste = toutesActions();
    return `${vuePlan(planCharge())}${liste.length ? groupesHtml(liste, { replier: true }) : VIDE}`;
  }

  function afficherAccueil() {
    if (!accueil || !document.contains(accueil)) return;
    const liste = toutesActions();
    const proches = liste.filter((a) => groupe(a.date) !== "plus_tard");
    const montrees = proches.slice(0, 8);
    const reste = liste.length - montrees.length;
    accueil.innerHTML = `
      ${vuePlan(planCharge())}
      ${montrees.length ? groupesHtml(montrees) : liste.length ? `<p class="af-vide">Rien d'urgent cette semaine.</p>` : VIDE}
      <div class="af-pied">
        <span class="aide">${reste ? `${reste} autre${reste > 1 ? "s" : ""} action${reste > 1 ? "s" : ""} dans Commandes.` : ""}</span>
        <span class="raccourcis"><button class="btn btn-ligne" data-aller="commandes">Toutes les commandes</button><button class="btn" data-aller="caisse">+ Nouvelle vente</button></span>
      </div>`;
  }

  // ---------- Page Commandes ----------
  const S = () => window.AdminServeur;
  const initialiser = () => (client = S().client(ctx.D));
  const appelAdmin = (action, corps) => S().appel(ctx.D, action, corps);
  const ecranConnexion = (erreur = "") => S().ecranConnexion(zone, ctx, charger, erreur);

  async function lire() {
    const [cmd, dem] = await Promise.all([
      client.from("commandes").select("*").order("cree_le", { ascending: false }).limit(500),
      client.from("demandes").select("id,type,statut,nom,sujet,quantite,cree_le").in("statut", ["nouvelle", "en_cours"]).in("type", ["devis", "contact"]),
    ]);
    if (cmd.error) throw cmd.error;
    commandes = cmd.data;
    demandes = dem.error ? [] : dem.data; // table des demandes absente : la liste ne montre que les commandes
    majCompteur();
  }

  async function charger() {
    zone.innerHTML = `<p class="aide" style="padding:2rem 0">Chargement des commandes…</p>`;
    try {
      await lire();
    } catch (error) {
      if (/JWT|auth/i.test(error.message)) return ecranConnexion("Session expirée : reconnectez-vous.");
      zone.innerHTML = `<p class="message message-alerte">Impossible de lire les commandes (${e(error.message)}). Vérifiez l’installation (onglet Installation → Vérifier).</p>`;
      return;
    }
    afficher();
  }

  function majCompteur() {
    window.AdminPastille?.("commandes", commandes.filter((c) => c.statut === "nouvelle").length);
  }

  // Ce qu'il faut ré-afficher après un geste : la page Commandes et/ou l'accueil
  function rafraichir() {
    if (zone && document.contains(zone)) afficher();
    afficherAccueil();
  }

  function afficher() {
    const nActions = toutesActions().length;
    zone.innerHTML = `
      <div class="cmd-barre">
        <div class="cmd-vues" role="group" aria-label="Affichage">
          <button type="button" data-cmd-vue="a_faire" aria-pressed="${vue === "a_faire"}">À faire <small>${nActions}</small></button>
          <button type="button" data-cmd-vue="liste" aria-pressed="${vue === "liste"}">Toutes les commandes <small>${commandes.length}</small></button>
        </div>
        <span class="raccourcis">
          <button class="btn btn-ligne" data-cmd="actualiser">Actualiser</button>
          <button class="btn" data-aller="caisse">+ Nouvelle vente</button>
        </span>
      </div>
      ${vue === "a_faire" ? `<section class="bloc cmd-afaire">${vueAFaire()}</section>` : `
      <section class="bloc cmd-liste">
        <div class="cmd-outils">
          <input type="search" id="cmd-q" placeholder="N°, nom, téléphone, texte gravé…" value="${e(recherche)}" aria-label="Rechercher une commande" aria-keyshortcuts="/" title="Raccourci : touche /">
          <label class="cmd-filtre"><span>Afficher</span>
            <select id="cmd-filtre">${Object.entries(FILTRES).map(([k, [nom, f]]) => `<option value="${k}" ${k === filtre ? "selected" : ""}>${nom} (${commandes.filter(f).length})</option>`).join("")}</select>
          </label>
          <button class="btn btn-ligne" data-cmd="export">Exporter</button>
        </div>
        <div data-cmd-resultats>${tableau()}</div>
      </section>`}`;
  }

  function visibles() {
    const q = recherche.trim().toLowerCase();
    // Une recherche porte sur toutes les commandes (on cherche souvent un client d'il y a quelques mois)
    if (q) return commandes.filter((c) => `${c.numero} ${c.client_nom} ${c.client_email} ${c.client_tel} ${c.lignes.map((l) => `${l.nom} ${l.texte}`).join(" ")}`.toLowerCase().includes(q));
    const liste = commandes.filter(FILTRES[filtre][1]);
    if (filtre !== "en_cours") return liste;
    // En cours : la plus pressée d'abord (date « prête le »), puis les commandes sans date, puis les prêtes et expédiées
    const cle = (c) => (A_FABRIQUER.includes(c.statut) ? +(fabrication(c).date || 9e15) : Infinity);
    return [...liste].sort((a, b) => cle(a) - cle(b) || (a.cree_le < b.cree_le ? -1 : 1));
  }

  function celluleEcheance(c) {
    if (!A_FABRIQUER.includes(c.statut)) return `<span class="aide">${c.statut === "prete" ? "prête" : "·"}</span>`;
    const f = fabrication(c);
    const s = souhaitee(c);
    const tard = s && f.date && f.date > s;
    const jour = f.date ? (f.auPlusTot ? `<span class="aide">au plus tôt ${jourCourt(f.date)}</span>` : `<span class="${groupe(f.date) === "retard" ? "cmd-tard" : ""}">${jourCourt(f.date)}</span>`) : `<span class="aide">délai à compléter</span>`;
    return `${jour}${s ? `<small class="${tard ? "cmd-tard" : ""}">pour le ${jourCourt(s)}</small>` : ""}`;
  }

  function cellulePaiement(c) {
    if (c.paiement_statut === "paye") return "Payée";
    if (c.paiement_statut === "rembourse") return `<span class="aide">Remboursée</span>`;
    if (c.statut === "annulee") return `<span class="aide">·</span>`;
    if (c.paiement_mode === "boutique" && c.statut !== "terminee") return "Au retrait";
    return `<span class="cmd-tard">À payer</span>`;
  }

  function tableau() {
    const liste = visibles();
    if (!liste.length)
      return `<p class="aide" style="padding:1.2rem 0">${recherche.trim() ? `Aucune commande ne correspond à « ${e(recherche.trim())} ».` : commandes.length ? "Aucune commande dans cette liste." : "Aucune commande pour l'instant : elles arrivent ici depuis le site, la caisse ou le téléphone."}</p>`;
    return `
      ${recherche.trim() ? `<p class="aide">${liste.length} résultat${liste.length > 1 ? "s" : ""} parmi toutes les commandes.</p>` : ""}
      <table class="cmd-table">
        <thead><tr><th scope="col">Client</th><th scope="col">Pièces</th><th scope="col">Statut</th><th scope="col">Prête le</th><th scope="col">Paiement</th><th scope="col" class="n">Total</th></tr></thead>
        <tbody>${liste
          .map(
            (c) => `
          <tr data-ouvrir="${c.id}">
            <td class="cmd-client"><button type="button" class="cmd-nom" data-af="ouvrir" data-id="${c.id}">${e(c.client_nom)}</button><small>${e(c.numero)} · ${quand(c.cree_le)}${CANAUX[c.canal] ? ` · ${CANAUX[c.canal].toLowerCase()}` : ""}</small></td>
            <td class="cmd-pieces">${e(resumePieces(c))}</td>
            <td class="cmd-statut s-${c.statut}">${STATUTS[c.statut]}</td>
            <td class="cmd-echeance">${celluleEcheance(c)}</td>
            <td class="cmd-paiement">${cellulePaiement(c)}</td>
            <td class="n cmd-total">${ctx.euros(c.total)}</td>
          </tr>`
          )
          .join("")}</tbody>
      </table>`;
  }

  // ---------- Gestes (depuis la liste ou la fiche) ----------
  async function changerStatut(c, statut, { prevenir = true, message = "", modif = {} } = {}) {
    const avant = c.statut;
    const { data, error } = await client.from("commandes").update({ ...modif, statut }).eq("id", c.id).select().single();
    if (error) {
      ctx.toast(`Enregistrement impossible (${error.message}).`, true);
      return false;
    }
    Object.assign(c, data);
    majCompteur();
    const fait = `${c.numero} : ${c.statut !== avant ? STATUTS[c.statut].toLowerCase() : "enregistré"}`;
    if (prevenir && !sansEmail(c) && (c.statut !== avant || message)) {
      try {
        await appelAdmin("notifier", { commande_id: c.id, message });
        ctx.toast(`${fait}. Client prévenu par email.`);
      } catch (err) {
        ctx.toast(`${fait}, mais l'email n'est pas parti : ${err.message}`, true);
      }
    } else ctx.toast(`${fait}.`);
    return true;
  }

  async function relancer(c, message = "") {
    try {
      const r = await appelAdmin("notifier", { commande_id: c.id, relance: true, message });
      c.relance_le = r.relance_le || new Date().toISOString();
      ctx.toast(`Rappel envoyé à ${c.client_nom}.`);
      return true;
    } catch (err) {
      ctx.toast(err.message, true);
      return false;
    }
  }

  async function envoyerLien(c, message = "") {
    const r = await appelAdmin("lien_paiement", { commande_id: c.id, envoyer: !sansEmail(c), message });
    c.stripe_url = r.url;
    if (r.email_envoye) c.relance_le = new Date().toISOString();
    return r;
  }

  async function modifier(c, modif, message) {
    const { data, error } = await client.from("commandes").update(modif).eq("id", c.id).select().single();
    if (error) {
      ctx.toast(`Enregistrement impossible (${error.message}).`, true);
      return false;
    }
    Object.assign(c, data);
    if (message) ctx.toast(message);
    return true;
  }

  async function gererClic(ev) {
    const v = ev.target.closest("[data-cmd-vue]");
    if (v) {
      vue = v.dataset.cmdVue;
      return afficher();
    }
    const b = ev.target.closest("[data-af]");
    const ligne = ev.target.closest("tr[data-ouvrir]");
    if (!b && ligne && !ev.target.closest("a, button, input, select, label")) return detail(trouver(ligne.dataset.ouvrir));
    if (b) {
      const c = trouver(b.dataset.id);
      if (!c) return;
      const a = b.dataset.af;
      if (a === "ouvrir") return detail(c, { focus: b.dataset.focus });
      b.disabled = true;
      let ok = false;
      if (a === "statut") ok = await changerStatut(c, b.dataset.statut);
      if (a === "relance") ok = await relancer(c);
      if (a === "prevenu") ok = await modifier(c, { relance_le: new Date().toISOString() }, `${c.client_nom} : prévenu par téléphone.`);
      if (a === "lien") {
        try {
          const r = await envoyerLien(c);
          ok = true;
          ctx.toast(r.email_envoye ? `Lien de paiement envoyé à ${c.client_nom}.` : "Lien créé, mais l'email n'est pas parti : ouvrez la commande pour le copier.", !r.email_envoye);
        } catch (err) {
          ctx.toast(err.message, true);
        }
      }
      b.disabled = false;
      if (ok) rafraichir();
      return;
    }
    const cmd = ev.target.closest("[data-cmd]");
    if (cmd?.dataset.cmd === "actualiser") charger();
    if (cmd?.dataset.cmd === "export") exporter();
  }

  async function gererChangement(ev) {
    const t = ev.target;
    if (t.id === "cmd-filtre") {
      filtre = t.value;
      return afficher();
    }
    if (t.dataset.afDate && t.value) {
      const c = trouver(t.dataset.afDate);
      if (c && (await modifier(c, { echeance: t.value }, `${c.numero} : prête le ${jourLong(J().lire(t.value))}.`))) rafraichir();
    }
  }

  // ---------- Fiche d'une commande (tiroir) ----------
  function fil(c) {
    if (c.statut === "annulee") return `<p class="cmd-annulee">Commande annulée</p>`;
    const etapes = ["nouvelle", "maquette_envoyee", "confirmee", "en_fabrication", c.mode_reception === "livraison" ? "expediee" : "prete", "terminee"];
    const rang = etapes.indexOf(c.statut === "retouche" ? "maquette_envoyee" : c.statut);
    const nom = (s) => (s === "maquette_envoyee" && c.statut === "retouche" ? ETAPES_FIL.retouche : ETAPES_FIL[s]);
    const etat = (i) => (i < rang || (i === rang && c.statut === "terminee") ? "faite" : i === rang ? "en-cours" : "");
    return `
      <div class="fil">
        <p class="fil-court" aria-hidden="true">Étape ${rang + 1} sur ${etapes.length} · <strong>${nom(etapes[rang])}</strong></p>
        <ol class="fil-etapes" aria-label="Avancement de la commande">${etapes.map((s, i) => `<li class="${etat(i)}${s === "maquette_envoyee" && c.statut === "retouche" ? " retouche" : ""}"${i === rang ? ' aria-current="step"' : ""}>${nom(s)}</li>`).join("")}</ol>
      </div>`;
  }

  // L'étape suivante : ce qu'il y a à faire, pour quand, et les boutons qui le font
  function etapeSuivante(c) {
    const a = actions(c);
    const principale = a[0];
    const paiement = a.find((x) => x.paiement);
    const B = (libelle, statut) => ({ libelle, statut });
    const pourLe = (x) => (x?.date ? `${groupe(x.date) === "retard" ? "en retard : prévu le" : "d'ici le"} ${jourLong(x.date)}` : "");
    const payer = { libelle: "Marquer payée", faire: "payer" };
    const gestePaiement = !paiement ? [] : paiement.geste.faire === "lien" ? [{ libelle: "Envoyer le lien de paiement", faire: "lien" }] : paiement.geste.faire === "relance" ? [{ libelle: "Relancer pour le paiement", faire: "relance" }] : [payer];
    const enAttente = c.paiement_statut === "en_attente";
    switch (c.statut) {
      case "nouvelle":
        return { titre: "Envoyer la maquette", quand: pourLe(principale), aide: "Une fois la maquette envoyée au client, notez-le ici : il reçoit un email qui l'invite à la valider.", boutons: [B("Maquette envoyée", "maquette_envoyee")] };
      case "retouche":
        return { titre: "Faire la retouche", quand: pourLe(principale), boutons: [B("Nouvelle maquette envoyée", "maquette_envoyee")] };
      case "maquette_envoyee":
        return { titre: "Faire valider la maquette", quand: `Maquette ${principale.note} · ${groupe(principale.date) === "retard" ? "en retard : relance prévue le" : "relance prévue le"} ${jourLong(principale.date)}`, boutons: [B("Maquette validée", "confirmee"), B("Retouche demandée", "retouche"), ...(sansEmail(c) ? [] : [{ libelle: "Relancer le client", faire: "relance" }])] };
      case "confirmee":
        return { titre: `Fabriquer ${nPieces(pieces(c))}`, boutons: [B("Lancer la fabrication", "en_fabrication"), ...gestePaiement], prete: true };
      case "en_fabrication":
        return c.mode_reception === "livraison"
          ? { titre: "Finir et expédier", aide: "Ajoutez le numéro de suivi dans Livraison avant de marquer la commande expédiée.", boutons: [B("Marquer expédiée", "expediee"), ...gestePaiement], prete: true }
          : { titre: "Finir et préparer le retrait", boutons: [B("Prête au retrait", "prete"), ...gestePaiement], prete: true };
      case "prete":
        return {
          titre: "Remettre la commande au client",
          quand: enAttente ? (c.paiement_mode === "boutique" ? `À encaisser au retrait : ${ctx.euros(c.total)}` : `Reste à payer : ${ctx.euros(c.total)}`) : "",
          boutons: [...(enAttente ? [payer] : []), B("Remise au client", "terminee"), ...(a.some((x) => x.appel) ? [{ libelle: "Client prévenu par téléphone", faire: "prevenu" }] : [])],
        };
      case "expediee":
        return { titre: "En cours de livraison", quand: c.suivi_colis ? `Colis ${c.suivi_colis}` : "", boutons: [B("Livrée au client", "terminee"), ...gestePaiement] };
      case "terminee":
        return enAttente ? { titre: "Encaisser la commande", quand: `Reste à payer : ${ctx.euros(c.total)}`, boutons: [payer] } : null;
      default:
        return null;
    }
  }

  function selectMoyen(id) {
    return `<select id="${id}" aria-label="Moyen de paiement" class="cmd-moyen">${Object.entries(MOYENS).filter(([k]) => k !== "paypal").map(([k, v]) => `<option value="${k}">${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select>`;
  }

  function blocEtape(c) {
    const et = etapeSuivante(c);
    if (!et) return "";
    const f = fabrication(c);
    const s = souhaitee(c);
    const bouton = (b, i) =>
      b.faire === "payer"
        ? `<span class="cmd-payer">${selectMoyen("cmd-moyen-etape")}<button type="button" class="btn ${i ? "btn-ligne" : ""}" data-action-cmd="paye">${b.libelle}</button></span>`
        : `<button type="button" class="btn ${i ? "btn-ligne" : ""}" data-action-cmd="${b.statut ? "statut" : b.faire}"${b.statut ? ` data-statut="${b.statut}"` : ""}>${b.libelle}</button>`;
    const avecStatut = et.boutons.some((b) => b.statut);
    // Date « prête le » : calculée ou fixée à la main, modifiable ici jusqu'à la fin de la fabrication.
    // Avant validation de la maquette, une simple indication (la date se fixe une fois la maquette validée).
    const avant = AVANT_VALIDATION.includes(c.statut) && !f.manuelle;
    const prete = avant
      ? f.date || s
        ? `<p class="aide">${f.date ? `Prête au plus tôt le ${jourLong(f.date)} si la maquette est validée aujourd'hui.` : ""}${s ? `<span class="${f.date && f.date > s ? "cmd-tard" : ""}"> Souhaitée par le client pour le ${jourLong(s)}.</span>` : ""}</p>`
        : ""
      : A_FABRIQUER.includes(c.statut)
      ? `<div class="cmd-prete">
          <label for="cmd-echeance">Prête le</label>
          <input type="date" id="cmd-echeance" value="${f.date ? J().iso(f.date) : ""}">
          <span class="aide">${
            f.manuelle ? `date fixée à la main · <button type="button" class="cmd-lien-texte" data-action-cmd="echeance-auto">revenir au calcul</button>`
            : f.date ? `${dateStatut(c, "confirmee") ? "validée" : "reçue"} le ${jourCourt(f.depart)} + ${f.delai} jour${f.delai > 1 ? "s" : ""} ouvré${f.delai > 1 ? "s" : ""}`
            : `délai à compléter pour ${e(f.manquants.join(", "))} (onglet Produits), ou date à fixer`
          }</span>
          ${s ? `<span class="${f.date && f.date > s ? "cmd-tard" : "aide"}">Souhaitée par le client pour le ${jourLong(s)}${f.date && f.date > s ? " : après la date prévue" : ""}</span>` : ""}
        </div>`
      : "";
    return `
      <section class="cmd-etape" aria-labelledby="cmd-etape-titre">
        <div class="cmd-etape-tete">
          <p class="etiquette">Prochaine étape</p>
          <h3 id="cmd-etape-titre">${e(et.titre)}</h3>
          ${et.quand ? `<p class="${/retard/.test(et.quand) ? "cmd-tard" : "aide"}">${e(et.quand)}</p>` : ""}
        </div>
        ${prete}
        <div class="cmd-gestes">${et.boutons.map(bouton).join("")}</div>
        ${et.aide ? `<p class="aide">${e(et.aide)}</p>` : ""}
        ${avecStatut ? (sansEmail(c) ? `<p class="aide">Pas d'email pour ce client : prévenez-le par téléphone.</p>` : `
          <div class="cmd-prevenir">
            <label class="case"><input type="checkbox" id="cmd-prevenir" checked> Prévenir le client par email</label>
            <details><summary>Ajouter un message</summary><textarea id="cmd-message" rows="2" aria-label="Message au client" placeholder="Ex. : la maquette est en pièce jointe de notre précédent email."></textarea></details>
          </div>`) : ""}
        <div id="cmd-lien"></div>
      </section>`;
  }

  function detail(c, { focus = "" } = {}) {
    if (!c) return;
    const f = document.getElementById("fenetre");
    const tel = telephone(c);
    const wa = tel ? `https://wa.me/${tel.startsWith("0") ? "33" + tel.slice(1) : tel.replace("+", "")}` : "";
    const livraison = c.mode_reception === "livraison";
    const enAttente = c.paiement_statut === "en_attente" && c.statut !== "annulee";
    const s = souhaitee(c);
    const ouvert = (oui) => (oui ? "open" : "");
    const n = pieces(c);
    const ville = (c.adresse || "").match(/\b\d{5}\s+([^\n,]+)\s*$/)?.[1] || (c.adresse || "").split("\n").pop();
    const ligneMontant = (libelle, valeur) => `<div><dt>${libelle}</dt><dd>${valeur}</dd></div>`;
    f.classList.add("tiroir-commande"); // retirée à la fermeture : la même fenêtre sert aux autres onglets
    f.innerHTML = `
      <form method="dialog" id="form-commande" class="cmd-fiche">
        <header class="cmd-tete">
          <div class="cmd-tete-texte">
            <p class="etiquette">${e(c.numero)} · ${CANAUX[c.canal] ? `${CANAUX[c.canal].toLowerCase()} ` : "reçue "}${quand(c.cree_le)}</p>
            <h2>${e(c.client_nom)}</h2>
          </div>
          <div class="cmd-tete-droite">
            <strong class="cmd-montant">${ctx.euros(c.total)}</strong>
            <button type="button" class="mini" data-action-cmd="fermer" aria-label="Fermer la fiche">✕</button>
          </div>
          <p class="cmd-contact">
            ${sansEmail(c) ? `<span class="aide">Pas d'email</span>` : `<a href="mailto:${e(c.client_email)}?subject=${encodeURIComponent("Votre commande " + c.numero)}">${e(c.client_email)}</a>`}
            ${c.client_tel ? `<a href="tel:${e(tel)}">${e(c.client_tel)}</a>${wa ? `<a href="${e(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}` : ""}
          </p>
        </header>

        ${fil(c)}
        ${blocEtape(c)}

        <details class="cmd-section" ${ouvert(A_FABRIQUER.includes(c.statut))}>
          <summary><h3>Pièces et personnalisation</h3><span class="cmd-resume">${nPieces(n)} · ${e(resumePieces(c))}</span></summary>
          <div class="cmd-corps">
            ${c.lignes
              .map(
                (l, i) => `
              <div class="cmd-piece">
                <div class="cmd-piece-tete"><strong>${e(l.nom)}</strong><span>× ${l.quantite}</span><span class="n">${ctx.euros(l.total)}</span></div>
                ${l.variante ? `<span class="aide">${e(l.variante)}</span>` : ""}
                ${l.texte ? `<p class="cmd-texte"><span class="etiquette">Texte à graver${l.police ? ` · police ${e(l.police)}` : ""}</span><span class="cmd-grave">« ${e(l.texte)} »</span></p>` : ""}
                ${l.remarque ? `<p>Précisions : ${e(l.remarque)}</p>` : ""}
                ${l.photo_chemin ? `<div class="cmd-photo" data-ligne="${i}"><span class="aide">Photo jointe : ${e(l.photo_nom)} (chargement…)</span></div>` : ""}
              </div>`
              )
              .join("")}
            ${c.message ? `<p class="encart">Message du client : ${e(c.message)}</p>` : ""}
            ${c.cadeau?.emballage || c.cadeau?.message ? `<p class="encart">Cadeau : ${c.cadeau.emballage ? "emballage cadeau. " : ""}${c.cadeau.message ? `Carte : « ${e(c.cadeau.message)} »` : ""}</p>` : ""}
          </div>
        </details>

        <details class="cmd-section" data-section="paiement" ${ouvert((enAttente && !["prete", "terminee"].includes(c.statut)) || focus === "paiement")}>
          <summary><h3>Paiement</h3><span class="cmd-resume">${PAIEMENTS[c.paiement_statut]}${c.paye_le ? ` le ${date(c.paye_le)}` : ""}${c.paiement_moyen ? ` · ${MOYENS[c.paiement_moyen] || e(c.paiement_moyen)}` : ""} · ${MODES[c.paiement_mode].toLowerCase()}</span></summary>
          <div class="cmd-corps">
            <dl class="cmd-faits">
              ${Number(c.remise) || Number(c.port) || Number(c.emballage) ? ligneMontant("Sous-total", ctx.euros(c.sous_total)) : ""}
              ${remisesDe(c).map((r) => ligneMontant(e(r.libelle), `− ${ctx.euros(r.montant)}`)).join("")}
              ${Number(c.port) ? ligneMontant("Livraison", ctx.euros(c.port)) : ""}
              ${Number(c.emballage) ? ligneMontant("Emballage cadeau", ctx.euros(c.emballage)) : ""}
              ${ligneMontant("Total", `<strong>${ctx.euros(c.total)}</strong>`)}
              ${ligneMontant("Mode", MODES[c.paiement_mode])}
              ${c.paiements?.length ? ligneMontant("Réglé", e(detailPaiements(c))) : ""}
              ${c.facture_numero ? ligneMontant("Facture", e(c.facture_numero)) : ""}
            </dl>
            <div class="raccourcis">
              ${c.paiement_statut === "rembourse" ? `<p class="aide">Commande remboursée. Si le client doit payer à nouveau, faites une nouvelle vente depuis la caisse.</p>` : ""}
              ${c.paiement_statut === "en_attente" && c.statut === "annulee" ? `<p class="aide">Commande annulée : rien à encaisser.</p>` : ""}
              ${enAttente ? `<button type="button" class="btn btn-ligne" data-action-cmd="lien">${sansEmail(c) ? "Créer un lien de paiement par carte" : c.stripe_url ? "Renvoyer le lien de paiement" : "Envoyer un lien de paiement par carte"}</button>
              <span class="cmd-payer">${selectMoyen("cmd-moyen")}<button type="button" class="btn btn-ligne" data-action-cmd="paye">Marquer payée</button></span>` : ""}
              ${c.paiement_statut === "paye" ? `<button type="button" class="btn btn-ligne" data-action-cmd="rembourse">Marquer remboursée</button>` : ""}
            </div>
          </div>
        </details>

        <details class="cmd-section" ${ouvert(["en_fabrication", "prete", "expediee"].includes(c.statut) && livraison || focus === "colis")}>
          <summary><h3>${livraison ? "Livraison" : "Retrait à la boutique"}</h3><span class="cmd-resume">${livraison ? (c.suivi_colis ? `colis ${e(c.suivi_colis)}` : e(ville)) : s ? `souhaitée pour le ${jourCourt(s)}` : "gratuit"}</span></summary>
          <div class="cmd-corps">
            ${c.adresse ? `<p style="white-space:pre-line">${e(c.adresse)}</p>` : ""}
            ${s ? `<p>Souhaitée pour le <strong>${jourLong(s)}</strong></p>` : ""}
            ${livraison ? `<div class="champ"><label for="cmd-colis">N° de suivi du colis</label><input type="text" id="cmd-colis" value="${e(c.suivi_colis)}" placeholder="Colissimo, Mondial Relay…"></div>` : `<p class="aide">Le client vient chercher sa commande à la boutique.</p>`}
          </div>
        </details>

        <details class="cmd-section">
          <summary><h3>Notes et historique</h3><span class="cmd-resume">${c.notes ? "note interne · " : ""}${(c.historique || []).length} étape${(c.historique || []).length > 1 ? "s" : ""}</span></summary>
          <div class="cmd-corps">
            <div class="champ"><label for="cmd-notes">Notes internes (jamais visibles par le client)</label><textarea id="cmd-notes" rows="3">${e(c.notes)}</textarea></div>
            <ol class="cmd-historique">
              ${(c.historique || []).map((h) => `<li><span>${date(h.date, true)}</span>${STATUTS[h.statut] || e(h.statut)}</li>`).join("")}
              ${c.relance_le ? `<li><span>${date(c.relance_le, true)}</span>Dernier rappel au client</li>` : ""}
            </ol>
            <div class="champ"><label for="cmd-statut">Corriger le statut</label><select id="cmd-statut">${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${k === c.statut ? "selected" : ""}>${v}</option>`).join("")}</select><small>Pour revenir en arrière ou annuler la commande. Enregistrez ensuite.</small></div>
          </div>
        </details>

        <div class="fenetre-pied cmd-pied">
          <button type="button" class="btn btn-ligne" data-action-cmd="bon">Bon de commande</button>
          ${c.facture_numero ? `<button type="button" class="btn btn-ligne" data-action-cmd="facture">Facture</button>` : ""}
          <button type="submit" class="btn">Enregistrer</button>
        </div>
      </form>`;

    const form = f.querySelector("#form-commande");
    const champ = (sel) => f.querySelector(sel);
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const modif = { notes: champ("#cmd-notes").value };
      if (champ("#cmd-colis")) modif.suivi_colis = champ("#cmd-colis").value.trim();
      const ok = await changerStatut(c, champ("#cmd-statut").value, { prevenir: !!champ("#cmd-prevenir")?.checked, message: champ("#cmd-message")?.value.trim() || "", modif });
      if (!ok) return;
      f.close();
      rafraichir();
    };
    form.addEventListener("change", async (ev) => {
      if (ev.target.id !== "cmd-echeance") return;
      const v = ev.target.value;
      if (await modifier(c, { echeance: v || null }, v ? `Prête le ${jourLong(J().lire(v))}.` : "Date calculée rétablie.")) {
        detail(c);
        rafraichir();
      }
    });
    f.onclick = async (ev) => {
      const b = ev.target.closest("[data-action-cmd]");
      if (!b) return;
      const a = b.dataset.actionCmd;
      if (a === "fermer") return f.close();
      if (a === "statut") {
        champ("#cmd-statut").value = b.dataset.statut;
        return form.requestSubmit();
      }
      if (a === "bon" || a === "facture") return imprimer(c, a);
      if (a === "echeance-auto") {
        if (await modifier(c, { echeance: null }, "Date calculée rétablie.")) {
          detail(c);
          rafraichir();
        }
        return;
      }
      b.disabled = true;
      if (a === "relance" && (await relancer(c, champ("#cmd-message")?.value.trim() || ""))) {
        detail(c);
        rafraichir();
      }
      if (a === "prevenu" && (await modifier(c, { relance_le: new Date().toISOString() }, `${c.client_nom} : prévenu par téléphone.`))) {
        detail(c);
        rafraichir();
      }
      if (a === "lien") {
        try {
          const champMessage = champ("#cmd-message");
          const r = await envoyerLien(c, champMessage?.value.trim() || "");
          if (champMessage && r.email_envoye) champMessage.value = ""; // déjà parti avec le lien : pas une deuxième fois avec le statut
          const lien = r.lien || r.url; // lien durable (page de suivi), le lien Stripe direct expire en 24 h
          champ("#cmd-lien").innerHTML = `
            <p class="message">${r.email_envoye ? "Lien envoyé au client par email." : "Lien créé : transmettez-le au client (SMS, WhatsApp…)."}</p>
            <div class="barre"><input type="text" readonly value="${e(lien)}" aria-label="Lien de paiement"><button type="button" class="mini" id="copier-lien">Copier</button></div>`;
          champ("#copier-lien").onclick = () => navigator.clipboard.writeText(lien).then(() => ctx.toast("Lien copié."));
          champ("#cmd-lien").scrollIntoView({ block: "nearest" });
          rafraichir();
        } catch (err) {
          ctx.toast(err.message, true);
        }
      }
      if (a === "paye" || a === "rembourse") {
        if (!confirm(a === "paye" ? `Confirmer que ${c.client_nom} a réglé ${ctx.euros(c.total)} ?` : "Confirmer le remboursement de cette commande ?")) {
          b.disabled = false;
          return;
        }
        const moyen = b.closest(".cmd-payer")?.querySelector("select")?.value || "";
        if (await modifier(c, a === "paye" ? { paiement_statut: "paye", paye_le: new Date().toISOString(), paiement_moyen: moyen } : { paiement_statut: "rembourse" }, a === "paye" ? `${c.numero} : payée.` : `${c.numero} : remboursée.`)) {
          detail(c);
          rafraichir();
        }
      }
      if (document.contains(b)) b.disabled = false;
    };
    if (!f.open) f.showModal();
    if (focus === "colis") champ("#cmd-colis")?.focus();
    if (focus === "paiement") champ("#cmd-moyen")?.focus();
    chargerPhotos(c, f);
  }

  // Photos envoyées par le client : vignettes cliquables dans la fiche (liens temporaires du serveur)
  async function chargerPhotos(c, f) {
    if (!c.lignes.some((l) => l.photo_chemin)) return;
    try {
      const { photos } = await appelAdmin("photos", { commande_id: c.id });
      for (const p of photos) {
        const el = f.querySelector(`.cmd-photo[data-ligne="${p.ligne}"]`);
        if (!el) continue;
        const url = window.MTB_DEMO ? await window.MTB_DEMO.lienPhoto(p.url) : p.url; // démo : photo gardée dans ce navigateur
        el.innerHTML = `<a href="${e(url)}" target="_blank" rel="noopener"><img src="${e(url)}" alt="Photo envoyée par le client : ${e(p.nom)}" width="96" height="96" loading="lazy"></a>
          <span><span class="aide">${e(p.nom)}</span><br><a href="${e(url)}" target="_blank" rel="noopener" download="${e(p.nom)}">Ouvrir / télécharger</a></span>`;
        el.querySelector("img").onerror = (ev) => ev.target.closest("a").remove(); // format que le navigateur n'affiche pas (HEIC…) : le lien suffit
      }
    } catch (err) {
      f.querySelectorAll(".cmd-photo .aide").forEach((x) => (x.textContent = `Photo jointe : lien indisponible (${err.message}).`));
    }
  }

  // ---------- Bon de commande / facture imprimable ----------
  function imprimer(c, type) {
    const S = ctx.D.site;
    const facture = type === "facture";
    const pret = !facture && A_FABRIQUER.includes(c.statut) ? fabrication(c).date : null;
    const lignes = c.lignes
      .map((l) => `<tr><td>${e(l.nom)}${l.variante ? `<br><small>${e(l.variante)}</small>` : ""}${!facture && l.texte ? `<br><small>Texte : « ${e(l.texte)} » ${e(l.police)}</small>` : ""}${!facture && l.remarque ? `<br><small>${e(l.remarque)}</small>` : ""}</td><td class="n">${l.quantite}</td><td class="n">${ctx.euros(l.prix_unitaire)}</td><td class="n">${ctx.euros(l.total)}</td></tr>`)
      .join("");
    const w = open("", "_blank");
    if (!w) return ctx.toast("Autorisez les fenêtres pop-up pour imprimer.", true);
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${facture ? "Facture " + e(c.facture_numero) : "Bon de commande " + e(c.numero)}</title>
      <style>body{font:14px/1.5 Arial,sans-serif;color:#1b1a17;max-width:760px;margin:30px auto;padding:0 20px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left;vertical-align:top}.n{text-align:right;white-space:nowrap}.tete{display:flex;justify-content:space-between;gap:20px}.total td{font-weight:bold;border:0}small{color:#5f5a52}.mention{color:#5f5a52;font-size:12px;margin-top:30px}@media print{button{display:none}}</style></head><body>
      <div class="tete">
        <div><img src="${new URL("img/logo-email.png", location.href).href}" alt="" width="90"><br><strong>${e(S.nom)}</strong><br>${e(S.adresse)}<br>${e(S.telephone)} · ${e(S.email)}${S.siret ? `<br>SIRET : ${e(S.siret)}` : ""}</div>
        <div style="text-align:right"><h1>${facture ? "Facture" : "Bon de commande"}</h1><strong>${facture ? e(c.facture_numero) : e(c.numero)}</strong><br>${facture ? `Date : ${date(c.paye_le)}<br>Commande ${e(c.numero)}` : `Date : ${date(c.cree_le)}${pret ? `<br>Prête le : ${jourLong(pret)}` : ""}`}</div>
      </div>
      <p style="margin-top:24px"><strong>Client :</strong><br>${e(c.client_nom)}<br>${[sansEmail(c) ? "" : c.client_email, c.client_tel].filter(Boolean).map(e).join(" · ")}${c.adresse ? `<br><span style="white-space:pre-line">${e(c.adresse)}</span>` : "<br>Retrait à la boutique"}</p>
      <table><thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>${lignes}
        ${Number(c.port) ? `<tr><td>Livraison</td><td class="n">1</td><td class="n">${ctx.euros(c.port)}</td><td class="n">${ctx.euros(c.port)}</td></tr>` : ""}
        ${Number(c.emballage) ? `<tr><td>Emballage cadeau</td><td class="n">1</td><td class="n">${ctx.euros(c.emballage)}</td><td class="n">${ctx.euros(c.emballage)}</td></tr>` : ""}
        ${remisesDe(c).map((r) => `<tr><td>${e(r.libelle)}</td><td class="n"></td><td class="n"></td><td class="n">−${ctx.euros(r.montant)}</td></tr>`).join("")}
      </tbody><tfoot>${(() => {
        // Assujetti à la TVA : détail HT / TVA / TTC (les prix du site sont TTC)
        if (S.legal?.regimeTva !== "assujetti") return `<tr class="total"><td colspan="3" class="n">Total</td><td class="n">${ctx.euros(c.total)}</td></tr>`;
        const taux = Number(S.legal.tauxTva || 20);
        const ht = Math.round((Number(c.total) / (1 + taux / 100)) * 100) / 100;
        return `<tr><td colspan="3" class="n">Total HT</td><td class="n">${ctx.euros(ht)}</td></tr><tr><td colspan="3" class="n">TVA ${String(taux).replace(".", ",")} %</td><td class="n">${ctx.euros(Number(c.total) - ht)}</td></tr><tr class="total"><td colspan="3" class="n">Total TTC</td><td class="n">${ctx.euros(c.total)}</td></tr>`;
      })()}</tfoot></table>
      ${facture ? `<p>Réglée le ${date(c.paye_le)}${c.paiements?.length ? ` : ${e(detailPaiements(c))}` : c.paiement_moyen ? ` par ${MOYENS[c.paiement_moyen] || e(c.paiement_moyen)}` : c.paiement_mode === "en_ligne" || c.stripe_session_id ? " par carte bancaire (paiement en ligne)" : ""}.</p>` : `<p>${c.cadeau?.date ? `Date souhaitée : ${new Date(c.cadeau.date).toLocaleDateString("fr-FR")}<br>` : ""}${c.cadeau?.message ? `Message carte : « ${e(c.cadeau.message)} »<br>` : ""}${c.message ? `Message client : ${e(c.message)}` : ""}</p>`}
      <p class="mention">${[S.legal?.regimeTva === "franchise" ? "TVA non applicable, article 293 B du CGI." : "", S.legal?.formeJuridique ? `${e(S.legal.exploitant || S.nom)}, ${e(S.legal.formeJuridique)}${S.siret ? ` · SIRET ${e(S.siret)}` : ""}.` : "", e(S.mentionTva || "")].filter(Boolean).join("<br>")}</p>
      <button onclick="print()">Imprimer</button>
      <script>setTimeout(() => print(), 400)<\/script></body></html>`);
    w.document.close();
  }

  // ---------- Export tableur (CSV, s'ouvre dans Excel ou LibreOffice) : la liste affichée ----------
  function exporter() {
    const champ = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const montant = (n) => String(Number(n || 0)).replace(".", ","); // virgule décimale pour Excel
    const lignes = [
      ["Numéro", "Date", "Canal", "Client", "Email", "Téléphone", "Réception", "Adresse", "Articles", "Sous-total", "Remise", "Code promo", "Livraison", "Emballage", "Total", "Statut", "Prête le", "Paiement", "Payée le", "Moyen de paiement", "Mode de paiement", "Facture"].map(champ).join(";"),
      ...visibles().map((c) => {
        const pret = A_FABRIQUER.includes(c.statut) ? fabrication(c).date : null;
        return [
          c.numero, date(c.cree_le, true), CANAUX[c.canal] || "Site internet", c.client_nom, sansEmail(c) ? "" : c.client_email, c.client_tel, c.mode_reception, c.adresse,
          c.lignes.map((l) => `${l.quantite} × ${l.nom}${l.texte ? ` (« ${l.texte} »)` : ""}`).join(" | "),
          ...[c.sous_total, c.remise].map(montant), c.code_promo || "", ...[c.port, c.emballage, c.total].map(montant),
          STATUTS[c.statut], pret ? pret.toLocaleDateString("fr-FR") : "", PAIEMENTS[c.paiement_statut], c.paye_le ? date(c.paye_le) : "", MOYENS[c.paiement_moyen] || c.paiement_moyen || "", MODES[c.paiement_mode], c.facture_numero || "",
        ].map(champ).join(";");
      }),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
  }

  // ---------- Branchement dans l'admin ----------
  function brancher(el) {
    el.onclick = gererClic;
    el.onchange = gererChangement;
  }

  async function monter(element, contexte) {
    ctx = contexte;
    zone = element;
    brancher(zone);
    zone.oninput = (ev) => {
      if (ev.target.id !== "cmd-q") return;
      recherche = ev.target.value;
      zone.querySelector("[data-cmd-resultats]").innerHTML = tableau(); // le champ de recherche garde le focus
    };
    if (!initialiser() || !(await S().connecte(ctx.D))) return ecranConnexion();
    charger();
    clearInterval(minuteur);
    minuteur = setInterval(() => (document.contains(zone) && !document.getElementById("fenetre").open && !zone.contains(document.activeElement) ? charger() : null), 90_000);
  }

  /** Encadré « À faire » de l'accueil. Renvoie false si le serveur n'est pas installé ou pas connecté. */
  async function monterAccueil(element, contexte) {
    ctx = contexte;
    if (!initialiser() || !(await S().connecte(ctx.D).catch(() => false))) return false;
    accueil = element;
    brancher(accueil);
    await lire();
    afficherAccueil();
    return true;
  }

  document.getElementById("fenetre")?.addEventListener("close", (ev) => ev.target.classList.remove("tiroir-commande"));

  // « / » : aller à la recherche des commandes
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "/" || !zone || !document.contains(zone) || document.getElementById("fenetre").open || ev.target.closest("input, textarea, select, [contenteditable]")) return;
    ev.preventDefault();
    if (vue !== "liste") {
      vue = "liste";
      afficher();
    }
    zone.querySelector("#cmd-q")?.focus();
  });

  window.AdminCommandes = {
    monter,
    accueil: monterAccueil,
    imprimer: (c, type, contexte) => {
      ctx ||= contexte;
      imprimer(c, type);
    },
  };
})();
