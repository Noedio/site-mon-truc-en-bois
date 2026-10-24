// En-tête, pied de page, panier, favoris et utilitaires partagés par toutes les pages.
// Les contenus (infos, textes, catalogue) viennent de data/donnees.js, modifiable depuis admin.html.
(function () {
  // ---------- Aperçu d'un brouillon de l'admin (?brouillon=1, garde le mode pendant la navigation) ----------
  let D = window.DONNEES;
  let enBrouillon = false;
  try {
    const params = new URLSearchParams(location.search);
    if (params.has("brouillon")) sessionStorage.setItem("mode-brouillon", "1");
    if (params.has("quitter-brouillon")) sessionStorage.removeItem("mode-brouillon");
    const brouillon = localStorage.getItem(window.MTB_DEMO ? "brouillon-mtb-demo" : "brouillon-mtb");
    if (sessionStorage.getItem("mode-brouillon") && brouillon) {
      const b = JSON.parse(brouillon);
      D = b.donnees;
      enBrouillon = true;
      // Une photo tout juste ajoutée n'est pas encore publiée sur le site : on la prend directement sur GitHub.
      if (b.depot)
        document.addEventListener(
          "error",
          (e) => {
            const img = e.target;
            if (img.tagName !== "IMG" || img.dataset.secours) return;
            const chemin = img.getAttribute("src") || "";
            if (!chemin.startsWith("img/")) return;
            img.dataset.secours = "1";
            img.src = window.MTB_DEMO?.photo(chemin) || `https://raw.githubusercontent.com/${b.depot}/${chemin}`;
          },
          true
        );
    }
  } catch {}
  const S = D.site;

  // Raccourcis utilisés par les pages
  window.DONNEES = D;
  window.SITE = S;
  window.CATEGORIES = Object.fromEntries(D.categories.map((c) => [c.id, c]));
  window.OCCASIONS = Object.fromEntries((D.occasions || []).map((o) => [o.id, o]));
  window.PRODUITS = D.produits.filter((p) => p.visible !== false);
  window.trouverProduit = (id) => window.PRODUITS.find((p) => p.id === id);

  const euros = (n) => Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const echapper = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const telLien = (t) => "tel:" + String(t).replace(/[^\d+]/g, "");
  // WhatsApp attend le numéro au format international sans « + » ni 0 initial : 07… → 337…
  const numeroWhatsapp = () => {
    let n = String(S.whatsapp || "").replace(/\D/g, "");
    if (n.startsWith("0")) n = "33" + n.slice(1);
    return n;
  };
  const lienWhatsapp = (texte = "") => (numeroWhatsapp() ? `https://wa.me/${numeroWhatsapp()}${texte ? "?text=" + encodeURIComponent(texte) : ""}` : "");

  // ---------- Icônes (traits simples) ----------
  const TRACES = {
    panier: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/>',
    tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    lieu: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    main: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 14a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
    crayon: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    boutique: '<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
    camion: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>',
    coche: '<path d="m5 12 5 5L20 7"/>',
    facebook: '<path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v4H8v7h4v-7h3l.5-4H12V8a1 1 0 0 1 1-1h2z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    gravure: '<path d="M14 4l6 6-9 9H5v-6z"/><path d="M4 21h16"/>',
    tshirt: '<path d="M8 4 4 6l1.5 4L8 9v11h8V9l2.5 1L20 6l-4-2a4 4 0 0 1-8 0z"/>',
    fete: '<path d="m4 20 5-14 9 9z"/><path d="M14 4c1 1 1 2 0 3M19 9c1-1 2-1 3 0M17 3l.5 1.5M21 6l-1.5.5"/>',
    bijou: '<circle cx="12" cy="14" r="6"/><path d="m9 4 3 4 3-4z"/>',
    coeur: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    cadeau: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8S10.5 3 8 4s0 4 4 4zM12 8s1.5-5 4-4 0 4-4 4z"/>',
    calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    partage: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
    bulle: '<path d="M4 19.5 5.5 15A8 8 0 1 1 9 18.6z"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
    etoile: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  };
  const icone = (nom, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${TRACES[nom] || ""}</svg>`;
  const LOGO = `<img class="logo-image" src="img/logo-200.webp" alt="" width="200" height="183">`;

  // ---------- Stockage navigateur (panier, favoris) ----------
  const lire = (cle, defaut) => {
    try {
      return JSON.parse(localStorage.getItem(cle)) ?? defaut;
    } catch {
      return defaut;
    }
  };
  const garder = (cle, valeur) => {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch {
      return false;
    }
  };

  const CLE = "panier-mtb";
  const lirePanier = () => lire(CLE, []);
  const ecrirePanier = (panier) => {
    // Quota dépassé (photos trop lourdes) : on retire les aperçus photo.
    if (!garder(CLE, panier)) garder(CLE, panier.map((l) => ({ ...l, photo: "" })));
    majCompteurs();
  };
  const ajouterAuPanier = (ligne) => {
    const panier = lirePanier();
    panier.push({ ...ligne, uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
    ecrirePanier(panier);
    mesurer("ajout-panier");
  };

  const CLE_FAVORIS = "favoris-mtb";
  const lireFavoris = () => lire(CLE_FAVORIS, []).filter((id) => window.trouverProduit(id));
  const estFavori = (id) => lireFavoris().includes(id);
  function basculerFavori(id) {
    const f = lireFavoris();
    const i = f.indexOf(id);
    i >= 0 ? f.splice(i, 1) : f.push(id);
    garder(CLE_FAVORIS, f);
    majCompteurs();
    document.querySelectorAll(`[data-favori="${CSS.escape(id)}"]`).forEach((b) => b.setAttribute("aria-pressed", i < 0));
    document.dispatchEvent(new CustomEvent("favoris"));
  }

  function majCompteurs() {
    const n = lirePanier().reduce((t, l) => t + l.quantite, 0);
    document.querySelectorAll("[data-compteur]").forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
    });
    const f = lireFavoris().length;
    document.querySelectorAll("[data-compteur-favoris]").forEach((el) => {
      el.textContent = f;
      el.hidden = f === 0;
    });
  }

  // ---------- Produits ----------
  const imagesProduit = (p) => (p.images?.length ? p.images : p.image ? [p.image] : []);
  function visuel(produit) {
    const src = imagesProduit(produit)[0];
    if (src) return `<img src="${echapper(src)}" alt="${echapper(produit.nom)}" loading="lazy">`;
    return `<div class="vide-image" role="img" aria-label="${echapper(produit.nom)}">${icone("image", "")}</div>`;
  }
  const BADGES = { nouveau: "Nouveau", promo: "Promo", best: "Best-seller", edition: "Édition limitée" };
  function badges(p) {
    const b = [];
    if (p.dispo === "epuise") b.push(`<span class="badge badge-epuise">Épuisé</span>`);
    else if (p.badge && BADGES[p.badge]) b.push(`<span class="badge badge-${p.badge}">${BADGES[p.badge]}</span>`);
    else if (p.prixBarre > p.prix) b.push(`<span class="badge badge-promo">−${Math.round((1 - p.prix / p.prixBarre) * 100)} %</span>`);
    return b.length ? `<div class="badges">${b.join("")}</div>` : "";
  }
  const aPartirDe = (p) => (p.variantes?.choix?.some((c) => c.prix) ? "<small>dès</small> " : "");
  const prixHTML = (p) =>
    `<span class="prix">${aPartirDe(p)}${euros(p.prix)}${p.prixBarre > p.prix ? ` <s class="prix-barre">${euros(p.prixBarre)}</s>` : ""}</span>`;
  const boutonFavori = (p) =>
    `<button class="favori" type="button" data-favori="${echapper(p.id)}" aria-pressed="${estFavori(p.id)}" aria-label="Ajouter « ${echapper(p.nom)} » aux favoris" title="Favori">${icone("coeur")}</button>`;
  function carteProduit(p) {
    const cat = window.CATEGORIES[p.categorie];
    const images = imagesProduit(p);
    return `
      <article class="produit-carte">
        <a href="produit.html?id=${encodeURIComponent(p.id)}">
          <div class="produit-image">
            ${visuel(p)}
            ${images[1] ? `<img class="produit-image-2" src="${echapper(images[1])}" alt="" loading="lazy">` : ""}
            ${badges(p)}
          </div>
          <div class="produit-infos">
            ${cat ? `<span class="etiquette">${echapper(cat.nom)}</span>` : ""}
            <h3>${echapper(p.nom)}</h3>
            ${prixHTML(p)}
          </div>
        </a>
        ${boutonFavori(p)}
      </article>`;
  }

  // ---------- Horaires : « Mardi : 9h – 18h » → ligne, jour courant en évidence ----------
  function horairesHTML() {
    const jour = new Date().toLocaleDateString("fr-FR", { weekday: "long" }).toLowerCase();
    return `<ul class="horaires">${S.horaires
      .map((h) => {
        const i = h.indexOf(":");
        const [j, v] = i > 0 ? [h.slice(0, i).trim(), h.slice(i + 1).trim()] : [h, ""];
        return `<li class="${j.toLowerCase() === jour ? "aujourdhui" : ""}"><span>${echapper(j)}</span><span>${echapper(v)}</span></li>`;
      })
      .join("")}</ul>`;
  }

  // ---------- En-tête et pied de page ----------
  function entete() {
    const page = location.pathname.includes("/p/") ? "produit.html" : location.pathname.split("/").pop() || "index.html";
    const lien = (href, texte) => `<a href="${href}"${page === href ? ' aria-current="page"' : ""}>${texte}</a>`;
    return `
      <div class="conteneur entete-int">
        <a class="logo" href="index.html" aria-label="${echapper(S.nom)} — accueil">${LOGO}<span><span class="logo-nom">${echapper(S.nom)}</span><span class="logo-lieu">Personnalisation · Auchel</span></span></a>
        <div class="entete-droite">
          <nav class="nav" aria-label="Navigation principale">
            ${lien("boutique.html", "Boutique")}
            ${lien("idees-cadeaux.html", "Idées cadeaux")}
            ${lien("atelier.html", "Qui sommes-nous ?")}
            ${lien("faq.html", "Questions")}
            ${lien("contact.html", "Contact")}
          </nav>
          <a class="icone-entete" href="favoris.html" aria-label="Mes favoris" title="Mes favoris"${page === "favoris.html" ? ' aria-current="page"' : ""}>${icone("coeur")}<span class="compteur" data-compteur-favoris hidden>0</span></a>
          <a class="icone-entete" href="panier.html" aria-label="Panier" title="Panier"${page === "panier.html" ? ' aria-current="page"' : ""}>${icone("panier")}<span class="compteur" data-compteur hidden>0</span></a>
          <button class="burger" aria-label="Menu" aria-expanded="false">${icone("menu")}</button>
        </div>
      </div>`;
  }
  function pied() {
    return `
      <div class="conteneur">
        <div class="pied-grille">
          <div class="pile">
            <a class="logo" href="index.html">${LOGO}<span><span class="logo-nom">${echapper(S.nom)}</span><span class="logo-lieu">Personnalisation · Auchel</span></span></a>
            <p style="margin-top:.6rem">${echapper(S.slogan)}</p>
          </div>
          <div class="pile">
            <h4>Boutique</h4>
            <span>${echapper(S.adresse)}</span>
            <a href="${telLien(S.telephone)}">${echapper(S.telephone)}</a>
            <a href="mailto:${echapper(S.email)}">${echapper(S.email)}</a>
            <a href="${echapper(S.facebook)}" target="_blank" rel="noopener">Facebook</a>
            ${S.instagram ? `<a href="${echapper(S.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
          </div>
          <div class="pile">
            <h4>Horaires</h4>
            ${ouvertureHTML()}
            ${S.horaires.map((h) => `<span>${echapper(h)}</span>`).join("")}
          </div>
          ${serveur() ? `<form class="pile newsletter-pied" data-newsletter>
            <h4>Nouveautés et idées cadeaux</h4>
            <span>Un email de temps en temps, avant les fêtes. Désinscription en un clic.</span>
            <div class="newsletter-champ">
              <input type="email" name="email" required placeholder="Votre email" aria-label="Votre email" autocomplete="email">
              <button class="btn" type="submit">Je m'inscris</button>
            </div>
            <input type="text" name="site_web" tabindex="-1" autocomplete="off" class="piege" aria-hidden="true">
            <span class="newsletter-etat" aria-live="polite"></span>
          </form>` : ""}
          <div class="pile">
            <h4>Aide</h4>
            <a href="suivi.html">Suivre ma commande</a>
            <a href="avis.html">Avis clients</a>
            <a href="faq.html">Questions fréquentes</a>
            <a href="contact.html">Demande de devis</a>
            <a href="cgv.html">Conditions générales de vente</a>
            <a href="mentions-legales.html">Mentions légales</a>
          </div>
        </div>
        <div class="pied-bas"><span>© ${new Date().getFullYear()} ${echapper(S.nom)}</span><span>Fait main à Auchel</span></div>
      </div>`;
  }

  function bandeaux() {
    const html = [];
    if (enBrouillon)
      html.push(`<div class="bandeau-info bandeau-brouillon">Aperçu des modifications non publiées — <a href="?quitter-brouillon=1">quitter l'aperçu</a></div>`);
    if (S.apercu)
      html.push(`<div class="bandeau-info bandeau-apercu">Site en construction — les prix sont provisoires et les commandes en ligne ne sont pas encore ouvertes. Contactez-nous au ${echapper(S.telephone)}.</div>`);
    if (D.annonce?.actif && D.annonce.texte)
      html.push(`<div class="bandeau-info bandeau-annonce">${D.annonce.lien ? `<a href="${echapper(D.annonce.lien)}">${echapper(D.annonce.texte)} →</a>` : echapper(D.annonce.texte)}</div>`);
    if (html.length) document.body.insertAdjacentHTML("afterbegin", html.join(""));
  }

  // Bouton de contact flottant : WhatsApp si renseigné, sinon téléphone.
  function boutonContact() {
    if (document.body.dataset.sansContact !== undefined) return;
    const wa = lienWhatsapp("Bonjour, j'ai une question au sujet d'une création personnalisée.");
    const a = document.createElement("a");
    a.className = "contact-flottant";
    a.href = wa || telLien(S.telephone);
    if (wa) a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", wa ? "Nous écrire sur WhatsApp" : `Nous appeler au ${S.telephone}`);
    a.innerHTML = `${icone(wa ? "bulle" : "tel")}<span>${wa ? "Une question ?" : "Appeler"}</span>`;
    document.body.append(a);
  }

  // Données structurées pour Google (fiche commerce local)
  function donneesStructurees() {
    const jours = { lundi: "Monday", mardi: "Tuesday", mercredi: "Wednesday", jeudi: "Thursday", vendredi: "Friday", samedi: "Saturday", dimanche: "Sunday" };
    const ouvertures = [];
    S.horaires.forEach((h) => {
      const [j, v = ""] = h.split(/\s*:\s*(.*)/s);
      const jour = jours[j.trim().toLowerCase()];
      if (!jour) return;
      for (const [, a, am, b, bm] of v.matchAll(/(\d{1,2})h(\d{2})?\s*[–-]\s*(\d{1,2})h(\d{2})?/g))
        ouvertures.push({ "@type": "OpeningHoursSpecification", dayOfWeek: jour, opens: `${a.padStart(2, "0")}:${am || "00"}`, closes: `${b.padStart(2, "0")}:${bm || "00"}` });
    });
    const [rue, ...ville] = S.adresse.split(",");
    const cp = (ville.join(",").match(/\d{5}/) || [""])[0];
    const json = {
      "@context": "https://schema.org",
      "@type": "Store",
      name: S.nom,
      description: S.slogan,
      telephone: S.telephone,
      email: S.email,
      url: new URL(".", document.baseURI).href,
      image: new URL("img/boutique-auchel.jpg", document.baseURI).href,
      logo: new URL("img/logo.webp", document.baseURI).href,
      address: { "@type": "PostalAddress", streetAddress: rue.trim(), postalCode: cp, addressLocality: ville.join(",").replace(cp, "").trim(), addressCountry: "FR" },
      openingHoursSpecification: ouvertures,
      sameAs: [S.facebook, S.instagram].filter(Boolean),
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(json);
    document.head.append(s);
  }

  // ---------- Avis clients (Facebook, Google…) ----------
  const PLATEFORMES = { facebook: "Facebook", google: "Google", autre: "" };
  const plateformes = () => S.plateformesAvis || {};
  function avisCarte(a) {
    const source = PLATEFORMES[a.source] ?? a.source ?? "";
    const etoiles = a.source === "facebook" ? `<span class="recommande">${icone("coche")} Recommande</span>` : `<span class="note" aria-label="${Number(a.note) || 5} sur 5">${"★".repeat(Number(a.note) || 5)}</span>`;
    return `
      <figure class="avis-carte">
        <div class="avis-tete">${etoiles}${source ? `<span class="source source-${echapper(a.source)}">${echapper(source)}</span>` : ""}</div>
        <blockquote>« ${echapper(a.texte)} »</blockquote>
        <figcaption><strong>${echapper(a.nom)}</strong>${a.date ? ` · ${echapper(a.date)}` : ""}</figcaption>
      </figure>`;
  }
  // Résumé « 100 % recommandé sur Facebook · 4,9/5 sur Google »
  function resumeAvis({ liens = true } = {}) {
    const p = plateformes();
    const blocs = [];
    if (p.google?.nombre)
      blocs.push(`<a class="score" ${p.google.lien && liens ? `href="${echapper(p.google.lien)}" target="_blank" rel="noopener"` : ""}><span class="source source-google">Google</span><strong>${String(p.google.note).replace(".", ",")}/5</strong><span class="etoiles">★★★★★</span><small>${p.google.nombre} avis</small></a>`);
    if (p.facebook?.nombre)
      blocs.push(`<a class="score" ${p.facebook.lien && liens ? `href="${echapper(p.facebook.lien)}" target="_blank" rel="noopener"` : ""}><span class="source source-facebook">Facebook</span><strong>${p.facebook.taux} %</strong><span>recommandent</span><small>${p.facebook.nombre} avis</small></a>`);
    return blocs.join("");
  }
  const texteAvisCourt = () => {
    const p = plateformes();
    const t = [];
    if (p.google?.nombre) t.push(`${String(p.google.note).replace(".", ",")}/5 sur Google (${p.google.nombre} avis)`);
    if (p.facebook?.nombre) t.push(`Recommandé à ${p.facebook.taux} % sur Facebook (${p.facebook.nombre} avis)`);
    return t.join(" · ") || S.avis || "";
  };
  function boutonsLaisserAvis() {
    const p = plateformes();
    const b = [];
    if (p.google?.lienAvis || p.google?.lien) b.push(`<a class="btn btn-ligne" href="${echapper(p.google.lienAvis || p.google.lien)}" target="_blank" rel="noopener">Laisser un avis Google</a>`);
    if (p.facebook?.lien) b.push(`<a class="btn btn-ligne" href="${echapper(p.facebook.lien)}" target="_blank" rel="noopener">Laisser un avis Facebook</a>`);
    return b.join("");
  }

  // ---------- Ouvert / fermé maintenant, calculé à partir des horaires ----------
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  function creneaux() {
    const semaine = JOURS.map(() => []);
    S.horaires.forEach((h) => {
      const i = h.indexOf(":");
      if (i < 0) return;
      const j = JOURS.indexOf(h.slice(0, i).trim().toLowerCase());
      if (j < 0) return;
      for (const [, a, am, b, bm] of h.slice(i + 1).matchAll(/(\d{1,2})h(\d{2})?\s*[–-]\s*(\d{1,2})h(\d{2})?/g))
        semaine[j].push([a * 60 + Number(am || 0), b * 60 + Number(bm || 0)]);
    });
    return semaine;
  }
  const heure = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
  function etatOuverture(maintenant = new Date()) {
    const semaine = creneaux();
    if (!semaine.some((c) => c.length)) return null;
    const j = maintenant.getDay();
    const m = maintenant.getHours() * 60 + maintenant.getMinutes();
    const enCours = semaine[j].find(([a, b]) => m >= a && m < b);
    if (enCours) return { ouvert: true, texte: `Ouvert maintenant · jusqu'à ${heure(enCours[1])}` };
    for (let d = 0; d < 7; d++) {
      const jour = (j + d) % 7;
      const prochain = semaine[jour].find(([a]) => d > 0 || a > m);
      if (prochain) return { ouvert: false, texte: `Fermé · ouvre ${d === 0 ? "aujourd'hui" : d === 1 ? "demain" : JOURS[jour]} à ${heure(prochain[0])}` };
    }
    return null;
  }
  const ouvertureHTML = () => {
    const e = etatOuverture();
    return e ? `<span class="ouverture ${e.ouvert ? "ouvert" : "ferme"}">${e.texte}</span>` : "";
  };

  // ---------- Photos des clients en haute qualité (gardées dans le navigateur jusqu'à l'envoi) ----------
  function baseImages() {
    return new Promise((ok, ko) => {
      if (!("indexedDB" in window)) return ko(new Error("indisponible"));
      const r = indexedDB.open("mtb-photos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  async function photoStocker(cle, blob) {
    try {
      const b = await baseImages();
      await new Promise((ok, ko) => {
        const t = b.transaction("photos", "readwrite");
        t.objectStore("photos").put(blob, cle);
        t.oncomplete = ok;
        t.onerror = () => ko(t.error);
      });
      return true;
    } catch {
      return false;
    }
  }
  async function photoLire(cle) {
    try {
      const b = await baseImages();
      return await new Promise((ok) => {
        const r = b.transaction("photos").objectStore("photos").get(cle);
        r.onsuccess = () => ok(r.result || null);
        r.onerror = () => ok(null);
      });
    } catch {
      return null;
    }
  }
  async function photoSupprimer(cle) {
    try {
      const b = await baseImages();
      b.transaction("photos", "readwrite").objectStore("photos").delete(cle);
    } catch {}
  }

  // ---------- Serveur de commandes (Supabase), s'il est configuré dans l'admin ----------
  const serveur = () => {
    const c = S.commandes || {};
    return c.supabaseUrl && c.supabaseCle ? { url: c.supabaseUrl.replace(/\/$/, ""), cle: c.supabaseCle } : null;
  };
  async function appelServeur(fonction, corps) {
    const sv = serveur();
    if (!sv) throw new Error("Commandes en ligne non configurées.");
    let r;
    try {
      r = await fetch(`${sv.url}/functions/v1/${fonction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: sv.cle, Authorization: `Bearer ${sv.cle}` },
        body: JSON.stringify(corps),
      });
    } catch {
      throw new Error("Connexion impossible : vérifiez votre accès à internet puis réessayez.");
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.erreur || `Erreur ${r.status}`);
    return d;
  }
  const modesPaiement = () => {
    const p = S.commandes?.paiement || {};
    return { en_ligne: !!serveur() && !!p.enLigne, apres_validation: p.apresValidation !== false, boutique: p.boutique !== false };
  };
  const STATUTS = {
    nouvelle: "Commande reçue",
    maquette_envoyee: "Maquette envoyée",
    retouche: "Maquette en retouche",
    confirmee: "Maquette validée",
    en_fabrication: "En fabrication",
    prete: "Prête à retirer",
    expediee: "Expédiée",
    terminee: "Terminée",
    annulee: "Annulée",
  };

  // Mode aperçu : les formulaires de commande et de devis ne partent pas.
  if (S.apercu) {
    document.addEventListener(
      "submit",
      (e) => {
        // Les demandes de devis passent quand même si le serveur est installé (elles arrivent dans l'admin).
        if (!(e.target.id === "commande" || (e.target.id === "devis" && !serveur()))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        let m = e.target.querySelector(".message-apercu");
        if (!m) {
          m = document.createElement("p");
          m.className = "message message-alerte message-apercu";
          e.target.append(m);
        }
        m.textContent = `Le site est encore en construction : l'envoi en ligne n'est pas encore ouvert. Appelez-nous au ${S.telephone} ou écrivez-nous sur Facebook.`;
      },
      true
    );
  }

  // Inscription aux nouveautés (pied de page et page newsletter)
  document.addEventListener("submit", async (e) => {
    const f = e.target.closest("[data-newsletter]");
    if (!f) return;
    e.preventDefault();
    const etat = f.querySelector(".newsletter-etat");
    const bouton = f.querySelector("button");
    bouton.disabled = true;
    try {
      await appelServeur("contact", { type: "newsletter", email: f.email.value.trim(), nom: f.nom?.value.trim() || "", site_web: f.site_web?.value || "" });
      etat.textContent = "Merci ! Vous êtes inscrit(e) : un email de confirmation vient de partir.";
      f.reset();
      mesurer("inscription-newsletter");
    } catch (err) {
      etat.textContent = err.message;
    } finally {
      bouton.disabled = false;
    }
  });

  // ---------- Mesure d'audience (GoatCounter : gratuit, sans cookie, réglé dans l'admin) ----------
  const goatcounter = String(S.mesure?.goatcounter || "").trim().toLowerCase();
  const mesureActive = goatcounter && /^[a-z0-9-]+$/.test(goatcounter) && !enBrouillon && !/^(localhost|127\.)/.test(location.hostname) && !location.pathname.endsWith("admin.html");
  if (mesureActive) {
    const g = document.createElement("script");
    g.async = true;
    g.src = "https://gc.zgo.at/count.js";
    g.dataset.goatcounter = `https://${goatcounter}.goatcounter.com/count`;
    document.head.append(g);
  }
  /** Compte un événement (ajout au panier, commande…) dans les statistiques de visite. */
  function mesurer(nom) {
    if (!mesureActive) return;
    const envoyer = () => window.goatcounter?.count?.({ path: `evenement-${nom}`, title: nom, event: true });
    if (window.goatcounter?.count) envoyer();
    else setTimeout(envoyer, 1500);
  }

  // ---------- Informations légales (CGV, mentions légales), saisies dans l'admin ----------
  const HEBERGEURS = {
    cloudflare: "Cloudflare Pages — Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.",
    github: "GitHub Pages — GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.",
  };
  function remplirLegal() {
    const L = S.legal || {};
    const m = L.mediateur || {};
    const valeurs = {
      exploitant: L.exploitant,
      forme: L.formeJuridique,
      siret: L.siret || S.siret,
      tva: L.regimeTva === "franchise" ? "TVA non applicable (article 293 B du code général des impôts)" : L.regimeTva === "assujetti" ? "toutes taxes comprises (TVA incluse)" : "",
      mediateur: m.nom ? `${echapper(m.nom)}${m.adresse ? `, ${echapper(m.adresse)}` : ""}${m.url ? ` — <a href="${echapper(m.url)}" target="_blank" rel="noopener">${echapper(m.url.replace(/^https?:\/\//, ""))}</a>` : ""}` : "",
      hebergeur: HEBERGEURS[L.hebergeur] || HEBERGEURS.github,
    };
    let incomplet = false;
    document.querySelectorAll("[data-legal]").forEach((el) => {
      const v = valeurs[el.dataset.legal];
      if (!v) incomplet = true;
      if (el.dataset.legal === "mediateur" && v) el.innerHTML = v;
      else el.textContent = v || "[à compléter]";
    });
    document.querySelectorAll("[data-legal-incomplet]").forEach((el) => (el.hidden = !incomplet));
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-favori]");
    if (!b) return;
    e.preventDefault();
    basculerFavori(b.dataset.favori);
  });

  document.addEventListener("DOMContentLoaded", () => {
    const h = document.querySelector("header.entete");
    const f = document.querySelector("footer.pied");
    if (h) h.innerHTML = entete();
    if (f) f.innerHTML = pied();
    bandeaux();
    boutonContact();
    donneesStructurees();
    document.querySelectorAll("[data-site]").forEach((el) => (el.textContent = S[el.dataset.site] ?? ""));
    remplirLegal();
    document.querySelectorAll("[data-texte]").forEach((el) => (el.textContent = D.textes?.[el.dataset.texte] ?? ""));
    document.querySelectorAll("[data-icone]").forEach((el) => el.insertAdjacentHTML("afterbegin", icone(el.dataset.icone)));
    document.querySelectorAll("[data-horaires]").forEach((el) => (el.innerHTML = horairesHTML()));
    document.querySelectorAll("[data-ouverture]").forEach((el) => (el.innerHTML = ouvertureHTML()));
    document.querySelectorAll("[data-avis-court]").forEach((el) => (el.textContent = texteAvisCourt()));
    document.querySelectorAll("[data-instagram]").forEach((el) => (S.instagram ? (el.href = S.instagram) : (el.hidden = true)));
    document.querySelectorAll("[data-tel]").forEach((el) => {
      el.href = telLien(S.telephone);
      el.insertAdjacentText("beforeend", S.telephone);
    });
    document.querySelectorAll("[data-mail]").forEach((el) => {
      el.href = "mailto:" + S.email;
      el.insertAdjacentText("beforeend", S.email);
    });
    document.querySelectorAll("[data-facebook]").forEach((el) => (el.href = S.facebook));
    document.querySelectorAll("[data-whatsapp]").forEach((el) => {
      const l = lienWhatsapp("Bonjour !");
      if (l) el.href = l;
      else el.hidden = true;
    });
    const burger = document.querySelector(".burger");
    burger?.addEventListener("click", () => {
      const ouvert = document.querySelector(".nav").classList.toggle("ouvert");
      burger.setAttribute("aria-expanded", ouvert);
    });
    majCompteurs();
  });

  window.MTB = {
    D, euros, echapper, icone, telLien, lienWhatsapp,
    lirePanier, ecrirePanier, ajouterAuPanier, lireFavoris, estFavori, basculerFavori,
    imagesProduit, visuel, badges, prixHTML, boutonFavori, carteProduit, majCompteurs,
    avisCarte, resumeAvis, texteAvisCourt, boutonsLaisserAvis, etatOuverture, ouvertureHTML,
    photoStocker, photoLire, photoSupprimer, serveur, appelServeur, modesPaiement, STATUTS, mesurer,
  };
})();
