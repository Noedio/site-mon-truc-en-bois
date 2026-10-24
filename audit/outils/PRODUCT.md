# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Site actuel : HTML statique + JavaScript sans framework (`data/donnees.js`, `js/main.js`), fonctions Supabase (Deno) déjà écrites pour les commandes, servi par GitHub Pages depuis la branche `site-vitrine-boutique` du dépôt Noedio/site-mon-truc-en-bois. Cible de la refonte décidée dans `docs/refonte/BRIEF.md` : Astro statique, zéro JS hors configurateur et panier.

## Users

- Particuliers qui cherchent un cadeau personnalisé pour une occasion (naissance, mariage, fête des mères et des pères, Noël, retraite…), le plus souvent avec une date limite.
- Associations, commerçants et entreprises qui commandent des séries (cité dans `textes.aPropos`).
- Part locale (retrait à Auchel) contre part nationale (livraison) : [À COMPLÉTER : répartition à demander à Christophe et Laetitia].
- Poids des demandes pro et des devis dans l'activité : [À COMPLÉTER : à demander à Christophe et Laetitia].
- Secondaire : Christophe et Laetitia eux-mêmes, qui tiennent le catalogue et les commandes depuis `admin.html`.

## Product Purpose

Vendre en ligne des pièces personnalisées (gravure laser sur bois, verre, ardoise ; sérigraphie et impression ; bijoux gravés) fabriquées dans l'atelier-boutique d'Auchel. Le client écrit son texte, voit un aperçu, commande ; l'atelier envoie une maquette à valider avant de graver ; le client paie après validation ou en boutique, puis retire ou se fait livrer. Réussite : un visiteur personnalise une pièce en moins d'une minute et passe une commande complète sans aide.

## Positioning

Une vraie boutique physique à Auchel tenue par deux artisans nommés (Christophe et Laetitia, depuis 2024), qui montre ses propres pièces et son atelier, valide une maquette avec chaque client avant fabrication, et propose le retrait gratuit sur place.

## Operating Context

- Commande souvent liée à une date d'occasion : le délai de fabrication compte.
- Parcours voulu : personnalisation → commande « à maquetter » → maquette envoyée → validée (sinon retouche) → paiement (après validation ou en boutique) → gravure → remise.
- Retrait gratuit en boutique ; livraison 5,90 €, offerte dès 60 € (`data/donnees.js`).
- Horaires de la boutique dans `site.horaires`. Présence aussi sur les salons et marchés de la région.

## Capabilities and Constraints

- Catalogue : 27 produits, 4 catégories, 9 occasions dans `data/donnees.js`, édité depuis `admin.html`.
- Aperçu en direct du texte sur la fiche produit (à conserver).
- Mode aperçu actif (`site.apercu: true`) : commandes en ligne pas encore ouvertes ; Supabase non configuré (`supabaseUrl`, `supabaseCle` vides).
- Budget serré, aucun abonnement mensuel, tout réalisé en interne par Noedio.
- Faits manquants : SIRET, mention TVA, délais de fabrication (`delai` à 0), compte Instagram, avis Google. [À COMPLÉTER pour chacun].

## Brand Commitments

- Nom : Mon Truc en Bois. Logo existant (`img/logo.webp`).
- Ton : phrases simples, au « nous », factuelles (matière, dimension, délai, lieu). Les titres décrivent, pas de jeux de mots, pas de mots creux (« unique », « passion », « sublimer »).
- Les pièces montrées sont les vraies pièces de l'atelier ; pas d'images générées par IA à leur place.
- Les contraintes visuelles figées (polices, palette, mise en page, interdits) vivent dans `docs/refonte/BRIEF.md` §3 et la maquette `docs/refonte/maquette/`.

## Evidence on Hand

- Photos produits, boutique et atelier dans `img/` (40 fichiers). `img/plaque-naissance-bois.jpg` montre un personnage sous licence : à ne pas réutiliser.
- Avis Facebook : 100 % de recommandation sur 16 avis (`site.plateformesAvis.facebook`) ; avis nommés et datés sur `avis.html`.
- Aucun avis Google, aucune presse, aucun chiffre de vente connus : ne rien inventer.

## Product Principles

1. Montrer l'atelier et les vraies pièces avant tout discours.
2. La personnalisation est le produit : l'aperçu passe en premier.
3. Chaque information utile à l'achat est factuelle et visible : prix, matière, dimensions, délai, retrait.
4. Rien n'est gravé sans maquette validée par le client.
5. Ce qui n'est pas connu s'affiche comme manquant, jamais comme inventé.

## Accessibility & Inclusion

Cible de l'audit : 0 erreur critique WCAG 2.1 AA (brief §4).
