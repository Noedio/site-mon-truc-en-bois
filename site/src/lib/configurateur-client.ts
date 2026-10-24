// Configurateur dans le navigateur : relie le champ de texte, les choix de pièce, de police et de variante
// aux aperçus SVG (le grand, à côté des commandes, et le bandeau collé en haut sur téléphone).
// Le dessin lui-même est dans configurateur.ts, partagé avec le build.
import { dessiner, gabaritDe, limiterTexte, policeDe, POLICES, titreApercu, type Mesure, type PieceConfigurable } from "./configurateur";

export interface PieceClient extends PieceConfigurable {
  nom: string;
  numero: string; // « N° 001 »
  prix: string; // « dès 24,90 € »
  lien: string; // fiche produit
}

// La saisie faite sur l'accueil suit le visiteur jusqu'à la fiche, sans passer par l'adresse.
const CLE_REPRISE = "configurateur-mtb";

const reduit = matchMedia("(prefers-reduced-motion: reduce)");

let contexte: CanvasRenderingContext2D | null = null;
const mesure: Mesure = (texte, police) => {
  contexte ??= document.createElement("canvas").getContext("2d");
  if (!contexte) return texte.length * police.chasse;
  contexte.font = `${police.graisse} 100px "${police.famille}"`;
  return contexte.measureText(texte).width / 100;
};

/** Le texte « se grave » : il apparaît ligne à ligne derrière le faisceau. Seule animation du site. */
function graver(svg: SVGSVGElement | null) {
  if (!svg || reduit.matches || !("animate" in svg)) return;
  const calques = [...svg.querySelectorAll<SVGGElement>('[data-calque="texte"], [data-calque="photo"]')];
  const faisceau = svg.querySelector<SVGLineElement>("[data-faisceau]");
  let haut = Infinity, bas = -Infinity;
  for (const c of calques) {
    try {
      const b = c.getBBox();
      if (b.height) { haut = Math.min(haut, b.y); bas = Math.max(bas, b.y + b.height); }
    } catch { /* aperçu masqué : rien à mesurer */ }
  }
  if (!isFinite(haut)) return;
  const duree = 1100, easing = "steps(20, end)";
  for (const c of calques) c.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }], { duration: duree, easing });
  faisceau?.animate(
    [{ transform: `translateY(${haut}px)`, opacity: 1 }, { transform: `translateY(${bas}px)`, opacity: 1 }],
    { duration: duree, easing },
  );
}

export function monterConfigurateur(racine: HTMLElement) {
  const pieces: PieceClient[] = JSON.parse(racine.querySelector("[data-config]")?.textContent || "[]");
  const champ = racine.querySelector<HTMLTextAreaElement>("[data-cfg-texte]")!;
  const compte = racine.querySelector<HTMLElement>("[data-cfg-compte]");
  const apercu = document.querySelector<HTMLElement>("[data-apercu-gravure]");
  const scenes = [
    { boite: apercu?.querySelector<HTMLElement>("[data-scene]"), prefixe: "grand" },
    { boite: racine.querySelector<HTMLElement>("[data-scene]"), prefixe: "bandeau" },
  ].filter((s) => s.boite) as { boite: HTMLElement; prefixe: string }[];
  let photo = "";
  let modifie = false;

  const choisi = (nom: string) => racine.querySelector<HTMLInputElement>(`[name="${nom}"]:checked`);
  const piece = () => pieces.find((p) => p.id === choisi("piece")?.value) ?? pieces[0];
  const police = () => policeDe(choisi("police")?.value);
  const variante = () => {
    const v = choisi("variante");
    return v ? Number(v.value) : null;
  };

  // Reprise de la saisie commencée sur l'accueil (même pièce seulement).
  try {
    const r = JSON.parse(sessionStorage.getItem(CLE_REPRISE) || "null");
    if (r && pieces.length === 1 && r.id === pieces[0].id) {
      champ.value = r.texte || "";
      const radio = racine.querySelector<HTMLInputElement>(`[name="police"][value="${r.police}"]`);
      if (radio) radio.checked = true;
      sessionStorage.removeItem(CLE_REPRISE);
    }
  } catch { /* stockage indisponible : on part de zéro */ }

  function rendre() {
    const p = piece(), pol = police(), g = gabaritDe(p, variante());
    const texte = limiterTexte(champ.value, g);
    if (texte !== champ.value) champ.value = texte;
    champ.maxLength = g.maxCaracteres;
    if (compte) compte.textContent = `${texte.length} / ${g.maxCaracteres} caractères · ${g.maxLignes} lignes au plus`;
    const titre = titreApercu(p.nom.toLowerCase(), texte, pol);
    for (const s of scenes) s.boite.innerHTML = dessiner({ gabarit: g, texte, police: pol, mesure, photo, prefixe: s.prefixe, titre });

    // Échantillons des polices : le premier mot du visiteur, sinon « Marie ».
    const echantillon = texte.trim().split(/\s+/)[0]?.slice(0, 10) || "Marie";
    racine.querySelectorAll<HTMLElement>("[data-echantillon]").forEach((e) => {
      const pp = policeDe(e.dataset.echantillon);
      e.textContent = pp.capitales ? echantillon.toLocaleUpperCase("fr-FR") : echantillon;
    });

    // Pièce choisie (accueil) : numéro, nom, prix, lien et photo.
    document.querySelectorAll<HTMLElement>("[data-cfg-numero]").forEach((e) => (e.textContent = `${p.numero} · ${p.nom}`));
    document.querySelectorAll<HTMLElement>("[data-cfg-prix]").forEach((e) => (e.textContent = p.prix));
    document.querySelectorAll<HTMLAnchorElement>("[data-cfg-lien]").forEach((e) => (e.href = p.lien));
    document.querySelectorAll<HTMLElement>("[data-cfg-photo]").forEach((e) => (e.hidden = e.dataset.cfgPhoto !== p.id));
  }

  const toutGraver = () => {
    for (const s of scenes) if (s.boite.offsetParent) graver(s.boite.querySelector("svg"));
  };

  champ.addEventListener("keydown", (e) => {
    // Entrée refusée au-delà du nombre de lignes de la pièce.
    if (e.key === "Enter" && champ.value.split("\n").length >= gabaritDe(piece(), variante()).maxLignes) e.preventDefault();
  });
  champ.addEventListener("input", () => {
    modifie = true;
    if (apercu) apercu.dataset.vue = "apercu";
    rendre();
  });
  racine.addEventListener("change", (e) => {
    const nom = (e.target as HTMLInputElement).name;
    if (!["piece", "police", "variante"].includes(nom)) return;
    if (apercu) apercu.dataset.vue = "apercu";
    rendre();
    toutGraver();
  });
  racine.addEventListener("configurateur:photo", (e) => {
    photo = (e as CustomEvent<string>).detail || "";
    rendre();
    toutGraver();
  });

  apercu?.querySelectorAll<HTMLButtonElement>("[data-vue]").forEach((b) =>
    b.addEventListener("click", () => {
      apercu.dataset.vue = b.dataset.vue!;
      apercu.querySelectorAll("[data-vue]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );

  document.querySelectorAll<HTMLAnchorElement>("[data-cfg-lien]").forEach((a) =>
    a.addEventListener("click", () => {
      if (!modifie) return;
      try {
        sessionStorage.setItem(CLE_REPRISE, JSON.stringify({ id: piece().id, texte: champ.value, police: police().id }));
      } catch { /* sans stockage, la fiche s'ouvre vide */ }
    }),
  );

  rendre();

  // Les vraies largeurs de texte ne sont connues qu'une fois les polices chargées.
  const pret = document.fonts
    ? Promise.all(POLICES.map((p) => document.fonts.load(`${p.graisse} 40px "${p.famille}"`).catch(() => []))).then(rendre, () => {})
    : Promise.resolve();

  // Première gravure quand l'aperçu entre à l'écran.
  if ("IntersectionObserver" in window) {
    const vues = new Set<Element>();
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting || vues.has(e.target)) continue;
        vues.add(e.target);
        pret.then(() => graver(e.target.querySelector("svg")));
      }
      if (vues.size >= scenes.length) io.disconnect();
    }, { threshold: 0.4 });
    for (const s of scenes) io.observe(s.boite);
  }
}
