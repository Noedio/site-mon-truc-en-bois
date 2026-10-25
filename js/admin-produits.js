// Onglet « Produits » de l'admin : liste dense façon tableau (recherche, filtres, tri, ordre du site par glisser-déposer
// ou au clavier, prix et visibilité modifiables dans la liste, sélection multiple) et éditeur en tiroir latéral.
// Travaille sur les données en cours d'édition (ctx.D, lues dans data/donnees.js) : rien ne part sur le site
// sans « Publier les modifications ».
(function () {
  // Forme de l'aperçu du configurateur (lue par le site) ; vide : choisie d'après le produit
  const GABARITS = {
    "": "Automatique",
    planche: "Planche à poignée",
    tranche: "Tranche de bois",
    ronde: "Rond",
    "porte-cles": "Porte-clés",
    ardoise: "Ardoise",
    rectangle: "Plaque rectangulaire",
    coeur: "Cœur",
    bande: "Sans gabarit (photo et texte)",
  };
  // Fiche technique affichée sur la fiche du nouveau site (brief §3)
  const FICHE = [
    ["delai", "délai"],
    ["matiere", "matière"],
    ["dimensions", "dimensions"],
    ["zoneGravable", "zone gravable"],
    ["entretien", "entretien"],
  ];
  const ETATS = {
    "": "Tous les produits",
    visibles: "Visibles sur le site",
    masques: "Masqués",
    incomplets: "Fiche technique incomplète",
    "sans-photo": "Sans photo",
  };
  const SECTIONS = [
    ["infos", "Informations"],
    ["photos", "Photos"],
    ["prix", "Prix et variantes"],
    ["perso", "Personnalisation"],
    ["fiche", "Fiche technique"],
    ["visibilite", "Visibilité"],
  ];
  const ICONES = {
    poignee: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3" stroke-linecap="round"/></svg>`,
    fermer: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  };

  let ctx = null; // contexte de l'admin : { D, toast, echapper, euros, marquerModifie, srcImage, envoyerPhoto, idUnique… }
  let zone = null;
  // Recherche, filtres, tri et sélection : gardés quand on change d'onglet
  const etat = { q: "", cat: "", vue: "", tri: "", sens: 1, selection: new Set(), aMontrer: "" };

  const D = () => ctx.D;
  const e = (s) => ctx.echapper(s);
  const sansAccents = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const rempli = (v) => v !== undefined && v !== null && String(v).trim() !== "" && v !== 0;
  const manques = (p) => FICHE.filter(([k]) => !rempli(p[k])).map(([, l]) => l);
  const premiere = (p) => p.images?.[0] || p.image || "";
  const nomCategorie = (id) => D().categories.find((c) => c.id === id)?.nom || "Sans catégorie";
  const numero3 = (n) => String(Number(n) || 0).padStart(3, "0");
  const montant = (n) => (Number(n) || 0).toFixed(2); // 24.9 → « 24,90 » dans un champ nombre
  const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
  // Prix affiché sur la carte du site : le moins cher des choix, précédé de « dès » si les choix ont des prix différents
  function prixCarte(prix, choix) {
    const ecarts = choix?.length ? choix.map((c) => Number(c.prix) || 0) : [0];
    const min = Math.min(...ecarts);
    return { prix: (Number(prix) || 0) + min, plusieurs: ecarts.some((x) => x !== min) };
  }
  const photo = (chemin, classe = "pr-vignette") =>
    chemin ? `<span class="${classe}"><img src="${e(ctx.srcImage(chemin))}" alt="" loading="lazy"></span>` : `<span class="${classe} sans-photo">Sans photo</span>`;

  // ---------- Liste ----------
  function correspond(p, q) {
    if (!q) return true;
    const n = Number(q.replace(/^n°\s*/, ""));
    if (n > 0 && Number(p.numero) === n) return true;
    return [p.nom, p.id, numero3(p.numero), nomCategorie(p.categorie), p.matiere].some((v) => sansAccents(v).includes(q));
  }
  function produitsAffiches() {
    const q = sansAccents(etat.q).trim();
    const liste = D()
      .produits.map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        if (etat.cat && p.categorie !== etat.cat) return false;
        if (etat.vue === "visibles" && p.visible === false) return false;
        if (etat.vue === "masques" && p.visible !== false) return false;
        if (etat.vue === "incomplets" && !manques(p).length) return false;
        if (etat.vue === "sans-photo" && premiere(p)) return false;
        return correspond(p, q);
      });
    const cle = {
      numero: ({ p }) => Number(p.numero) || 0,
      nom: ({ p }) => sansAccents(p.nom),
      categorie: ({ p }) => sansAccents(nomCategorie(p.categorie)),
      prix: ({ p }) => Number(p.prix) || 0,
      fiche: ({ p }) => manques(p).length,
    }[etat.tri];
    if (cle) liste.sort((a, b) => (cle(a) < cle(b) ? -1 : cle(a) > cle(b) ? 1 : a.i - b.i) * etat.sens);
    return liste;
  }

  function enTete(col, libelle, classe = "") {
    const sens = etat.tri === col ? (etat.sens > 0 ? "ascending" : "descending") : "none";
    return `<th class="${classe}" aria-sort="${sens}"><button type="button" class="pr-tri" data-tri="${col}">${libelle}<span class="pr-sens" aria-hidden="true">${sens === "ascending" ? "▲" : sens === "descending" ? "▼" : ""}</span></button></th>`;
  }

  function rendre() {
    const cats = D().categories;
    zone.innerHTML = `
      <section class="bloc pr-bloc">
        <div class="pr-outils">
          <div class="pr-recherche">
            <input type="search" id="pr-q" value="${e(etat.q)}" placeholder="Nom ou N°" aria-label="Rechercher un produit (raccourci : /)" aria-keyshortcuts="/" autocomplete="off">
            <kbd aria-hidden="true">/</kbd>
          </div>
          <select id="pr-cat" aria-label="Filtrer par catégorie">
            <option value="">Toutes les catégories</option>
            ${cats.map((c) => `<option value="${e(c.id)}" ${etat.cat === c.id ? "selected" : ""}>${e(c.nom)}</option>`).join("")}
          </select>
          <select id="pr-vue" aria-label="Filtrer par état">
            ${Object.entries(ETATS).map(([k, v]) => `<option value="${k}" ${etat.vue === k ? "selected" : ""}>${v}</option>`).join("")}
          </select>
          <button type="button" class="btn" data-pr="nouveau"><span>+ Ajouter<span class="pr-long"> un produit</span></span></button>
        </div>
        <div class="pr-infos">
          <p id="pr-compte" aria-live="polite"></p>
          <p id="pr-ordre"></p>
        </div>
        <div class="pr-cadre">
          <table class="pr-table">
            <thead>
              <tr>
                <th class="pr-c-poignee"><span class="pr-cache">Ordre</span></th>
                <th class="pr-c-case"><label class="pr-case"><input type="checkbox" id="pr-tout" aria-label="Sélectionner tous les produits affichés"></label></th>
                <th class="pr-c-photo"><span class="pr-cache">Photo</span></th>
                ${enTete("numero", "N°", "pr-c-numero")}
                ${enTete("nom", "Nom", "pr-c-nom")}
                ${enTete("categorie", "Catégorie", "pr-c-cat")}
                ${enTete("prix", "Prix", "pr-c-prix")}
                <th class="pr-c-visible">Sur le site</th>
                ${enTete("fiche", "Fiche technique", "pr-c-fiche")}
                <th class="pr-c-actions"><span class="pr-cache">Actions</span></th>
              </tr>
            </thead>
            <tbody id="pr-corps"></tbody>
          </table>
        </div>
        <div class="pr-selection" id="pr-selection" role="region" aria-label="Actions sur la sélection" hidden>
          <div class="pr-sel-tete">
            <strong id="pr-sel-n"></strong>
            <button type="button" class="mini pr-sel-vider" data-pr="vider-sel">Désélectionner</button>
          </div>
          <div class="pr-sel-actions">
            <button type="button" class="mini" data-pr="afficher-sel">Afficher</button>
            <button type="button" class="mini" data-pr="masquer-sel">Masquer</button>
            <select id="pr-sel-cat" aria-label="Changer la catégorie des produits sélectionnés">
              <option value="">${matchMedia("(max-width: 760px)").matches ? "Catégorie…" : "Changer de catégorie…"}</option>
              ${cats.map((c) => `<option value="${e(c.id)}">${e(c.nom)}</option>`).join("")}
            </select>
          </div>
        </div>
      </section>`;
    rendreCorps();
  }

  function ligne({ p, i }, n) {
    const m = manques(p);
    const masque = p.visible === false;
    // Fiche technique : « Vide », « 2 sur 5 à compléter » ou « Complète » (le détail au survol)
    const resume = !m.length ? "complète" : m.length === FICHE.length ? "vide" : `${m.length} sur ${FICHE.length} à compléter`;
    const marque = (t) => (m.length ? `<span class="manque" title="À compléter : ${m.join(", ")}">${t}</span>` : t);
    const fiche = marque(resume[0].toUpperCase() + resume.slice(1));
    const ficheMeta = marque(`fiche ${m.length && m.length < FICHE.length ? ": " : ""}${resume}`);
    const dispo = p.dispo && p.dispo !== "disponible" ? ctx.DISPOS[p.dispo] : "";
    return `
      <tr data-i="${i}" class="${masque ? "masque" : ""} ${etat.selection.has(p.id) ? "choisi" : ""}">
        <td class="pr-c-poignee"><button type="button" class="pr-poignee" data-pr="poignee" ${etat.tri ? "disabled" : ""} aria-label="Déplacer « ${e(p.nom)} », position ${n} (flèches haut et bas)" title="Glisser pour déplacer (ou flèches haut et bas)">${ICONES.poignee}</button></td>
        <td class="pr-c-case"><label class="pr-case"><input type="checkbox" data-pr-case ${etat.selection.has(p.id) ? "checked" : ""} aria-label="Sélectionner « ${e(p.nom)} »"></label></td>
        <td class="pr-c-photo">${photo(premiere(p))}</td>
        <td class="pr-c-numero">${numero3(p.numero)}</td>
        <td class="pr-c-nom">
          <button type="button" class="pr-nom" data-pr="modifier">${e(p.nom) || "Sans nom"}</button>
          <span class="pr-meta"><span class="pr-meta-num">N° ${numero3(p.numero)} · ${e(nomCategorie(p.categorie))} · </span>${dispo ? `${e(dispo)}<span class="pr-meta-fiche"> · </span>` : ""}<span class="pr-meta-fiche">${ficheMeta}</span></span>
        </td>
        <td class="pr-c-cat">${e(nomCategorie(p.categorie))}</td>
        <td class="pr-c-prix"><label class="pr-prix"><input type="number" step="0.01" min="0" inputmode="decimal" data-pr-prix value="${montant(p.prix)}" aria-label="Prix de « ${e(p.nom)} » en euros"><span aria-hidden="true">€</span></label></td>
        <td class="pr-c-visible"><button type="button" class="pr-bascule" role="switch" aria-checked="${!masque}" data-pr="visible" aria-label="« ${e(p.nom)} » visible sur le site"><span aria-hidden="true">${masque ? "Masqué" : "Visible"}</span></button></td>
        <td class="pr-c-fiche">${fiche}</td>
        <td class="pr-c-actions">
          <details class="plus-actions">
            <summary class="mini" aria-label="Plus d'actions pour « ${e(p.nom)} »">…</summary>
            <div class="plus-menu">
              <button type="button" data-pr="modifier">Modifier</button>
              <button type="button" data-pr="dupliquer">Dupliquer</button>
              <button type="button" data-pr="monter" ${i === 0 ? "disabled" : ""}>Monter dans la liste</button>
              <button type="button" data-pr="descendre" ${i === D().produits.length - 1 ? "disabled" : ""}>Descendre dans la liste</button>
              <button type="button" class="danger" data-pr="supprimer">Supprimer</button>
            </div>
          </details>
        </td>
      </tr>`;
  }

  // Corps du tableau, compteur et barre de sélection (la recherche garde le focus : le reste n'est pas redessiné)
  function rendreCorps() {
    const liste = produitsAffiches();
    const tous = D().produits;
    const corps = zone.querySelector("#pr-corps");
    const filtre = etat.q || etat.cat || etat.vue;
    corps.innerHTML =
      liste.map((x, n) => ligne(x, n + 1)).join("") ||
      `<tr class="pr-vide"><td colspan="10">${
        tous.length
          ? `Aucun produit ne correspond${etat.q ? ` à « ${e(etat.q)} »` : ""}${etat.cat ? ` dans « ${e(nomCategorie(etat.cat))} »` : ""}${etat.vue ? ` (${ETATS[etat.vue].toLowerCase()})` : ""}. <button type="button" class="mini" data-pr="effacer">Effacer les filtres</button>`
          : `Aucun produit pour l'instant. <button type="button" class="mini" data-pr="nouveau">Ajouter le premier produit</button>`
      }</td></tr>`;
    const visibles = tous.filter((p) => p.visible !== false).length;
    const incomplets = tous.filter((p) => manques(p).length).length;
    zone.querySelector("#pr-compte").textContent =
      (filtre ? `${liste.length} sur ${pluriel(tous.length, "produit", "produits")}` : pluriel(tous.length, "produit", "produits")) +
      ` · ${pluriel(visibles, "visible", "visibles")} · ${incomplets ? `${pluriel(incomplets, "fiche technique", "fiches techniques")} à compléter` : "fiches techniques complètes"}`;
    zone.querySelector("#pr-ordre").innerHTML = etat.tri
      ? `Liste triée : l'ordre du site ne change pas. <button type="button" class="mini" data-pr="ordre-site">Revenir à l'ordre du site</button>`
      : "L'ordre de la liste est celui du site : glissez une ligne par sa poignée, ou flèches haut et bas sur la poignée.";
    majSelection();
    if (etat.aMontrer) {
      const i = tous.findIndex((p) => p.id === etat.aMontrer);
      const tr = corps.querySelector(`tr[data-i="${i}"]`);
      etat.aMontrer = "";
      if (tr) {
        tr.scrollIntoView({ block: "center" });
        tr.querySelector(".pr-nom").focus({ preventScroll: true });
      }
    }
  }

  function majSelection() {
    const tous = D().produits;
    // Produits supprimés entre-temps : retirés de la sélection
    for (const id of etat.selection) if (!tous.some((p) => p.id === id)) etat.selection.delete(id);
    const n = etat.selection.size;
    const barre = zone.querySelector("#pr-selection");
    barre.hidden = !n;
    zone.querySelector("#pr-sel-n").textContent = `${pluriel(n, "produit sélectionné", "produits sélectionnés")}`;
    const affiches = produitsAffiches();
    const coches = affiches.filter(({ p }) => etat.selection.has(p.id)).length;
    const tout = zone.querySelector("#pr-tout");
    tout.checked = !!affiches.length && coches === affiches.length;
    tout.indeterminate = coches > 0 && coches < affiches.length;
  }

  // Déplace un produit avant ou après un autre dans l'ordre du site (vrai aussi quand la liste est filtrée)
  function deplacer(p, cible, apres) {
    const liste = D().produits;
    if (p === cible) return;
    liste.splice(liste.indexOf(p), 1);
    liste.splice(liste.indexOf(cible) + (apres ? 1 : 0), 0, p);
    ctx.marquerModifie();
  }
  function deplacerClavier(i, sens) {
    const affiches = produitsAffiches();
    const n = affiches.findIndex((x) => x.i === i);
    const voisin = affiches[n + sens];
    if (!voisin) return;
    const p = D().produits[i];
    deplacer(p, voisin.p, sens > 0);
    rendreCorps();
    const j = D().produits.indexOf(p);
    zone.querySelector(`tr[data-i="${j}"] .pr-poignee`)?.focus();
    ctx.toast(`« ${p.nom} » en position ${n + sens + 1}.`);
  }

  // Glisser-déposer à la souris ou au doigt par la poignée (événements « pointer » : marche aussi sur écran tactile)
  function glisser(ev, poignee) {
    const tr = poignee.closest("tr");
    const corps = zone.querySelector("#pr-corps");
    const lignes = [...corps.querySelectorAll("tr[data-i]")];
    let cible = null;
    let apres = false;
    ev.preventDefault();
    poignee.setPointerCapture(ev.pointerId);
    tr.classList.add("en-deplacement");
    const marquer = () => {
      lignes.forEach((l) => l.classList.remove("depot-avant", "depot-apres"));
      if (cible && cible !== tr) cible.classList.add(apres ? "depot-apres" : "depot-avant");
    };
    const bouger = (m) => {
      const y = m.clientY;
      cible = lignes.find((l) => {
        const r = l.getBoundingClientRect();
        return y >= r.top && y < r.bottom;
      }) || (y < lignes[0].getBoundingClientRect().top ? lignes[0] : y > lignes.at(-1).getBoundingClientRect().bottom ? lignes.at(-1) : cible);
      if (cible) {
        const r = cible.getBoundingClientRect();
        apres = y > r.top + r.height / 2;
      }
      if (y < 90) scrollBy(0, -14);
      else if (y > innerHeight - 90) scrollBy(0, 14);
      marquer();
    };
    const fin = (annule) => {
      poignee.removeEventListener("pointermove", bouger);
      poignee.removeEventListener("pointerup", lacher);
      poignee.removeEventListener("pointercancel", abandon);
      tr.classList.remove("en-deplacement");
      cible = annule ? null : cible;
      marquer();
      if (!cible || cible === tr) return;
      const p = D().produits[tr.dataset.i];
      deplacer(p, D().produits[cible.dataset.i], apres);
      rendreCorps();
      zone.querySelector(`tr[data-i="${D().produits.indexOf(p)}"] .pr-poignee`)?.focus();
    };
    const lacher = () => fin(false);
    const abandon = () => fin(true);
    poignee.addEventListener("pointermove", bouger);
    poignee.addEventListener("pointerup", lacher);
    poignee.addEventListener("pointercancel", abandon);
  }

  function supprimer(i) {
    const p = D().produits[i];
    if (!confirm(`Supprimer « ${p.nom} » ? Il disparaîtra du site à la prochaine publication.`)) return;
    D().produits.splice(i, 1);
    etat.selection.delete(p.id);
    ctx.marquerModifie();
    rendreCorps();
    ctx.toast(`« ${p.nom} » supprimé. Pensez à publier les modifications.`);
  }

  function actionGroupee(quoi, valeur) {
    const choisis = D().produits.filter((p) => etat.selection.has(p.id));
    if (!choisis.length) return;
    if (quoi === "visible") choisis.forEach((p) => (p.visible = valeur));
    if (quoi === "categorie") choisis.forEach((p) => (p.categorie = valeur));
    ctx.marquerModifie();
    rendreCorps();
    const n = pluriel(choisis.length, "produit", "produits");
    ctx.toast(
      quoi === "visible" ? `${n} ${valeur ? (choisis.length > 1 ? "affichés" : "affiché") : choisis.length > 1 ? "masqués" : "masqué"} sur le site. Pensez à publier.`
      : `${n} dans « ${nomCategorie(valeur)} ». Pensez à publier.`
    );
  }

  function monter(element, contexte) {
    ctx = contexte;
    zone = element;
    rendre();

    zone.addEventListener("input", (ev) => {
      const el = ev.target;
      if (el.id === "pr-q") {
        etat.q = el.value;
        rendreCorps();
      } else if (el.dataset.prPrix !== undefined) {
        const p = D().produits[el.closest("tr").dataset.i];
        p.prix = Math.max(0, Number(el.value || 0));
        ctx.marquerModifie();
      }
    });
    zone.addEventListener("change", (ev) => {
      const el = ev.target;
      if (el.id === "pr-cat") etat.cat = el.value;
      else if (el.id === "pr-vue") etat.vue = el.value;
      else if (el.id === "pr-tout") produitsAffiches().forEach(({ p }) => (el.checked ? etat.selection.add(p.id) : etat.selection.delete(p.id)));
      else if (el.id === "pr-sel-cat") {
        if (el.value) actionGroupee("categorie", el.value);
        return;
      } else if (el.dataset.prCase !== undefined) {
        const tr = el.closest("tr");
        const p = D().produits[tr.dataset.i];
        el.checked ? etat.selection.add(p.id) : etat.selection.delete(p.id);
        tr.classList.toggle("choisi", el.checked);
        return majSelection();
      } else if (el.dataset.prPrix !== undefined) {
        // Prix vidé : on réaffiche le prix retenu (0)
        el.value = montant(D().produits[el.closest("tr").dataset.i].prix);
        return;
      } else return;
      rendreCorps();
    });
    zone.addEventListener("click", (ev) => {
      const tri = ev.target.closest("[data-tri]");
      if (tri) {
        // Croissant, décroissant, puis retour à l'ordre du site
        if (etat.tri !== tri.dataset.tri) [etat.tri, etat.sens] = [tri.dataset.tri, 1];
        else if (etat.sens > 0) etat.sens = -1;
        else etat.tri = "";
        rendre();
        zone.querySelector(`[data-tri="${tri.dataset.tri}"]`)?.focus();
        return;
      }
      const b = ev.target.closest("[data-pr]");
      const tr = ev.target.closest("tr[data-i]");
      const i = tr ? Number(tr.dataset.i) : -1;
      if (!b) {
        // Un clic sur la ligne (hors champ, case ou bouton) ouvre la fiche
        if (tr && !ev.target.closest("input, button, select, label, details, a")) editer(i, ctx);
        return;
      }
      const a = b.dataset.pr;
      if (a === "nouveau") return editer(-1, ctx);
      if (a === "modifier") return editer(i, ctx);
      if (a === "dupliquer") return editer(-1, ctx, { modele: i });
      if (a === "supprimer") return supprimer(i);
      if (a === "monter" || a === "descendre") {
        const p = D().produits[i];
        const j = a === "monter" ? i - 1 : i + 1;
        if (!D().produits[j]) return;
        deplacer(p, D().produits[j], a === "descendre");
        return rendreCorps();
      }
      if (a === "visible") {
        const p = D().produits[i];
        p.visible = p.visible === false;
        ctx.marquerModifie();
        b.setAttribute("aria-checked", p.visible);
        b.firstElementChild.textContent = p.visible ? "Visible" : "Masqué";
        tr.classList.toggle("masque", !p.visible);
        return zone.querySelector("#pr-compte") && rendreCompteSeul();
      }
      if (a === "afficher-sel") return actionGroupee("visible", true);
      if (a === "masquer-sel") return actionGroupee("visible", false);
      if (a === "vider-sel") {
        etat.selection.clear();
        return rendreCorps();
      }
      if (a === "ordre-site") {
        etat.tri = "";
        return rendre();
      }
      if (a === "effacer") {
        Object.assign(etat, { q: "", cat: "", vue: "" });
        return rendre();
      }
    });
    zone.addEventListener("pointerdown", (ev) => {
      const poignee = ev.target.closest(".pr-poignee");
      if (poignee && !poignee.disabled && ev.button === 0) glisser(ev, poignee);
    });
    zone.addEventListener("keydown", (ev) => {
      const tr = ev.target.closest?.("tr[data-i]");
      if (!tr || !["ArrowUp", "ArrowDown"].includes(ev.key) || etat.tri) return;
      // Sur la poignée : flèches seules ; ailleurs dans la ligne (hors champ de prix) : Alt + flèches
      const surPoignee = ev.target.classList.contains("pr-poignee");
      if (!surPoignee && !(ev.altKey && ev.target.dataset.prPrix === undefined)) return;
      ev.preventDefault();
      deplacerClavier(Number(tr.dataset.i), ev.key === "ArrowUp" ? -1 : 1);
    });
  }
  // Compteur seul (après un changement de visibilité dans la ligne : la ligne garde le focus)
  function rendreCompteSeul() {
    const tous = D().produits;
    const visibles = tous.filter((p) => p.visible !== false).length;
    const el = zone.querySelector("#pr-compte");
    el.textContent = el.textContent.replace(/\d+ visibles?/, pluriel(visibles, "visible", "visibles"));
  }

  // « / » place le curseur dans la recherche (quand on n'est pas déjà en train d'écrire)
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "/" || !zone?.isConnected || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
    ev.preventDefault();
    zone.querySelector("#pr-q")?.focus();
  });

  // ---------- Éditeur en tiroir ----------
  let tiroir = null;
  let sale = false; // modifications pas encore validées
  function creerTiroir() {
    tiroir = document.createElement("dialog");
    tiroir.className = "tiroir";
    tiroir.setAttribute("aria-labelledby", "ed-titre");
    document.body.append(tiroir);
    // Clic sur le voile (et pas une sélection de texte commencée dans le tiroir)
    let surVoile = false;
    tiroir.addEventListener("pointerdown", (ev) => (surVoile = ev.target === tiroir));
    tiroir.addEventListener("click", (ev) => ev.target === tiroir && surVoile && fermer());
    // Échap : demande avant de perdre des modifications (le navigateur fermerait le tiroir sans prévenir)
    tiroir.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      fermer();
    });
    tiroir.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        fermer();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        tiroir.querySelector("form")?.requestSubmit();
      }
    });
    addEventListener("beforeunload", (ev) => {
      if (tiroir.open && sale) ev.preventDefault();
    });
  }
  function fermer() {
    if (sale && !confirm("Fermer sans valider ? Les modifications de ce produit seront perdues.")) return;
    sale = false;
    tiroir.close();
  }

  // index < 0 : nouveau produit ; options.modele : index du produit à dupliquer (la copie est ajoutée juste après lui)
  function editer(index, contexte, { modele = -1 } = {}) {
    ctx = contexte;
    if (!tiroir) creerTiroir();
    const d = D();
    const nouveau = index < 0;
    const copie = modele >= 0;
    let p;
    if (copie) {
      p = structuredClone(d.produits[modele]);
      p.nom = `${p.nom} (copie)`;
      p.id = "";
      p.visible = false;
      p.numero = ctx.numeroLibre();
    } else if (nouveau)
      p = { id: "", nom: "", categorie: d.categories[0]?.id || "", prix: 0, images: [], description: "", options: { texte: true, photo: false }, visible: true, vedette: false, occasions: [], dispo: "disponible", badge: "", prixBarre: 0, delai: 0, instructions: "", numero: ctx.numeroLibre(), matiere: "", dimensions: "", zoneGravable: "", entretien: "" };
    else p = structuredClone(d.produits[index]);
    p.options ||= {};
    p.images ||= p.image ? [p.image] : [];
    p.occasions ||= [];
    p.variantes ||= { nom: "", choix: [] };
    p.variantes.choix ||= [];
    const envois = []; // photos en cours d'envoi (aperçu local)
    sale = copie;

    const lignesChoix = () =>
      p.variantes.choix
        .map(
          (c, k) => `
        <div class="ed-choix" data-k="${k}">
          <input type="text" data-v="nom" value="${e(c.nom)}" placeholder="Ex. : Grande" aria-label="Choix ${k + 1} : nom">
          <input type="number" step="0.01" min="0" data-v="prix" value="${montant(c.prix)}" aria-label="Choix ${k + 1} : supplément en euros">
          <span class="ed-choix-total" data-total></span>
          <button type="button" class="mini danger" data-ed="retirer-choix" aria-label="Retirer le choix ${k + 1}">${ICONES.fermer}</button>
        </div>`
        )
        .join("");
    const lignesPhotos = () =>
      p.images
        .map(
          (src, k) => `
        <figure class="ed-photo" data-k="${k}">
          <button type="button" class="ed-photo-image" data-ed="photo" aria-label="Photo ${k + 1} sur ${p.images.length}${k === 0 ? ", photo principale" : ""} : glisser, ou flèches gauche et droite pour la déplacer">
            <img src="${e(ctx.srcImage(src))}" alt="" draggable="false">
          </button>
          <figcaption>
            ${k === 0 ? `<span class="ed-principale">Photo principale</span>` : `<button type="button" class="mini" data-ed="principale">Principale</button>`}
            <button type="button" class="mini danger" data-ed="retirer-photo" aria-label="Retirer la photo ${k + 1}">${ICONES.fermer}</button>
          </figcaption>
        </figure>`
        )
        .join("") +
      envois.map((src) => `<figure class="ed-photo envoi"><span class="ed-photo-image"><img src="${e(src)}" alt=""></span><figcaption><span class="ed-principale">Envoi…</span></figcaption></figure>`).join("") +
      `<label class="ed-ajout" id="ed-depot"><strong>Ajouter des photos</strong><small>ou déposez-les ici</small><input type="file" accept="image/*" multiple id="ed-fichiers"></label>`;
    const champ = (id, libelle, entree, aide = "", large = false) =>
      `<div class="champ ${large ? "large" : ""}"><label for="${id}">${libelle}</label>${entree}${aide ? `<small>${aide}</small>` : ""}</div>`;
    const texte = (id, v, attrs = "") => `<input type="text" id="${id}" value="${e(v)}" ${attrs}>`;

    tiroir.innerHTML = `
      <form class="ed" id="ed-form" novalidate>
        <header class="ed-tete">
          <div class="ed-titres">
            <p class="etiquette" id="ed-surtitre">${copie ? `Copie de N° ${numero3(d.produits[modele].numero)}` : nouveau ? "Nouveau produit" : `N° ${numero3(p.numero)}`}</p>
            <h2 id="ed-titre">${e(p.nom) || "Nouveau produit"}</h2>
          </div>
          <button type="button" class="mini" data-ed="fermer" aria-label="Fermer (Échap)" title="Fermer (Échap)">${ICONES.fermer}</button>
        </header>
        <nav class="ed-sommaire" aria-label="Sections de la fiche">
          ${SECTIONS.map(([id, nom]) => `<button type="button" data-ed-aller="${id}">${nom}</button>`).join("")}
        </nav>
        <div class="ed-corps" id="ed-corps">
          <aside class="ed-apercu" aria-label="Aperçu de la carte sur le site">
            <p class="etiquette">Aperçu de la carte sur le site</p>
            <div class="ed-carte" id="ed-carte"></div>
            <p class="ed-carte-note" id="ed-carte-note"></p>
          </aside>
          <div class="ed-sections">
            <section class="ed-section" id="ed-s-infos" aria-labelledby="ed-h-infos">
              <h3 id="ed-h-infos">Informations</h3>
              <div class="grille-champs">
                ${champ("ed-nom", "Nom du produit *", texte("ed-nom", p.nom, 'required autocomplete="off"') + `<small class="ed-erreur" id="ed-nom-erreur" hidden>Indiquez le nom du produit.</small>`, "", true)}
                ${champ("ed-cat", "Catégorie", `<select id="ed-cat">${d.categories.map((c) => `<option value="${e(c.id)}" ${c.id === p.categorie ? "selected" : ""}>${e(c.nom)}</option>`).join("")}</select>`)}
                ${champ("ed-desc", "Description", `<textarea id="ed-desc" rows="4">${e(p.description)}</textarea>`, "", true)}
              </div>
              ${d.occasions.length ? `
              <fieldset class="ed-groupe">
                <legend>Occasions <small class="aide">(page « Idées cadeaux » et filtres)</small></legend>
                <div class="cases-occasions">${d.occasions.map((o) => `<label class="case"><input type="checkbox" data-occasion="${e(o.id)}" ${p.occasions.includes(o.id) ? "checked" : ""}> ${e(o.nom)}</label>`).join("")}</div>
              </fieldset>` : ""}
              <details class="ed-avance">
                <summary>Identifiant (adresse de la page)</summary>
                ${champ("ed-id", "Identifiant", texte("ed-id", p.id, 'placeholder="créé automatiquement à partir du nom"'), "Évitez de le changer : les liens déjà partagés ne marcheraient plus.")}
              </details>
            </section>

            <section class="ed-section" id="ed-s-photos" aria-labelledby="ed-h-photos">
              <h3 id="ed-h-photos">Photos</h3>
              <div class="ed-photos" id="ed-photos">${lignesPhotos()}</div>
              <small class="aide">La première photo est la photo principale : carte et fiche du site. Montrez de préférence un produit déjà personnalisé. Glissez une photo pour changer l'ordre ; format carré conseillé, les photos sont réduites automatiquement.</small>
            </section>

            <section class="ed-section" id="ed-s-prix" aria-labelledby="ed-h-prix">
              <h3 id="ed-h-prix">Prix et variantes</h3>
              <div class="grille-champs">
                ${champ("ed-prix", "Prix de base (€) *", `<input type="number" id="ed-prix" step="0.01" min="0" inputmode="decimal" required value="${montant(p.prix)}">`)}
                ${champ("ed-prix-barre", "Ancien prix barré (€)", `<input type="number" id="ed-prix-barre" step="0.01" min="0" inputmode="decimal" value="${p.prixBarre > 0 ? montant(p.prixBarre) : ""}" placeholder="Pour une promotion">`, "Laisser vide sans promotion.")}
              </div>
              <fieldset class="ed-groupe">
                <legend>Choix proposés au client <small class="aide">(facultatif : taille, couleur, finition…)</small></legend>
                ${champ("ed-var-nom", "Intitulé", texte("ed-var-nom", p.variantes.nom, 'placeholder="Ex. : Taille"'))}
                <div class="ed-choix-tete" ${p.variantes.choix.length ? "" : "hidden"}><span>Choix</span><span>Supplément (€)</span><span>Prix payé</span></div>
                <div class="ed-choix-liste" id="ed-choix">${lignesChoix()}</div>
                <button type="button" class="mini ed-ajout-choix" data-ed="ajout-choix">+ Ajouter un choix</button>
                <small class="aide">Le supplément s'ajoute au prix de base (0 si même prix).</small>
              </fieldset>
            </section>

            <section class="ed-section" id="ed-s-perso" aria-labelledby="ed-h-perso">
              <h3 id="ed-h-perso">Personnalisation</h3>
              <div class="interrupteurs">
                <label class="case"><input type="checkbox" id="ed-texte" ${p.options.texte ? "checked" : ""}> Le client peut saisir un texte</label>
                <label class="case"><input type="checkbox" id="ed-opt-photo" ${p.options.photo ? "checked" : ""}> Le client peut envoyer une photo</label>
              </div>
              <div class="grille-champs">
                ${champ("ed-instructions", "Consigne pour le client", texte("ed-instructions", p.instructions, `placeholder="Ex. : Indiquez le prénom, la date de naissance, l'heure, le poids et la taille."`), "", true)}
                ${champ("ed-gabarit", "Forme de l'aperçu", `<select id="ed-gabarit">${Object.entries(GABARITS).map(([k, v]) => `<option value="${k}" ${k === (p.gabarit || "") ? "selected" : ""}>${v}</option>`).join("")}</select>`, "Forme dessinée dans le configurateur du site. Automatique : choisie d'après le produit et sa catégorie.")}
              </div>
            </section>

            <section class="ed-section" id="ed-s-fiche" aria-labelledby="ed-h-fiche">
              <h3 id="ed-h-fiche">Fiche technique <span class="ed-h-etat" id="ed-fiche-etat"></span></h3>
              <div class="grille-champs">
                ${champ("ed-numero", "N° de pièce", `<input type="number" id="ed-numero" min="1" step="1" value="${Number(p.numero) || ""}"><small class="ed-erreur" id="ed-numero-erreur" hidden></small>`, "Deux produits ne peuvent pas avoir le même.")}
                ${champ("ed-delai", "Délai de fabrication (jours)", `<input type="number" id="ed-delai" min="0" step="1" value="${Number(p.delai || 0) || ""}" placeholder="Nombre de jours">`, "Compté après validation de la maquette.")}
                ${champ("ed-matiere", "Matière", texte("ed-matiere", p.matiere, 'placeholder="Essence de bois, verre, métal…"'))}
                ${champ("ed-dimensions", "Dimensions", texte("ed-dimensions", p.dimensions, 'placeholder="Largeur × hauteur × épaisseur"'), "Une taille par choix si le produit en a plusieurs.")}
                ${champ("ed-zone", "Zone gravable", texte("ed-zone", p.zoneGravable, 'placeholder="Surface où l’on peut graver"'))}
                ${champ("ed-entretien", "Entretien", texte("ed-entretien", p.entretien, 'placeholder="Nettoyage, ce qu’il faut éviter"'))}
              </div>
            </section>

            <section class="ed-section" id="ed-s-visibilite" aria-labelledby="ed-h-visibilite">
              <h3 id="ed-h-visibilite">Visibilité</h3>
              <div class="interrupteurs">
                <label class="case"><input type="checkbox" id="ed-visible" ${p.visible !== false ? "checked" : ""}> Visible sur le site</label>
                <label class="case"><input type="checkbox" id="ed-vedette" ${p.vedette ? "checked" : ""}> Coup de cœur (page d'accueil)</label>
              </div>
              <div class="grille-champs">
                ${champ("ed-dispo", "Disponibilité", `<select id="ed-dispo">${Object.entries(ctx.DISPOS).map(([k, v]) => `<option value="${k}" ${k === p.dispo ? "selected" : ""}>${v}</option>`).join("")}</select>`)}
                ${champ("ed-badge", "Badge sur la photo", `<select id="ed-badge">${Object.entries(ctx.BADGES).map(([k, v]) => `<option value="${k}" ${k === (p.badge || "") ? "selected" : ""}>${v}</option>`).join("")}</select>`)}
              </div>
            </section>
          </div>
        </div>
        <footer class="ed-pied">
          <span class="ed-etat" id="ed-etat" aria-live="polite"></span>
          <button type="button" class="btn btn-ligne" data-ed="fermer">Annuler</button>
          <button type="submit" class="btn">Valider<kbd aria-hidden="true">Ctrl S</kbd></button>
        </footer>
      </form>`;

    const f = tiroir;
    const $ = (s) => f.querySelector(s);
    const lireChoix = () =>
      f.querySelectorAll(".ed-choix").forEach((l) => {
        const c = p.variantes.choix[l.dataset.k];
        c.nom = l.querySelector('[data-v="nom"]').value;
        c.prix = Number(l.querySelector('[data-v="prix"]').value || 0);
      });
    const majPhotos = () => ($("#ed-photos").innerHTML = lignesPhotos());
    const majChoix = () => {
      $("#ed-choix").innerHTML = lignesChoix();
      $(".ed-choix-tete").hidden = !p.variantes.choix.length;
    };
    const marquer = () => {
      sale = true;
      $("#ed-etat").textContent = "Modifications non validées";
    };
    if (sale) marquer();

    // Aperçu de la carte (mêmes informations que la carte du nouveau site) et état de la fiche technique
    function majApercu() {
      lireChoix();
      const nom = $("#ed-nom").value.trim();
      const prix = prixCarte($("#ed-prix").value, p.variantes.choix.filter((c) => c.nom.trim()));
      const num = parseInt($("#ed-numero").value, 10) || p.numero;
      $("#ed-carte").innerHTML = `
        ${photo(p.images[0], "ed-carte-photo")}
        <div class="ed-carte-texte">
          <div class="ed-carte-ligne"><span>N° ${numero3(num)}</span><span>${e(nomCategorie($("#ed-cat").value))}</span></div>
          <span class="ed-carte-nom">${e(nom) || "Nom du produit"}</span>
          <span class="ed-carte-prix">${prix.plusieurs ? `<span class="ed-des">dès </span>` : ""}${ctx.euros(prix.prix)}</span>
        </div>`;
      $("#ed-carte-note").textContent = $("#ed-visible").checked ? "" : "Masqué : cette carte n’apparaît pas sur le site.";
      $("#ed-titre").textContent = nom || (nouveau ? "Nouveau produit" : "Sans nom");
      const base = Number($("#ed-prix").value || 0);
      f.querySelectorAll(".ed-choix").forEach((l) => {
        l.querySelector("[data-total]").textContent = ctx.euros(base + (Number(l.querySelector('[data-v="prix"]').value) || 0));
      });
      const reste = FICHE.filter(([k]) => {
        const v = { delai: $("#ed-delai").value, matiere: $("#ed-matiere").value, dimensions: $("#ed-dimensions").value, zoneGravable: $("#ed-zone").value, entretien: $("#ed-entretien").value }[k];
        return !rempli(v) || v === "0";
      });
      $("#ed-fiche-etat").textContent = reste.length ? `${pluriel(reste.length, "champ", "champs")} à compléter` : "complète";
      $("#ed-fiche-etat").classList.toggle("manque", !!reste.length);
    }
    majApercu();

    f.querySelector("form").addEventListener("input", (ev) => {
      if (ev.target.id === "ed-fichiers") return;
      marquer();
      if (ev.target.id === "ed-nom") $("#ed-nom-erreur").hidden = true;
      if (ev.target.id === "ed-numero") $("#ed-numero-erreur").hidden = true;
      majApercu();
    });
    f.querySelector("form").addEventListener("change", (ev) => {
      if (ev.target.id === "ed-fichiers") return;
      marquer();
      majApercu();
    });

    // Sommaire : fait défiler le corps du tiroir jusqu'à la section
    $(".ed-sommaire").onclick = (ev) => {
      const b = ev.target.closest("[data-ed-aller]");
      if (!b) return;
      const s = $(`#ed-s-${b.dataset.edAller}`);
      s.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      s.querySelector("input, select, textarea, button")?.focus({ preventScroll: true });
    };
    // Section visible : repérée dans le sommaire
    const corps = $("#ed-corps");
    const sommaire = [...f.querySelectorAll("[data-ed-aller]")];
    const reperer = () => {
      const haut = corps.getBoundingClientRect().top + 24;
      let courante = SECTIONS[0][0];
      for (const [id] of SECTIONS) if ($(`#ed-s-${id}`).getBoundingClientRect().top <= haut) courante = id;
      if (corps.scrollTop + corps.clientHeight >= corps.scrollHeight - 4) courante = SECTIONS.at(-1)[0];
      sommaire.forEach((b) => (b.dataset.edAller === courante ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
    };
    corps.onscroll = reperer;

    f.onclick = (ev) => {
      if (ev.target === f) return;
      const b = ev.target.closest("[data-ed]");
      if (!b) return;
      const a = b.dataset.ed;
      const k = Number(b.closest("[data-k]")?.dataset.k);
      if (a === "fermer") return fermer();
      if (a === "ajout-choix") {
        lireChoix();
        p.variantes.choix.push({ nom: "", prix: 0 });
        majChoix();
        majApercu();
        f.querySelector(".ed-choix:last-child input")?.focus();
        return marquer();
      }
      if (a === "retirer-choix") {
        lireChoix();
        p.variantes.choix.splice(k, 1);
        majChoix();
        majApercu();
        return marquer();
      }
      if (a === "principale") {
        p.images.unshift(...p.images.splice(k, 1));
        majPhotos();
        majApercu();
        $('.ed-photo[data-k="0"] .ed-photo-image')?.focus();
        return marquer();
      }
      if (a === "retirer-photo") {
        p.images.splice(k, 1);
        majPhotos();
        majApercu();
        return marquer();
      }
    };

    // Photos : réordonner au clavier (flèches) ou en glissant (souris ou doigt)
    const photos = $("#ed-photos");
    const bougerPhoto = (de, vers) => {
      if (vers < 0 || vers >= p.images.length || de === vers) return;
      p.images.splice(vers, 0, ...p.images.splice(de, 1));
      majPhotos();
      majApercu();
      marquer();
    };
    photos.addEventListener("keydown", (ev) => {
      const b = ev.target.closest(".ed-photo-image");
      if (!b || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
      ev.preventDefault();
      const k = Number(b.closest("[data-k]").dataset.k);
      const vers = k + (ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 1);
      bougerPhoto(k, vers);
      f.querySelector(`.ed-photo[data-k="${Math.max(0, Math.min(p.images.length - 1, vers))}"] .ed-photo-image`)?.focus();
    });
    photos.addEventListener("pointerdown", (ev) => {
      const b = ev.target.closest(".ed-photo-image");
      if (!b || ev.button !== 0 || !b.closest("[data-k]")) return;
      const de = Number(b.closest("[data-k]").dataset.k);
      const figure = b.closest(".ed-photo");
      const depart = { x: ev.clientX, y: ev.clientY };
      let vers = -1;
      let bouge = false;
      b.setPointerCapture(ev.pointerId);
      const marquerCible = () => photos.querySelectorAll(".ed-photo").forEach((x) => x.classList.toggle("depot", Number(x.dataset.k) === vers && vers !== de));
      const bouger = (m) => {
        if (!bouge && Math.hypot(m.clientX - depart.x, m.clientY - depart.y) < 6) return;
        bouge = true;
        figure.classList.add("en-deplacement");
        const sous = document.elementFromPoint(m.clientX, m.clientY)?.closest(".ed-photo[data-k]");
        vers = sous ? Number(sous.dataset.k) : vers;
        marquerCible();
      };
      const fin = () => {
        b.removeEventListener("pointermove", bouger);
        b.removeEventListener("pointerup", fin);
        b.removeEventListener("pointercancel", fin);
        figure.classList.remove("en-deplacement");
        if (bouge && vers >= 0 && vers !== de) {
          bougerPhoto(de, vers);
          f.querySelector(`.ed-photo[data-k="${vers}"] .ed-photo-image`)?.focus();
        } else marquerCible();
      };
      b.addEventListener("pointermove", bouger);
      b.addEventListener("pointerup", fin);
      b.addEventListener("pointercancel", fin);
    });
    // Ajout : bouton (sélecteur de fichiers) ou fichiers déposés depuis l'ordinateur
    async function ajouter(fichiers) {
      const images = [...fichiers].filter((x) => x.type.startsWith("image/"));
      for (const fichier of images) {
        const local = URL.createObjectURL(fichier);
        envois.push(local);
        majPhotos();
        try {
          p.images.push(await ctx.envoyerPhoto(fichier, $("#ed-nom").value || "produit"));
          marquer();
        } catch (err) {
          ctx.toast(`Échec de l'envoi de la photo (${err.detail || err.message}).`, true);
        }
        envois.splice(envois.indexOf(local), 1);
        URL.revokeObjectURL(local);
        if (!tiroir.open) return;
        majPhotos();
        majApercu();
      }
    }
    photos.addEventListener("change", (ev) => ev.target.id === "ed-fichiers" && ajouter(ev.target.files));
    photos.addEventListener("dragover", (ev) => {
      if (![...(ev.dataTransfer?.types || [])].includes("Files")) return;
      ev.preventDefault();
      $("#ed-depot")?.classList.add("survol");
    });
    photos.addEventListener("dragleave", (ev) => !photos.contains(ev.relatedTarget) && $("#ed-depot")?.classList.remove("survol"));
    photos.addEventListener("drop", (ev) => {
      if (!ev.dataTransfer?.files.length) return;
      ev.preventDefault();
      $("#ed-depot")?.classList.remove("survol");
      ajouter(ev.dataTransfer.files);
    });

    $("#ed-form").onsubmit = (ev) => {
      ev.preventDefault();
      const nom = $("#ed-nom").value.trim();
      if (!nom) {
        $("#ed-nom-erreur").hidden = false;
        $("#ed-nom").focus();
        return;
      }
      const numero = parseInt($("#ed-numero").value, 10) || 0;
      const doublon = numero && d.produits.find((x, k) => k !== index && Number(x.numero) === numero);
      if (doublon) {
        const err = $("#ed-numero-erreur");
        err.textContent = `Le N° ${numero3(numero)} est déjà celui de « ${doublon.nom} ».`;
        err.hidden = false;
        $("#ed-numero").focus();
        return;
      }
      lireChoix();
      p.nom = nom;
      p.categorie = $("#ed-cat").value;
      p.description = $("#ed-desc").value.trim();
      p.occasions = [...f.querySelectorAll("[data-occasion]:checked")].map((x) => x.dataset.occasion);
      p.prix = Math.max(0, Number($("#ed-prix").value || 0));
      p.prixBarre = Math.max(0, Number($("#ed-prix-barre").value || 0));
      p.options = { texte: $("#ed-texte").checked, photo: $("#ed-opt-photo").checked };
      p.instructions = $("#ed-instructions").value.trim();
      const gabarit = $("#ed-gabarit").value;
      if (gabarit) p.gabarit = gabarit;
      else delete p.gabarit;
      p.numero = numero > 0 ? numero : ctx.numeroLibre();
      p.delai = Math.max(0, parseInt($("#ed-delai").value, 10) || 0);
      p.matiere = $("#ed-matiere").value.trim();
      p.dimensions = $("#ed-dimensions").value.trim();
      p.zoneGravable = $("#ed-zone").value.trim();
      p.entretien = $("#ed-entretien").value.trim();
      p.visible = $("#ed-visible").checked;
      p.vedette = $("#ed-vedette").checked;
      p.dispo = $("#ed-dispo").value;
      p.badge = $("#ed-badge").value;
      p.image = p.images[0] || "";
      p.variantes.nom = $("#ed-var-nom").value.trim();
      p.variantes.choix = p.variantes.choix.filter((c) => c.nom.trim());
      if (!p.variantes.choix.length) delete p.variantes;
      p.id = ctx.idUnique($("#ed-id").value.trim() || p.nom, d.produits, index);
      if (copie) d.produits.splice(modele + 1, 0, p);
      else if (nouveau) d.produits.unshift(p);
      else d.produits[index] = p;
      sale = false;
      tiroir.close();
      ctx.marquerModifie();
      etat.aMontrer = p.id;
      if (zone?.isConnected) rendreCorps();
      else ctx.allerA("produits");
      ctx.toast(`« ${p.nom} » enregistré${copie ? " (copie masquée)" : ""}. Pensez à cliquer sur « Publier les modifications ».`);
    };

    tiroir.showModal();
    corps.scrollTop = 0;
    reperer();
    $("#ed-nom").focus();
  }

  window.AdminProduits = { monter, editer, GABARITS };
})();
