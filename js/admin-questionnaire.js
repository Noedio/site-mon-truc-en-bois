// Questionnaire de démarrage : les questions de l'audit (audit/RAPPORT.md §5) posées au commerçant.
// Les questions sur les produits sous licence et le logo de la tirelire ont été retirées après la relecture de la démo
// (25/10/2026) : ces photos sont couvertes par les accords de l'atelier.
// Une réponse qui correspond à une donnée du site remplit directement ce champ (délais, occasions, fiches techniques,
// polices, paiement, livraison, mentions légales, liens) ; le reste va dans D.questionnaire.reponses, avec la date de réponse.
// Rien n'est publié ici : les réponses partent avec le bouton « Publier les modifications », comme le reste du site.
(function () {
  // Même liste et mêmes identifiants que le configurateur du site (site/src/lib/configurateur.ts) :
  // [id, police, nom dans le configurateur, famille CSS, graisse]. Les quatre premières sont proposées par défaut.
  const POLICES = [
    ["atelier", "Big Shoulders", "Atelier", "'Big Shoulders', sans-serif", "800"],
    ["classique", "Literata", "Classique", "Literata, serif", "600"],
    ["machine", "Courier Prime", "Machine à écrire", "'Courier Prime', monospace", "700"],
    ["manuscrite", "Sacramento", "Manuscrite", "Sacramento, cursive", "400"],
    ["calligraphie", "Great Vibes", "Calligraphie", "'Great Vibes', cursive", "400"],
    ["ronde", "Dancing Script", "Ronde", "'Dancing Script', cursive", "600"],
    ["retro", "Pacifico", "Rétro", "Pacifico, cursive", "400"],
    ["craie", "Amatic SC", "Craie", "'Amatic SC', sans-serif", "700"],
    ["elegante", "Playfair Display", "Élégante", "'Playfair Display', serif", "600"],
    ["affiche", "Bebas Neue", "Affiche", "'Bebas Neue', sans-serif", "400"],
    ["romaine", "Cinzel", "Romaine", "Cinzel, serif", "600"],
    ["ecriture", "Caveat", "Écriture", "Caveat, cursive", "600"],
    ["moderne", "Josefin Sans", "Moderne", "'Josefin Sans', sans-serif", "600"],
  ];
  const POLICES_DEFAUT = ["atelier", "classique", "machine", "manuscrite"];
  const MOTIFS = [
    ["coeurs", "Cœurs"],
    ["etoiles", "Étoiles"],
    ["alliances", "Alliances"],
    ["feuillage", "Feuillage"],
    ["pattes", "Pattes d'animal"],
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

  // Cases liées à une liste (polices, motifs) : la liste garde l'ordre du catalogue.
  // Liste absente : le site garde son comportement par défaut (second élément).
  const LISTES = {
    "site.configurateur.polices": [POLICES.map(([id]) => id), POLICES_DEFAUT],
    "site.configurateur.motifs": [MOTIFS.map(([id]) => id), []],
  };
  const listeDe = (chemin) => lire(chemin) || LISTES[chemin][1];
  const caseListe = (chemin, valeur, contenu, aide = "") =>
    `<label class="choix-carte"><input type="checkbox" data-q-liste="${chemin}" value="${e(valeur)}" ${listeDe(chemin).includes(valeur) ? "checked" : ""}><span>${contenu}${aide ? `<small>${aide}</small>` : ""}</span></label>`;

  // ---------- Dates des occasions ----------
  // Noël, fête des mères et fête des pères sont datées par le site (site/src/lib/occasions.ts, mêmes règles) ;
  // les autres seulement si l'atelier saisit une date. La date limite vient des jours ouvrés, sauf date saisie.
  const J = () => window.JoursOuvres;
  const decaler = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  const dimancheAvant = (d) => decaler(d, -d.getDay());
  const dimancheApres = (d) => decaler(d, (7 - d.getDay()) % 7);
  const REGLES = {
    noel: (a) => new Date(a, 11, 25, 12),
    // Dernier dimanche de mai ; si c'est la Pentecôte, premier dimanche de juin.
    "fete-meres": (a) => {
      const fin = dimancheAvant(new Date(a, 4, 31, 12));
      return J().iso(fin) === J().iso(decaler(J().paques(a), 49)) ? dimancheApres(new Date(a, 5, 1, 12)) : fin;
    },
    // Troisième dimanche de juin.
    "fete-peres": (a) => decaler(dimancheApres(new Date(a, 5, 1, 12)), 14),
  };
  function dateOccasion(o) {
    if (o.date) return { date: J().lire(o.date), auto: false };
    const regle = REGLES[o.id];
    if (!regle) return null;
    const jour = J().iso(new Date());
    let d = regle(new Date().getFullYear());
    if (J().iso(d) < jour) d = regle(new Date().getFullYear() + 1);
    return { date: d, auto: true };
  }
  function limiteOccasion(o) {
    if (o.dateLimite) return { date: J().lire(o.dateLimite), saisie: true };
    const quand = dateOccasion(o);
    return quand && o.delaiJours > 0 ? { date: J().retirer(quand.date, o.delaiJours), saisie: false } : null;
  }
  const dateCourte = (d) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const jours = (n) => `${n} jour${n > 1 ? "s" : ""} ouvré${n > 1 ? "s" : ""}`;

  // ---------- Les questions ----------
  const THEMES = ["Pour vendre", "Sur les produits", "Sur vous", "Pour les mentions obligatoires"];
  const Q = [
    {
      cle: "delais", theme: 0,
      titre: "Délais de fabrication",
      question: "Quel délai de fabrication pour chaque produit (ou par famille) ? Et en période de fête ?",
      ouVa: "Fiche de chaque produit : délai en jours ouvrés après validation de la maquette",
      commencee: (d) => d.produits.some((p) => p.delai > 0) || rempli(d.questionnaire?.reponses?.delais?.fetes),
      corps: (d) => {
        const familles = d.categories
          .map((c) => {
            const n = d.produits.filter((p) => p.categorie === c.id).length;
            return n ? `<div class="q-ligne q-ligne-famille">
              <label for="q-fam-delai-${e(c.id)}">${e(c.nom)} <span class="aide">(${n} produit${n > 1 ? "s" : ""})</span></label>
              <input type="number" min="0" step="1" inputmode="numeric" id="q-fam-delai-${e(c.id)}" placeholder="jours ouvrés" aria-label="Délai en jours ouvrés pour ${e(c.nom)}">
              <button type="button" class="mini" data-q-action="delai-famille" data-cat="${e(c.id)}">Appliquer à la famille</button>
            </div>` : "";
          })
          .join("");
        const lignes = d.produits
          .map((p, i) => `<div class="q-ligne">
              <span class="numero-piece">${numero(p)}</span>
              <label for="q-delai-${i}">${e(p.nom)}</label>
              <input type="number" min="0" step="1" inputmode="numeric" id="q-delai-${i}" data-q-chemin="produits.${i}.delai" data-q-type="entier" value="${p.delai > 0 ? p.delai : ""}" placeholder="jours ouvrés">
            </div>`)
          .join("");
        return (
          partie("Par famille, en une fois", `<div class="q-tableau">${familles}</div>`, "Le délai est compté en jours ouvrés (du lundi au vendredi, hors jours fériés) après validation de la maquette. Il remplace celui de chaque produit de la famille ; vous pouvez ensuite ajuster produit par produit.") +
          partie("Produit par produit", `<div class="q-tableau">${lignes}</div>`) +
          partie("En période de fête", grille(texte(R("delais", "fetes"), "Délai pendant les fêtes (Noël, fête des mères…)", { zone: true, placeholder: "Par exemple : délai en décembre, date à partir de laquelle vous ne garantissez plus la livraison" })))
        );
      },
    },
    {
      cle: "dates-limites", theme: 0,
      titre: "Délais des occasions",
      question: "Combien de jours ouvrés faut-il prévoir pour chaque occasion, entre la commande et la remise de la pièce ? Pour une fête à date fixe comme Noël, vous pouvez aussi donner directement la date limite.",
      ouVa: "Occasions : délai en jours ouvrés, date limite de commande des fêtes datées",
      commencee: (d) => d.occasions.some((o) => o.delaiJours > 0 || o.dateLimite || o.date),
      corps: (d) =>
        partie(
          "",
          `<div class="q-tableau">${d.occasions
            .map((o, i) => {
              const quand = dateOccasion(o);
              const limite = limiteOccasion(o);
              const resultat = quand
                ? limite
                  ? `Commander avant le <strong>${dateCourte(limite.date)}</strong>${limite.saisie ? " (date imposée)" : ""}`
                  : "Indiquez les jours ouvrés ou une date limite"
                : o.delaiJours > 0
                  ? `Sur le site : « prévoir ${jours(o.delaiJours)} »`
                  : "Pas de date fixe : seul le délai compte";
              const dates = quand
                ? `${REGLES[o.id] ? "" : date(`occasions.${i}.date`, "Date de l'occasion")}${date(`occasions.${i}.dateLimite`, "Date limite imposée")}`
                : date(`occasions.${i}.date`, "Date de l'occasion");
              return `<div class="q-occasion">
                <p class="q-occasion-nom"><strong>${e(o.nom)}</strong><span class="aide">${quand ? `${dateCourte(quand.date)}${quand.auto ? " (calculée)" : ""}` : "Toute l'année"}</span></p>
                <div class="champ"><label for="q-occ-jours-${i}">Jours ouvrés</label><input type="number" min="0" step="1" inputmode="numeric" id="q-occ-jours-${i}" data-q-chemin="occasions.${i}.delaiJours" data-q-type="entier" data-q-rendre value="${o.delaiJours > 0 ? o.delaiJours : ""}" placeholder="jours"></div>
                <p class="q-occasion-resultat">${resultat}</p>
                <details class="q-occasion-plus" ${o.dateLimite || (o.date && !REGLES[o.id]) ? "open" : ""}><summary>${quand ? "Dates" : "Date fixe ?"}</summary><div class="grille-champs">${dates}</div></details>
              </div>`;
            })
            .join("")}</div>`,
          "Jours ouvrés : du lundi au vendredi hors jours fériés, maquette, fabrication et envoi compris. Naissance, baptême, mariage, anniversaire : seul le délai s'affiche. Noël, fête des mères, fête des pères : la date limite est calculée depuis la date de la fête, sauf si vous en imposez une."
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
      cle: "polices", theme: 1,
      titre: "Polices et motifs proposés",
      question: "Quelles polices proposer aux clients dans le configurateur ? Pouvez-vous faire un essai de gravure de chacune ? Proposez-vous des motifs à ajouter (cœurs, étoiles…) ?",
      ouVa: "Configurateur du site : polices et motifs proposés aux clients",
      commencee: (d) => !!d.site.configurateur || Object.keys(d.questionnaire?.reponses?.polices || {}).some((k) => k !== "date"),
      corps: () =>
        partie(
          "Polices",
          `<div class="q-polices">${POLICES.map(([id, nom, surnom, famille, graisse]) => `
            <div class="q-police">
              ${caseListe("site.configurateur.polices", id, `<span class="q-police-essai" style="font-family:${famille};font-weight:${graisse}">Léa &amp; Hugo, 12 juin 2027</span><span class="q-police-nom">${surnom} <span class="aide">${nom}</span></span>`)}
              <select data-q-chemin="${R("polices", id)}" aria-label="Essai de gravure, police ${surnom}">
                ${[["", "Essai à faire"], ["ok", "Essai réussi"], ["non", "Ne convient pas"]].map(([v, l]) => `<option value="${v}" ${(lire(R("polices", id)) || "") === v ? "selected" : ""}>${l}</option>`).join("")}
              </select>
            </div>`).join("")}</div>`,
          "Cochez les polices proposées aux clients ; elles apparaissent dans cet ordre. Toutes sont libres de droits et déjà prêtes sur le site."
        ) +
        partie("", `<div class="q-choix">${caseQ("site.configurateur.autrePolice", "Proposer « Autre police »", "Le client décrit la police souhaitée ; vous confirmez avec la maquette")}</div>`) +
        partie("Motifs", `<div class="q-choix en-ligne">${MOTIFS.map(([id, nom]) => caseListe("site.configurateur.motifs", id, nom)).join("")}</div>`, "Le client peut ajouter un motif coché à sa gravure, comme les petits cœurs de la plaque à message. Aucun coché : pas de choix de motif.") +
        partie("", grille(texte(R("polices", "remarque"), "Remarques sur les essais (taille minimale, matière, autres polices que vous utilisez…)", { zone: true }))),
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
      corps: (d) =>
        partie(
          "Directeur de la publication",
          grille(texte("site.legal.directeurPublication", "Directeur ou directrice de la publication", {
            large: false,
            placeholder: d.site.legal?.exploitant || "Prénom Nom",
            aide: d.site.legal?.exploitant ? `Laissez vide : c'est l'exploitant, ${e(d.site.legal.exploitant)}.` : "Laissez vide si c'est l'exploitant (question « Votre entreprise »).",
          })),
          "Pourquoi : le site d'une entreprise doit nommer la personne responsable de ce qui y est publié (loi pour la confiance dans l'économie numérique, art. 6). Pour une entreprise individuelle, c'est l'exploitant : rien de plus à faire."
        ) +
        partie(
          "Médiateur de la consommation",
          grille(
            texte("site.legal.mediateur.nom", "Nom du médiateur", { large: false, aide: "Liste officielle des médiateurs : economie.gouv.fr/mediation-conso." }) +
            texte("site.legal.mediateur.url", "Site du médiateur", { large: false, type: "url", placeholder: "https://…" }) +
            texte("site.legal.mediateur.adresse", "Adresse postale du médiateur")
          ),
          "Pourquoi : un commerçant qui vend à des particuliers doit adhérer à un médiateur et donner ses coordonnées sur le site et dans les CGV (Code de la consommation, art. L612-1 et L616-1). Un client mécontent peut ainsi le saisir gratuitement avant d'aller au tribunal. L'adhésion est payante ; sans médiateur, l'entreprise s'expose à une amende administrative (art. L641-1). Si la boutique a déjà un médiateur, ce sont ses coordonnées."
        ),
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
          <summary style="padding-inline:14px;display:block;min-height:var(--cible)">${barre(d)}<span class="aide" ${telephone ? "" : "hidden"}>${sommaireOuvert ? "Masquer" : "Voir"} les ${Q.length} questions</span></summary>
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
      if (el.dataset.qListe) {
        const [tous] = LISTES[el.dataset.qListe];
        const coches = new Set(listeDe(el.dataset.qListe));
        if (el.checked) coches.add(el.value);
        else coches.delete(el.value);
        ecrire(el.dataset.qListe, tous.filter((id) => coches.has(id)));
        rep(courante);
        ctx.marquerModifie();
        return majEtats(zone, el);
      }
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
      ctx.marquerModifie();
      if (el.dataset.qRendre !== undefined) rafraichir(true);
      else majEtats(zone, el);
    });
    zone.addEventListener("toggle", (ev) => {
      if (ev.target.classList?.contains("q-sommaire") && matchMedia("(max-width: 999px)").matches) {
        sommaireOuvert = ev.target.open;
        const lien = ev.target.querySelector("summary .aide");
        if (lien) lien.textContent = `${sommaireOuvert ? "Masquer" : "Voir"} les ${Q.length} questions`;
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
        const n = parseInt(champ?.value, 10);
        if (!(n > 0)) return ctx.toast("Indiquez d'abord un nombre de jours.", true);
        const cibles = d.produits.filter((p) => p.categorie === b.dataset.cat);
        cibles.forEach((p) => (p.delai = n));
        rep(courante);
        ctx.marquerModifie();
        rendre(zone);
        ctx.toast(`${n} jour${n > 1 ? "s" : ""} ouvré${n > 1 ? "s" : ""} pour les ${cibles.length} produits de la famille.`);
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
