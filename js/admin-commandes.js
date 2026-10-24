// Onglet « Commandes » de l'admin : connexion au compte Supabase de la boutique, liste des commandes,
// détail, changement de statut (avec email au client), paiement, photos, bon de commande / facture, export.
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
  const PAIEMENTS = { en_attente: "À payer", paye: "Payée", rembourse: "Remboursée" };
  const MODES = { en_ligne: "En ligne", apres_validation: "Après validation", boutique: "Sur place" };
  const CANAUX = { boutique: "Vente en boutique", telephone: "Par téléphone", salon: "Salon / marché" };
  const MOYENS = { carte: "carte bancaire", especes: "espèces", cheque: "chèque", virement: "virement", paypal: "PayPal", autre: "autre moyen" };
  const FILTRES = {
    a_traiter: ["À traiter", (c) => ["nouvelle", "maquette_envoyee", "retouche", "confirmee", "en_fabrication"].includes(c.statut)],
    pretes: ["Prêtes / expédiées", (c) => ["prete", "expediee"].includes(c.statut)],
    a_payer: ["À payer", (c) => c.paiement_statut === "en_attente" && c.statut !== "annulee"],
    toutes: ["Toutes", () => true],
    annulees: ["Annulées", (c) => c.statut === "annulee"],
  };

  let ctx = null; // { D, toast, echapper, euros }
  let client = null; // client Supabase
  let commandes = [];
  let filtre = "a_traiter";
  let recherche = "";
  let zone = null;
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
  const initiales = (nom) => String(nom || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join("");
  const date = (d, heure = false) =>
    d ? new Date(d).toLocaleString("fr-FR", heure ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" }) : "";

  const S = () => window.AdminServeur;
  const initialiser = () => (client = S().client(ctx.D));
  const appelAdmin = (action, corps) => S().appel(ctx.D, action, corps);
  const ecranConnexion = (erreur = "") => S().ecranConnexion(zone, ctx, charger, erreur);

  async function charger() {
    zone.innerHTML = `<p class="aide" style="padding:2rem 0">Chargement des commandes…</p>`;
    const { data, error } = await client.from("commandes").select("*").order("cree_le", { ascending: false }).limit(500);
    if (error) {
      if (/JWT|auth/i.test(error.message)) return ecranConnexion("Session expirée : reconnectez-vous.");
      zone.innerHTML = `<p class="message message-alerte">Impossible de lire les commandes (${e(error.message)}). Vérifiez l’installation (onglet Installation → Vérifier).</p>`;
      return;
    }
    commandes = data;
    majCompteur();
    liste();
  }

  function majCompteur() {
    const n = commandes.filter((c) => c.statut === "nouvelle").length;
    window.AdminPastille?.("commandes", n);
  }

  function liste() {
    const q = recherche.trim().toLowerCase();
    const visibles = commandes.filter(FILTRES[filtre][1]).filter((c) => !q || `${c.numero} ${c.client_nom} ${c.client_email} ${c.client_tel}`.toLowerCase().includes(q));
    const mois = new Date().toISOString().slice(0, 7);
    const duMois = commandes.filter((c) => c.cree_le.slice(0, 7) === mois && c.statut !== "annulee");
    const encaisse = duMois.filter((c) => c.paiement_statut === "paye").reduce((t, c) => t + Number(c.total), 0);
    zone.innerHTML = `
      <div class="chiffres-admin">
        <div class="chiffre"><strong>${commandes.filter((c) => c.statut === "nouvelle").length}</strong><span>nouvelles commandes</span></div>
        <div class="chiffre"><strong>${commandes.filter(FILTRES.a_traiter[1]).length}</strong><span>à traiter</span></div>
        <div class="chiffre"><strong>${duMois.length}</strong><span>commandes ce mois-ci</span></div>
        <div class="chiffre"><strong>${ctx.euros(encaisse)}</strong><span>encaissés en ligne ce mois-ci</span></div>
      </div>
      <section class="bloc">
        <div class="bloc-tete">
          <h2>Commandes</h2>
          <div class="raccourcis">
            <button class="btn" data-aller="caisse">+ Nouvelle vente</button>
            <button class="btn btn-ligne" data-cmd="actualiser">Actualiser</button>
            <button class="btn btn-ligne" data-cmd="export">Exporter (tableur)</button>
          </div>
        </div>
        <div class="barre">
          <div class="filtres">${Object.entries(FILTRES).map(([k, [nom, f]]) => `<button class="filtre" data-filtre="${k}" aria-pressed="${k === filtre}">${nom} <small>${commandes.filter(f).length}</small></button>`).join("")}</div>
          <input type="search" id="cmd-q" placeholder="N°, nom, email, téléphone…" value="${e(recherche)}" aria-label="Rechercher une commande">
        </div>
        <div class="liste">
          ${visibles
            .map(
              (c) => `
            <button class="ligne ligne-commande" data-ouvrir="${c.id}">
              <span class="avatar" aria-hidden="true">${e(initiales(c.client_nom))}</span>
              <span class="ligne-texte">
                <strong>${e(c.client_nom)}</strong>
                <span>${e(c.lignes[0]?.nom || "")}${c.lignes.length > 1 ? ` et ${c.lignes.length - 1} autre${c.lignes.length > 2 ? "s" : ""}` : ""} · ${c.mode_reception === "retrait" ? "retrait" : "livraison"}${c.cadeau?.date ? ` · <b>pour le ${new Date(c.cadeau.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</b>` : ""}</span>
                <small>${e(c.numero)} · ${quand(c.cree_le)}</small>
              </span>
              <span class="pastilles">${CANAUX[c.canal] ? `<span class="pastille">${CANAUX[c.canal]}</span>` : ""}<span class="pastille statut-${c.statut}">${STATUTS[c.statut]}</span><span class="pastille paiement-${c.paiement_statut}">${PAIEMENTS[c.paiement_statut]}</span></span>
              <strong class="prix">${ctx.euros(c.total)}</strong>
            </button>`
            )
            .join("") || `<p class="aide" style="padding:1.5rem 0">Aucune commande ${filtre === "toutes" ? "pour l'instant" : "dans cette liste"}.</p>`}
        </div>
      </section>`;
  }

  // ---------- Détail d'une commande ----------
  function detail(c) {
    const f = document.getElementById("fenetre");
    const tel = String(c.client_tel || "").replace(/[^\d+]/g, "");
    const wa = tel ? `https://wa.me/${tel.startsWith("0") ? "33" + tel.slice(1) : tel.replace("+", "")}` : "";
    const sansEmail = c.client_email.endsWith(".invalid");
    // Étape suivante proposée en un geste (le menu « Statut » reste là pour tout autre changement)
    const SUIVANT = {
      nouvelle: ["maquette_envoyee", "Maquette envoyée au client"],
      maquette_envoyee: ["confirmee", "Maquette validée par le client"],
      retouche: ["maquette_envoyee", "Nouvelle maquette envoyée"],
      confirmee: ["en_fabrication", "Lancer la fabrication"],
      en_fabrication: c.mode_reception === "livraison" ? ["expediee", "Marquer comme expédiée"] : ["prete", "Prête à retirer"],
      prete: ["terminee", "Remise au client"],
      expediee: ["terminee", "Livrée au client"],
    };
    const suivant = SUIVANT[c.statut];
    const ETAPES = ["nouvelle", "maquette_envoyee", "confirmee", "en_fabrication", c.mode_reception === "livraison" ? "expediee" : "prete", "terminee"];
    const rang = ETAPES.indexOf(c.statut === "retouche" ? "maquette_envoyee" : c.statut);
    f.innerHTML = `
      <form method="dialog" id="form-commande">
        <div class="bloc-tete">
          <h2 style="font-size:1.35rem">${e(c.numero)}</h2>
          <span class="pastilles"><span class="pastille statut-${c.statut}">${STATUTS[c.statut]}</span><span class="pastille paiement-${c.paiement_statut}">${PAIEMENTS[c.paiement_statut]}</span></span>
        </div>
        <p class="aide">${CANAUX[c.canal] ? `${CANAUX[c.canal]} le` : "Reçue le"} ${date(c.cree_le, true)} · ${MODES[c.paiement_mode]}${c.paiement_moyen ? ` (${MOYENS[c.paiement_moyen] || e(c.paiement_moyen)})` : ""}${c.code_promo ? ` · code ${e(c.code_promo)}` : ""}${c.facture_numero ? ` · facture ${e(c.facture_numero)}` : ""}</p>

        <div class="grille-champs">
          <div class="pile" style="gap:.3rem">
            <strong>${e(c.client_nom)}</strong>
            ${c.client_email.endsWith(".invalid") ? `<span class="aide">Pas d'email</span>` : `<a href="mailto:${e(c.client_email)}?subject=${encodeURIComponent("Votre commande " + c.numero)}">${e(c.client_email)}</a>`}
            ${c.client_tel ? `<span><a href="tel:${e(tel)}">${e(c.client_tel)}</a>${wa ? ` · <a href="${e(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</span>` : ""}
          </div>
          <div class="pile" style="gap:.3rem">
            <strong>${c.mode_reception === "retrait" ? "Retrait à la boutique" : "Livraison"}</strong>
            ${c.adresse ? `<span style="white-space:pre-line">${e(c.adresse)}</span>` : ""}
            ${c.cadeau?.date ? `<span>Souhaitée pour le <strong>${new Date(c.cadeau.date).toLocaleDateString("fr-FR")}</strong></span>` : ""}
          </div>
        </div>

        <div class="liste">
          ${c.lignes
            .map(
              (l, i) => `
            <div class="ligne-edit">
              <div class="ligne-edit-tete"><strong>${e(l.nom)} × ${l.quantite}</strong><span>${ctx.euros(l.total)}</span></div>
              ${l.variante ? `<span class="aide">${e(l.variante)}</span>` : ""}
              ${l.texte ? `<div class="encart"><span>Texte à graver : <strong style="font-size:1.05rem">« ${e(l.texte)} »</strong>${l.police ? ` · police ${e(l.police)}` : ""}</span></div>` : ""}
              ${l.remarque ? `<span>Précisions : ${e(l.remarque)}</span>` : ""}
              ${l.photo_chemin ? `<span>Photo jointe : ${e(l.photo_nom)} <span class="photo-lien" data-ligne="${i}"></span></span>` : ""}
            </div>`
            )
            .join("")}
        </div>
        <div class="pile" style="gap:.3rem">
          ${Number(c.remise) || Number(c.port) || Number(c.emballage) ? `<div class="recap-ligne"><span>Sous-total</span><span>${ctx.euros(c.sous_total)}</span></div>` : ""}
          ${Number(c.remise) ? `<div class="recap-ligne"><span>Remise${c.code_promo ? ` (code ${e(c.code_promo)})` : ""}</span><span>− ${ctx.euros(c.remise)}</span></div>` : ""}
          ${Number(c.port) ? `<div class="recap-ligne"><span>Livraison</span><span>${ctx.euros(c.port)}</span></div>` : ""}
          ${Number(c.emballage) ? `<div class="recap-ligne"><span>Emballage cadeau</span><span>${ctx.euros(c.emballage)}</span></div>` : ""}
          <div class="recap-ligne recap-total"><span>Total</span><span>${ctx.euros(c.total)}</span></div>
        </div>
        ${c.cadeau?.emballage || c.cadeau?.message ? `<p class="encart">Cadeau : ${c.cadeau.emballage ? "Emballage cadeau. " : ""}${c.cadeau.message ? `Carte : « ${e(c.cadeau.message)} »` : ""}</p>` : ""}
        ${c.message ? `<p class="encart">Message du client : ${e(c.message)}</p>` : ""}
        ${c.lignes.some((l) => l.photo_chemin) ? `<button type="button" class="btn btn-ligne" data-action-cmd="photos" style="justify-self:start">Voir / télécharger les photos du client</button>` : ""}

        <section class="pile" style="gap:.8rem;border-top:1px solid var(--trait);padding-top:1rem">
          <h3>Avancement</h3>
          ${c.statut !== "annulee" ? `<ol class="avancement">${ETAPES.map((s, i) => `<li class="${i < rang ? "faite" : i === rang ? "en-cours" : ""}">${STATUTS[s]}</li>`).join("")}</ol>` : ""}
          ${suivant ? `<button type="button" class="btn" data-action-cmd="suivant" data-statut="${suivant[0]}" style="justify-self:start">${suivant[1]}${sansEmail ? "" : " et prévenir le client"}</button>` : ""}
          <div class="grille-champs">
            <div class="champ"><label for="cmd-statut">Statut</label><select id="cmd-statut">${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${k === c.statut ? "selected" : ""}>${v}</option>`).join("")}</select></div>
            <div class="champ"><label for="cmd-colis">N° de suivi du colis</label><input type="text" id="cmd-colis" value="${e(c.suivi_colis)}" placeholder="Colissimo, Mondial Relay…"></div>
          </div>
          ${sansEmail ? `<p class="aide">Pas d'email pour ce client : prévenez-le par téléphone.</p>` : `<label class="case"><input type="checkbox" id="cmd-prevenir" checked> Prévenir le client par email du changement de statut</label>`}
          ${sansEmail ? "" : `<div class="champ"><label for="cmd-message">Message au client (facultatif)</label><textarea id="cmd-message" rows="2" placeholder="Ex. : votre maquette est en pièce jointe de notre précédent email…"></textarea></div>`}
          <div class="champ"><label for="cmd-notes">Notes internes (jamais visibles par le client)</label><textarea id="cmd-notes" rows="2">${e(c.notes)}</textarea></div>
        </section>

        <section class="pile" style="gap:.6rem;border-top:1px solid var(--trait);padding-top:1rem">
          <h3>Paiement : ${PAIEMENTS[c.paiement_statut]}${c.paye_le ? ` le ${date(c.paye_le)}` : ""}</h3>
          <div class="raccourcis">
            ${c.paiement_statut === "rembourse" ? `<p class="aide">Commande remboursée. Si le client doit payer à nouveau, faites une nouvelle vente depuis la caisse.</p>` : ""}
            ${c.paiement_statut === "en_attente" && c.statut === "annulee" ? `<p class="aide">Commande annulée : rien à encaisser.</p>` : ""}
            ${c.paiement_statut === "en_attente" && c.statut !== "annulee" ? `<button type="button" class="btn btn-ligne" data-action-cmd="lien">${sansEmail ? "Créer un lien de paiement par carte" : "Envoyer un lien de paiement par carte"}</button>
            <span class="raccourcis"><select id="cmd-moyen" aria-label="Moyen de paiement" style="width:auto">${Object.entries(MOYENS).filter(([k]) => k !== "paypal").map(([k, v]) => `<option value="${k}">${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select><button type="button" class="btn btn-ligne" data-action-cmd="paye">Marquer comme payée</button></span>` : ""}
            ${c.paiement_statut === "paye" ? `<button type="button" class="btn btn-ligne" data-action-cmd="rembourse">Marquer comme remboursée</button>` : ""}
          </div>
          <div id="cmd-lien"></div>
        </section>

        <div class="fenetre-pied">
          <button type="button" class="btn btn-ligne" data-action-cmd="bon">Imprimer le bon de commande</button>
          ${c.facture_numero ? `<button type="button" class="btn btn-ligne" data-action-cmd="facture">Imprimer la facture</button>` : ""}
          <button type="button" class="btn btn-ligne" data-action-cmd="fermer">Fermer</button>
          <button type="submit" class="btn">Enregistrer</button>
        </div>
      </form>`;

    const majLocale = (nouvelle) => {
      Object.assign(c, nouvelle);
      majCompteur();
    };
    f.querySelector("#form-commande").onsubmit = async (ev) => {
      ev.preventDefault();
      const avant = c.statut;
      const modif = { statut: f.querySelector("#cmd-statut").value, suivi_colis: f.querySelector("#cmd-colis").value.trim(), notes: f.querySelector("#cmd-notes").value };
      const { data, error } = await client.from("commandes").update(modif).eq("id", c.id).select().single();
      if (error) return ctx.toast(`Enregistrement impossible (${error.message}).`, true);
      majLocale(data);
      const message = f.querySelector("#cmd-message")?.value.trim() || "";
      if (f.querySelector("#cmd-prevenir")?.checked && (data.statut !== avant || message)) {
        try {
          await appelAdmin("notifier", { commande_id: c.id, message });
          ctx.toast("Enregistré. Le client a été prévenu par email.");
        } catch (err) {
          ctx.toast(`Enregistré, mais l'email n'est pas parti : ${err.message}`, true);
        }
      } else ctx.toast("Enregistré.");
      f.close();
      liste();
    };
    f.onclick = async (ev) => {
      const b = ev.target.closest("[data-action-cmd]");
      if (!b) return;
      const a = b.dataset.actionCmd;
      if (a === "fermer") return f.close();
      if (a === "suivant") {
        f.querySelector("#cmd-statut").value = b.dataset.statut;
        return f.querySelector("#form-commande").requestSubmit();
      }
      if (a === "bon" || a === "facture") return imprimer(c, a);
      if (a === "photos") {
        b.disabled = true;
        try {
          const { photos } = await appelAdmin("photos", { commande_id: c.id });
          for (const p of photos) {
            const el = f.querySelector(`.photo-lien[data-ligne="${p.ligne}"]`);
            const url = window.MTB_DEMO ? await window.MTB_DEMO.lienPhoto(p.url) : p.url; // démo : photo gardée dans ce navigateur
            if (el) el.innerHTML = `· <a href="${e(url)}" target="_blank" rel="noopener">ouvrir / télécharger</a>`;
          }
          if (!photos.length) ctx.toast("Aucune photo trouvée.", true);
        } catch (err) {
          ctx.toast(err.message, true);
        }
        b.disabled = false;
      }
      if (a === "lien") {
        b.disabled = true;
        try {
          const champMessage = f.querySelector("#cmd-message");
          const r = await appelAdmin("lien_paiement", { commande_id: c.id, envoyer: !sansEmail, message: champMessage?.value.trim() || "" });
          if (champMessage && r.email_envoye) champMessage.value = ""; // déjà parti avec le lien : pas une deuxième fois avec le statut
          c.stripe_url = r.url;
          const lien = r.lien || r.url; // lien durable (page de suivi), le lien Stripe direct expire en 24 h
          f.querySelector("#cmd-lien").innerHTML = `
            <p class="message">${r.email_envoye ? "Lien envoyé au client par email." : "Lien créé : transmettez-le au client (SMS, WhatsApp…)."}</p>
            <div class="barre"><input type="text" readonly value="${e(lien)}" aria-label="Lien de paiement"><button type="button" class="mini" id="copier-lien">Copier</button></div>`;
          f.querySelector("#copier-lien").onclick = () => navigator.clipboard.writeText(lien).then(() => ctx.toast("Lien copié."));
        } catch (err) {
          ctx.toast(err.message, true);
        }
        b.disabled = false;
      }
      if (a === "paye" || a === "rembourse") {
        if (!confirm(a === "paye" ? "Confirmer que cette commande a été réglée ?" : "Confirmer le remboursement de cette commande ?")) return;
        const { data, error } = await client
          .from("commandes")
          .update(a === "paye" ? { paiement_statut: "paye", paye_le: new Date().toISOString(), paiement_moyen: f.querySelector("#cmd-moyen")?.value || "" } : { paiement_statut: "rembourse" })
          .eq("id", c.id)
          .select()
          .single();
        if (error) return ctx.toast(error.message, true);
        majLocale(data);
        detail(c);
        liste();
      }
    };
    if (!f.open) f.showModal();
  }

  // ---------- Bon de commande / facture imprimable ----------
  function imprimer(c, type) {
    const S = ctx.D.site;
    const facture = type === "facture";
    const lignes = c.lignes
      .map((l) => `<tr><td>${e(l.nom)}${l.variante ? `<br><small>${e(l.variante)}</small>` : ""}${!facture && l.texte ? `<br><small>Texte : « ${e(l.texte)} » ${e(l.police)}</small>` : ""}${!facture && l.remarque ? `<br><small>${e(l.remarque)}</small>` : ""}</td><td class="n">${l.quantite}</td><td class="n">${ctx.euros(l.prix_unitaire)}</td><td class="n">${ctx.euros(l.total)}</td></tr>`)
      .join("");
    const w = open("", "_blank");
    if (!w) return ctx.toast("Autorisez les fenêtres pop-up pour imprimer.", true);
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${facture ? "Facture " + e(c.facture_numero) : "Bon de commande " + e(c.numero)}</title>
      <style>body{font:14px/1.5 Arial,sans-serif;color:#1b1a17;max-width:760px;margin:30px auto;padding:0 20px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left;vertical-align:top}.n{text-align:right;white-space:nowrap}.tete{display:flex;justify-content:space-between;gap:20px}.total td{font-weight:bold;border:0}small{color:#5f5a52}.mention{color:#5f5a52;font-size:12px;margin-top:30px}@media print{button{display:none}}</style></head><body>
      <div class="tete">
        <div><img src="${new URL("img/logo-email.png", location.href).href}" alt="" width="90"><br><strong>${e(S.nom)}</strong><br>${e(S.adresse)}<br>${e(S.telephone)} · ${e(S.email)}${S.siret ? `<br>SIRET : ${e(S.siret)}` : ""}</div>
        <div style="text-align:right"><h1>${facture ? "Facture" : "Bon de commande"}</h1><strong>${facture ? e(c.facture_numero) : e(c.numero)}</strong><br>${facture ? `Date : ${date(c.paye_le)}<br>Commande ${e(c.numero)}` : `Date : ${date(c.cree_le)}`}</div>
      </div>
      <p style="margin-top:24px"><strong>Client :</strong><br>${e(c.client_nom)}<br>${[c.client_email.endsWith(".invalid") ? "" : c.client_email, c.client_tel].filter(Boolean).map(e).join(" · ")}${c.adresse ? `<br><span style="white-space:pre-line">${e(c.adresse)}</span>` : "<br>Retrait à la boutique"}</p>
      <table><thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>${lignes}
        ${Number(c.port) ? `<tr><td>Livraison</td><td class="n">1</td><td class="n">${ctx.euros(c.port)}</td><td class="n">${ctx.euros(c.port)}</td></tr>` : ""}
        ${Number(c.emballage) ? `<tr><td>Emballage cadeau</td><td class="n">1</td><td class="n">${ctx.euros(c.emballage)}</td><td class="n">${ctx.euros(c.emballage)}</td></tr>` : ""}
        ${Number(c.remise) ? `<tr><td>Remise${c.code_promo ? ` (code ${e(c.code_promo)})` : ""}</td><td class="n"></td><td class="n"></td><td class="n">−${ctx.euros(c.remise)}</td></tr>` : ""}
      </tbody><tfoot>${(() => {
        // Assujetti à la TVA : détail HT / TVA / TTC (les prix du site sont TTC)
        if (S.legal?.regimeTva !== "assujetti") return `<tr class="total"><td colspan="3" class="n">Total</td><td class="n">${ctx.euros(c.total)}</td></tr>`;
        const taux = Number(S.legal.tauxTva || 20);
        const ht = Math.round((Number(c.total) / (1 + taux / 100)) * 100) / 100;
        return `<tr><td colspan="3" class="n">Total HT</td><td class="n">${ctx.euros(ht)}</td></tr><tr><td colspan="3" class="n">TVA ${String(taux).replace(".", ",")} %</td><td class="n">${ctx.euros(Number(c.total) - ht)}</td></tr><tr class="total"><td colspan="3" class="n">Total TTC</td><td class="n">${ctx.euros(c.total)}</td></tr>`;
      })()}</tfoot></table>
      ${facture ? `<p>Réglée le ${date(c.paye_le)}${c.paiement_moyen ? ` par ${MOYENS[c.paiement_moyen] || e(c.paiement_moyen)}` : c.paiement_mode === "en_ligne" || c.stripe_session_id ? " par carte bancaire (paiement en ligne)" : ""}.</p>` : `<p>${c.cadeau?.date ? `Date souhaitée : ${new Date(c.cadeau.date).toLocaleDateString("fr-FR")}<br>` : ""}${c.cadeau?.message ? `Message carte : « ${e(c.cadeau.message)} »<br>` : ""}${c.message ? `Message client : ${e(c.message)}` : ""}</p>`}
      <p class="mention">${[S.legal?.regimeTva === "franchise" ? "TVA non applicable, article 293 B du CGI." : "", S.legal?.formeJuridique ? `${e(S.legal.exploitant || S.nom)}, ${e(S.legal.formeJuridique)}${S.siret ? ` · SIRET ${e(S.siret)}` : ""}.` : "", e(S.mentionTva || "")].filter(Boolean).join("<br>")}</p>
      <button onclick="print()">Imprimer</button>
      <script>setTimeout(() => print(), 400)<\/script></body></html>`);
    w.document.close();
  }

  // ---------- Export tableur (CSV, s'ouvre dans Excel ou LibreOffice) ----------
  function exporter() {
    const champ = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const montant = (n) => String(Number(n || 0)).replace(".", ","); // virgule décimale pour Excel
    const lignes = [
      ["Numéro", "Date", "Canal", "Client", "Email", "Téléphone", "Réception", "Adresse", "Articles", "Sous-total", "Remise", "Code promo", "Livraison", "Emballage", "Total", "Statut", "Paiement", "Payée le", "Moyen de paiement", "Mode de paiement", "Facture"].map(champ).join(";"),
      ...commandes.filter(FILTRES[filtre][1]).map((c) =>
        [
          c.numero, date(c.cree_le, true), CANAUX[c.canal] || "Site internet", c.client_nom, c.client_email.endsWith(".invalid") ? "" : c.client_email, c.client_tel, c.mode_reception, c.adresse,
          c.lignes.map((l) => `${l.quantite} × ${l.nom}${l.texte ? ` (« ${l.texte} »)` : ""}`).join(" | "),
          ...[c.sous_total, c.remise].map(montant), c.code_promo || "", ...[c.port, c.emballage, c.total].map(montant),
          STATUTS[c.statut], PAIEMENTS[c.paiement_statut], c.paye_le ? date(c.paye_le) : "", MOYENS[c.paiement_moyen] || c.paiement_moyen || "", MODES[c.paiement_mode], c.facture_numero || "",
        ].map(champ).join(";")
      ),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
  }

  // ---------- Branchement dans l'admin ----------
  async function monter(element, contexte) {
    ctx = contexte;
    zone = element;
    if (!initialiser() || !(await S().connecte(ctx.D))) return ecranConnexion();
    charger();
    clearInterval(minuteur);
    minuteur = setInterval(() => document.contains(zone) && !document.getElementById("fenetre").open ? charger() : null, 90_000);
  }

  document.addEventListener("click", (ev) => {
    if (!zone || !zone.contains(ev.target)) return;
    const o = ev.target.closest("[data-ouvrir]");
    if (o) return detail(commandes.find((c) => c.id === o.dataset.ouvrir));
    const fb = ev.target.closest("[data-filtre]");
    if (fb) {
      filtre = fb.dataset.filtre;
      return liste();
    }
    const b = ev.target.closest("[data-cmd]");
    if (!b) return;
    if (b.dataset.cmd === "actualiser") charger();
    if (b.dataset.cmd === "export") exporter();
    if (b.dataset.cmd === "deconnexion") S().deconnecter(ctx.D).then(() => ecranConnexion());
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id !== "cmd-q") return;
    recherche = ev.target.value;
    const pos = ev.target.selectionStart;
    liste();
    const q = document.getElementById("cmd-q");
    q.focus();
    q.setSelectionRange(pos, pos);
  });

  /** Résumé pour le tableau de bord (null si non connecté). */
  async function resume(contexte) {
    ctx = contexte;
    if (!initialiser()) return null;
    if (!(await S().connecte(ctx.D))) return { connecte: false };
    const { data, error } = await client.from("commandes").select("statut").in("statut", ["nouvelle", "maquette_envoyee", "retouche", "confirmee", "en_fabrication"]);
    if (error) return { connecte: false };
    return { connecte: true, nouvelles: data.filter((c) => c.statut === "nouvelle").length, aTraiter: data.length };
  }

  window.AdminCommandes = {
    monter,
    resume,
    imprimer: (c, type, contexte) => {
      ctx ||= contexte;
      imprimer(c, type);
    },
  };
})();
