// Configurateur de gravure (brief §5) : gabarits des pièces, mise en page du texte et dessin SVG.
// Fonctions pures, utilisées au build (premier rendu, sans JavaScript) et dans le navigateur (aperçu en direct).
// Les polices sont dans polices.ts.
//
// Le SVG produit sert d'aperçu aujourd'hui ; il est pensé pour devenir la maquette envoyée au client
// puis la base du fichier laser : viewBox en millimètres et calques séparés
//   - « rendu »   : matière, veinage, ombre, anneau, support (aperçu seulement, à retirer pour le laser)
//   - « contour » : découpe de la pièce
//   - « zone »    : zone gravable (invisible dans l'aperçu)
//   - « photo »   : photo du client à graver, quand la pièce en accepte une
//   - « texte »   : texte gravé, un <text> par ligne, police et corps en millimètres
//   - « motif »   : motif choisi par le client (pièces en bois collées ou dessin gravé)
//
// Les dimensions réelles et les zones gravables ne sont pas encore connues : les proportions ci-dessous
// sont indicatives, comme les limites de caractères et de lignes, à confirmer par l'atelier (questionnaire).
// Les teintes de bois sont relevées sur les photos des pièces (img/).
import { POLICES, pileCss, trouverPolice, type Police } from "./polices";

export { POLICES, type Police };

export const policeDe = (id: string | undefined) => trouverPolice(id ?? "") ?? POLICES[0];

export interface Zone { x: number; y: number; l: number; h: number }

/** Valeurs acceptées pour `produit.gabarit` (proposées par l'éditeur de produit de l'admin). */
export const FORMES_GABARIT = ["planche", "tranche", "ronde", "porte-cles", "ardoise", "rectangle", "coeur", "bande"] as const;
export type Forme = (typeof FORMES_GABARIT)[number];

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
  fond?: string; // photo de la pièce vierge (produit.apercuPhoto) : le texte est gravé dessus, sans dessin
}

// --- Motifs ---------------------------------------------------------------

export const MOTIFS = [
  { id: "coeurs", nom: "Cœurs", colle: true },
  { id: "etoiles", nom: "Étoiles", colle: true },
  { id: "alliances", nom: "Alliances", colle: false },
  { id: "feuillage", nom: "Feuillage", colle: false },
  { id: "pattes", nom: "Pattes", colle: false },
] as const;
export type Motif = (typeof MOTIFS)[number];
export const motifDe = (id: string | undefined) => MOTIFS.find((m) => m.id === id);

// --- Outils de tracé ------------------------------------------------------

const f = (n: number) => Math.round(n * 100) / 100;
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Tirage pseudo-aléatoire à graine fixe : les contours irréguliers sont toujours les mêmes. */
function hasard(graine: number) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Courbe fermée lissée passant par les points (Catmull-Rom convertie en Bézier). */
function courbeFermee(pts: [number, number][]) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/** Points ramenés dans le rectangle [m, l - m] × [m, h - m]. */
function cadrer(pts: [number, number][], l: number, h: number, m: number): [number, number][] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return pts.map(([x, y]) => [m + ((x - x0) / (x1 - x0)) * (l - 2 * m), m + ((y - y0) / (y1 - y0)) * (h - 2 * m)]);
}

const rectArrondi = (x: number, y: number, l: number, h: number, r: number) =>
  `M${f(x + r)} ${f(y)}H${f(x + l - r)}A${r} ${r} 0 0 1 ${f(x + l)} ${f(y + r)}V${f(y + h - r)}A${r} ${r} 0 0 1 ${f(x + l - r)} ${f(y + h)}` +
  `H${f(x + r)}A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}Z`;

const cercle = (cx: number, cy: number, r: number) => `M${f(cx + r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0Z`;

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

/**
 * Tranche de bois aux bords irréguliers et arrondis (plaque à message) : superellipse
 * déformée par des bosses relevées une fois pour toutes, sans écorce.
 */
function tranche(): Gabarit {
  const l = 250, h = 236;
  const bosses = [1, 0.975, 0.935, 0.962, 1.018, 0.972, 0.905, 0.948, 1, 1.012, 0.962, 0.922, 0.972, 1.03, 0.99, 0.94, 0.962, 1.006];
  const n = bosses.length;
  const pts = bosses.map((b, i): [number, number] => {
    const a = (i / n) * 2 * Math.PI + 0.12;
    const c = Math.cos(a), s = Math.sin(a);
    const r = Math.pow(Math.pow(Math.abs(c), 2.4) + Math.pow(Math.abs(s), 2.4), -1 / 2.4);
    return [c * r * b, s * r * b];
  });
  return {
    forme: "tranche", matiere: "bois", libelle: "tranche de bois",
    largeur: l, hauteur: h, contour: courbeFermee(cadrer(pts, l, h, 5)),
    zone: { x: 46, y: 40, l: 158, h: 156 },
    maxCaracteres: 100, maxLignes: 5,
  };
}

/** Tranche de bois ronde avec une fine écorce (le tracé est celui de l'écorce). */
function ronde(): Gabarit {
  const c = 120, r = 116, alea = hasard(7), n = 22;
  const pts = Array.from({ length: n }, (_, i): [number, number] => {
    const a = (i / n) * 2 * Math.PI, rr = r * (1 - alea() * 0.022);
    return [c + Math.cos(a) * rr, c + Math.sin(a) * rr];
  });
  return {
    forme: "ronde", matiere: "bois", libelle: "tranche de bois ronde",
    largeur: 240, hauteur: 240, contour: courbeFermee(pts),
    zone: { x: 50, y: 62, l: 140, h: 116 },
    maxCaracteres: 80, maxLignes: 4,
  };
}

/** Porte-clés rectangulaire, percé en haut ; l'anneau est dessiné dans le rendu. */
function porteCles(): Gabarit {
  const x = 5, y = 16, l = 40, h = 62, cx = 25, cy = 22.5, t = 2.3;
  return {
    forme: "porte-cles", matiere: "bois", libelle: "porte-clés",
    largeur: 50, hauteur: 82,
    contour: rectArrondi(x, y, l, h, 2.5) + cercle(cx, cy, t),
    zone: { x: 9, y: 29, l: 32, h: 44 },
    maxCaracteres: 30, maxLignes: 3,
  };
}

/** Plaque rectangulaire générique, aux dimensions du format choisi quand elles sont connues. */
function rectangle(l = 300, h = 200): Gabarit {
  const m = 4, marge = Math.min(l, h) * 0.1;
  return {
    forme: "rectangle", matiere: "bois", libelle: "plaque rectangulaire",
    largeur: l + 2 * m, hauteur: h + 2 * m,
    contour: rectArrondi(m, m, l, h, 3),
    zone: { x: m + marge, y: m + marge, l: l - 2 * marge, h: h - 2 * marge },
    maxCaracteres: 100, maxLignes: 4,
  };
}

/** Ardoise naturelle aux bords éclatés, posée sur son support (comme sur la photo de la pièce). */
function ardoise(): Gabarit {
  const l = 300, h = 200, m = 4, alea = hasard(23), pas = 7;
  const pts: string[] = [];
  const bord = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / pas);
    for (let i = 0; i < n; i++) {
      const t = i / n, creux = alea() < 0.3 ? alea() * 2.6 : alea() * 0.8;
      pts.push(`${f(x0 + (x1 - x0) * t + nx * creux)} ${f(y0 + (y1 - y0) * t + ny * creux)}`);
    }
  };
  bord(m, m, m + l, m, 0, 1);
  bord(m + l, m, m + l, m + h, -1, 0);
  bord(m + l, m + h, m, m + h, 0, -1);
  bord(m, m + h, m, m, 1, 0);
  return {
    forme: "ardoise", matiere: "ardoise", libelle: "plaque d'ardoise",
    largeur: l + 2 * m, hauteur: h + 2 * m + 12,
    contour: `M${pts.join("L")}Z`,
    zone: { x: m + 30, y: m + 24, l: l - 60, h: h - 48 },
    maxCaracteres: 160, maxLignes: 6,
  };
}

/** Cœur découpé au laser. */
function coeur(): Gabarit {
  return {
    forme: "coeur", matiere: "bois", libelle: "cœur en bois",
    largeur: 220, hauteur: 200,
    contour: "M110 50C104 28 86 10 60 10C29 10 6 34 6 66C6 116 58 150 110 194C162 150 214 116 214 66C214 34 191 10 160 10C134 10 116 28 110 50Z",
    zone: { x: 36, y: 46, l: 148, h: 96 },
    maxCaracteres: 60, maxLignes: 4,
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

/** Photo de la pièce vierge : le texte est gravé dans la zone donnée en pourcentages de la photo. */
function surPhoto(g: Gabarit, a: ApercuPhoto): Gabarit {
  const l = 300, h = f(300 / (a.ratio || 1)), z = a.zone;
  return {
    ...g, largeur: l, hauteur: h, contour: `M0 0H${l}V${h}H0Z`, fond: a.image,
    zone: { x: f((z.x / 100) * l), y: f((z.y / 100) * h), l: f((z.l / 100) * l), h: f((z.h / 100) * h) },
  };
}

// Pièce → forme quand le produit n'a pas de champ « gabarit » (choisi dans l'éditeur de produit de l'admin).
const FORMES: Record<string, Forme> = {
  "planche-aperitif": "planche",
  "plaque-message": "tranche",
  "porte-cles-grave": "porte-cles",
  "ardoise-gravee": "ardoise",
  "cadre-mariage": "rectangle",
  "coeur-anniversaire-mariage": "coeur",
};
// Pièces gravées sur une autre matière que le bois ou l'ardoise : photo et texte en dessous.
const SANS_GABARIT = new Set(["verres-graves"]);

/** Photo de la pièce vierge, déjà résolue au build (adresse optimisée et proportions). */
export interface ApercuPhoto { image: string; zone: Zone; ratio?: number }

export interface PieceConfigurable {
  id: string;
  categorie: string;
  variantes?: { nom: string; choix: { nom: string; prix: number }[] } | null;
  gabarit?: string;
  apercuPhoto?: ApercuPhoto | null;
}

/** « 30 × 40 cm » → [400, 300] en mm (plus grand côté en largeur : orientation à confirmer). */
function formatEnMm(nom: string | undefined): [number, number] | undefined {
  const m = nom?.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)/i);
  if (!m) return undefined;
  const k = m[3].toLowerCase() === "cm" ? 10 : 1;
  const a = parseFloat(m[1].replace(",", ".")) * k, b = parseFloat(m[2].replace(",", ".")) * k;
  return [Math.max(a, b), Math.min(a, b)];
}

/** Forme d'une pièce : son champ « gabarit », sinon la table ci-dessus. */
export function formeDe(p: PieceConfigurable): Forme {
  if ((FORMES_GABARIT as readonly string[]).includes(p.gabarit ?? "")) return p.gabarit as Forme;
  return FORMES[p.id] ?? (p.categorie === "gravure" && !SANS_GABARIT.has(p.id) ? "rectangle" : "bande");
}

/** Gabarit d'une pièce pour la variante choisie. */
export function gabaritDe(p: PieceConfigurable, varianteIndex: number | null = null): Gabarit {
  const choix = p.variantes?.choix ?? [];
  const nomVariante = varianteIndex === null ? choix[0]?.nom : choix[varianteIndex]?.nom;
  const forme = formeDe(p);
  let g: Gabarit;
  if (forme === "planche") {
    // Tailles relatives d'une variante « Taille » : la plus petite à 85 %, la plus grande à 100 %.
    const n = choix.length, i = varianteIndex ?? 0;
    g = planche(/taille/i.test(p.variantes?.nom ?? "") && n > 1 ? 0.85 + (0.15 * i) / (n - 1) : 1);
  } else if (forme === "rectangle") {
    const mm = formatEnMm(nomVariante);
    g = mm ? rectangle(mm[0], mm[1]) : rectangle();
  } else {
    g = { tranche, ronde, "porte-cles": porteCles, ardoise, coeur, bande }[forme]();
  }
  return p.apercuPhoto?.image ? surPhoto(g, p.apercuPhoto) : g;
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

/** Texte montré, marqué « exemple », tant que le client n'a rien écrit : un prénom et une date, comme sur les pièces. */
export const EXEMPLE = "Marie & Paul\n14.06.2026";

/** Échantillon des polices : la première ligne du visiteur si elle est courte, sinon son premier mot ; « Marie » à défaut. */
export function echantillonDe(texte: string) {
  const ligne = texte.split("\n")[0].trim();
  return (ligne.length <= 10 ? ligne : ligne.split(/\s+/)[0].slice(0, 12)) || "Marie";
}

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
  motif?: string; // id parmi MOTIFS
  prefixe: string; // préfixe des id internes (plusieurs aperçus sur une page)
  titre: string; // description accessible
  leger?: boolean; // filtres allégés (petit aperçu du téléphone)
}

export const estExemple = (texte: string, police: Police, photo?: string) => lignesDe(texte, police).length === 0 && !photo;

interface Placement { cx: number; cy: number; taille: number; angle: number }

/** Place qu'occupe le motif : pièces collées en marge du texte, dessin gravé au-dessus. */
function placerMotif(m: Motif, z: Zone): { zone: Zone; places: Placement[] } {
  if (m.colle) {
    const s = Math.min(z.l, z.h) * 0.26;
    return {
      zone: { x: z.x + s * 0.45, y: z.y, l: z.l - s * 0.9, h: z.h },
      places: [
        { cx: z.x + z.l - s * 0.05, cy: z.y + s * 0.15, taille: s * 0.8, angle: 14 },
        { cx: z.x + s * 0.05, cy: z.y + z.h * 0.6, taille: s, angle: -12 },
      ],
    };
  }
  const bh = z.h * 0.3, ecart = z.h * 0.05;
  return {
    zone: { x: z.x, y: z.y + bh + ecart, l: z.l, h: z.h - bh - ecart },
    places: [{ cx: z.x + z.l / 2, cy: z.y + bh / 2, taille: Math.min(bh * (RATIOS[m.id] ?? 1), z.l * 0.8), angle: 0 }],
  };
}

function miseEnPage(d: Dessin) {
  const { gabarit: g, police, mesure = mesureEstimee, photo } = d;
  const saisies = lignesDe(d.texte, police);
  const exemple = saisies.length === 0 && !photo;
  const lignes = exemple ? lignesDe(limiterTexte(EXEMPLE, g), police) : saisies;

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
  const motif = motifDe(d.motif);
  let places: Placement[] = [];
  if (motif) ({ zone: zoneTexte, places } = placerMotif(motif, zoneTexte));
  return { lignes, exemple, zonePhoto, motif, places, ...disposer(lignes, zoneTexte, police, mesure) };
}

// Matières : teintes relevées sur les photos des pièces. `encre` : gravure brun presque noir ; `roussi` : halo brûlé.
interface Essence { fond: string; clair: string; fonce: string; encre: string; roussi: string; bord: string }
const ESSENCES: Record<string, Essence> = {
  tranche: { fond: "#c38f5c", clair: "#ddb487", fonce: "#7e4f2b", encre: "#22110a", roussi: "#5b2f13", bord: "#7a4c28" },
  bambou: { fond: "#d7ae74", clair: "#e8c792", fonce: "#a2733f", encre: "#26140b", roussi: "#62351a", bord: "#9a6d3c" },
  ronde: { fond: "#dfbf8e", clair: "#ecd3a8", fonce: "#a87947", encre: "#24120a", roussi: "#5e3215", bord: "#4a3223" },
  hetre: { fond: "#dcb17b", clair: "#e9c895", fonce: "#b0804b", encre: "#2c160b", roussi: "#6a3a19", bord: "#6e4526" },
  peuplier: { fond: "#e3c99f", clair: "#f0dcba", fonce: "#bf9b6b", encre: "#2a160b", roussi: "#6a3a19", bord: "#8a6038" },
  coeur: { fond: "#e8d3ad", clair: "#f3e4c7", fonce: "#c3a274", encre: "#2b170c", roussi: "#6b3c1a", bord: "#6d4424" },
};
const ESSENCE_DE: Partial<Record<Forme, keyof typeof ESSENCES>> = {
  planche: "bambou", tranche: "tranche", ronde: "ronde", "porte-cles": "hetre", rectangle: "peuplier", coeur: "coeur",
};

/**
 * Filtre de veinage : bruit étiré dans le sens du fil (fx petit = veines longues), dont la table
 * ne garde que certaines valeurs (bandes de teinte ou lignes du fil, comme les courbes de niveau du bois).
 */
const filtreVeines = (id: string, fx: number, fy: number, octaves: number, graine: number, table: string) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="${octaves}" seed="${graine}" result="b"/>` +
  `<feColorMatrix in="b" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0"/>` +
  `<feComponentTransfer result="m"><feFuncA type="table" tableValues="${table}"/></feComponentTransfer>` +
  `<feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;

const flou = (id: string, ecart: number, marge = 10) =>
  `<filter id="${id}" x="-${marge}%" y="-${marge}%" width="${100 + 2 * marge}%" height="${100 + 2 * marge}%"><feGaussianBlur stdDeviation="${f(ecart)}"/></filter>`;

/** Couche de veinage : un rectangle de couleur, filtré, découpé par la pièce. */
const couche = (p: string, g: Gabarit, filtre: string, couleur: string, opacite: number) =>
  `<rect width="${g.largeur}" height="${g.hauteur}" fill="${couleur}" opacity="${opacite}" filter="url(#${p}-${filtre})" clip-path="url(#${p}-forme)"/>`;

/** Matière, ombre et accessoires de la pièce (calque « rendu »), et teintes de la gravure. */
function matiere(g: Gabarit, p: string, leger: boolean) {
  const oct = (n: number) => Math.max(1, leger ? n - 1 : n);
  const t = Math.max(g.largeur, g.hauteur);
  const defs: string[] = [`<clipPath id="${p}-forme"><path d="${g.contour}" clip-rule="evenodd"/></clipPath>`];
  const rendu = (corps: string) => `<defs>${defs.join("")}</defs>${corps}`;
  const piece = (fond: string) => `<path d="${g.contour}" fill="${fond}" fill-rule="evenodd"/>`;
  // Ombre douce de la pièce posée, un peu décalée vers le bas.
  const ombre = () => {
    defs.push(flou(`${p}-ombre`, t * 0.014, 15));
    return `<path d="${g.contour}" fill="#1e130b" fill-opacity=".34" fill-rule="evenodd" transform="translate(${f(t * 0.004)} ${f(t * 0.016)})" filter="url(#${p}-ombre)"/>`;
  };
  // Bord intérieur assombri : l'épaisseur de la pièce, arrondie au ponçage ou brûlée par la découpe.
  const bordInterieur = (couleur: string, largeur: number, opacite: number) => {
    defs.push(flou(`${p}-flou-bord`, largeur * 0.35));
    return `<path d="${g.contour}" fill="none" stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="${f(largeur)}" clip-path="url(#${p}-forme)" filter="url(#${p}-flou-bord)"/>`;
  };

  if (g.fond) {
    return {
      corps: `<image href="${xml(g.fond)}" width="${g.largeur}" height="${g.hauteur}" preserveAspectRatio="xMidYMid slice"/>`,
      bord: "none", epaisseur: 0, roussi: "#5b2f13",
    };
  }
  if (g.forme === "bande") return { corps: `<path d="${g.contour}" fill="#fbf7f0"/>`, bord: "#231a14", epaisseur: 0.6, roussi: "" };
  if (g.forme === "ardoise") {
    // Ardoise : face claire imprimée, bords sombres éclatés, deux pieds de support devant (photo de la pièce).
    const face = rectArrondi(10, 10, g.largeur - 20, g.hauteur - 32, 1.5);
    const pied = (x: number) =>
      `<path d="M${x} ${g.hauteur - 26}h28l2 26h-32z" fill="#151617"/><path d="M${x + 2} ${g.hauteur - 24}h24" stroke="#3a3d40" stroke-width=".8"/>`;
    defs.push(filtreVeines(`${p}-feuillets`, 0.012, 0.22, oct(3), 5, "0 0 .2 .7 .1 0 .5 .2 0"), flou(`${p}-flou-face`, 1.2));
    return {
      corps: rendu(
        ombre() + piece("#2b2f31") + couche(p, g, "feuillets", "#5d6367", 0.55) +
        `<path d="${face}" fill="#000" fill-opacity=".35" filter="url(#${p}-flou-face)" transform="translate(0 .8)"/>` +
        `<path d="${face}" fill="#f5f3ee"/>` + pied(58) + pied(g.largeur - 88),
      ),
      bord: "#1d2022", epaisseur: 0.6, roussi: "",
    };
  }

  const e = ESSENCES[ESSENCE_DE[g.forme] ?? "peuplier"];
  let corps = ombre() + piece(e.fond);
  if (g.forme === "tranche") {
    // Acacia : larges bandes claires et foncées, fil serré, un nœud discret, bord poncé arrondi.
    defs.push(
      filtreVeines(`${p}-bandes`, 0.003, 0.024, oct(2), 11, "0 0 .05 .1 .45 .15 .6 .3 .05 .55 .2 0 0"),
      filtreVeines(`${p}-clair`, 0.005, 0.045, oct(2), 4, "0 0 0 .6 .1 0 .5 .8 .2 0 0"),
      filtreVeines(`${p}-fil`, 0.004, 0.13, oct(2), 8, "0 .6 0 0 .5 0 0 .7 0 0 .4 0 .6 0 0 .5 0"),
      flou(`${p}-noeud`, 0.9, 40),
    );
    corps +=
      couche(p, g, "clair", e.clair, 0.85) +
      couche(p, g, "bandes", e.fonce, 0.6) +
      couche(p, g, "fil", e.fonce, 0.32) +
      `<g clip-path="url(#${p}-forme)" fill="none" stroke="${e.fonce}"><ellipse cx="196" cy="186" rx="3.6" ry="1.8" fill="${e.fonce}" fill-opacity=".7" stroke="none" filter="url(#${p}-noeud)"/>` +
      `<ellipse cx="196" cy="186" rx="7" ry="3.2" stroke-opacity=".3" stroke-width=".7"/><ellipse cx="196.5" cy="186" rx="11" ry="4.8" stroke-opacity=".18" stroke-width=".6"/></g>` +
      bordInterieur(e.fonce, 8, 0.4);
  } else if (g.forme === "planche") {
    // Bambou : lamelles dans la longueur, fibres fines, nœuds.
    const alea = hasard(31), lamelle = 13 * (g.hauteur / 158);
    let lamelles = "", noeuds = "";
    for (let y = 0, i = 0; y < g.hauteur; y += lamelle, i++) {
      const teinte = [e.clair, e.fond, e.fonce, e.clair, e.fonce][i % 5];
      lamelles += `<rect y="${f(y)}" width="${g.largeur}" height="${f(lamelle)}" fill="${teinte}" opacity="${f(0.08 + alea() * 0.14)}"/>` +
        `<rect y="${f(y)}" width="${g.largeur}" height=".35" fill="${e.fonce}" opacity=".35"/>`;
      noeuds += `<ellipse cx="${f(20 + alea() * (g.largeur - 60))}" cy="${f(y + lamelle / 2)}" rx="1.3" ry="${f(lamelle * 0.42)}" fill="${e.fonce}" opacity=".45"/>`;
    }
    defs.push(filtreVeines(`${p}-fibres`, 0.012, 0.7, oct(2), 3, "0 .5 0 0 .6 0 0 .5 0"), flou(`${p}-noeud`, 0.8, 40));
    corps +=
      `<g clip-path="url(#${p}-forme)">${lamelles}<g filter="url(#${p}-noeud)">${noeuds}</g></g>` +
      couche(p, g, "fibres", e.fonce, 0.3) +
      bordInterieur(e.fonce, 6, 0.5);
  } else if (g.forme === "ronde") {
    // Bois de bout : cernes concentriques autour d'un cœur décentré, petite fente au bord, fine écorce.
    const alea = hasard(17), cx = 116, cy = 124;
    let cernes = "";
    for (let k = 1; k <= 13; k++) {
      const r = k * 7.6 + alea() * 2, n = 16;
      const pts = Array.from({ length: n }, (_, i): [number, number] => {
        const a = (i / n) * 2 * Math.PI, rr = r * (1 + Math.sin(a * 3 + k) * 0.025 + (alea() - 0.5) * 0.03);
        return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
      });
      cernes += `<path d="${courbeFermee(pts)}" stroke-width="${f(0.5 + alea() * 0.9)}" stroke-opacity="${f(0.25 + alea() * 0.3)}"/>`;
    }
    const aubier = "translate(120 120) scale(.955) translate(-120 -120)";
    defs.push(filtreVeines(`${p}-ecorce`, 0.09, 0.3, oct(2), 9, "0 .7 0 .5 0 .8 0"), filtreVeines(`${p}-grain`, 0.05, 0.05, oct(2), 2, "0 0 .4 0 0 .3 0 0"));
    corps =
      ombre() + piece(e.bord) + couche(p, g, "ecorce", "#2a1b12", 0.6) +
      `<path d="${g.contour}" fill="${e.fond}" transform="${aubier}"/>` +
      `<g clip-path="url(#${p}-forme)" transform="${aubier}">` +
      `<rect width="240" height="240" fill="${e.fonce}" opacity=".25" filter="url(#${p}-grain)"/>` +
      `<g fill="none" stroke="${e.fonce}">${cernes}</g>` +
      `<path d="M${cx - 58} ${cy + 50}L${cx - 70} ${cy + 63}L${cx - 79} ${cy + 75}" fill="none" stroke="#5b3a20" stroke-width=".9" stroke-linecap="round" opacity=".7"/></g>`;
  } else {
    // Hêtre (porte-clés), contreplaqué clair (plaque), cœur pâle : fil fin, bord brûlé par la découpe laser.
    const vertical = g.hauteur > g.largeur;
    defs.push(
      filtreVeines(`${p}-bandes`, vertical ? 0.03 : 0.004, vertical ? 0.004 : 0.03, oct(2), 6, "0 0 .4 0 .2 .5 0 0"),
      filtreVeines(`${p}-fil`, vertical ? 0.12 : 0.006, vertical ? 0.006 : 0.12, oct(2), 12, "0 .5 0 0 .45 0 0 .5 0 .4 0"),
      filtreVeines(`${p}-pores`, vertical ? 0.9 : 0.25, vertical ? 0.25 : 0.9, 1, 21, "0 0 0 0 0 0 0 .7"),
    );
    corps +=
      couche(p, g, "bandes", e.clair, 0.6) +
      couche(p, g, "fil", e.fonce, 0.3) +
      couche(p, g, "pores", e.fonce, 0.45) +
      bordInterieur(e.roussi, g.forme === "coeur" ? 7 : Math.max(2.5, t * 0.02), g.forme === "coeur" ? 0.3 : 0.3);
    if (g.forme === "porte-cles") {
      // Anneau brisé en acier et sa perle, au-dessus du trou.
      corps +=
        `<circle cx="25" cy="9.2" r="7.6" fill="none" stroke="#7d7d79" stroke-width="1.7"/>` +
        `<circle cx="25" cy="9.2" r="7.6" fill="none" stroke="#e2e2de" stroke-width=".5" stroke-dasharray="9 5 14 20" stroke-dashoffset="3"/>` +
        `<rect x="22.4" y="15.4" width="5.2" height="6.4" rx="2.4" fill="#8c8c88"/><rect x="23.3" y="16" width="1.2" height="5" rx=".6" fill="#e6e6e2" opacity=".8"/>`;
    }
  }
  return { corps: rendu(corps), bord: e.bord, epaisseur: f(Math.min(g.forme === "tranche" ? 0.5 : 0.7, Math.max(0.25, t * 0.0035))), roussi: e.roussi };
}

/**
 * Gravure laser : trait brun presque noir, léger halo roussi autour (0,2 à 0,5 mm, comme le bois brûlé
 * en bord de trait), surface un peu irrégulière. Valeurs en mm, indépendantes du corps du texte.
 */
function filtreGravure(p: string, roussi: string, leger: boolean, taille: number) {
  // Sur une petite pièce montrée en grand, le halo reste fin à l’écran.
  const k = Math.min(1.2, Math.max(0.3, taille / 300));
  const halo = `<feMorphology in="SourceAlpha" operator="dilate" radius="${f(0.16 * k)}" result="epais"/><feGaussianBlur in="epais" stdDeviation="${f(0.42 * k)}" result="halo"/>` +
    `<feFlood flood-color="${roussi}" flood-opacity=".6"/><feComposite in2="halo" operator="in" result="roussi"/>`;
  const texture = leger
    ? `<feMerge><feMergeNode in="roussi"/><feMergeNode in="SourceGraphic"/></feMerge>`
    : `<feTurbulence type="fractalNoise" baseFrequency="${f(1.4 / k)}" numOctaves="1" seed="4" result="grain"/>` +
      `<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.3 0 0 0 1.62" result="usure"/>` +
      `<feComposite in="SourceGraphic" in2="usure" operator="in" result="trace"/>` +
      `<feMerge><feMergeNode in="roussi"/><feMergeNode in="trace"/></feMerge>`;
  return `<filter id="${p}-gravure" x="-4%" y="-8%" width="108%" height="116%" color-interpolation-filters="sRGB">${halo}${texture}</filter>`;
}

// Motifs dessinés dans une boîte de 100 × 100.
const COEUR = "M50 90C22 70 4 54 4 32C4 17 15 7 29 7C38 7 46 12 50 21C54 12 62 7 71 7C85 7 96 17 96 32C96 54 78 70 50 90Z";
const ETOILE = "M" + Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 20 : 47;
  return `${f(50 + Math.cos(a) * r)} ${f(52 + Math.sin(a) * r)}`;
}).join("L") + "Z";
const FEUILLE = "M0 0C4 -3 11 -3.6 16 0C11 3.6 4 3 0 0Z";
/** Deux rameaux qui partent du centre, feuilles par paires tournées vers les bouts. */
const FEUILLAGE = (() => {
  const y = (x: number) => 47 + ((x - 50) / 44) ** 2 * 13;
  const feuille = (x: number, yy: number, a: number) => `<path d="${FEUILLE}" transform="translate(${f(x)} ${f(yy)}) rotate(${f(a)})" stroke="none"/>`;
  let d = `<path d="M6 ${f(y(6))}Q28 ${f(y(28) - 5)} 50 47Q72 ${f(y(72) - 5)} 94 ${f(y(94))}" fill="none" stroke-width="1.8" stroke-linecap="round"/>`;
  for (const cote of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = 50 + cote * (9 + i * 10.5), pente = ((2 * (x - 50)) / 44 ** 2) * 13;
      const a = (Math.atan2(pente * cote, cote) * 180) / Math.PI;
      for (const e of [-40, 40]) d += feuille(x, y(x), a + e);
    }
    const xb = 50 + cote * 46;
    d += feuille(xb - cote * 2, y(xb) - 1, cote > 0 ? 20 : 160);
  }
  return d;
})();
// Largeur sur hauteur de chaque dessin, pour qu’il occupe la bande au-dessus du texte.
const RATIOS: Record<string, number> = { alliances: 1.3, feuillage: 3, pattes: 1 };
const DESSINS: Record<string, string> = {
  alliances:
    `<g fill="none" stroke-width="4.2"><circle cx="37" cy="58" r="23"/><circle cx="63" cy="58" r="23"/></g>` +
    `<path d="M63 23l6 6-6 8-6-8z" stroke="none"/>`,
  feuillage: FEUILLAGE,
  pattes:
    `<path d="M50 54C62 54 74 66 74 77C74 86 66 89 58 87C54 86 46 86 42 87C34 89 26 86 26 77C26 66 38 54 50 54Z" stroke="none"/>` +
    `<ellipse cx="22" cy="42" rx="8" ry="10.5" transform="rotate(-24 22 42)" stroke="none"/><ellipse cx="39" cy="26" rx="8.5" ry="11.5" transform="rotate(-8 39 26)" stroke="none"/>` +
    `<ellipse cx="61" cy="26" rx="8.5" ry="11.5" transform="rotate(8 61 26)" stroke="none"/><ellipse cx="78" cy="42" rx="8" ry="10.5" transform="rotate(24 78 42)" stroke="none"/>`,
};

function calqueMotif(p: string, m: Motif, places: Placement[], { encre, gravee }: { encre: string; gravee: boolean }) {
  const pose = (pl: Placement) => `translate(${f(pl.cx)} ${f(pl.cy)}) rotate(${pl.angle}) scale(${f(pl.taille / 100)}) translate(-50 -50)`;
  if (m.colle) {
    // Petites pièces en bois clair collées sur la gravure, avec leur ombre portée (comme sur la plaque à message).
    const forme = m.id === "coeurs" ? COEUR : ETOILE;
    return (
      `<defs><filter id="${p}-colle" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="1.5" dy="3.5" stdDeviation="2.6" flood-color="#2a180c" flood-opacity=".45"/></filter></defs>` +
      places.map((pl) => `<path d="${forme}" transform="${pose(pl)}" fill="#efdfc3" stroke="#c9a77a" stroke-width="1.6" stroke-linejoin="round" filter="url(#${p}-colle)"/>`).join("")
    );
  }
  return `<g${gravee ? ` filter="url(#${p}-gravure)"` : ""} fill="${encre}" stroke="${encre}">${places.map((pl) => `<g transform="${pose(pl)}">${DESSINS[m.id]}</g>`).join("")}</g>`;
}

/** Le calque du texte seul : le navigateur ne remplace que lui à chaque frappe. */
export function calqueTexte(d: Dessin) {
  const { police, gabarit: g } = d;
  const { lignes, corps, x, ys } = miseEnPage(d);
  const mat = encreDe(g);
  const textes = lignes.map((l, i) => `<text x="${f(x)}" y="${f(ys[i])}">${xml(l)}</text>`).join("");
  return (
    `<g data-calque="texte" font-family="${xml(pileCss(police))}" font-weight="${police.graisse}" font-size="${f(corps)}" text-anchor="middle" dominant-baseline="central" fill="${mat.encre}"` +
    `${mat.gravee ? ` filter="url(#${d.prefixe}-gravure)"` : ""}${mat.multiplier ? ` style="mix-blend-mode:multiply"` : ""}>${textes}</g>`
  );
}

/** Teintes de gravure d'un gabarit, sans recalculer la matière. */
function encreDe(g: Gabarit) {
  if (g.fond) return { encre: "#22110a", gravee: true, multiplier: true };
  if (g.forme === "bande") return { encre: "#231a14", gravee: false, multiplier: false };
  if (g.forme === "ardoise") return { encre: "#1b1b1b", gravee: false, multiplier: false };
  return { encre: ESSENCES[ESSENCE_DE[g.forme] ?? "peuplier"].encre, gravee: true, multiplier: false };
}

/** Le SVG complet de la pièce, texte gravé compris. */
export function dessiner(d: Dessin) {
  const { gabarit: g, photo, prefixe: p, titre } = d;
  const leger = !!d.leger;
  const mp = miseEnPage(d);
  const mat = matiere(g, p, leger), encre = encreDe(g);

  const image = mp.zonePhoto
    ? `<image href="${xml(photo!)}" x="${f(mp.zonePhoto.x)}" y="${f(mp.zonePhoto.y)}" width="${f(mp.zonePhoto.l)}" height="${f(mp.zonePhoto.h)}" preserveAspectRatio="xMidYMid meet"${g.matiere === "papier" ? "" : ` filter="url(#${p}-brulure-photo)" style="mix-blend-mode:multiply"`}/>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.largeur} ${g.hauteur}" width="${g.largeur}mm" height="${g.hauteur}mm" overflow="visible" role="img" aria-labelledby="${p}-titre" data-forme="${g.fond ? "photo" : g.forme}">` +
    `<title id="${p}-titre">${xml(titre)}</title>` +
    `<defs>${encre.gravee ? filtreGravure(p, mat.roussi, leger, Math.max(g.largeur, g.hauteur)) : ""}` +
    `<filter id="${p}-brulure-photo"><feColorMatrix type="matrix" values=".25 .45 .1 0 0  .17 .32 .07 0 0  .1 .19 .04 0 0  0 0 0 1 0"/></filter>` +
    `</defs>` +
    `<g data-calque="rendu">${mat.corps}</g>` +
    `<g data-calque="contour"><path d="${g.contour}" fill="none" stroke="${mat.bord}" stroke-width="${f(mat.epaisseur)}" stroke-opacity="${g.fond ? 0 : 0.8}" fill-rule="evenodd"/></g>` +
    `<g data-calque="zone"><rect x="${f(g.zone.x)}" y="${f(g.zone.y)}" width="${f(g.zone.l)}" height="${f(g.zone.h)}" fill="none" stroke="none"/></g>` +
    (image ? `<g data-calque="photo">${image}</g>` : "") +
    calqueTexte(d) +
    (mp.motif ? `<g data-calque="motif">${calqueMotif(p, mp.motif, mp.places, encre)}</g>` : "") +
    `<line data-faisceau x1="${f(g.zone.x - 4)}" x2="${f(g.zone.x + g.zone.l + 4)}" y1="0" y2="0" stroke="#ffd9a8" stroke-width="${f(Math.max(0.4, g.hauteur / 220))}" opacity="0"/>` +
    `</svg>`
  );
}

/** Description lue par les lecteurs d'écran à la place du dessin. */
export function titreApercu(nomPiece: string, texte: string, police: Police, options: { autre?: boolean; motif?: string } = {}) {
  const t = texte.trim().replace(/\s*\n\s*/g, " / ");
  const motif = motifDe(options.motif);
  return (
    `Aperçu indicatif de la gravure sur ${nomPiece} : ${t ? `« ${t} »` : `texte d’exemple « ${EXEMPLE.replace("\n", " / ")} »`}, ` +
    `${options.autre ? "police à préciser" : `police ${police.nom}`}${motif ? `, motif ${motif.nom.toLowerCase()}` : ""}.`
  );
}
