const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** 24.9 → « 24,90 € » */
export const euros = (n: number) => EUROS.format(n);

/** 1 → « N° 001 » : le numéro de pièce affiché sur les cartes et les fiches. */
export const numeroPiece = (n: number) => `N° ${String(n).padStart(3, "0")}`;

/** « 07 83 39 40 28 » → « tel:0783394028 » */
export const lienTel = (tel: string) => `tel:${tel.replace(/[^\d+]/g, "")}`;

/** Découpe « 3 rue Salengro, 62260 Auchel » en rue et ville. */
export function adresseEnLignes(adresse: string) {
  const [rue, ...reste] = adresse.split(",");
  return { rue: rue.trim(), ville: reste.join(",").trim() };
}
