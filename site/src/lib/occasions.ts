// Dates des occasions (chantier C2), calculées au build.
// Une date n'est calculée que si c'est un fait de calendrier (Noël, fête des mères, fête des pères).
// Délai : occasion.delaiJours, en jours ouvrés (lundi au vendredi hors jours fériés), saisi dans l'admin.
// Date limite de commande d'une occasion datée : occasion.dateLimite si l'atelier l'impose, sinon la date
// de l'occasion moins le délai ; à compléter si aucun des deux n'est saisi. Mêmes calculs que js/jours-ouvres.js.
import { occasions, produitsDe, type Occasion } from "./donnees";
import { parPrix } from "./catalogue";

const JOUR = 86_400_000;
const FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const utc = (a: number, m: number, j: number) => new Date(Date.UTC(a, m - 1, j));

/** Date du build (ou DATE_REFERENCE=AAAA-MM-JJ pour vérifier un autre jour), à minuit UTC. */
function aujourdhui() {
  const forcee = process.env.DATE_REFERENCE?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (forcee) return utc(+forcee[1], +forcee[2], +forcee[3]);
  const d = new Date();
  return utc(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus). */
function paques(a: number) {
  const n = a % 19, s = Math.floor(a / 100), u = a % 100;
  const h = (19 * n + s - Math.floor(s / 4) - Math.floor((s - Math.floor((s + 8) / 25) + 1) / 3) + 15) % 30;
  const l = (32 + 2 * (s % 4) + 2 * Math.floor(u / 4) - h - (u % 4)) % 7;
  const m = Math.floor((n + 11 * h + 22 * l) / 451);
  const x = h + l - 7 * m + 114;
  return utc(a, Math.floor(x / 31), (x % 31) + 1);
}

/** Les 11 jours fériés de l'année (métropole), en millisecondes. */
function feries(a: number) {
  const p = paques(a).getTime();
  const fixes = [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25]].map(([m, j]) => utc(a, m, j).getTime());
  // Lundi de Pâques, Ascension, lundi de Pentecôte
  return new Set([...fixes, ...[1, 39, 50].map((n) => p + n * JOUR)]);
}
const estOuvre = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !feries(d.getUTCFullYear()).has(d.getTime());

/** La date n jours ouvrés avant d. */
function retirerJoursOuvres(d: Date, n: number) {
  let x = d;
  for (let reste = n; reste > 0; ) {
    x = new Date(x.getTime() - JOUR);
    if (estOuvre(x)) reste--;
  }
  return x;
}

const dimancheAvant = (d: Date) => new Date(d.getTime() - d.getUTCDay() * JOUR);
const dimancheApres = (d: Date) => new Date(d.getTime() + ((7 - d.getUTCDay()) % 7) * JOUR);

/** Règles de calendrier, par identifiant d'occasion. */
const REGLES: Record<string, (annee: number) => Date> = {
  noel: (a) => utc(a, 12, 25),
  // Dernier dimanche de mai ; si c'est la Pentecôte, premier dimanche de juin.
  "fete-meres": (a) => {
    const fin = dimancheAvant(utc(a, 5, 31));
    const pentecote = new Date(paques(a).getTime() + 49 * JOUR);
    return fin.getTime() === pentecote.getTime() ? dimancheApres(utc(a, 6, 1)) : fin;
  },
  // Troisième dimanche de juin.
  "fete-peres": (a) => new Date(dimancheApres(utc(a, 6, 1)).getTime() + 14 * JOUR),
};

/** « 1 juin 2027 » → « 1er juin 2027 ». */
const formater = (d: Date) => FORMAT.format(d).replace(/^1 /, "1er ");

/** Une date saisie dans l'admin : AAAA-MM-JJ est mise en forme, un autre texte est affiché tel quel. */
function lireSaisie(valeur: string) {
  const iso = valeur.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? { texte: formater(utc(+iso[1], +iso[2], +iso[3])), date: utc(+iso[1], +iso[2], +iso[3]) } : { texte: valeur.trim() };
}

export interface DateOccasion { texte: string; date?: Date; passee?: boolean }

/** Prochaine date de l'occasion à partir du jour du build, ou « Toute l'année ». */
export function dateDe(o: Occasion): DateOccasion {
  if (o.date?.trim()) return lireSaisie(o.date);
  const regle = REGLES[o.id];
  if (!regle) return { texte: "Toute l'année" };
  const jour = aujourdhui();
  let d = regle(jour.getUTCFullYear());
  if (d < jour) d = regle(jour.getUTCFullYear() + 1);
  return { texte: formater(d), date: d };
}

/** Date limite de commande : imposée dans l'admin, ou calculée avec le délai ; undefined si rien n'est saisi. */
export function dateLimiteDe(o: Occasion): DateOccasion | undefined {
  let limite: DateOccasion | undefined;
  if (o.dateLimite?.trim()) limite = lireSaisie(o.dateLimite);
  else {
    const quand = dateDe(o).date;
    if (quand && o.delaiJours && o.delaiJours > 0) {
      const d = retirerJoursOuvres(quand, o.delaiJours);
      limite = { texte: formater(d), date: d };
    }
  }
  if (limite?.date) limite.passee = limite.date < aujourdhui();
  return limite;
}

/** « 10 jours ouvrés », ou undefined si le délai n'est pas saisi. */
export const delaiDe = (o: Occasion) =>
  o.delaiJours && o.delaiJours > 0 ? `${o.delaiJours} jour${o.delaiJours > 1 ? "s" : ""} ouvré${o.delaiJours > 1 ? "s" : ""}` : undefined;

/** Pièces d'une occasion, du prix le plus bas au plus haut. */
export const piecesDe = (o: Occasion) => parPrix(produitsDe({ occasion: o.id }));

/** Occasions datées d'abord, de la plus proche à la plus lointaine, puis les autres dans l'ordre du catalogue. */
export function occasionsTriees(liste: Occasion[] = occasions) {
  const avecDate = liste.map((o, i) => ({ o, i, quand: dateDe(o).date?.getTime() ?? Infinity }));
  return avecDate.sort((a, b) => a.quand - b.quand || a.i - b.i).map((x) => x.o);
}
