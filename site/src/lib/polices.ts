// Les polices proposées pour la gravure, sous le nom que voit le client (brief §3).
// La valeur `police` d'une ligne du panier est l'un de ces noms.
// Sacramento (« Manuscrite ») n'est chargée que sur les pages qui montrent un aperçu.

export interface Police {
  nom: string;
  famille: string; // variable CSS du socle
  graisse: number;
  capitales: boolean;
}

export const POLICES: Police[] = [
  { nom: "Atelier", famille: "var(--f-titre)", graisse: 800, capitales: true },
  { nom: "Classique", famille: "var(--f-texte)", graisse: 600, capitales: false },
  { nom: "Machine à écrire", famille: "var(--f-machine)", graisse: 700, capitales: false },
  { nom: "Manuscrite", famille: "var(--f-manuscrite)", graisse: 400, capitales: false },
];

export const trouverPolice = (nom: string) => POLICES.find((p) => p.nom === nom);
