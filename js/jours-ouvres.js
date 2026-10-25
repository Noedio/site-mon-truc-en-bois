// Jours ouvrés : du lundi au vendredi, hors jours fériés français (métropole).
// Sert à l'admin pour les délais de fabrication et les dates limites des occasions.
// Les dates sont des Date locales ramenées à midi (pas de décalage au changement d'heure) ;
// iso() et lire() font le lien avec le format AAAA-MM-JJ des données.
(function () {
  const midi = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const decaler = (d, jours) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + jours, 12);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function lire(texte) {
    const m = String(texte || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
  }

  // Dimanche de Pâques (calendrier grégorien, algorithme de Meeus), comme site/src/lib/occasions.ts
  function paques(a) {
    const n = a % 19, s = Math.floor(a / 100), u = a % 100;
    const h = (19 * n + s - Math.floor(s / 4) - Math.floor((s - Math.floor((s + 8) / 25) + 1) / 3) + 15) % 30;
    const l = (32 + 2 * (s % 4) + 2 * Math.floor(u / 4) - h - (u % 4)) % 7;
    const m = Math.floor((n + 11 * h + 22 * l) / 451);
    const x = h + l - 7 * m + 114;
    return new Date(a, Math.floor(x / 31) - 1, (x % 31) + 1, 12);
  }

  const cache = {};
  /** Les 11 jours fériés de l'année, au format AAAA-MM-JJ. */
  function feries(a) {
    if (cache[a]) return cache[a];
    const p = paques(a);
    const fixes = [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25]].map(([m, j]) => new Date(a, m - 1, j, 12));
    // Lundi de Pâques, Ascension, lundi de Pentecôte
    const mobiles = [1, 39, 50].map((n) => decaler(p, n));
    return (cache[a] = new Set([...fixes, ...mobiles].map(iso)));
  }

  const estFerie = (d) => feries(d.getFullYear()).has(iso(d));
  const estOuvre = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !estFerie(d);

  /** Date après n jours ouvrés (n < 0 : avant). ajouter(vendredi, 1) = lundi suivant (s'il n'est pas férié). */
  function ajouter(depart, n) {
    let d = midi(depart);
    const pas = n < 0 ? -1 : 1;
    for (let reste = Math.abs(n); reste > 0; ) {
      d = decaler(d, pas);
      if (estOuvre(d)) reste--;
    }
    return d;
  }

  /** Nombre de jours ouvrés après a jusqu'à b compris (négatif si b est avant a). */
  function entre(a, b) {
    const x = midi(a), y = midi(b);
    const signe = y < x ? -1 : 1;
    let n = 0;
    for (let d = x; signe > 0 ? d < y : d > y; ) {
      d = decaler(d, signe);
      if (estOuvre(d)) n += signe;
    }
    return n;
  }

  window.JoursOuvres = { feries, estFerie, estOuvre, ajouter, retirer: (d, n) => ajouter(d, -n), entre, iso, lire };
})();
