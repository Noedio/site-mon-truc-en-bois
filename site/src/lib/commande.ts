// Calculs du panier côté navigateur : prix à jour, totaux, lignes envoyées au serveur, récapitulatif par email.
// Le serveur refait tous les calculs (supabase/functions/_shared/outils.ts → calculerCommande) :
// ceux d'ici servent à l'affichage, et au récapitulatif quand la commande en ligne n'est pas ouverte.
import type { LignePanier } from "./panier";
import type { LigneDemandee, ModePaiement, ModeReception } from "./serveur";

/** Ce que la page panier sait de chaque produit (préparé au build). */
export interface ProduitPanier {
  nom: string;
  numero: number;
  prix: number;
  vignette: string; // adresse de la photo réduite, vide si la photo n'est pas montrable
  varianteNom: string;
  variantes: { nom: string; prix: number }[];
  texte: boolean;
  delai: number; // jours, 0 = inconnu
  epuise: boolean;
}

export interface ReglagesPanier {
  livraison: number;
  livraisonOfferteDes: number;
  emballage: { actif: boolean; prix: number };
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Index de la variante, retrouvé par son libellé si la ligne vient d'une ancienne version du panier. */
export function indexVariante(l: LignePanier, p: ProduitPanier | undefined) {
  if (Number.isInteger(l.varianteIndex)) return l.varianteIndex as number;
  const i = (p?.variantes ?? []).findIndex((c) => l.variante && l.variante.endsWith(": " + c.nom));
  return i >= 0 ? i : p?.variantes.length ? 0 : null;
}

/** Prix unitaire d'après le catalogue publié ; celui de la ligne si le produit a disparu. */
export function prixUnitaire(l: LignePanier, p: ProduitPanier | undefined) {
  if (!p) return Number(l.prix) || 0;
  const i = indexVariante(l, p);
  return arrondi(p.prix + (i === null ? 0 : Number(p.variantes[i]?.prix) || 0));
}

export const quantite = (l: LignePanier) => Math.min(99, Math.max(1, Math.trunc(Number(l.quantite)) || 1));

export function totaux(lignes: LignePanier[], cat: Record<string, ProduitPanier>, mode: ModeReception, r: ReglagesPanier, emballage = false) {
  const sousTotal = arrondi(lignes.reduce((t, l) => t + prixUnitaire(l, cat[l.id]) * quantite(l), 0));
  const port = mode === "retrait" || sousTotal >= r.livraisonOfferteDes ? 0 : arrondi(r.livraison);
  const prixEmballage = r.emballage.actif && emballage ? arrondi(r.emballage.prix) : 0;
  return { sousTotal, port, emballage: prixEmballage, remise: 0, total: arrondi(sousTotal + port + prixEmballage) };
}

/** Lignes au format attendu par la fonction `commande` (même forme que l'ancien panier.html). */
export const lignesServeur = (lignes: LignePanier[], cat: Record<string, ProduitPanier>): LigneDemandee[] =>
  lignes.map((l) => ({
    id: l.id,
    quantite: quantite(l),
    variante: indexVariante(l, cat[l.id]),
    texte: l.texte,
    police: l.police,
    remarque: l.remarque,
    photo: l.photoNom ? { nom: l.photoNom.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg" } : null,
  }));

/** Nombre de jours entre aujourd'hui et une date AAAA-MM-JJ (heure locale). */
export function joursAvant(date: string) {
  const [a, m, j] = date.split("-").map(Number);
  if (!a || !m || !j) return null;
  const cible = new Date(a, m - 1, j);
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return Math.round((cible.getTime() - auj.getTime()) / 86_400_000);
}

export const dateLongue = (date: string) => {
  const [a, m, j] = date.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/** Référence donnée au client quand la commande part par email (même format que l'ancien site). */
export const referenceLocale = () =>
  "CMD-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

export interface Recapitulatif {
  reference: string;
  lignes: LignePanier[];
  cat: Record<string, ProduitPanier>;
  mode: ModeReception;
  adresseBoutique: string;
  t: ReturnType<typeof totaux>;
  date: string;
  client: { nom: string; email: string; tel: string; adresse: string; message: string };
  paiement: ModePaiement | "";
  libellePaiement: string;
  nouveautes: boolean;
}

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Texte complet de la commande, pour l'email prérempli. */
export function recapitulatifTexte(r: Recapitulatif) {
  const lignes = r.lignes.map((l, i) => {
    const p = r.cat[l.id];
    const q = quantite(l);
    return [
      `${i + 1}. ${l.nom} × ${q} : ${eur(prixUnitaire(l, p) * q)}`,
      l.variante && `   ${l.variante}`,
      l.texte && `   Texte à graver : « ${l.texte} »${l.police ? ` (police ${l.police})` : ""}`,
      l.photoNom && `   Photo : ${l.photoNom} (je la joins à cet email)`,
      l.remarque && `   Précisions : ${l.remarque}`,
    ].filter(Boolean).join("\n");
  });
  const jours = r.date ? joursAvant(r.date) : null;
  return [
    `Commande ${r.reference} à maquetter`,
    "",
    `Pour quelle date : ${r.date ? `${dateLongue(r.date)}${jours !== null ? ` (dans ${jours} jour${jours > 1 ? "s" : ""})` : ""}` : "pas de date précise"}`,
    "",
    ...lignes,
    "",
    `Sous-total : ${eur(r.t.sousTotal)}`,
    r.mode === "retrait" ? `Retrait à la boutique (${r.adresseBoutique}) : gratuit` : `Livraison : ${r.t.port ? eur(r.t.port) : "offerte"}`,
    r.t.emballage ? `Emballage cadeau : ${eur(r.t.emballage)}` : null,
    `Total : ${eur(r.t.total)}`,
    r.libellePaiement ? `Paiement souhaité : ${r.libellePaiement}` : null,
    "",
    `Nom : ${r.client.nom}`,
    `Email : ${r.client.email}`,
    `Téléphone : ${r.client.tel}`,
    r.mode === "livraison" ? `Adresse de livraison : ${r.client.adresse}` : null,
    r.client.message ? `Message pour l'atelier : ${r.client.message}` : null,
    "",
    "J'accepte les conditions générales de vente.",
    `Recevoir les nouveautés par email : ${r.nouveautes ? "oui" : "non"}`,
  ].filter((x) => x !== null).join("\n");
}
