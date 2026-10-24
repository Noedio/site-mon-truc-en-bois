// Gestion commerciale dans l'admin (serveur Supabase requis) :
//   Caisse     : vente en boutique, commande prise par téléphone ou sur un salon (ticket / facture)
//   Clients    : fichier clients, historique d'achats, notes, étiquettes, consentement, export
//   Demandes   : devis et messages reçus depuis le site
//   Marketing  : codes promo, emails aux abonnés
//   + statistiques de ventes sur le tableau de bord
(function () {
  const MOYENS = { carte: "Carte bancaire (TPE)", especes: "Espèces", cheque: "Chèque", virement: "Virement", paypal: "PayPal", autre: "Autre" };
  const CANAUX = { boutique: "En boutique", telephone: "Par téléphone", salon: "Salon / marché" };
  const CANAUX_STATS = { site: "Site internet", boutique: "Boutique", telephone: "Téléphone", salon: "Salons" };
  const SOURCES = { site: "Site internet", boutique: "Boutique", telephone: "Téléphone", salon: "Salon / marché", newsletter: "Newsletter", autre: "Autre" };
  const ST_DEM = { nouvelle: "Nouvelle", en_cours: "En cours", repondue: "Répondue", convertie: "Devenue commande", archivee: "Archivée" };
  const TYPES_DEM = { devis: "Devis", contact: "Message", newsletter: "Newsletter" };
  const SEGMENTS = {
    tous: ["Tous", () => true],
    abonnes: ["Abonnés newsletter", (c) => c.consentement_marketing],
    fideles: ["Fidèles (2 achats ou +)", (c, s) => s.n >= 2],
    inactifs: ["Sans achat depuis 6 mois", (c, s) => s.n && Date.now() - new Date(s.derniere) > 182 * 864e5],
    prospects: ["Jamais commandé", (c, s) => !s.n],
  };
  const FILTRES_DEM = {
    a_traiter: ["À traiter", (d) => ["nouvelle", "en_cours"].includes(d.statut)],
    repondue: ["Répondues", (d) => d.statut === "repondue"],
    convertie: ["Devenues commandes", (d) => d.statut === "convertie"],
    toutes: ["Toutes", (d) => d.type !== "newsletter"],
    newsletter: ["Inscriptions newsletter", (d) => d.type === "newsletter"],
  };

  let ctx = null;
  let zone = null;
  let vue = "";
  const donnees = { clients: [], commandes: [], demandes: [], promos: [], campagnes: [] };
  const etat = { q: "", segment: "tous", etiquette: "", demandes: "a_traiter" };
  const caisseVide = () => ({ lignes: [], recherche: "", clientId: "", saisieClient: "", nouveau: { nom: "", email: "", tel: "" }, consentement: false, canal: "boutique", paye: true, moyen: "carte", remise: 0, remiseType: "euros", code: "", promo: null, reception: "retrait", port: 0, adresse: "", date: "", notes: "", demandeId: "", fini: null });
  let caisse = caisseVide();

  const S = () => window.AdminServeur;
  const sb = () => S().client(ctx.D);
  const e = (s) => ctx.echapper(s);
  const euros = (n) => ctx.euros(n);
  const arrondi = (n) => Math.round(Number(n || 0) * 100) / 100;
  const date = (d, heure = false) => (d ? new Date(d).toLocaleString("fr-FR", heure ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" }) : "");
  const fenetre = () => document.getElementById("fenetre");
  const lien = (tel) => String(tel || "").replace(/[^\d+]/g, "");
  const sansEmail = (email) => !email || email.endsWith(".invalid");
  const avatar = (nom) => `<span class="avatar" aria-hidden="true">${e(String(nom || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join(""))}</span>`;
  // Adresse du site pour les liens envoyés aux clients : l'adresse publique réglée dans Infos boutique, sinon le dossier
  // de cette page (Cloudflare Pages sert l'admin à « /admin » sans « .html » : on ne peut pas se fier au nom de la page).
  const adresseSite = () => (ctx.D.site.url ? ctx.D.site.url.replace(/\/*$/, "/") : location.origin + location.pathname.replace(/[^/]*$/, ""));

  async function lire(table, select = "*", ordre = "cree_le") {
    const { data, error } = await sb().from(table).select(select).order(ordre, { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    return data;
  }
  async function charger() {
    const besoins = {
      caisse: ["clients", "promos"],
      clients: ["clients", "commandes", "demandes"],
      demandes: ["demandes", "clients"],
      marketing: ["promos", "campagnes", "clients"],
    }[vue];
    const lecteurs = {
      clients: () => lire("clients"),
      commandes: () => lire("commandes", "id,numero,cree_le,total,statut,paiement_statut,client_id,canal"),
      demandes: () => lire("demandes"),
      promos: () => lire("codes_promo"),
      campagnes: () => lire("campagnes"),
    };
    await Promise.all(besoins.map(async (b) => (donnees[b] = await lecteurs[b]())));
    majCompteurDemandes();
  }
  function majCompteurDemandes() {
    const n = donnees.demandes.filter((d) => d.statut === "nouvelle" && d.type !== "newsletter").length;
    window.AdminPastille?.("demandes", n);
  }

  async function monter(nomVue, element, contexte) {
    ctx = contexte;
    zone = element;
    vue = nomVue;
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
    zone.innerHTML = { caisse: vueCaisse, clients: vueClients, demandes: vueDemandes, marketing: vueMarketing }[vue]();
    if (vue === "caisse") {
      majTotalCaisse();
      // Téléphone : la barre verte « Ticket » s'efface quand le ticket (et son total) est à l'écran
      const barre = zone.querySelector(".caisse-barre");
      const ticket = zone.querySelector("#cs-ticket");
      if (barre && ticket && "IntersectionObserver" in window)
        new IntersectionObserver(([x]) => barre.classList.toggle("cachee", x.isIntersecting), { threshold: 0 }).observe(ticket);
    }
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
  //  CAISSE : vente en boutique, par téléphone, sur un salon
  // =====================================================================
  // Assujetti à la TVA : les paiements en espèces doivent passer par un logiciel de caisse certifié (art. 286 du CGI).
  const especesInterdites = () => ctx.D.site.legal?.regimeTva === "assujetti";
  const produitsVendables = () => ctx.D.produits.filter((p) => p.visible !== false);
  function totauxCaisse() {
    const sous = arrondi(caisse.lignes.reduce((t, l) => t + arrondi(l.prix) * l.quantite, 0));
    // Un code promo remplace la remise saisie à la main (même calcul que sur le site)
    const p = caisse.promo;
    const remise = p
      ? arrondi(Math.min(sous, p.type === "pourcentage" ? (sous * Number(p.valeur)) / 100 : Number(p.valeur)))
      : arrondi(Math.min(sous, caisse.remiseType === "pourcent" ? (sous * Number(caisse.remise || 0)) / 100 : Number(caisse.remise || 0)));
    const port = caisse.reception === "livraison" ? arrondi(caisse.port) : 0;
    return { sous, remise, port, total: arrondi(Math.max(0, sous - remise + port)) };
  }
  function vueCaisse() {
    if (caisse.fini) {
      const c = caisse.fini;
      return `
        <section class="bloc" style="max-width:640px">
          <div class="bloc-tete"><h2>Vente enregistrée ✓</h2></div>
          <p><strong>${e(c.numero)}</strong> · ${e(c.client_nom)} · <strong>${euros(c.total)}</strong> · ${c.paiement_statut === "paye" ? `réglée (${e(MOYENS[c.paiement_moyen] || c.paiement_moyen || "")})` : "à régler"}</p>
          <div class="raccourcis">
            ${c.facture_numero ? `<button class="btn" data-crm="imprimer" data-type="facture">Imprimer la facture ${e(c.facture_numero)}</button>` : ""}
            <button class="btn ${c.facture_numero ? "btn-ligne" : ""}" data-crm="imprimer" data-type="bon">Imprimer le bon de commande</button>
            <button class="btn btn-ligne" data-crm="nouvelle-vente">Nouvelle vente</button>
            <button class="btn btn-ligne" data-aller="commandes">Voir dans les commandes</button>
          </div>
        </section>`;
    }
    const q = caisse.recherche.trim().toLowerCase();
    const produits = produitsVendables().filter((p) => !q || p.nom.toLowerCase().includes(q));
    const client = donnees.clients.find((c) => c.id === caisse.clientId);
    return `
      <div class="caisse">
        <section class="bloc">
          <div class="bloc-tete"><h2>Articles</h2></div>
          <input type="search" data-caisse="recherche" value="${e(caisse.recherche)}" placeholder="Rechercher un produit…" aria-label="Rechercher un produit">
          <div class="caisse-produits">
            ${produits.map((p) => `<button class="caisse-produit" data-crm="ajouter" data-id="${e(p.id)}">${p.images?.[0] || p.image ? `<img src="${e(p.images?.[0] || p.image)}" alt="" loading="lazy">` : ""}<span>${e(p.nom)}</span><strong>${euros(p.prix)}</strong></button>`).join("") || `<p class="aide">Aucun produit.</p>`}
          </div>
          <form class="caisse-libre" data-crm-form="libre">
            <strong>Article sur mesure</strong>
            <input name="nom" placeholder="Ex. : gravure plaque de porte" required aria-label="Désignation">
            <input name="prix" type="number" step="0.01" min="0" placeholder="Prix €" required aria-label="Prix">
            <button class="btn btn-ligne">Ajouter</button>
          </form>
        </section>

        <section class="bloc ticket" id="cs-ticket">
          <div class="bloc-tete"><div><h2>Ticket</h2><span class="aide">${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span></div>${caisse.lignes.length ? `<button class="mini" data-crm="vider">Vider le ticket</button>` : ""}</div>
          <div class="liste">
            ${caisse.lignes
              .map((l, i) => {
                const p = ctx.D.produits.find((x) => x.id === l.id);
                const choix = p?.variantes?.choix || [];
                return `<div class="ligne-edit">
                  <div class="ligne-edit-tete"><strong>${e(l.nom)}</strong><button class="mini danger" data-crm="retirer" data-i="${i}" aria-label="Retirer">✕</button></div>
                  ${choix.length ? `<select data-ligne="${i}" data-champ="variante" aria-label="${e(p.variantes.nom || "Option")}">${choix.map((c, j) => `<option value="${j}" ${l.variante === j ? "selected" : ""}>${e(p.variantes.nom || "Option")} : ${e(c.nom)}${c.prix ? ` (+${euros(c.prix)})` : ""}</option>`).join("")}</select>` : ""}
                  ${p?.options?.texte || !p ? `<input data-ligne="${i}" data-champ="texte" value="${e(l.texte)}" placeholder="Texte à graver / personnalisation" aria-label="Personnalisation">` : ""}
                  <div class="ticket-ligne">
                    <span class="quantite"><button class="mini" data-crm="moins" data-i="${i}" aria-label="Moins">−</button><strong>${l.quantite}</strong><button class="mini" data-crm="plus" data-i="${i}" aria-label="Plus">+</button></span>
                    <label>Prix unitaire <input type="number" step="0.01" min="0" data-ligne="${i}" data-champ="prix" value="${l.prix}"> €</label>
                    <strong data-total-ligne="${i}">${euros(l.prix * l.quantite)}</strong>
                  </div>
                </div>`;
              })
              .join("") || `<p class="aide" style="padding:1rem 0">Touchez un produit pour l'ajouter.</p>`}
          </div>

          <fieldset class="pile">
            <legend>Client</legend>
            <input list="crm-liste-clients" data-caisse="client" value="${client ? e(`${client.nom}${client.email ? ` · ${client.email}` : client.tel ? ` · ${client.tel}` : ""}`) : ""}" placeholder="Client existant (nom, email…) · ou laissez vide" aria-label="Client existant">
            <datalist id="crm-liste-clients">${donnees.clients.map((c) => `<option value="${e(`${c.nom}${c.email ? ` · ${c.email}` : c.tel ? ` · ${c.tel}` : ""}`)}"></option>`).join("")}</datalist>
            ${client ? `<p class="aide">Fiche : ${e(client.nom)}${client.tel ? ` · ${e(client.tel)}` : ""} <button class="mini" data-crm="sans-client" type="button">Changer</button></p>` : `
            <div class="grille-champs">
              <div class="champ"><label for="cs-nom">Nouveau client : nom</label><input id="cs-nom" data-nouveau="nom" value="${e(caisse.nouveau.nom)}" autocomplete="off"></div>
              <div class="champ"><label for="cs-tel">Téléphone</label><input id="cs-tel" type="tel" data-nouveau="tel" value="${e(caisse.nouveau.tel)}" autocomplete="off"></div>
              <div class="champ large"><label for="cs-email">Email (pour la facture et le suivi)</label><input id="cs-email" type="email" data-nouveau="email" value="${e(caisse.nouveau.email)}" autocomplete="off"></div>
            </div>`}
            <label class="case"><input type="checkbox" data-caisse="consentement" ${caisse.consentement ? "checked" : ""}> <span>Le client accepte de recevoir nos nouveautés par email</span></label>
          </fieldset>

          <fieldset class="pile">
            <legend>Vente</legend>
            <div class="filtres">${Object.entries(CANAUX).map(([k, v]) => `<button type="button" class="filtre" data-crm="canal" data-valeur="${k}" aria-pressed="${caisse.canal === k}">${v}</button>`).join("")}</div>
            <div class="filtres">
              <button type="button" class="filtre" data-crm="paye" data-valeur="1" aria-pressed="${caisse.paye}">Réglée maintenant</button>
              <button type="button" class="filtre" data-crm="paye" data-valeur="" aria-pressed="${!caisse.paye}">À régler plus tard</button>
            </div>
            ${caisse.paye ? `<div class="filtres">${Object.entries(MOYENS).filter(([k]) => k !== "especes" || !especesInterdites()).map(([k, v]) => `<button type="button" class="filtre" data-crm="moyen" data-valeur="${k}" aria-pressed="${caisse.moyen === k}">${v}</button>`).join("")}</div>${especesInterdites() ? `<p class="aide">Espèces : à enregistrer sur une caisse certifiée (obligation pour les commerces assujettis à la TVA). Ici : carte, chèque, virement.</p>` : ""}` : `<p class="aide">La commande sera « à payer » : vous pourrez envoyer un lien de paiement par carte depuis l'onglet Commandes.</p>`}
            <div class="grille-champs">
              ${caisse.promo
                ? `<div class="champ large"><span class="label">Code promo</span><p class="encart" style="margin:0">Code <strong>${e(caisse.promo.code)}</strong> (${libellePromo(caisse.promo)})${caisse.promo.description ? ` : ${e(caisse.promo.description)}` : ""} <button type="button" class="mini" data-crm="retirer-code-caisse">Retirer</button></p></div>`
                : `<div class="champ"><label for="cs-remise">Remise</label><span class="avec-unite"><input id="cs-remise" type="number" step="0.01" min="0" data-caisse="remise" value="${caisse.remise || ""}" placeholder="0"><select data-caisse="remiseType" aria-label="Type de remise"><option value="euros" ${caisse.remiseType === "euros" ? "selected" : ""}>€</option><option value="pourcent" ${caisse.remiseType === "pourcent" ? "selected" : ""}>%</option></select></span></div>
              <div class="champ"><label for="cs-code">Code promo</label><span class="code-promo"><input id="cs-code" data-caisse="code" value="${e(caisse.code)}" placeholder="Ex. BIENVENUE10" autocomplete="off" maxlength="30"><button type="button" class="btn btn-ligne" data-crm="appliquer-code-caisse">Appliquer</button></span></div>`}
              <div class="champ"><label for="cs-date">Pour le (facultatif)</label><input id="cs-date" type="date" data-caisse="date" value="${e(caisse.date)}"></div>
              <label class="case large"><input type="checkbox" data-caisse="livraison" ${caisse.reception === "livraison" ? "checked" : ""}> <span>À livrer</span></label>
              ${caisse.reception === "livraison" ? `
              <div class="champ"><label for="cs-port">Frais de livraison (€)</label><input id="cs-port" type="number" step="0.01" min="0" data-caisse="port" value="${caisse.port || ""}"></div>
              <div class="champ large"><label for="cs-adresse">Adresse de livraison</label><textarea id="cs-adresse" rows="2" data-caisse="adresse">${e(caisse.adresse)}</textarea></div>` : ""}
              <div class="champ large"><label for="cs-notes">Notes internes</label><textarea id="cs-notes" rows="2" data-caisse="notes">${e(caisse.notes)}</textarea></div>
            </div>
          </fieldset>

          <div class="ticket-pied">
            <div class="ticket-total" id="cs-total"></div>
            <button class="btn btn-plein" data-crm="encaisser" ${caisse.lignes.length ? "" : "disabled"}>Enregistrer la vente</button>
          </div>
        </section>
      </div>
      ${caisse.lignes.length ? `<a class="caisse-barre" href="#cs-ticket"><span>Ticket · ${caisse.lignes.reduce((t, l) => t + l.quantite, 0)} article${caisse.lignes.reduce((t, l) => t + l.quantite, 0) > 1 ? "s" : ""}</span><strong id="cs-barre-total"></strong></a>` : ""}`;
  }
  function majTotalCaisse() {
    const t = totauxCaisse();
    const el = zone.querySelector("#cs-total");
    if (!el) return;
    const barre = zone.querySelector("#cs-barre-total");
    if (barre) barre.textContent = euros(t.total);
    const ligne = (libelle, montant, classe = "") => `<div class="ticket-somme ${classe}"><span>${libelle}</span><span>${montant}</span></div>`;
    el.innerHTML = `${t.remise || t.port ? ligne("Sous-total", euros(t.sous)) : ""}${t.remise ? ligne(caisse.promo ? `Code ${e(caisse.promo.code)}` : "Remise", `−${euros(t.remise)}`, "remise") : ""}${t.port ? ligne("Livraison", euros(t.port)) : ""}${ligne("Total", euros(t.total), "total")}`;
    // Le bouton dit exactement ce qui va se passer, avec le montant
    const bouton = zone.querySelector('[data-crm="encaisser"]');
    if (bouton) bouton.textContent = caisse.lignes.length ? (caisse.paye ? `Encaisser ${euros(t.total)}` : `Enregistrer la vente à régler (${euros(t.total)})`) : "Enregistrer la vente";
    caisse.lignes.forEach((l, i) => {
      const x = zone.querySelector(`[data-total-ligne="${i}"]`);
      if (x) x.textContent = euros(l.prix * l.quantite);
    });
  }
  function ajouterProduit(id) {
    const p = ctx.D.produits.find((x) => x.id === id);
    if (!p) return;
    const existante = caisse.lignes.find((l) => l.id === id && !l.texte && (l.variante ?? 0) === 0);
    if (existante && !p.variantes?.choix?.length && !p.options?.texte) existante.quantite++;
    else caisse.lignes.push({ id, nom: p.nom, prix: arrondi(Number(p.prix) + Number(p.variantes?.choix?.[0]?.prix || 0)), quantite: 1, texte: "", variante: p.variantes?.choix?.length ? 0 : null });
  }
  async function encaisser() {
    const t = totauxCaisse();
    // Nom tapé dans « Client existant » sans choisir dans la liste : on retrouve la fiche si elle est unique,
    // sinon on demande de choisir (la vente ne doit pas partir sans client par erreur).
    const saisie = String(caisse.saisieClient || "").trim().toLowerCase();
    if (!caisse.clientId && saisie) {
      const trouves = donnees.clients.filter((c) => `${c.nom} ${c.email ?? ""} ${c.tel}`.toLowerCase().includes(saisie.split(" · ")[0]));
      if (trouves.length !== 1) return ctx.toast(trouves.length ? "Plusieurs clients correspondent : choisissez le bon dans la liste proposée." : "Ce client n'est pas dans le fichier : videz le champ « Client existant » et remplissez « Nouveau client ».", true);
      caisse.clientId = trouves[0].id;
    }
    const client = donnees.clients.find((c) => c.id === caisse.clientId);
    const n = caisse.nouveau;
    if (n.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.email)) return ctx.toast("Email du client invalide.", true);
    if (caisse.reception === "livraison" && !client?.adresse && !caisse.adresse.trim()) return ctx.toast("Indiquez l'adresse de livraison.", true);
    if (caisse.paye && caisse.moyen === "especes" && especesInterdites()) return ctx.toast("Les espèces doivent être enregistrées sur votre caisse certifiée.", true);
    const vente = {
      client: client ? { id: client.id } : n.nom || n.email || n.tel ? { ...n, consentement: caisse.consentement } : undefined,
      lignes: caisse.lignes.map((l) => {
        const p = ctx.D.produits.find((x) => x.id === l.id);
        const c = l.variante != null ? p?.variantes?.choix?.[l.variante] : null;
        return { id: l.id || undefined, nom: l.nom, prix_unitaire: arrondi(l.prix), quantite: l.quantite, texte: l.texte, variante: c ? `${p.variantes.nom || "Option"} : ${c.nom}` : "" };
      }),
      canal: caisse.canal,
      mode_reception: caisse.reception,
      paiement_statut: caisse.paye ? "paye" : "en_attente",
      paiement_moyen: caisse.paye ? caisse.moyen : "",
      remise: t.remise,
      code_promo: caisse.promo?.code || "",
      port: t.port,
      notes: caisse.notes,
      date_souhaitee: caisse.date,
    };
    if (client && caisse.consentement && !client.consentement_marketing)
      await sb().from("clients").update({ consentement_marketing: true, consentement_le: new Date().toISOString() }).eq("id", client.id);
    if (caisse.reception === "livraison" && caisse.adresse.trim()) {
      if (client) await sb().from("clients").update({ adresse: caisse.adresse.trim() }).eq("id", client.id);
      else vente.client = { ...(vente.client || {}), adresse: caisse.adresse.trim() };
    }
    const bouton = zone.querySelector('[data-crm="encaisser"]');
    bouton.disabled = true;
    try {
      const { commande } = await S().appel(ctx.D, "creer_commande", { vente });
      if (caisse.demandeId) await sb().from("demandes").update({ statut: "convertie", client_id: commande.client_id }).eq("id", caisse.demandeId);
      caisse = { ...caisseVide(), fini: commande };
      donnees.clients = await lire("clients").catch(() => donnees.clients);
      donnees.promos = await lire("codes_promo").catch(() => donnees.promos); // nombre d'utilisations à jour
      ctx.toast(`Vente ${commande.numero} enregistrée.`);
      afficher();
    } catch (x) {
      bouton.disabled = false;
      ctx.toast(x.message, true);
    }
  }

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
  function vueClients() {
    const st = statsClients();
    const q = etat.q.trim().toLowerCase();
    const chiffresQ = q.replace(/\D/g, ""); // « 06 12 » ou « 0612 » retrouvent le même numéro
    const etiquettes = [...new Set(donnees.clients.flatMap((c) => c.etiquettes || []))].sort();
    const liste = donnees.clients
      .filter((c) => SEGMENTS[etat.segment][1](c, st(c.id)))
      .filter((c) => !etat.etiquette || (c.etiquettes || []).includes(etat.etiquette))
      .filter((c) => !q || `${c.nom} ${c.email ?? ""} ${c.tel} ${(c.etiquettes || []).join(" ")}`.toLowerCase().includes(q) || (chiffresQ.length >= 4 && lien(c.tel).replace(/^\+33/, "0").includes(chiffresQ)));
    const abonnes = donnees.clients.filter((c) => c.consentement_marketing).length;
    const recurrents = donnees.clients.filter((c) => st(c.id).n >= 2).length;
    const acheteurs = donnees.clients.filter((c) => st(c.id).n).length;
    const ca = donnees.clients.reduce((t, c) => t + st(c.id).total, 0);
    return `
      <div class="chiffres-admin">
        <div class="chiffre"><strong>${donnees.clients.length}</strong><span>clients</span></div>
        <div class="chiffre"><strong>${abonnes}</strong><span>abonnés aux nouveautés</span></div>
        <div class="chiffre"><strong>${acheteurs ? Math.round((recurrents / acheteurs) * 100) : 0} %</strong><span>de clients fidèles (2 achats ou +)</span></div>
        <div class="chiffre"><strong>${euros(acheteurs ? ca / acheteurs : 0)}</strong><span>dépensés en moyenne par client</span></div>
      </div>
      <section class="bloc">
        <div class="bloc-tete">
          <h2>Clients <span class="aide">(${liste.length})</span></h2>
          <div class="raccourcis">
            <button class="btn" data-crm="nouveau-client">+ Nouveau client</button>
            <button class="btn btn-ligne" data-crm="export-clients">Exporter (tableur)</button>
          </div>
        </div>
        <div class="barre">
          <div class="filtres">${Object.entries(SEGMENTS).map(([k, [nom, f]]) => `<button class="filtre" data-crm="segment" data-valeur="${k}" aria-pressed="${etat.segment === k}">${nom} <small>${donnees.clients.filter((c) => f(c, st(c.id))).length}</small></button>`).join("")}</div>
          <input type="search" data-crm-q value="${e(etat.q)}" placeholder="Nom, email, téléphone, étiquette…" aria-label="Rechercher un client">
        </div>
        ${etiquettes.length ? `<div class="filtres" style="margin-bottom:.8rem">${etiquettes.map((t) => `<button class="filtre" data-crm="etiquette" data-valeur="${e(t)}" aria-pressed="${etat.etiquette === t}">#${e(t)}</button>`).join("")}</div>` : ""}
        <div class="liste">
          ${liste
            .slice(0, 300)
            .map((c) => {
              const s = st(c.id);
              return `<button class="ligne ligne-commande" data-crm="client" data-id="${c.id}">
                ${avatar(c.nom || c.email)}
                <span class="ligne-texte"><strong>${e(c.nom || "(sans nom)")}</strong><span>${[c.email, c.tel].filter(Boolean).map(e).join(" · ") || "aucun contact"}${s.derniere ? ` · dernier achat le ${date(s.derniere)}` : ""}</span></span>
                <span class="pastilles">${c.consentement_marketing ? `<span class="pastille ok">Abonné</span>` : ""}${(c.etiquettes || []).map((t) => `<span class="pastille">#${e(t)}</span>`).join("")}</span>
                <span class="prix"><strong>${euros(s.total)}</strong><small class="aide"> ${s.n} achat${s.n > 1 ? "s" : ""}</small></span>
              </button>`;
            })
            .join("") || `<p class="aide" style="padding:1.5rem 0">Aucun client ${donnees.clients.length ? "dans cette liste" : "pour l'instant : ils sont ajoutés automatiquement à chaque commande, devis ou inscription"}.</p>`}
        </div>
        ${liste.length > 300 ? `<p class="aide">300 premiers affichés : affinez la recherche.</p>` : ""}
      </section>`;
  }

  function ficheClient(id) {
    const c = id ? donnees.clients.find((x) => x.id === id) : { nom: "", email: "", tel: "", adresse: "", notes: "", etiquettes: [], source: "boutique", consentement_marketing: false };
    if (!c) return;
    const st = statsClients()(c.id);
    const achats = donnees.commandes.filter((x) => x.client_id === c.id);
    const demandes = donnees.demandes.filter((d) => d.client_id === c.id);
    const tel = lien(c.tel);
    const f = fenetre();
    const STATUTS_CMD = { nouvelle: "Nouvelle", confirmee: "Maquette validée", en_fabrication: "En fabrication", prete: "Prête", expediee: "Expédiée", terminee: "Terminée", annulee: "Annulée" };
    const wa = tel ? `https://wa.me/${tel.startsWith("0") ? "33" + tel.slice(1) : tel.replace("+", "")}` : "";
    // Fiche d'un client connu : qui c'est, comment le joindre, ce qu'il a acheté, puis ses coordonnées (repliées).
    // Nouveau client : directement le formulaire.
    const champs = `
        <div class="grille-champs">
          <div class="champ"><label for="cl-nom">Nom</label><input id="cl-nom" name="nom" value="${e(c.nom)}" required></div>
          <div class="champ"><label for="cl-tel">Téléphone</label><input id="cl-tel" name="tel" type="tel" value="${e(c.tel)}"></div>
          <div class="champ large"><label for="cl-email">Email</label><input id="cl-email" name="email" type="email" value="${e(c.email || "")}"></div>
          <div class="champ large"><label for="cl-adresse">Adresse</label><textarea id="cl-adresse" name="adresse" rows="2">${e(c.adresse)}</textarea></div>
          <div class="champ large"><label for="cl-etiquettes">Étiquettes</label><input id="cl-etiquettes" name="etiquettes" value="${e((c.etiquettes || []).join(", "))}" placeholder="pro, mariage 2026, club de foot…"><small>Séparées par des virgules : pour retrouver et cibler un groupe de clients.</small></div>
          ${id ? "" : `<div class="champ"><label for="cl-source">Connu par</label><select id="cl-source" name="source">${Object.entries(SOURCES).map(([k, v]) => `<option value="${k}" ${c.source === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>`}
          <label class="case large"><input type="checkbox" name="consentement" ${c.consentement_marketing ? "checked" : ""}> <span>Accepte de recevoir les nouveautés et promotions par email${c.consentement_le ? `<br><small class="aide">Choix enregistré le ${date(c.consentement_le, true)}</small>` : ""}</span></label>
        </div>`;
    f.innerHTML = `
      <form method="dialog" class="pile" data-crm-form="client">
        ${id ? `
        <div class="fiche-client-tete">
          ${avatar(c.nom || c.email)}
          <div>
            <h2>${e(c.nom || "Client")}</h2>
            <p class="aide">Client depuis le ${date(c.cree_le)} · ${e(SOURCES[c.source] || c.source)}</p>
            <div class="pastilles" style="margin:0.4rem 0 0">${c.consentement_marketing ? `<span class="pastille paiement-paye">Abonné aux nouveautés</span>` : ""}${(c.etiquettes || []).map((t) => `<span class="pastille">#${e(t)}</span>`).join("")}</div>
          </div>
        </div>
        <div class="raccourcis">
          <button class="btn" type="button" data-crm="vendre" data-id="${c.id}">Nouvelle vente</button>
          ${tel ? `<a class="btn btn-ligne" href="tel:${e(tel)}">Appeler</a>` : ""}
          ${wa ? `<a class="btn btn-ligne" target="_blank" rel="noopener" href="${e(wa)}">WhatsApp</a>` : ""}
          ${c.email ? `<button class="btn btn-ligne" type="button" data-crm="ecrire" data-id="${c.id}">Écrire un email</button>` : ""}
        </div>
        <p class="fiche-client-chiffres"><span><strong>${st.n}</strong> achat${st.n > 1 ? "s" : ""}</span><span><strong>${euros(st.total)}</strong> dépensés</span>${st.n ? `<span>panier moyen <strong>${euros(st.total / st.n)}</strong></span>` : ""}</p>` : `<h2 style="font-size:1.35rem">Nouveau client</h2>`}
        <div class="champ"><label for="cl-notes">Notes</label><textarea id="cl-notes" name="notes" rows="3" placeholder="Préférences, tailles, dates importantes (anniversaire, mariage…)">${e(c.notes)}</textarea></div>
        ${achats.length ? `<h3>Achats</h3><div class="liste">${achats.map((a) => `<div class="ligne ligne-simple"><span class="ligne-texte"><strong>${e(a.numero)}</strong><span>${date(a.cree_le)} · ${e(CANAUX_STATS[a.canal] || "Site internet")}</span></span><span class="pastilles"><span class="pastille statut-${a.statut}">${e(STATUTS_CMD[a.statut] || a.statut)}</span></span><strong class="prix">${euros(a.total)}</strong></div>`).join("")}</div>` : id ? `<p class="aide">Pas encore d'achat.</p>` : ""}
        ${demandes.length ? `<h3>Demandes</h3><div class="liste">${demandes.map((d) => `<div class="ligne ligne-simple"><span class="ligne-texte"><strong>${e(TYPES_DEM[d.type])}${d.sujet ? ` · ${e(d.sujet)}` : ""}</strong><span>${date(d.cree_le)} · ${e(ST_DEM[d.statut])}</span></span></div>`).join("")}</div>` : ""}
        ${id ? `<details class="coordonnees"><summary>Coordonnées, étiquettes et accord pour les emails</summary>${champs}</details>` : champs}
        <div class="raccourcis">
          <button class="btn" value="ok">Enregistrer</button>
          <button class="btn btn-ligne" value="annuler" formnovalidate>Fermer</button>
          ${id ? `<button class="btn btn-ligne danger" type="button" data-crm="supprimer-client" data-id="${c.id}" style="margin-left:auto">Supprimer la fiche</button>` : ""}
        </div>
      </form>`;
    f.querySelector("form").onsubmit = async (ev) => {
      if (ev.submitter?.value !== "ok") return;
      ev.preventDefault();
      const x = Object.fromEntries(new FormData(ev.target));
      const email = String(x.email || "").trim().toLowerCase();
      const fiche = {
        nom: String(x.nom).trim(),
        email: email || null,
        tel: String(x.tel || "").trim(),
        adresse: String(x.adresse || "").trim(),
        notes: String(x.notes || "").trim(),
        etiquettes: [...new Set(String(x.etiquettes || "").split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean))],
        consentement_marketing: !!x.consentement,
        ...(id ? {} : { source: x.source }),
      };
      if (!!x.consentement !== !!c.consentement_marketing) fiche.consentement_le = new Date().toISOString();
      const r = id ? await sb().from("clients").update(fiche).eq("id", id).select().single() : await sb().from("clients").insert(fiche).select().single();
      if (r.error) return ctx.toast(/duplicate|unique/i.test(r.error.message) ? "Un autre client a déjà cet email." : r.error.message, true);
      if (id) Object.assign(c, r.data);
      else donnees.clients.unshift(r.data);
      f.close();
      ctx.toast("Fiche enregistrée.");
      afficher();
    };
    if (!f.open) f.showModal();
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
  }

  // =====================================================================
  //  DEMANDES (devis, messages)
  // =====================================================================
  function vueDemandes() {
    const liste = donnees.demandes.filter(FILTRES_DEM[etat.demandes][1]);
    return `
      <section class="bloc">
        <div class="bloc-tete"><h2>Demandes reçues</h2><button class="btn btn-ligne" data-crm="actualiser">Actualiser</button></div>
        <p class="aide">Devis et messages envoyés depuis le site. Chaque demande crée ou complète la fiche du client.</p>
        <div class="barre"><div class="filtres">${Object.entries(FILTRES_DEM).map(([k, [nom, f]]) => `<button class="filtre" data-crm="filtre-demandes" data-valeur="${k}" aria-pressed="${etat.demandes === k}">${nom} <small>${donnees.demandes.filter(f).length}</small></button>`).join("")}</div></div>
        <div class="liste">
          ${liste
            .map(
              (d) => `<button class="ligne ligne-commande" data-crm="demande" data-id="${d.id}">
                ${avatar(d.nom || d.email)}
                <span class="ligne-texte"><strong>${e(d.nom || d.email)}${d.sujet ? ` · ${e(d.sujet)}` : ""}</strong><span>${date(d.cree_le, true)}${d.quantite ? ` · quantité ${d.quantite}` : ""} · ${e(d.message.slice(0, 90))}${d.message.length > 90 ? "…" : ""}</span></span>
                <span class="pastilles"><span class="pastille">${TYPES_DEM[d.type]}</span><span class="pastille demande-${d.statut}">${ST_DEM[d.statut]}</span></span>
              </button>`
            )
            .join("") || `<p class="aide" style="padding:1.5rem 0">Aucune demande dans cette liste.</p>`}
        </div>
      </section>`;
  }
  // Statut et notes tapés dans la fiche d'une demande, gardés avant d'ouvrir l'email de réponse ou la caisse
  async function garderSaisieDemande(id) {
    const d = donnees.demandes.find((x) => x.id === id);
    const statut = fenetre().querySelector("#dm-statut")?.value;
    const notes = fenetre().querySelector("#dm-notes")?.value.trim();
    if (!d || statut === undefined || (statut === d.statut && notes === d.notes)) return;
    const { error } = await sb().from("demandes").update({ statut, notes }).eq("id", d.id);
    if (!error) Object.assign(d, { statut, notes });
  }
  function ficheDemande(id) {
    const d = donnees.demandes.find((x) => x.id === id);
    if (!d) return;
    if (d.statut === "nouvelle" && d.type !== "newsletter") {
      d.statut = "en_cours";
      sb().from("demandes").update({ statut: "en_cours" }).eq("id", d.id).then(majCompteurDemandes);
    }
    const tel = lien(d.tel);
    const f = fenetre();
    f.innerHTML = `
      <form method="dialog" class="pile" style="max-width:680px">
        <div class="bloc-tete"><h2 style="font-size:1.35rem">${TYPES_DEM[d.type]}${d.sujet ? ` · ${e(d.sujet)}` : ""}</h2><span class="aide">${date(d.cree_le, true)}</span></div>
        <p><strong>${e(d.nom)}</strong><br><a href="mailto:${e(d.email)}">${e(d.email)}</a>${d.tel ? ` · <a href="tel:${e(tel)}">${e(d.tel)}</a>` : ""}${d.quantite ? `<br>Quantité : <strong>${d.quantite}</strong>` : ""}</p>
        ${d.message ? `<div class="encart" style="white-space:pre-line">${e(d.message)}</div>` : ""}
        <div class="grille-champs">
          <div class="champ"><label for="dm-statut">Suivi</label><select id="dm-statut">${Object.entries(ST_DEM).map(([k, v]) => `<option value="${k}" ${d.statut === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
          <div class="champ large"><label for="dm-notes">Notes internes</label><textarea id="dm-notes" rows="3" placeholder="Prix proposé, délai, maquette envoyée…">${e(d.notes)}</textarea></div>
        </div>
        <div class="raccourcis">
          <button class="btn" type="button" data-crm="repondre" data-id="${d.id}">Répondre par email</button>
          <button class="btn btn-ligne" type="button" data-crm="convertir" data-id="${d.id}">Transformer en commande</button>
          ${d.client_id ? `<button class="btn btn-ligne" type="button" data-crm="client" data-id="${d.client_id}">Fiche client</button>` : ""}
        </div>
        <div class="raccourcis"><button class="btn btn-ligne" value="ok">Enregistrer et fermer</button><button class="btn btn-ligne" value="annuler" formnovalidate>Fermer</button></div>
      </form>`;
    f.querySelector("form").onsubmit = async (ev) => {
      ev.preventDefault();
      if (ev.submitter?.value === "ok") {
        const modif = { statut: f.querySelector("#dm-statut").value, notes: f.querySelector("#dm-notes").value.trim() };
        const { error } = await sb().from("demandes").update(modif).eq("id", d.id);
        if (error) return ctx.toast(error.message, true);
        Object.assign(d, modif);
      }
      f.close();
      majCompteurDemandes();
      afficher();
    };
    if (!f.open) f.showModal();
  }

  // =====================================================================
  //  MARKETING : codes promo et emails aux abonnés
  // =====================================================================
  const libellePromo = (p) => (p.type === "pourcentage" ? `−${Number(p.valeur)} %` : `−${euros(p.valeur)}`);
  const promoValide = (p) => {
    const auj = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    if (!p.actif) return [false, "Désactivé"];
    if (p.debut && auj < p.debut) return [false, `À partir du ${date(p.debut)}`];
    if (p.fin && auj > p.fin) return [false, "Expiré"];
    if (p.utilisations_max && p.utilisations >= p.utilisations_max) return [false, "Épuisé"];
    return [true, "Actif"];
  };
  function vueMarketing() {
    const abonnes = donnees.clients.filter((c) => c.consentement_marketing && c.email).length;
    const site = adresseSite();
    return `
      <section class="bloc">
        <div class="bloc-tete"><h2>Codes promo</h2><button class="btn" data-crm="nouveau-code">+ Nouveau code</button></div>
        <p class="aide">Le client saisit le code dans son panier ; la remise est calculée par le serveur et appliquée au paiement par carte. Idées : <em>BIENVENUE10</em> pour les abonnés, <em>FETEDESMERES</em> sur une période, un code pour un salon.</p>
        <div class="bons">
          ${donnees.promos
            .map((p) => {
              const [ok, txt] = promoValide(p);
              const conditions = [Number(p.minimum) ? `dès ${euros(p.minimum)} d'achat` : "", p.debut ? `à partir du ${date(p.debut)}` : "", p.fin ? `jusqu'au ${date(p.fin)}` : "", p.utilisations_max ? `${p.utilisations_max} utilisations au plus` : ""].filter(Boolean).join(", ");
              // Une carte par code, comme un bon de réduction : le code, la remise, les conditions, l'usage
              return `<article class="bon ${ok ? "" : "bon-inactif"}">
                <div class="bon-tete"><span class="bon-code">${e(p.code)}</span><span class="bon-remise">${libellePromo(p)}</span></div>
                <p>${e(p.description) || "Sans description"}</p>
                ${conditions ? `<p class="aide">${conditions[0].toUpperCase() + conditions.slice(1)}</p>` : ""}
                <div class="pastilles" style="margin:0"><span class="pastille" style="${ok ? "background:#e3f1e9;color:#1f6b45" : ""}">${txt}</span><span class="pastille">${p.utilisations ? `Utilisé ${p.utilisations} fois` : "Pas encore utilisé"}</span></div>
                <div class="ligne-boutons">
                  <button class="mini" data-crm="partager-code" data-code="${e(p.code)}">Texte à partager</button>
                  <button class="mini" data-crm="modifier-code" data-code="${e(p.code)}">Modifier</button>
                  <button class="mini" data-crm="basculer-code" data-code="${e(p.code)}">${p.actif ? "Désactiver" : "Activer"}</button>
                  <button class="mini danger" data-crm="supprimer-code" data-code="${e(p.code)}" aria-label="Supprimer le code ${e(p.code)}">Supprimer</button>
                </div>
              </article>`;
            })
            .join("") || `<p class="aide" style="padding:1rem 0">Aucun code pour l'instant. Un code de bienvenue (par exemple BIENVENUE10) est un bon début.</p>`}
        </div>
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
    f.innerHTML = `
      <form method="dialog" class="pile" style="max-width:600px">
        <h2 style="font-size:1.35rem">${code ? `Code ${e(code)}` : "Nouveau code promo"}</h2>
        <div class="grille-champs">
          <div class="champ"><label for="cp-code">Code</label><input id="cp-code" name="code" value="${e(p.code)}" ${code ? "readonly" : ""} required pattern="[A-Za-z0-9_-]{3,30}" placeholder="NOEL10" style="text-transform:uppercase"><small>3 à 30 lettres ou chiffres, sans espace.</small></div>
          <div class="champ"><label for="cp-desc">Description (vue par le client)</label><input id="cp-desc" name="description" value="${e(p.description)}" placeholder="10 % pour Noël"></div>
          <div class="champ"><label for="cp-type">Remise</label><select id="cp-type" name="type"><option value="pourcentage" ${p.type === "pourcentage" ? "selected" : ""}>Pourcentage (%)</option><option value="montant" ${p.type === "montant" ? "selected" : ""}>Montant (€)</option></select></div>
          <div class="champ"><label for="cp-valeur">Valeur</label><input id="cp-valeur" name="valeur" type="number" step="0.01" min="0.01" value="${Number(p.valeur)}" required></div>
          <div class="champ"><label for="cp-min">Dès un achat de (€)</label><input id="cp-min" name="minimum" type="number" step="0.01" min="0" value="${Number(p.minimum) || ""}" placeholder="0"></div>
          <div class="champ"><label for="cp-max">Nombre d'utilisations max.</label><input id="cp-max" name="utilisations_max" type="number" min="1" value="${p.utilisations_max ?? ""}" placeholder="Illimité"></div>
          <div class="champ"><label for="cp-debut">Valable du</label><input id="cp-debut" name="debut" type="date" value="${e(p.debut || "")}"></div>
          <div class="champ"><label for="cp-fin">Au (inclus)</label><input id="cp-fin" name="fin" type="date" value="${e(p.fin || "")}"></div>
          <label class="case large"><input type="checkbox" name="actif" ${p.actif ? "checked" : ""}> <span>Actif</span></label>
        </div>
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
      if (r.error) return ctx.toast(/duplicate|unique/i.test(r.error.message) ? "Ce code existe déjà." : r.error.message, true);
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
    const [stats, nbClients, nbDemandes] = await Promise.all([
      sb().from("stats_ventes").select("*"),
      sb().from("clients").select("id", { count: "exact", head: true }),
      // « À traiter » comme dans l'onglet Demandes : nouvelles et en cours
      sb().from("demandes").select("id", { count: "exact", head: true }).in("statut", ["nouvelle", "en_cours"]).neq("type", "newsletter"),
    ]);
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
  const dansZone = (el) => zone && (zone.contains(el) || fenetre().contains(el));
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-crm]");
    if (!b || !dansZone(b)) return;
    const a = b.dataset.crm;
    const v = b.dataset.valeur;
    if (a === "ajouter") {
      ajouterProduit(b.dataset.id);
      return afficher();
    }
    if (a === "retirer") caisse.lignes.splice(+b.dataset.i, 1);
    if (a === "plus") caisse.lignes[+b.dataset.i].quantite++;
    if (a === "moins") {
      const l = caisse.lignes[+b.dataset.i];
      if (--l.quantite < 1) caisse.lignes.splice(+b.dataset.i, 1);
    }
    if (a === "vider" && confirm("Vider le ticket ?")) caisse = caisseVide();
    if (a === "canal") caisse.canal = v;
    if (a === "paye") caisse.paye = !!v;
    if (a === "moyen") caisse.moyen = v;
    if (a === "sans-client") Object.assign(caisse, { clientId: "", saisieClient: "", consentement: false });
    if (a === "appliquer-code-caisse") {
      const code = String(caisse.code || "").trim().toUpperCase();
      const p = donnees.promos.find((x) => x.code === code);
      const [valable, etatCode] = p ? promoValide(p) : [false, "Inconnu"];
      if (!code) return ctx.toast("Tapez le code donné par le client.", true);
      if (!p) return ctx.toast(`Le code ${code} n'existe pas (onglet Marketing).`, true);
      if (!valable) return ctx.toast(`Le code ${code} n'est pas utilisable : ${etatCode.toLowerCase()}.`, true);
      if (totauxCaisse().sous < Number(p.minimum || 0)) return ctx.toast(`Le code ${code} s'applique dès ${euros(p.minimum)} d'achat.`, true);
      caisse.promo = p;
      return afficher();
    }
    if (a === "retirer-code-caisse") {
      caisse.promo = null;
      return afficher();
    }
    if (a === "nouvelle-vente") caisse = caisseVide();
    if (a === "encaisser") return encaisser();
    if (a === "imprimer") return window.AdminCommandes.imprimer(caisse.fini, b.dataset.type === "facture" ? "facture" : "bon", ctx);
    if (["retirer", "plus", "moins", "vider", "canal", "paye", "moyen", "sans-client", "nouvelle-vente"].includes(a)) return afficher();

    if (a === "segment") etat.segment = v;
    if (a === "etiquette") etat.etiquette = etat.etiquette === v ? "" : v;
    if (a === "filtre-demandes") etat.demandes = v;
    if (["segment", "etiquette", "filtre-demandes"].includes(a)) return afficher();
    if (a === "actualiser") return monter(vue, zone, ctx);
    if (a === "client") {
      if (!donnees.commandes.length && vue !== "clients") donnees.commandes = await lire("commandes", "id,numero,cree_le,total,statut,paiement_statut,client_id,canal").catch(() => []);
      return ficheClient(b.dataset.id);
    }
    if (a === "nouveau-client") return ficheClient(null);
    if (a === "ecrire") {
      const c = donnees.clients.find((x) => x.id === b.dataset.id);
      return ecrire({ email: c.email, nom: c.nom });
    }
    if (a === "vendre") {
      fenetre().close();
      const choisi = donnees.clients.find((x) => x.id === b.dataset.id);
      caisse = { ...caisseVide(), clientId: b.dataset.id, consentement: !!choisi?.consentement_marketing, adresse: choisi?.adresse || "" };
      return ctx.allerA("caisse");
    }
    if (a === "supprimer-client") {
      const c = donnees.clients.find((x) => x.id === b.dataset.id);
      if (!confirm(`Supprimer définitivement la fiche de ${c.nom} ? Ses commandes sont conservées (obligation comptable), sans lien vers la fiche.`)) return;
      const { error } = await sb().from("clients").delete().eq("id", c.id);
      if (error) return ctx.toast(error.message, true);
      donnees.clients = donnees.clients.filter((x) => x.id !== c.id);
      fenetre().close();
      ctx.toast("Fiche supprimée.");
      return afficher();
    }
    if (a === "export-clients" || a === "export-abonnes") {
      const st = statsClients();
      const liste = a === "export-abonnes" ? donnees.clients.filter((c) => c.consentement_marketing && c.email) : donnees.clients;
      return exporterCsv(a === "export-abonnes" ? "abonnes" : "clients", ["Nom", "Email", "Téléphone", "Adresse", "Étiquettes", "Abonné", "Achats", "Total dépensé", "Dernier achat", "Client depuis", "Source", "Notes"],
        liste.map((c) => { const s = st(c.id); return [c.nom, c.email, c.tel, c.adresse, (c.etiquettes || []).join(", "), c.consentement_marketing ? "oui" : "non", s.n, String(arrondi(s.total)).replace(".", ","), date(s.derniere), date(c.cree_le), SOURCES[c.source] || c.source, c.notes]; }));
    }
    if (a === "demande") return ficheDemande(b.dataset.id);
    if (a === "repondre" || a === "convertir") await garderSaisieDemande(b.dataset.id);
    if (a === "repondre") {
      const d = donnees.demandes.find((x) => x.id === b.dataset.id);
      return ecrire({
        email: d.email, nom: d.nom, sujet: `Votre demande${d.sujet ? ` : ${d.sujet}` : ""} · Mon Truc en Bois`,
        message: `Merci pour votre demande${d.type === "devis" ? " de devis" : ""}.\n\n`,
        apres: async () => {
          d.statut = "repondue";
          await sb().from("demandes").update({ statut: "repondue" }).eq("id", d.id);
          majCompteurDemandes();
          afficher();
        },
      });
    }
    if (a === "convertir") {
      const d = donnees.demandes.find((x) => x.id === b.dataset.id);
      fenetre().close();
      const fiche = donnees.clients.find((x) => x.id === d.client_id);
      caisse = { ...caisseVide(), clientId: d.client_id || "", consentement: !!fiche?.consentement_marketing, nouveau: { nom: d.nom, email: d.email, tel: d.tel }, canal: "telephone", paye: false, notes: [d.sujet, d.message].filter(Boolean).join(" · ").slice(0, 1500), demandeId: d.id };
      ctx.toast("Ajoutez les articles puis enregistrez : la demande passera en « Devenue commande ».");
      return ctx.allerA("caisse");
    }

    if (a === "nouveau-code") return ficheCode(null);
    if (a === "modifier-code") return ficheCode(b.dataset.code);
    if (a === "basculer-code" || a === "supprimer-code") {
      const p = donnees.promos.find((x) => x.code === b.dataset.code);
      if (a === "supprimer-code") {
        if (!confirm(`Supprimer le code ${p.code} ?`)) return;
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

  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!dansZone(el)) return;
    if (el.dataset.crmQ !== undefined) {
      etat.q = el.value;
      const pos = el.selectionStart;
      afficher();
      const q = zone.querySelector("[data-crm-q]");
      q.focus();
      q.setSelectionRange(pos, pos);
      return;
    }
    if (el.dataset.ligne !== undefined) {
      const l = caisse.lignes[+el.dataset.ligne];
      if (el.dataset.champ === "prix") l.prix = Number(el.value || 0);
      if (el.dataset.champ === "texte") l.texte = el.value;
      return majTotalCaisse();
    }
    if (el.dataset.nouveau) caisse.nouveau[el.dataset.nouveau] = el.value.trim();
    const c = el.dataset.caisse;
    if (c === "recherche") {
      caisse.recherche = el.value;
      const pos = el.selectionStart;
      afficher();
      const q = zone.querySelector('[data-caisse="recherche"]');
      q.focus();
      q.setSelectionRange(pos, pos);
      return;
    }
    if (c === "client") return void (caisse.saisieClient = el.value);
    if (c === "code") return void (caisse.code = el.value);
    if (["remise", "port"].includes(c)) caisse[c] = Number(el.value || 0);
    if (["adresse", "notes", "date"].includes(c)) caisse[c] = el.value;
    majTotalCaisse();
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!dansZone(el)) return;
    const c = el.dataset.caisse;
    if (el.dataset.ligne !== undefined && el.dataset.champ === "variante") {
      const l = caisse.lignes[+el.dataset.ligne];
      const p = ctx.D.produits.find((x) => x.id === l.id);
      l.variante = Number(el.value);
      l.prix = arrondi(Number(p.prix) + Number(p.variantes.choix[l.variante]?.prix || 0));
      return afficher();
    }
    if (c === "client") {
      const choisi = donnees.clients.find((x) => `${x.nom}${x.email ? ` · ${x.email}` : x.tel ? ` · ${x.tel}` : ""}` === el.value);
      if (choisi) {
        caisse.clientId = choisi.id;
        caisse.saisieClient = "";
        caisse.consentement = !!choisi.consentement_marketing;
        if (choisi.adresse) caisse.adresse = choisi.adresse;
        afficher();
      }
    }
    if (c === "consentement") caisse.consentement = el.checked;
    if (c === "remiseType") caisse.remiseType = el.value;
    if (c === "livraison") {
      caisse.reception = el.checked ? "livraison" : "retrait";
      if (el.checked && !caisse.port) caisse.port = Number(ctx.D.site.livraison || 0);
      return afficher();
    }
    majTotalCaisse();
  });
  document.addEventListener("submit", async (ev) => {
    const f = ev.target;
    if (!dansZone(f)) return;
    if (f.dataset.crmForm === "libre") {
      ev.preventDefault();
      const x = Object.fromEntries(new FormData(f));
      caisse.lignes.push({ id: "", nom: x.nom.trim(), prix: arrondi(x.prix), quantite: 1, texte: "", variante: null });
      return afficher();
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
