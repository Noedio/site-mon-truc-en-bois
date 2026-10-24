// Configurateur de gravure (brief §5) : gabarits des pièces, polices, mise en page du texte et dessin SVG.
// Fonctions pures, utilisées au build (premier rendu, sans JavaScript) et dans le navigateur (aperçu en direct).
//
// Le SVG produit sert d'aperçu aujourd'hui ; il est pensé pour devenir la maquette envoyée au client
// puis la base du fichier laser : viewBox en millimètres et calques séparés
//   - « rendu »   : matière, veinage, anneau (aperçu seulement, à retirer pour le laser)
//   - « contour » : découpe de la pièce
//   - « zone »    : zone gravable (invisible dans l'aperçu)
//   - « photo »   : photo du client à graver, quand la pièce en accepte une
//   - « texte »   : texte gravé, un <text> par ligne, police et corps en millimètres
//
// Les dimensions réelles et les zones gravables ne sont pas encore connues : les proportions ci-dessous
// sont indicatives, comme les limites de caractères et de lignes, à confirmer par l'atelier (questionnaire).

export interface Police {
  id: string;
  nom: string; // nom affiché, enregistré tel quel dans la ligne du panier
  famille: string; // famille CSS, chargée par le socle (Sacramento : par le configurateur)
  graisse: number;
  capitales: boolean;
  chasse: number; // largeur moyenne d'un caractère, en corps : estimation avant le chargement des polices
  echelle: number; // corps relatif, pour qu'un même texte ait un poids visuel proche d'une police à l'autre
}

export const POLICES: Police[] = [
  { id: "atelier", nom: "Atelier", famille: "Big Shoulders", graisse: 800, capitales: true, chasse: 0.5, echelle: 1 },
  { id: "classique", nom: "Classique", famille: "Literata Variable", graisse: 600, capitales: false, chasse: 0.55, echelle: 0.85 },
  { id: "machine", nom: "Machine à écrire", famille: "Courier Prime", graisse: 700, capitales: false, chasse: 0.6, echelle: 0.8 },
  { id: "manuscrite", nom: "Manuscrite", famille: "Sacramento", graisse: 400, capitales: false, chasse: 0.36, echelle: 1.3 },
];

export const policeDe = (id: string | undefined) => POLICES.find((p) => p.id === id || p.nom === id) ?? POLICES[0];

export interface Zone { x: number; y: number; l: number; h: number }

export type Forme = "planche" | "ronde" | "porte-cles" | "rectangle" | "bande";

export interface Gabarit {
  forme: Forme;
  matiere: "bois" | "ardoise" | "papier";
  largeur: number; // viewBox, en mm
  hauteur: number;
  contour: string; // tracé de découpe
  zone: Zone;
  maxCaracteres: number;
  maxLignes: number;
  libelle: string; // pour la description accessible
}

// --- Gabarits -------------------------------------------------------------

/** Planche à poignée percée (maquette) : corps arrondi + poignée en demi-cercle. */
function planche(echelle = 1): Gabarit {
  const l = 320 * echelle, h = 150 * echelle, r = 20 * echelle, m = 4;
  const ph = 56 * echelle, pl = 52 * echelle, py = m + (h - ph) / 2, rp = ph / 2;
  const x2 = m + l;
  const trou = 7 * echelle, tx = x2 + pl + rp - 20 * echelle, ty = m + h / 2;
  const contour =
    `M${f(m + r)} ${m}H${f(x2 - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x2)} ${f(m + r)}V${f(py)}H${f(x2 + pl)}` +
    `A${f(rp)} ${f(rp)} 0 0 1 ${f(x2 + pl)} ${f(py + ph)}H${f(x2)}V${f(m + h - r)}` +
    `A${f(r)} ${f(r)} 0 0 1 ${f(x2 - r)} ${f(m + h)}H${f(m + r)}A${f(r)} ${f(r)} 0 0 1 ${m} ${f(m + h - r)}` +
    `V${f(m + r)}A${f(r)} ${f(r)} 0 0 1 ${f(m + r)} ${m}Z` +
    `M${f(tx + trou)} ${f(ty)}a${f(trou)} ${f(trou)} 0 1 0 ${f(-2 * trou)} 0a${f(trou)} ${f(trou)} 0 1 0 ${f(2 * trou)} 0Z`;
  const marge = 22 * echelle;
  return {
    forme: "planche", matiere: "bois", libelle: "planche à poignée",
    largeur: f(x2 + pl + rp + m), hauteur: f(h + 2 * m), contour,
    zone: { x: m + marge, y: m + marge * 0.8, l: l - 2 * marge, h: h - 1.6 * marge },
    maxCaracteres: 48, maxLignes: 3,
  };
}

/** Tranche de bois ronde avec son écorce. */
function ronde(): Gabarit {
  const c = 120, r = 116;
  return {
    forme: "ronde", matiere: "bois", libelle: "tranche de bois ronde",
    largeur: 240, hauteur: 240,
    contour: `M${c + r} ${c}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`,
    zone: { x: 52, y: 64, l: 136, h: 112 },
    maxCaracteres: 80, maxLignes: 4,
  };
}

/** Porte-clés rectangulaire arrondi, percé en haut, avec son anneau. */
function porteCles(): Gabarit {
  const x = 5, y = 16, l = 40, h = 62, r = 6, cx = 25, cy = 23.5, t = 2.5;
  return {
    forme: "porte-cles", matiere: "bois", libelle: "porte-clés",
    largeur: 50, hauteur: 82,
    contour:
      `M${x + r} ${y}H${x + l - r}A${r} ${r} 0 0 1 ${x + l} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + l - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z` +
      `M${cx + t} ${cy}a${t} ${t} 0 1 0 ${-2 * t} 0a${t} ${t} 0 1 0 ${2 * t} 0Z`,
    zone: { x: 9, y: 30, l: 32, h: 43 },
    maxCaracteres: 30, maxLignes: 3,
  };
}

/** Plaque rectangulaire générique, aux dimensions du format choisi quand elles sont connues. */
function rectangle(l = 300, h = 200, matiere: "bois" | "ardoise" = "bois"): Gabarit {
  const m = 4, r = matiere === "ardoise" ? 2 : 4, marge = Math.min(l, h) * 0.1;
  return {
    forme: "rectangle", matiere, libelle: matiere === "ardoise" ? "plaque d'ardoise" : "plaque rectangulaire",
    largeur: l + 2 * m, hauteur: h + 2 * m,
    contour:
      `M${m + r} ${m}H${m + l - r}A${r} ${r} 0 0 1 ${m + l} ${m + r}V${m + h - r}A${r} ${r} 0 0 1 ${m + l - r} ${m + h}` +
      `H${m + r}A${r} ${r} 0 0 1 ${m} ${m + h - r}V${m + r}A${r} ${r} 0 0 1 ${m + r} ${m}Z`,
    zone: { x: m + marge, y: m + marge, l: l - 2 * marge, h: h - 2 * marge },
    maxCaracteres: 100, maxLignes: 4,
  };
}

/** Sans gabarit (mug, textile, verre…) : une bande de texte sous la photo de la pièce. */
function bande(): Gabarit {
  return {
    forme: "bande", matiere: "papier", libelle: "texte",
    largeur: 300, hauteur: 90, contour: "M0 0H300V90H0Z",
    zone: { x: 16, y: 12, l: 268, h: 66 },
    maxCaracteres: 120, maxLignes: 3,
  };
}

// Pièce → forme. La correspondance reste ici tant que le catalogue n'a pas de champ « gabarit »
// (à ajouter par l'admin, chantier C6, avec les vraies dimensions).
const FORMES: Record<string, "planche" | "ronde" | "porte-cles" | "ardoise" | "rectangle"> = {
  "planche-aperitif": "planche",
  "plaque-message": "ronde",
  "porte-cles-grave": "porte-cles",
  "ardoise-gravee": "ardoise",
  "cadre-mariage": "rectangle",
  "coeur-anniversaire-mariage": "rectangle",
};
// Pièces gravées sur une autre matière que le bois ou l'ardoise : photo et texte en dessous.
const SANS_GABARIT = new Set(["verres-graves"]);

export interface PieceConfigurable {
  id: string;
  categorie: string;
  variantes?: { nom: string; choix: { nom: string; prix: number }[] } | null;
}

/** « 30 × 40 cm » → [400, 300] en mm (plus grand côté en largeur : orientation à confirmer). */
function formatEnMm(nom: string | undefined): [number, number] | undefined {
  const m = nom?.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)/i);
  if (!m) return undefined;
  const k = m[3].toLowerCase() === "cm" ? 10 : 1;
  const a = parseFloat(m[1].replace(",", ".")) * k, b = parseFloat(m[2].replace(",", ".")) * k;
  return [Math.max(a, b), Math.min(a, b)];
}

/** Gabarit d'une pièce pour la variante choisie. */
export function gabaritDe(p: PieceConfigurable, varianteIndex: number | null = null): Gabarit {
  const choix = p.variantes?.choix ?? [];
  const nomVariante = varianteIndex === null ? choix[0]?.nom : choix[varianteIndex]?.nom;
  const forme = FORMES[p.id] ?? (p.categorie === "gravure" && !SANS_GABARIT.has(p.id) ? "rectangle" : undefined);
  if (forme === "planche") {
    // Tailles relatives d'une variante « Taille » : la plus petite à 85 %, la plus grande à 100 %.
    const n = choix.length, i = varianteIndex ?? 0;
    const echelle = /taille/i.test(p.variantes?.nom ?? "") && n > 1 ? 0.85 + (0.15 * i) / (n - 1) : 1;
    return planche(echelle);
  }
  if (forme === "ronde") return ronde();
  if (forme === "porte-cles") return porteCles();
  if (forme === "ardoise") return rectangle(300, 200, "ardoise");
  if (forme === "rectangle") {
    const mm = formatEnMm(nomVariante);
    return mm ? rectangle(mm[0], mm[1]) : rectangle();
  }
  return bande();
}

// --- Texte ----------------------------------------------------------------

/** Largeur d'un texte pour un corps de 1 (mesurée par le navigateur, estimée au build). */
export type Mesure = (texte: string, police: Police) => number;

export const mesureEstimee: Mesure = (texte, police) => {
  let n = 0;
  for (const c of texte) n += c === " " ? 0.5 : /[il.,:;'!|1]/.test(c) ? 0.55 : /[mwMW@&]/.test(c) ? 1.45 : 1;
  return n * police.chasse;
};

/** Coupe le texte saisi selon les limites du gabarit : lignes, puis caractères. */
export function limiterTexte(texte: string, g: Pick<Gabarit, "maxCaracteres" | "maxLignes">) {
  return texte.replace(/\r/g, "").split("\n").slice(0, g.maxLignes).join("\n").slice(0, g.maxCaracteres);
}

export const lignesDe = (texte: string, police: Police) =>
  texte.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => (police.capitales ? l.toLocaleUpperCase("fr-FR") : l));

const INTERLIGNE = 1.15;

/** Corps (en mm) et position de chaque ligne pour que le bloc tienne dans la zone, centré. */
export function disposer(lignes: string[], zone: Zone, police: Police, mesure: Mesure) {
  const n = Math.max(lignes.length, 1);
  const plusLarge = Math.max(...lignes.map((l) => mesure(l, police)), 0.01);
  const corpsMax = zone.h * 0.42 * police.echelle;
  // 88 % de la largeur : un peu de bois reste visible autour du texte, comme sur les pièces gravées.
  const corps = Math.min((zone.l * 0.88) / plusLarge, zone.h / (n * INTERLIGNE), corpsMax);
  const cx = zone.x + zone.l / 2, cy = zone.y + zone.h / 2;
  return { corps, x: cx, ys: lignes.map((_, i) => cy + (i - (n - 1) / 2) * corps * INTERLIGNE) };
}

// --- Dessin ---------------------------------------------------------------

export interface Dessin {
  gabarit: Gabarit;
  texte: string;
  police: Police;
  mesure?: Mesure;
  photo?: string; // data URL réduite, pour les pièces avec photo
  prefixe: string; // préfixe des id internes (plusieurs aperçus sur une page)
  titre: string; // description accessible
}

const f = (n: number) => Math.round(n * 100) / 100;
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ENCRE = { bois: "#3a2010", ardoise: "#d9d3c7", papier: "#231a14" };

/** Le SVG complet de la pièce, texte gravé compris. */
export function dessiner({ gabarit: g, texte, police, mesure = mesureEstimee, photo, prefixe: p, titre }: Dessin) {
  const saisies = lignesDe(texte, police);
  const vide = saisies.length === 0 && !photo;
  const lignes = vide ? lignesDe("Votre texte", police) : saisies;

  // Avec une photo, la zone se partage : photo à gauche si la zone est large, en haut sinon.
  let zoneTexte = g.zone, zonePhoto: Zone | undefined;
  if (photo) {
    const z = g.zone, large = z.l / z.h > 1.6;
    const partTexte = lignes.length ? 0.38 : 0;
    if (large) {
      zonePhoto = { x: z.x, y: z.y, l: z.l * (1 - partTexte) - (partTexte ? 4 : 0), h: z.h };
      zoneTexte = { x: z.x + z.l * (1 - partTexte), y: z.y, l: z.l * partTexte, h: z.h };
    } else {
      zonePhoto = { x: z.x, y: z.y, l: z.l, h: z.h * (1 - partTexte) - (partTexte ? 3 : 0) };
      zoneTexte = { x: z.x, y: z.y + z.h * (1 - partTexte), l: z.l, h: z.h * partTexte };
    }
  }
  const { corps, x, ys } = disposer(lignes, zoneTexte, police, mesure);

  const veinage =
    g.matiere === "bois"
      ? `<pattern id="${p}-veinage" width="12" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(${g.forme === "porte-cles" ? 90 : 7})">` +
        `<rect width="1.1" height="40" fill="#3c200e" fill-opacity=".08"/><rect x="6" width=".5" height="40" fill="#3c200e" fill-opacity=".06"/></pattern>`
      : "";
  const fond = { bois: "#c8955e", ardoise: "#34383b", papier: "#fbf7f0" }[g.matiere];
  const bord = { bois: "#8a5a32", ardoise: "#1f2224", papier: "#231a14" }[g.matiere];
  const epaisseur = g.forme === "bande" ? 0.6 : Math.max(0.6, g.largeur / 250);

  let rendu = "";
  if (g.forme === "ronde") {
    // Écorce : anneau sombre autour du bois clair.
    rendu += `<path d="${g.contour}" fill="#6b4a2e"/><circle cx="120" cy="120" r="104" fill="${fond}"/><circle cx="120" cy="120" r="104" fill="url(#${p}-veinage)"/>`;
  } else {
    rendu += `<path d="${g.contour}" fill="${fond}" fill-rule="evenodd"/>`;
    if (veinage) rendu += `<path d="${g.contour}" fill="url(#${p}-veinage)" fill-rule="evenodd"/>`;
  }
  if (g.forme === "porte-cles") rendu += `<circle cx="25" cy="9" r="7.5" fill="none" stroke="#8b8b86" stroke-width="1.6"/>`;

  const image = zonePhoto
    ? `<image href="${xml(photo!)}" x="${f(zonePhoto.x)}" y="${f(zonePhoto.y)}" width="${f(zonePhoto.l)}" height="${f(zonePhoto.h)}" preserveAspectRatio="xMidYMid meet"${g.matiere === "papier" ? "" : ` filter="url(#${p}-brulure-photo)" style="mix-blend-mode:multiply"`}/>`
    : "";

  const encre = ENCRE[g.matiere];
  const textes = lignes
    .map((l, i) => `<text x="${f(x)}" y="${f(ys[i])}">${xml(l)}</text>`)
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.largeur} ${g.hauteur}" width="${g.largeur}mm" height="${g.hauteur}mm" role="img" aria-labelledby="${p}-titre" data-forme="${g.forme}">` +
    `<title id="${p}-titre">${xml(titre)}</title>` +
    `<defs>${veinage}` +
    `<filter id="${p}-brulure" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${f(Math.max(0.12, corps / 120))}" result="flou"/><feMerge><feMergeNode in="flou"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<filter id="${p}-brulure-photo"><feColorMatrix type="matrix" values=".25 .45 .1 0 0  .17 .32 .07 0 0  .1 .19 .04 0 0  0 0 0 1 0"/></filter>` +
    `</defs>` +
    `<g data-calque="rendu">${rendu}</g>` +
    `<g data-calque="contour"><path d="${g.contour}" fill="none" stroke="${bord}" stroke-width="${f(epaisseur)}" fill-rule="evenodd"/></g>` +
    `<g data-calque="zone"><rect x="${f(g.zone.x)}" y="${f(g.zone.y)}" width="${f(g.zone.l)}" height="${f(g.zone.h)}" fill="none" stroke="none"/></g>` +
    (image ? `<g data-calque="photo">${image}</g>` : "") +
    `<g data-calque="texte" font-family="${xml(police.famille)}" font-weight="${police.graisse}" font-size="${f(corps)}" text-anchor="middle" dominant-baseline="central" fill="${encre}"${vide ? ` fill-opacity=".45"` : ""}${g.matiere === "papier" ? "" : ` filter="url(#${p}-brulure)"`}>` +
    `${textes}</g>` +
    `<line data-faisceau x1="${f(g.zone.x - 4)}" x2="${f(g.zone.x + g.zone.l + 4)}" y1="0" y2="0" stroke="#ffd9a8" stroke-width="${f(Math.max(0.4, g.hauteur / 220))}" opacity="0"/>` +
    `</svg>`
  );
}

/** Description lue par les lecteurs d'écran à la place du dessin. */
export function titreApercu(nomPiece: string, texte: string, police: Police) {
  const t = texte.trim().replace(/\s*\n\s*/g, " / ");
  return `Aperçu indicatif de la gravure sur ${nomPiece} : ${t ? `« ${t} »` : "pas encore de texte"}, police ${police.nom}.`;
}
