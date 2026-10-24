// Contrat du panier, partagé par la fiche produit (C3) et le panier (C5).
// Même clé et même forme de ligne que le site actuel (js/main.js) : un panier commencé
// sur l'ancien site se retrouve sur le nouveau, et la fonction Supabase `commande`
// (supabase/functions/_shared/outils.ts) accepte ces lignes telles quelles.

export const CLE_PANIER = "panier-mtb";
export const CLE_FAVORIS = "favoris-mtb";

export interface LignePanier {
  uid: string;
  id: string; // id du produit dans le catalogue
  nom: string;
  prix: number; // prix unitaire, variante comprise (recalculé côté serveur)
  quantite: number;
  variante: string; // libellé lisible, ex. « Taille : Grande »
  varianteIndex: number | null; // index dans produit.variantes.choix (c'est lui que lit le serveur)
  texte: string; // texte à graver, 200 caractères au plus
  police: string; // nom de la police dans le configurateur (Atelier, Classique, Machine à écrire, Manuscrite)
  photo: string; // aperçu réduit (data URL), vidé si le stockage est plein
  photoNom: string;
  photoCle?: string; // clé de la photo complète gardée dans IndexedDB
  remarque: string;
}

const lire = <T>(cle: string, defaut: T): T => {
  try {
    return JSON.parse(localStorage.getItem(cle) ?? "null") ?? defaut;
  } catch {
    return defaut;
  }
};

const ecrire = (cle: string, valeur: unknown) => {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
};

export const lirePanier = () => lire<LignePanier[]>(CLE_PANIER, []);

export function ecrirePanier(lignes: LignePanier[]) {
  // Quota dépassé (photos trop lourdes) : on retire les aperçus photo.
  if (!ecrire(CLE_PANIER, lignes)) ecrire(CLE_PANIER, lignes.map((l) => ({ ...l, photo: "" })));
  document.dispatchEvent(new CustomEvent("panier:change"));
}

export function ajouterAuPanier(ligne: Omit<LignePanier, "uid">) {
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  ecrirePanier([...lirePanier(), { ...ligne, uid }]);
}

export const nombreArticles = () => lirePanier().reduce((n, l) => n + (Number(l.quantite) || 1), 0);

export const lireFavoris = () => lire<string[]>(CLE_FAVORIS, []);
export function basculerFavori(id: string) {
  const f = lireFavoris();
  ecrire(CLE_FAVORIS, f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  document.dispatchEvent(new CustomEvent("favoris:change"));
}

// ---------- Modifications depuis la page panier (chantier C5) ----------

type ChampsModifiables = Partial<Pick<LignePanier, "quantite" | "texte" | "police" | "remarque">>;

export function modifierLigne(uid: string, champs: ChampsModifiables) {
  ecrirePanier(lirePanier().map((l) => (l.uid === uid ? { ...l, ...champs } : l)));
}

/** Retire une ligne et la renvoie avec sa place, pour pouvoir annuler. */
export function retirerLigne(uid: string) {
  const lignes = lirePanier();
  const position = lignes.findIndex((l) => l.uid === uid);
  if (position < 0) return null;
  const [ligne] = lignes.splice(position, 1);
  ecrirePanier(lignes);
  return { ligne, position };
}

export function remettreLigne(ligne: LignePanier, position: number) {
  const lignes = lirePanier().filter((l) => l.uid !== ligne.uid);
  lignes.splice(Math.min(position, lignes.length), 0, ligne);
  ecrirePanier(lignes);
}

export const viderPanier = () => ecrirePanier([]);
