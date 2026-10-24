// Questionnaire de démarrage : les 18 questions de l'audit (audit/RAPPORT.md §5) posées au commerçant.
// Une réponse qui correspond à une donnée du site remplit directement ce champ (délais, dates limites, fiches techniques,
// paiement, livraison, mentions légales, liens) ; le reste va dans D.questionnaire.reponses, avec la date de réponse.
// Rien n'est publié ici : les réponses partent avec le bouton « Publier les modifications », comme le reste du site.
(function () {
  const PHOTOS = {
    winnie: { produit: "plaque-naissance-bois", photo: "img/plaque-naissance-bois.jpg", sujet: "Winnie l'Ourson, personnage sous licence" },
    ecussons: { produit: "verre-imprime", photo: "img/verre-imprime.jpg", sujet: "écussons du RC Lens, du PSG et d'Arsenal (marques déposées)" },
    tirelire: { produit: "tirelire", photo: "img/tirelire.jpg", sujet: "logo « Le Comptoir de la Friterie »" },
  };
  const POLICES = [
    ["big-shoulders", "Big Shoulders", "Atelier", "'Big Shoulders', sans-serif", "800"],
    ["literata", "Literata", "Classique", "Literata, serif", "400"],
    ["courier-prime", "Courier Prime", "Machine à écrire", "'Courier Prime', monospace", "400"],
    ["sacramento", "Sacramento", "Manuscrite", "Sacramento, cursive", "400"],
  ];
  const CHAMPS_FICHE = [
    ["matiere", "Matière", "Essence de bois, verre, métal…"],
    ["dimensions", "Dimensions", "Largeur × hauteur × épaisseur, pour chaque taille"],
    ["zoneGravable", "Zone gravable", "Surface où l'on peut graver"],
    ["entretien", "Entretien", "Comment le nettoyer, ce qu'il faut éviter"],
  ];

  let ctx = null;
  let courante = null; // clé de la question affichée (gardée d'un affichage à l'autre)
  let sommaireOuvert = false; // téléphone : sommaire replié par défaut

  const e = (s) => ctx.echapper(s);
  const D = () => ctx.D;
  const aujourdhui = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const dateFr = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
  const numero = (p) => `N° ${String(p.numero ?? D().produits.indexOf(p) + 1).padStart(3, "0")}`;
  const reponses = () => ((D().questionnaire ||= {}).reponses ||= {});
  const rep = (cle) => (reponses()[cle] ||= {});
  const R = (cle, champ) => `questionnaire.reponses.${cle}.${champ}`;
  const lire = (chemin) => chemin.split(".").reduce((o, k) => o?.[k], D());
  function ecrire(chemin, valeur) {
    const cles = chemin.split(".");
    const dernier = cles.pop();
    cles.reduce((o, k) => (o[k] ??= {}), D())[dernier] = valeur;
  }
  const rempli = (v) => v !== undefined && v !== null && v !== "" && v !== 0 && v !== false;
  const produit = (id) => D().produits.find((p) => p.id === id);
  const indexProduit = (p) => D().produits.indexOf(p);
  const ficheComplete = (p) => CHAMPS_FICHE.every(([k]) => rempli(p[k]));

  // ---------- Champs du questionnaire ----------
  // data-q-chemin : chemin dans les données ; data-q-type : texte | nombre | entier | case | date
  const idDe = (chemin) => "q-" + chemin.replace(/[^a-zA-Z0-9]+/g, "-");
  function texte(chemin, libelle, { zone = false, aide = "", placeholder = "", type = "text", large = true, liste = "" } = {}) {
    const v = lire(chemin) ?? "";
    const id = idDe(chemin);
    const entree = zone
      ? `<textarea id="${id}" data-q-chemin="${chemin}" rows="3" placeholder="${e(placeholder)}">${e(v)}</textarea>`
      : `<input type="${type}" id="${id}" data-q-chemin="${chemin}" value="${e(v)}" placeholder="${e(placeholder)}" ${liste ? `list="${liste}"` : ""}>`;
    return `<div class="champ ${large ? "large" : ""}"><label for="${id}">${libelle}</label>${entree}${aide ? `<small>${aide}</small>` : ""}</div>`;
  }
  function nombre(chemin, libelle, { aide = "", entier = false, placeholder = "", large = false } = {}) {
    const v = lire(chemin);
    const id = idDe(chemin);
    return `<div class="champ ${large ? "large" : ""}"><label for="${id}">${libelle}</label><input type="number" inputmode="decimal" id="${id}" data-q-chemin="${chemin}" data-q-type="${entier ? "entier" : "nombre"}" min="0" step="${entier ? 1 : 0.01}" value="${rempli(v) ? Number(v) : ""}" placeholder="${e(placeholder)}">${aide ? `<small>${aide}</small>` : ""}</div>`;
  }
  const caseQ = (chemin, libelle, aide = "") =>
    `<label class="choix-carte"><input type="checkbox" data-q-chemin="${chemin}" data-q-type="case" ${lire(chemin) ? "checked" : ""}><span>${libelle}${aide ? `<small>${aide}</small>` : ""}</span></label>`;
  function radios(chemin, options, { enLigne = true, rendre = false } = {}) {
    const v = lire(chemin) ?? "";
    const nom = idDe(chemin);
    return `<div class="q-choix ${enLigne ? "en-ligne" : ""}" role="radiogroup">${options
      .map(([val, lib, aide]) => `<label class="choix-carte"><input type="radio" name="${nom}" id="${nom}-${e(val)}" value="${e(val)}" data-q-chemin="${chemin}" ${rendre ? "data-q-rendre" : ""} ${v === val ? "checked" : ""}><span>${lib}${aide ? `<small>${aide}</small>` : ""}</span></label>`)
      .join("")}</div>`;
  }
  const date = (chemin, libelle) => {
    const id = idDe(chemin);
    return `<div class="champ"><label for="${id}">${libelle}</label><input type="date" id="${id}" data-q-chemin="${chemin}" value="${e(lire(chemin) || "")}"></div>`;
  };
  const partie = (titre, contenu, aide = "") => `<div class="q-partie">${titre ? `<h3>${titre}</h3>` : ""}${aide ? `<p class="aide">${aide}</p>` : ""}${contenu}</div>`;
  const grille = (contenu) => `<div class="grille-champs">${contenu}</div>`;

  // ---------- Photos sous licence : garder, retirer la photo, ou masquer le produit ----------
  // Le choix s'applique tout de suite aux données (réversible) ; le fichier reste dans img/.
  function appliquerChoixPhoto(cle, nom) {
    const { produit: id, photo } = PHOTOS[nom];
    const r = rep(cle);
    const choix = r[`choix-${nom}`] || "";
    r.retraits ||= {};
    const p = produit(id);
    const d = D();
    // 1. Revenir à l'état d'avant le choix précédent
    const avant = r.retraits[nom];
    if (avant) {
      (avant.produits || []).forEach(([pid, i]) => {
        const q = produit(pid);
        if (q && !q.images.includes(photo)) q.images.splice(Math.min(i, q.images.length), 0, photo);
        if (q) q.image = q.images[0] || "";
      });
      (avant.categories || []).forEach((cid) => {
        const c = d.categories.find((x) => x.id === cid);
        if (c && !c.image) c.image = photo;
      });
      (avant.galerie || []).forEach((i) => !d.galerie.includes(photo) && d.galerie.splice(Math.min(i, d.galerie.length), 0, photo));
      if (avant.visible !== undefined && p) p.visible = avant.visible;
      delete r.retraits[nom];
    }
    // 2. Appliquer le nouveau choix
    if (choix === "retirer-photo") {
      const trace = { produits: [], categories: [], galerie: [] };
      d.produits.forEach((q) => {
        const i = (q.images || []).indexOf(photo);
        if (i >= 0) {
          q.images.splice(i, 1);
          q.image = q.images[0] || "";
          trace.produits.push([q.id, i]);
        }
      });
      d.categories.forEach((c) => {
        if (c.image === photo) {
          c.image = "";
          trace.categories.push(c.id);
        }
      });
      const g = d.galerie.indexOf(photo);
      if (g >= 0) {
        d.galerie.splice(g, 1);
        trace.galerie.push(g);
      }
      r.retraits[nom] = trace;
    } else if (choix === "masquer-produit" && p) {
      r.retraits[nom] = { visible: p.visible !== false };
      p.visible = false;
    }
    if (!Object.keys(r.retraits).length) delete r.retraits;
  }
  function blocPhoto(cle, nom) {
    const { produit: id, photo, sujet } = PHOTOS[nom];
    const p = produit(id);
    if (!p) return "";
    const choix = reponses()[cle]?.[`choix-${nom}`] || "";
    const etat =
      choix === "retirer-photo" ? "Photo retirée du site (produit, catégorie, galerie). Le fichier reste dans img/ : choisissez « Garder » pour la remettre."
      : choix === "masquer-produit" ? "Produit masqué sur le site. Choisissez « Garder » pour le remettre en ligne."
      : "";
    return `
      <div class="q-photo">
        <img src="${e(ctx.srcImage(photo))}" alt="Photo actuelle : ${e(p.nom)}" loading="lazy">
        <div class="pile" style="gap:.6rem">
          <p><strong>${e(p.nom)}</strong> <span class="numero-piece">${numero(p)}</span><br><span class="aide">Sur la photo : ${e(sujet)}.</span></p>
          ${radios(R(cle, `choix-${nom}`), [
            ["garder", "Garder", "Photo et produit restent en ligne"],
            ["retirer-photo", "Retirer la photo", "Le produit reste en vente, sans cette photo"],
            ["masquer-produit", "Masquer le produit", "Le produit n'apparaît plus sur le site"],
          ], { rendre: true, enLigne: false })}
          ${etat ? `<p class="aide">${etat}</p>` : ""}
        </div>
      </div>`;
  }

  // ---------- Les 18 questions ----------
  const THEMES = ["Pour vendre", "Sur les produits", "Sur vous", "Pour les mentions obligatoires"];
  const Q = [
    {
      cle: "delais", theme: 0,
      titre: "Délais de fabrication",
      question: "Quel délai de fabrication pour chaque produit (ou par famille) ? Et en période de fête ?",
      ouVa: "Fiche de chaque produit : délai (jours après validation de la maquette)",
      commencee: (d) => d.produits.some((p) => p.delai > 0) || rempli(d.questionnaire?.reponses?.delais?.fetes),
      corps: (d) => {
        const familles = d.categories
          .map((c) => {
            const n = d.produits.filter((p) => p.categorie === c.id).length;
            return n ? `<div class="q-ligne q-ligne-famille">
              <label for="q-fam-delai-${e(c.id)}">${e(c.nom)} <span class="aide">(${n} produit${n > 1 ? "s" : ""})</span></label>
              <input type="number" min="0" step="1" inputmode="numeric" id="q-fam-delai-${e(c.id)}" placeholder="jours" aria-label="Délai en jours pour ${e(c.nom)}">
              <button type="button" class="mini" data-q-action="delai-famille" data-cat="${e(c.id)}">Appliquer à la famille</button>
            </div>` : "";
          })
          .join("");
        const lignes = d.produits
          .map((p, i) => `<div class="q-ligne">
              <span class="numero-piece">${numero(p)}</span>
              <label for="q-delai-${i}">${e(p.nom)}</label>
              <input type="number" min="0" step="1" inputmode="numeric" id="q-delai-${i}" data-q-chemin="produits.${i}.delai" data-q-type="entier" value="${p.delai > 0 ? p.delai : ""}" placeholder="jours">
            </div>`)
          .join("");
        return (
          partie("Par famille, en une fois", `<div class="q-tableau">${familles}</div>`, "Le délai est donné en jours après validation de la maquette. Il remplace celui de chaque produit de la famille ; vous pouvez ensuite ajuster produit par produit.") +
          partie("Produit par produit", `<div class="q-tableau">${lignes}</div>`) +
          partie("En période de fête", grille(texte(R("delais", "fetes"), "Délai pendant les fêtes (Noël, fête des mères…)", { zone: true, placeholder: "Par exemple : délai en décembre, date à partir de laquelle vous ne garantissez plus la livraison" })))
        );
      },
    },
    {
      cle: "dates-limites", theme: 0,
      titre: "Dates limites des fêtes",
      question: "Quelle date limite pour commander avant la fête des mères, la fête des pères, Noël ?",
      ouVa: "Occasions : date de l'occasion et date limite de commande",
      commencee: (d) => d.occasions.some((o) => o.dateLimite || o.date),
      corps: (d) =>
        partie(
          "",
          `<div class="q-tableau">${d.occasions
            .map((o, i) => `<div class="ligne-occasion" style="padding:.6rem 0;border-bottom:var(--filet-doux)">
                <div class="champ"><span class="label">${e(o.nom)}</span></div>
                ${date(`occasions.${i}.date`, "Date de l'occasion")}
                ${date(`occasions.${i}.dateLimite`, "Commander avant le")}
              </div>`)
            .join("")}</div>`,
          "Laissez vide les occasions sans date fixe (naissance, mariage, anniversaire…). Le nouveau site affiche la date limite sur la page des occasions et sur les fiches."
        ) + partie("", grille(texte(R("dates-limites", "note"), "Remarque (facultatif)", { zone: true }))),
    },
    {
      cle: "maquette", theme: 0,
      titre: "Envoi d'une maquette",
      question: "Envoyez-vous une maquette pour chaque commande, ou seulement quand c'est nécessaire ?",
      ouVa: "Réglage des commandes : maquette systématique ou non",
      commencee: (d) => rempli(d.site.commandes?.maquette),
      corps: () =>
        partie("", radios("site.commandes.maquette", [
          ["toujours", "Pour chaque commande", "Le client valide la maquette avant la fabrication"],
          ["si-besoin", "Seulement quand c'est nécessaire", "Photo, logo, texte long…"],
        ])) + partie("", grille(texte(R("maquette", "precision"), "Dans quels cas ? Comment l'envoyez-vous (email, SMS, WhatsApp) ?", { zone: true }))),
    },
    {
      cle: "delai-reponse", theme: 0,
      titre: "Délai de réponse",
      question: "Le rappel « sous 48 h » après une commande ou un devis est-il tenu ?",
      ouVa: "Réglage des commandes : délai de réponse annoncé aux clients",
      commencee: (d) => rempli(d.site.commandes?.delaiReponse),
      corps: () =>
        partie("", grille(texte("site.commandes.delaiReponse", "Délai de réponse que nous pouvons promettre", { placeholder: "48 h", aide: "Il s'affiche après une commande et une demande de devis. Laissez vide si vous préférez ne rien promettre." })) +
          `<div><button type="button" class="btn btn-ligne" data-q-action="delai-48">Oui, sous 48 h</button></div>`),
    },
    {
      cle: "paiement", theme: 0,
      titre: "Modes de paiement",
      question: "Quels modes de paiement voulez-vous : après validation de la maquette, en boutique, carte en ligne ?",
      ouVa: "Commandes en ligne et paiement (Infos boutique)",
      commencee: () => false,
      corps: () =>
        partie("", `<div class="q-choix">
          ${caseQ("site.commandes.paiement.apresValidation", "Après validation de la maquette", "Vous envoyez un lien de paiement par carte depuis l'admin")}
          ${caseQ("site.commandes.paiement.boutique", "En boutique, au retrait", "Carte, espèces ou chèque")}
          ${caseQ("site.commandes.paiement.enLigne", "Carte en ligne, à la commande", "Demande le compte Stripe, relié par l'agence")}
        </div>`) + partie("", grille(texte(R("paiement", "remarque"), "Remarque (facultatif)", { zone: true }))),
    },
    {
      cle: "livraison", theme: 0,
      titre: "Livraison et emballage",
      question: "Livraison : 5,90 € et gratuite dès 60 €, c'est toujours juste ? Quel transporteur, quelles zones ? L'emballage cadeau existe-t-il ?",
      ouVa: "Livraison, cadeau et commandes (Infos boutique)",
      commencee: (d) => rempli(d.site.expedition?.transporteur) || rempli(d.site.expedition?.zones),
      corps: () =>
        partie("Livraison", grille(
          nombre("site.livraison", "Frais de livraison (€)") +
          nombre("site.livraisonOfferteDes", "Livraison offerte à partir de (€)", { aide: "0 : jamais offerte" }) +
          texte("site.expedition.transporteur", "Transporteur", { large: false, placeholder: "La Poste, Mondial Relay…" }) +
          texte("site.expedition.zones", "Zones livrées", { large: false, placeholder: "France métropolitaine, Belgique…" })
        )) +
        partie("Emballage cadeau", `<div class="q-choix">${caseQ("site.emballage.actif", "Nous proposons un emballage cadeau")}</div>` + grille(nombre("site.emballage.prix", "Prix de l'emballage cadeau (€)"))),
    },
    {
      cle: "fiches", theme: 1,
      titre: "Fiche technique des produits",
      question: "Pour chaque produit : matière, dimensions de chaque taille (Moyenne, Grande…), zone gravable, entretien.",
      ouVa: "Fiche de chaque produit : matière, dimensions, zone gravable, entretien",
      commencee: (d) => d.produits.some((p) => CHAMPS_FICHE.some(([k]) => rempli(p[k]))),
      corps: (d) => {
        const completes = d.produits.filter(ficheComplete).length;
        const familles = d.categories
          .filter((c) => d.produits.some((p) => p.categorie === c.id))
          .map((c) => `<div class="q-ligne q-ligne-famille" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) auto">
              <label for="q-fam-mat-${e(c.id)}">${e(c.nom)}</label>
              <input type="text" id="q-fam-mat-${e(c.id)}" placeholder="Matière commune" aria-label="Matière commune à ${e(c.nom)}">
              <button type="button" class="mini" data-q-action="matiere-famille" data-cat="${e(c.id)}">Aux produits sans matière</button>
            </div>`)
          .join("");
        const produits = d.produits
          .map((p, i) => {
            const n = CHAMPS_FICHE.filter(([k]) => rempli(p[k])).length;
            const tailles = p.variantes?.choix?.length ? p.variantes.choix.map((c) => c.nom).filter(Boolean).join(", ") : "";
            return `<details class="q-produit" data-q-produit="${i}">
              <summary><span class="numero-piece">${numero(p)}</span><span>${e(p.nom)}</span><span class="q-etat ${n === 4 ? "repondue" : n ? "commencee" : "vide"}">${n}/4</span></summary>
              <div class="grille-champs">
                ${texte(`produits.${i}.matiere`, "Matière", { large: false, placeholder: CHAMPS_FICHE[0][2] })}
                ${texte(`produits.${i}.dimensions`, "Dimensions", { large: false, placeholder: CHAMPS_FICHE[1][2], aide: tailles ? `Pour chaque taille : ${e(tailles)}` : "" })}
                ${texte(`produits.${i}.zoneGravable`, "Zone gravable", { large: false, placeholder: CHAMPS_FICHE[2][2] })}
                ${texte(`produits.${i}.entretien`, "Entretien", { large: false, placeholder: CHAMPS_FICHE[3][2] })}
              </div>
            </details>`;
          })
          .join("");
        return (
          partie("Par famille", `<div class="q-tableau">${familles}</div>`, "La matière commune est recopiée dans les produits de la famille qui n'en ont pas encore. Les autres champs se remplissent produit par produit.") +
          partie(`Produit par produit <span class="aide" style="font:400 .85rem var(--f-mono);text-transform:none">(${completes} sur ${d.produits.length} complets)</span>`, `<div class="q-tableau">${produits}</div>`, "Les mêmes champs se trouvent dans Produits → Modifier.")
        );
      },
    },
    {
      cle: "licences", theme: 1,
      titre: "Produits sous licence",
      question: "Les produits avec Winnie l'Ourson ou des écussons de clubs : les vendez-vous ? avec quelle autorisation ? Peut-on retirer ces photos du site ?",
      ouVa: "Réponses du questionnaire ; votre choix pour chaque photo s'applique au site",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.licences || {}).some((k) => k !== "date"),
      corps: () =>
        partie("", grille(texte(R("licences", "vente"), "Vendez-vous ces produits ? Avec quelle autorisation ?", { zone: true, aide: "Un personnage ou un logo de club appartient à son propriétaire : sans licence, mieux vaut ne pas le montrer." }))) +
        partie("Que faire de ces photos ?", blocPhoto("licences", "winnie") + blocPhoto("licences", "ecussons")),
    },
    {
      cle: "tirelire", theme: 1,
      titre: "Logo sur la tirelire",
      question: "Le logo « Le Comptoir de la Friterie » sur la tirelire : le client est-il d'accord pour qu'on le montre ?",
      ouVa: "Réponses du questionnaire ; votre choix pour la photo s'applique au site",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.tirelire || {}).some((k) => k !== "date"),
      corps: () =>
        partie("", radios(R("tirelire", "accord"), [
          ["oui", "Oui, il est d'accord", ""],
          ["non", "Non", ""],
          ["a-demander", "Pas encore demandé", ""],
        ])) + partie("Que faire de cette photo ?", blocPhoto("tirelire", "tirelire")),
    },
    {
      cle: "polices", theme: 1,
      titre: "Essai de gravure des polices",
      question: "Pouvez-vous faire un essai de gravure avec les polices prévues (Big Shoulders, Literata, Courier Prime, Sacramento) ?",
      ouVa: "Réponses du questionnaire",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.polices || {}).some((k) => k !== "date"),
      corps: () =>
        POLICES.map(([cle, nom, surnom, famille, graisse]) =>
          partie(
            `${nom} <span class="aide" style="font:400 .85rem var(--f-mono);text-transform:none">(« ${surnom} » dans le configurateur)</span>`,
            `<p class="q-citation" style="font-family:${famille};font-weight:${graisse};font-style:normal;font-size:1.6rem;line-height:1.2">Léa &amp; Hugo, 12 juin 2027</p>` +
              radios(R("polices", cle), [
                ["a-faire", "Pas encore essayée", ""],
                ["ok", "Essai réussi", ""],
                ["non", "Ne convient pas", ""],
              ])
          )
        ).join("") + partie("", grille(texte(R("polices", "remarque"), "Remarques sur l'essai (taille minimale, matière…)", { zone: true }))),
    },
    {
      cle: "photos", theme: 2,
      titre: "Photos de l'équipe et de l'atelier",
      question: "Acceptez-vous d'apparaître en photo sur le site ? Peut-on photographier l'atelier et la machine laser ?",
      ouVa: "Réponses du questionnaire",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.photos || {}).some((k) => k !== "date"),
      corps: () =>
        partie("Vous, en photo sur le site", radios(R("photos", "equipe"), [["oui", "Oui", ""], ["non", "Non", ""], ["a-voir", "À voir ensemble", ""]])) +
        partie("L'atelier et la machine laser", radios(R("photos", "atelier"), [["oui", "Oui", ""], ["non", "Non", ""], ["a-voir", "À voir ensemble", ""]])) +
        partie("", grille(texte(R("photos", "remarque"), "Remarque (facultatif)", { zone: true }))),
    },
    {
      cle: "textes", theme: 2,
      titre: "Textes signés de vos prénoms",
      question: "Les deux phrases signées « Christophe et Laetitia » sur l'accueil et la page atelier vous conviennent-elles, ou voulez-vous les écrire vous-mêmes ? « Fait main à Auchel » vous convient-il ?",
      ouVa: "Réponses du questionnaire",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.textes || {}).some((k) => k !== "date"),
      corps: () =>
        partie("Les deux phrases", `
          <blockquote class="q-citation">« Chaque pièce passe entre nos mains, de la maquette à la dernière gravure. » <span class="aide">(accueil)</span></blockquote>
          <blockquote class="q-citation">« Venez nous voir : on aime parler de votre projet autour de l'établi. » <span class="aide">(page atelier)</span></blockquote>
          ${radios(R("textes", "phrases"), [["conviennent", "Elles nous conviennent", ""], ["a-ecrire", "Nous préférons les écrire", ""], ["retirer", "Les retirer", ""]])}
          <div class="grille-champs">${texte(R("textes", "nosPhrases"), "Vos phrases (si vous les écrivez)", { zone: true })}</div>`) +
        partie("« Fait main à Auchel »", radios(R("textes", "faitMain"), [["oui", "Nous convient", ""], ["non", "Ne convient pas", ""]]) + grille(texte(R("textes", "faitMainAutre"), "Ce que vous préférez dire", { placeholder: "Votre formule" }))),
    },
    {
      cle: "clientele", theme: 2,
      titre: "Votre clientèle",
      question: "Quelle part de vos clients vient d'Auchel et des environs, et quelle part se fait livrer ? Quelle part des commandes vient des associations et des entreprises ?",
      ouVa: "Réponses du questionnaire",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.clientele || {}).some((k) => k !== "date"),
      corps: () =>
        partie("", grille(
          texte(R("clientele", "local"), "Clients d'Auchel et des environs", { large: false, placeholder: "Une estimation suffit" }) +
          texte(R("clientele", "livres"), "Clients qui se font livrer", { large: false, placeholder: "Une estimation suffit" }) +
          texte(R("clientele", "pro"), "Commandes des associations et entreprises", { large: false, placeholder: "Une estimation suffit" }) +
          texte(R("clientele", "remarque"), "Remarque (facultatif)", { zone: true })
        )),
    },
    {
      cle: "concurrents", theme: 2,
      titre: "Concurrents locaux",
      question: "Quels concurrents locaux connaissez-vous (pour le benchmark) ?",
      ouVa: "Réponses du questionnaire",
      commencee: (d) => rempli(d.questionnaire?.reponses?.concurrents?.liste),
      corps: () => partie("", grille(texte(R("concurrents", "liste"), "Noms, villes, sites ou pages Facebook", { zone: true }))),
    },
    {
      cle: "entreprise", theme: 3,
      titre: "Votre entreprise",
      question: "Forme juridique, SIRET (le numéro SIREN imprimé sur votre carte de visite est-il le bon ?), inscription au répertoire des métiers ou au RCS, régime de TVA.",
      ouVa: "Informations légales (Infos boutique) : CGV, mentions légales, factures",
      commencee: (d) => rempli(d.site.siret) || rempli(d.site.legal?.formeJuridique),
      corps: (d) =>
        partie("", grille(
          texte("site.legal.exploitant", "Nom et prénom de l'exploitant", { large: false }) +
          texte("site.legal.formeJuridique", "Forme juridique", { large: false, liste: "q-formes", placeholder: "Micro-entreprise, EURL, SAS…" }) +
          texte("site.siret", "SIRET (14 chiffres)", { large: false, aide: "Les 9 premiers chiffres sont le SIREN, celui de votre carte de visite." }) +
          texte("site.legal.immatriculation", "Immatriculation (RM ou RCS)", { large: false, placeholder: "RM, chambre de métiers, ou RCS et ville" }) +
          `<div class="champ"><label for="q-regime">Régime de TVA</label><select id="q-regime" data-q-chemin="site.legal.regimeTva" data-q-rendre>
            <option value="" ${!d.site.legal?.regimeTva ? "selected" : ""}>À choisir</option>
            <option value="franchise" ${d.site.legal?.regimeTva === "franchise" ? "selected" : ""}>Franchise en base (TVA non applicable)</option>
            <option value="assujetti" ${d.site.legal?.regimeTva === "assujetti" ? "selected" : ""}>Assujetti à la TVA</option>
          </select><small>À confirmer avec le comptable.</small></div>` +
          (d.site.legal?.regimeTva === "assujetti" ? nombre("site.legal.tauxTva", "Taux de TVA (%)") : "")
        ) + `<datalist id="q-formes"><option value="Micro-entreprise (entreprise individuelle)"><option value="Entreprise individuelle"><option value="EURL"><option value="SARL"><option value="SASU"><option value="SAS"></datalist>`),
    },
    {
      cle: "publication", theme: 3,
      titre: "Directeur de la publication et médiateur",
      question: "Qui est le directeur de la publication ? Quel médiateur de la consommation avez-vous choisi ?",
      ouVa: "Informations légales (Infos boutique) : mentions légales et CGV",
      commencee: (d) => rempli(d.site.legal?.directeurPublication) || rempli(d.site.legal?.mediateur?.nom),
      corps: () =>
        partie("", grille(texte("site.legal.directeurPublication", "Directeur ou directrice de la publication", { large: false, aide: "La personne responsable du contenu du site, souvent l'exploitant." }))) +
        partie("Médiateur de la consommation", grille(
          texte("site.legal.mediateur.nom", "Nom du médiateur", { large: false, aide: "Obligatoire pour vendre aux particuliers. Liste officielle : economie.gouv.fr/mediation-conso." }) +
          texte("site.legal.mediateur.url", "Site du médiateur", { large: false, type: "url", placeholder: "https://…" }) +
          texte("site.legal.mediateur.adresse", "Adresse postale du médiateur")
        )),
    },
    {
      cle: "domaine", theme: 3,
      titre: "Nom de domaine et emails",
      question: "Le domaine montrucenbois.fr : chez qui est-il, et qui gère les emails ?",
      ouVa: "Réponses du questionnaire",
      commencee: (d) => Object.keys(d.questionnaire?.reponses?.domaine || {}).some((k) => k !== "date"),
      corps: () =>
        partie("", grille(
          texte(R("domaine", "registrar"), "Chez qui est le domaine ?", { large: false, placeholder: "OVH, Gandi, IONOS…" }) +
          texte(R("domaine", "emails"), "Qui gère les emails ?", { large: false }) +
          texte(R("domaine", "remarque"), "Remarque (accès, personne à contacter)", { zone: true, aide: "N'écrivez pas de mot de passe ici." })
        )),
    },
    {
      cle: "reseaux", theme: 3,
      titre: "Google, Instagram, WhatsApp",
      question: "Avez-vous une fiche Google (avis Google), un compte Instagram, un WhatsApp professionnel ?",
      ouVa: "Avis clients et Infos boutique : liens du site",
      commencee: (d) => rempli(d.site.plateformesAvis?.google?.lien) || rempli(d.site.instagram) || rempli(d.site.whatsapp),
      corps: () =>
        partie("Fiche Google", grille(
          texte("site.plateformesAvis.google.lien", "Lien de la fiche Google", { type: "url", placeholder: "https://maps.app.goo.gl/…", aide: "Google Maps → votre fiche → Partager → copier le lien." }) +
          texte("site.plateformesAvis.google.lienAvis", "Lien « Laisser un avis »", { type: "url", placeholder: "https://g.page/r/…/review" })
        ) + `<div class="q-choix">${caseQ(R("reseaux", "sansGoogle"), "Nous n'avons pas de fiche Google")}</div>`) +
        partie("Instagram", grille(texte("site.instagram", "Lien du compte Instagram", { type: "url", placeholder: "https://www.instagram.com/…" })) + `<div class="q-choix">${caseQ(R("reseaux", "sansInstagram"), "Nous n'avons pas de compte Instagram")}</div>`) +
        partie("WhatsApp", grille(texte("site.whatsapp", "Numéro WhatsApp professionnel", { type: "tel", aide: "Ajoute « Commander par WhatsApp » et un bouton de contact sur le site." })) + `<div class="q-choix">${caseQ(R("reseaux", "sansWhatsapp"), "Nous n'utilisons pas WhatsApp pour la boutique")}</div>`),
    },
  ];

  const estRepondue = (q, d = D()) => !!d.questionnaire?.reponses?.[q.cle]?.date;
  function etat(q, d = D()) {
    if (estRepondue(q, d)) return "repondue";
    const r = d.questionnaire?.reponses?.[q.cle];
    return q.commencee(d) || (r && Object.keys(r).length) ? "commencee" : "vide";
  }
  const LIBELLES = { repondue: "Répondue", commencee: "Commencée", vide: "À faire" };
  function avancement(d) {
    const repondues = Q.filter((q) => estRepondue(q, d)).length;
    return { repondues, total: Q.length, fini: repondues === Q.length };
  }
  const barre = (d) => {
    const a = avancement(d);
    return `<div class="avancement-q">
      <div class="avancement-q-barre" role="progressbar" aria-label="Avancement du questionnaire" aria-valuemin="0" aria-valuemax="${a.total}" aria-valuenow="${a.repondues}"><span style="width:${(a.repondues / a.total) * 100}%"></span></div>
      <p class="avancement-q-texte"><span><strong>${a.repondues}</strong> sur ${a.total} répondues</span><span>${a.fini ? "Terminé" : `${a.total - a.repondues} à faire`}</span></p>
    </div>`;
  };

  // ---------- Affichage ----------
  function rendre(zone) {
    const d = D();
    if (!courante || !Q.some((q) => q.cle === courante)) courante = (Q.find((q) => !estRepondue(q, d)) || Q[0]).cle;
    const i = Q.findIndex((q) => q.cle === courante);
    const q = Q[i];
    const r = d.questionnaire?.reponses?.[q.cle];
    const sommaire = THEMES.map(
      (t, k) => `<div class="q-theme"><p>${t}</p>${Q.map((x, n) => [x, n])
        .filter(([x]) => x.theme === k)
        .map(([x, n]) => {
          const s = etat(x, d);
          return `<button type="button" class="q-lien" data-q-aller="${x.cle}" ${x.cle === courante ? 'aria-current="step"' : ""}><span class="q-num">${String(n + 1).padStart(2, "0")}</span><span>${x.titre}</span><span class="q-etat ${s}">${LIBELLES[s]}</span></button>`;
        })
        .join("")}</div>`
    ).join("");
    const telephone = matchMedia("(max-width: 999px)").matches;
    zone.innerHTML = `
      <div class="questionnaire">
        <details class="q-sommaire" ${!telephone || sommaireOuvert ? "open" : ""}>
          <summary style="padding-inline:14px;display:block;min-height:var(--cible)">${barre(d)}<span class="aide" ${telephone ? "" : "hidden"}>${sommaireOuvert ? "Masquer" : "Voir"} les 18 questions</span></summary>
          ${sommaire}
        </details>
        <article class="q-carte" aria-labelledby="q-titre">
          <header class="q-carte-tete">
            <p class="etiquette">Question ${i + 1} sur ${Q.length} · ${THEMES[q.theme]}</p>
            <h2 id="q-titre" tabindex="-1">${q.titre}</h2>
            <p>${e(q.question)}</p>
            <p class="q-ou-va">Va dans : ${q.ouVa}</p>
          </header>
          <div class="q-corps">${q.corps(d)}</div>
          <footer class="q-pied">
            <span class="q-date">${r?.date ? `Répondue le ${dateFr(r.date)}` : ctx.estModifie() ? "Enregistré sur cet appareil, à publier" : "Pas encore répondue"}</span>
            <span class="q-pied-boutons">
              ${i > 0 ? `<button type="button" class="btn btn-ligne" data-q-aller="${Q[i - 1].cle}" aria-label="Question précédente"><span class="q-court" aria-hidden="true">←</span><span class="q-long">Précédente</span></button>` : ""}
              ${r?.date ? `<button type="button" class="btn btn-ligne" data-q-action="rouvrir">À revoir</button>` : ""}
              <button type="button" class="btn" data-q-action="valider">${i < Q.length - 1 ? `Valider<span class="q-long"> et continuer</span>` : "Valider"}</button>
            </span>
          </footer>
        </article>
      </div>
      <p class="aide">Vos réponses sont gardées sur cet appareil au fur et à mesure. Elles changent le site après « Publier les modifications », en haut de la page.</p>`;
  }

  // Pendant la saisie : seuls les états (sommaire, « n/4 » d'un produit) changent, la page n'est pas redessinée
  function majEtats(zone, el) {
    const q = Q.find((x) => x.cle === courante);
    const s = etat(q);
    const badge = zone.querySelector(`[data-q-aller="${courante}"] .q-etat`);
    if (badge) {
      badge.className = `q-etat ${s}`;
      badge.textContent = LIBELLES[s];
    }
    const fiche = el.closest("details.q-produit");
    if (fiche) {
      const p = D().produits[fiche.dataset.qProduit];
      const n = CHAMPS_FICHE.filter(([k]) => rempli(p[k])).length;
      const b = fiche.querySelector("summary .q-etat");
      b.className = `q-etat ${n === 4 ? "repondue" : n ? "commencee" : "vide"}`;
      b.textContent = `${n}/4`;
    }
  }

  function monter(zone, contexte) {
    ctx = contexte;
    reponses();
    rendre(zone);
    const rafraichir = (garderFocus) => {
      const actif = document.activeElement?.id;
      rendre(zone);
      if (garderFocus && actif) document.getElementById(actif)?.focus();
    };
    zone.addEventListener("input", (ev) => {
      const el = ev.target;
      const chemin = el.dataset.qChemin;
      if (!chemin) return;
      const t = el.dataset.qType;
      let v;
      if (t === "case") v = el.checked;
      else if (t === "entier") v = Math.max(0, parseInt(el.value, 10) || 0);
      else if (t === "nombre") v = Number(el.value || 0);
      else v = el.value;
      ecrire(chemin, v);
      rep(courante); // la question est commencée
      const photo = chemin.match(/^questionnaire\.reponses\.([^.]+)\.choix-(.+)$/);
      if (photo) appliquerChoixPhoto(photo[1], photo[2]);
      ctx.marquerModifie();
      if (el.dataset.qRendre !== undefined) rafraichir(true);
      else majEtats(zone, el);
    });
    zone.addEventListener("toggle", (ev) => {
      if (ev.target.classList?.contains("q-sommaire") && matchMedia("(max-width: 999px)").matches) {
        sommaireOuvert = ev.target.open;
        const lien = ev.target.querySelector("summary .aide");
        if (lien) lien.textContent = `${sommaireOuvert ? "Masquer" : "Voir"} les 18 questions`;
      }
    }, true);
    zone.addEventListener("click", (ev) => {
      const aller = ev.target.closest("[data-q-aller]");
      if (aller) {
        courante = aller.dataset.qAller;
        sommaireOuvert = false;
        rendre(zone);
        zone.querySelector(".q-carte")?.scrollIntoView({ block: "start" });
        zone.querySelector("#q-titre")?.focus({ preventScroll: true });
        return;
      }
      const b = ev.target.closest("[data-q-action]");
      if (!b) return;
      const d = D();
      const a = b.dataset.qAction;
      if (a === "valider") {
        rep(courante).date = aujourdhui();
        ctx.marquerModifie();
        const suivante = Q.slice(Q.findIndex((q) => q.cle === courante) + 1).find((q) => !estRepondue(q, d)) || Q.find((q) => !estRepondue(q, d));
        if (suivante) courante = suivante.cle;
        rendre(zone);
        zone.querySelector(".q-carte")?.scrollIntoView({ block: "start" });
        ctx.toast(avancement(d).fini ? "Questionnaire terminé. Pensez à publier les modifications." : "Réponse enregistrée.");
        return;
      }
      if (a === "rouvrir") {
        delete rep(courante).date;
        ctx.marquerModifie();
        return rendre(zone);
      }
      if (a === "delai-48") {
        ecrire("site.commandes.delaiReponse", "48 h");
        rep(courante);
        ctx.marquerModifie();
        return rendre(zone);
      }
      if (a === "delai-famille") {
        const champ = zone.querySelector(`#q-fam-delai-${CSS.escape(b.dataset.cat)}`);
        const jours = parseInt(champ?.value, 10);
        if (!(jours > 0)) return ctx.toast("Indiquez d'abord un nombre de jours.", true);
        const cibles = d.produits.filter((p) => p.categorie === b.dataset.cat);
        cibles.forEach((p) => (p.delai = jours));
        rep(courante);
        ctx.marquerModifie();
        rendre(zone);
        ctx.toast(`${jours} jour${jours > 1 ? "s" : ""} pour les ${cibles.length} produits de la famille.`);
        return;
      }
      if (a === "matiere-famille") {
        const champ = zone.querySelector(`#q-fam-mat-${CSS.escape(b.dataset.cat)}`);
        const matiere = champ?.value.trim();
        if (!matiere) return ctx.toast("Indiquez d'abord la matière.", true);
        const cibles = d.produits.filter((p) => p.categorie === b.dataset.cat && !rempli(p.matiere));
        cibles.forEach((p) => (p.matiere = matiere));
        rep(courante);
        ctx.marquerModifie();
        rendre(zone);
        ctx.toast(cibles.length ? `Matière ajoutée à ${cibles.length} produit${cibles.length > 1 ? "s" : ""}.` : "Tous les produits de la famille avaient déjà une matière.");
      }
    });
  }

  window.AdminQuestionnaire = { monter, avancement, barre: (d) => barre(d), QUESTIONS: Q };
})();
