// Atelier ouvert ou fermé maintenant, à l'heure de Paris, d'après site.horaires
// (« Mardi : 9h – 11h30 / 13h30 – 18h », « Lundi : fermé »).
// Une ligne illisible ou un jour absent : pas d'état du tout, plutôt qu'un état faux.
// Jours fériés et fermetures exceptionnelles : aucune donnée, donc rien n'est supposé.

/** Plages d'ouverture en minutes depuis minuit, par jour (0 = dimanche … 6 = samedi). */
export type Semaine = [number, number][][];

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const HEURE = /^(\d{1,2})h(\d{2})?$/;

const minutes = (h: string) => {
  const m = h.trim().match(HEURE);
  if (!m) return null;
  const n = Number(m[1]) * 60 + Number(m[2] ?? 0);
  return Number(m[1]) <= 24 && Number(m[2] ?? 0) < 60 ? n : null;
};

export function lireSemaine(lignes: string[]): Semaine | null {
  const semaine: (Semaine[number] | undefined)[] = new Array(7).fill(undefined);
  for (const ligne of lignes) {
    const [jour, plages] = ligne.split(/\s*:\s*(.*)/s);
    const i = JOURS.indexOf((jour ?? "").trim().toLowerCase());
    if (i < 0 || plages === undefined || semaine[i]) return null;
    if (/^ferm[ée]e?$/i.test(plages.trim())) {
      semaine[i] = [];
      continue;
    }
    const liste: [number, number][] = [];
    for (const plage of plages.split("/")) {
      const [a, b, reste] = plage.split(/[–-]/);
      const debut = minutes(a ?? ""), fin = minutes(b ?? "");
      if (reste !== undefined || debut === null || fin === null || fin <= debut) return null;
      liste.push([debut, fin]);
    }
    semaine[i] = liste.sort((x, y) => x[0] - y[0]);
  }
  return semaine.every((j) => j !== undefined) ? (semaine as Semaine) : null;
}

/** « 9h », « 11h30 » */
export const heureLisible = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;

export interface Etat { ouvert: boolean; texte: string }

/** État pour un jour de la semaine (0 = dimanche) et une heure en minutes depuis minuit. */
export function etatOuverture(semaine: Semaine, jour: number, maintenant: number): Etat | null {
  const enCours = semaine[jour].find(([a, b]) => maintenant >= a && maintenant < b);
  if (enCours) {
    const reste = enCours[1] - maintenant;
    return { ouvert: true, texte: reste <= 30 ? `Ouvert · ferme dans ${reste} min` : `Ouvert · ferme à ${heureLisible(enCours[1])}` };
  }
  for (let n = 0; n < 7; n++) {
    const j = (jour + n) % 7;
    const prochaine = semaine[j].find(([a]) => n > 0 || a > maintenant);
    if (!prochaine) continue;
    const dans = prochaine[0] - maintenant;
    if (n === 0) return { ouvert: false, texte: dans <= 30 ? `Fermé · ouvre dans ${dans} min` : `Fermé · ouvre à ${heureLisible(prochaine[0])}` };
    return { ouvert: false, texte: `Fermé · ouvre ${n === 1 ? "demain" : JOURS[j]} à ${heureLisible(prochaine[0])}` };
  }
  return null; // fermé toute la semaine : rien de sûr à dire
}

/** Jour (0 = dimanche) et minutes depuis minuit à Paris, quel que soit le fuseau du visiteur. */
export function maintenantAParis(date = new Date()) {
  const parties = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const jour = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parties.weekday);
  return { jour, minutes: Number(parties.hour) * 60 + Number(parties.minute) };
}
