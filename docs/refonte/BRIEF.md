# Brief — refonte du site Mon Truc en Bois

Document de référence pour l'agent qui travaille dans ce repo. Version du 24/10/2026.
Plan complet (lecture humaine) : https://claude.ai/artifact/HCHKQUFiTumQtjL3aVTbG8
Maquette cliquable : https://claude.ai/artifact/5xrB4ayAagJdsnEZFUuZxv (sources dans `docs/refonte/maquette/`)

## 1. Contexte

- Client : Mon Truc en Bois, atelier-boutique de gravure laser, sérigraphie et bijoux gravés, 3 rue Salengro, 62260 Auchel. Équipe : Christophe et Laetitia, depuis 2024.
- Site actuel : statique, servi par GitHub Pages depuis la branche `master` de ce repo. Catalogue dans `data/donnees.js` (27 produits, 4 catégories, 9 occasions), édité via `admin.html`. Mode aperçu actif (`site.apercu: true`), commandes en ligne pas encore ouvertes.
- Prévu dans les données mais vide : Supabase (`commandes.supabaseUrl`, `supabaseCle`), `siret`, `mentionTva`, `delai` (0 partout), avis Google.
- Paiement voulu : après validation de la maquette (`paiement.apresValidation: true`) ou en boutique.
- Contraintes : budget serré, pas d'abonnement mensuel, tout fait en interne par Noedio.

## 2. Objectif

Un site e-commerce qui vend la personnalisation en montrant l'atelier, et qui ne ressemble à aucun template généré par IA.

| On garde | On change | On retire |
| --- | --- | --- |
| L'aperçu en direct de la fiche produit | Le configurateur passe en tête de l'accueil | Bandeau de 4 pictos de réassurance |
| Les vraies photos produits et atelier | Les polices de gravure deviennent celles du site | Cartes catégories à dégradé sombre |
| Les avis Facebook nommés et datés | Palette tirée des matières | Bouton flottant « Appeler » |
| Christophe et Laetitia, Auchel | Achat par occasion avec date limite | Logo en double au premier écran |
| Prix affichés, retrait gratuit | Mise en page éditoriale, angles droits, filets fins | Titres jeux de mots, slogans en trois temps |

## 3. Direction artistique (figée après validation de l'atelier)

### Typographie : les polices du site = les polices proposées au client pour la gravure

| Rôle | Police Google Fonts | Nom dans le configurateur |
| --- | --- | --- |
| Titres, prix, chiffres | Big Shoulders 800, capitales | Atelier |
| Texte courant | Literata 400 / 600 | Classique |
| Étiquettes, fiches techniques, n° de pièce | Courier Prime 400 / 700 | Machine à écrire |
| Aperçus uniquement | Sacramento (à valider par un essai de gravure) | Manuscrite |

Aujourd'hui : site en Bricolage Grotesque + Figtree + Caveat, configurateur en Georgia / Dancing Script / Figtree / IBM Plex Mono. Les deux listes fusionnent.

### Couleurs : les matières

| Token | Rôle | Valeur |
| --- | --- | --- |
| `--bouleau` | Fond principal | #EFE6D8 |
| `--brule` | Texte, filets, pied de page | #231A14 |
| `--gravure` | Accent unique : achat, prix, date limite | #A4471C |
| `--kraft` | Fonds secondaires | #D7BF9C |
| `--ardoise` | Encadrés ardoise et verre | #34383B |
| `--texte-doux` | Texte secondaire | #6B5A4A |

Contrastes calculés : brûlé sur bouleau 13,8:1 ; blanc sur gravure 6,0:1 ; gravure sur bouleau 4,86:1 ; texte doux sur bouleau 5,3:1.

### Mise en page

- Conteneur 1320 px max, gouttière 24 px. Angles droits (0 à 2 px), filets de 1 px au lieu des ombres.
- Grilles produit à filets (fond brûlé + `gap: 1px`), photos carrées bord à bord.
- Chaque produit a un numéro de pièce (N° 001) et une fiche technique : matière, dimensions, zone gravable, délai, entretien.
- Une seule animation signature : le texte qui « se grave » dans l'aperçu. Rien d'autre ne bouge au scroll.

### Ton

- Phrases simples, au « nous », factuelles : matière, dimension, délai, lieu.
- Les titres décrivent. Pas de jeux de mots.

### Interdits (contrôlés à chaque livraison)

- Dégradés décoratifs, glassmorphism, ombres douces, cartes arrondies empilées, bordure gauche colorée.
- Rangées d'icônes de réassurance, emojis, étoiles décoratives.
- Slogans en trois temps, mots creux (« unique », « passion », « sublimer »).
- Plus de deux polices par écran (hors aperçu de gravure), plus d'une couleur d'accent.
- Images générées par IA à la place des vraies pièces.

## 4. Phase 0 — Audit (première mission)

Sortie : `audit/RAPPORT.md`, une note de 1 à 5 par axe avec preuves, et 10 actions classées par impact sur la vente et effort.

| Axe | Ce qu'on regarde | Outil | Cible |
| --- | --- | --- | --- |
| Identité / anti-slop | Polices, palette, motifs de template, ton | impeccable, anti-slop, revue | 0 FAIL bloquant |
| Structure de l'accueil | Ordre des sections, message, doublons | Captures, critique | Configurateur visible au 1er écran |
| Fiche produit | Aperçu, options, prix, délai, panier | Revue + test utilisateurs | Personnaliser en < 60 s |
| Parcours d'achat | Panier, commande, retrait/livraison | Revue + test | Commande test complète sans aide |
| Performance | LCP, CLS, poids | Lighthouse mobile | Score ≥ 90, LCP < 2,5 s, CLS < 0,1 |
| Accessibilité | Contrastes, clavier, alt, labels | axe, Lighthouse | 0 erreur critique WCAG 2.1 AA |
| SEO local | title, meta, données structurées | Lighthouse SEO, lecture | LocalBusiness + Product présents |
| Confiance et légal | Avis, CGV, mentions, délais | Lecture | Mentions de vente en ligne complètes |
| Photos | Fond, lumière, cadrage | Revue | Une seule mise en scène |
| Code | Structure, duplication, réutilisable | Lecture | Liste de ce qu'on garde |

Points déjà relevés à confirmer :
- Photos produits sur fonds variés (mur végétal artificiel) avec la carte de visite dans chaque cadre.
- `img/plaque-naissance-bois.jpg` montre un personnage de dessin animé sous licence : à signaler, ne pas réutiliser.
- Champs vides : `siret`, `mentionTva`, `delai`, `instagram`, avis Google.

Tâches du test utilisateurs (fait par des humains, l'agent prépare la feuille de passation) :
1. Trouver un cadeau de fête des mères à moins de 30 €.
2. Personnaliser une planche apéro avec deux prénoms et une date.
3. Trouver le délai de fabrication et le mode de retrait.
4. Demander un devis pour 50 pièces gravées pour une association.
5. Retrouver un produit mis en favori.

## 5. Architecture cible (phases suivantes, ne pas coder pendant l'audit)

- Astro statique, zéro JS hors configurateur et panier. Catalogue migré de `donnees.js` vers JSON lu au build.
- Configurateur en SVG : le même SVG sert d'aperçu, de maquette envoyée au client et de base pour le fichier laser.
- Panier dans le navigateur. Commandes dans une table Supabase `commandes` (numéro, lignes, contact, retrait, statut), règles d'accès strictes.
- Parcours : personnalisation → commande (« à maquetter ») → maquette envoyée → validée ? (non : retouche) → paiement Stripe Checkout ou en boutique → gravure → remise.
- `admin.html` conservé pour le catalogue + vue des commandes.
- Hébergement GitHub Pages ou Cloudflare Pages, domaine montrucenbois.fr, redirections 301 depuis `produit.html?id=…`.

Lots : 1 socle et tokens · 2 catalogue, boutique, occasions · 3 configurateur et fiche · 4 panier et commandes Supabase · 5 maquette, Stripe, webhook, e-mails · 6 admin commandes et suivi · 7 pages éditoriales et légales.

## 6. Règles de travail

- Branche `refonte`. `master` est le site en ligne : ne jamais y committer ni pousser sans accord explicite.
- Ne rien supprimer du site actuel pendant l'audit. Aucune donnée inventée : un fait manquant devient `[À COMPLÉTER : …]`.
- Images de la maquette : elles pointent déjà vers `img/` du repo.
