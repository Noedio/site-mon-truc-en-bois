# Nouveau site Mon Truc en Bois (refonte)

Site statique Astro. Seuls le configurateur et le panier chargent du JavaScript.
Référence de la direction : `docs/refonte/BRIEF.md` (§3 direction artistique et interdits) et `docs/refonte/maquette/`.
Audit de départ : `audit/RAPPORT.md`. Suivi : https://claude.ai/artifact/CTVrs9UjK7tMb5tv1TzE1i

```bash
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ + dist/_redirects
```

`npm run dev` et `npm run build` copient d'abord `../img` dans `public/img` (non versionné).
`sharp` doit rester en dépendance explicite dans `package.json` : sans lui, le build Cloudflare (Linux) échoue au traitement des images.
Le catalogue est lu au build dans `../data/donnees.js`, le fichier que publie l'admin actuel.

## Ce que fournit le socle (chantier C1)

| Fichier | Rôle |
| --- | --- |
| `src/styles/socle.css` | Jetons de couleur et de police, échelle typographique, briques `.conteneur`, `.bande`, `.pile`, `.rangee`, `.machine`, `.etiquette`, `.prix`. |
| `src/layouts/Base.astro` | Balises SEO, données structurées `Store`, bandeau « site en préparation », en-tête, pied. Props : `titre`, `description`, `image`, `indexer`. |
| `src/components/Entete.astro`, `Pied.astro` | En-tête (un seul logo, navigation, panier) et pied brûlé. |
| `src/components/GrillePieces.astro`, `CartePiece.astro` | Grille à filets et carte d'une pièce (photo carrée, N° de pièce, catégorie, nom, prix). |
| `src/components/PhotoPiece.astro` | Photo optimisée (WebP, srcset). Remplace par un cadre neutre les photos signalées par l'audit (`PHOTOS_A_VERIFIER` dans `src/lib/images.ts`). |
| `src/components/FicheTechnique.astro` | Matière, dimensions, zone gravable, délai, entretien. |
| `src/components/ACompleter.astro` | Affiche `[À COMPLÉTER : …]` pour toute information que l'atelier doit fournir. |
| `src/components/Bouton.astro` | Genres `achat` (couleur gravure, réservée à l'achat), `plein`, `contour`. |
| `src/components/TeteSection.astro` | Titre de section avec phrase et lien optionnels. |
| `src/lib/donnees.ts` | Types et accès au catalogue : `produits` (avec `numero`), `categories`, `occasions`, `avis`, `site`, `prixDe`, `produitsDe`. |
| `src/lib/panier.ts` | Contrat du panier : même clé `panier-mtb` et même forme de ligne que l'ancien site, acceptée par la fonction Supabase `commande`. |
| `src/lib/format.ts` | `euros`, `numeroPiece`, `lienTel`, `adresseEnLignes`. |
| `src/pages/socle.astro` | Nuancier : couleurs, polices, boutons, fiche technique, grille. À ouvrir avant de construire une page. |
| `scripts/redirections.mjs`, `public/produit.html` | Redirections 301 des anciennes adresses (`*.html`, `p/<id>.html`, `produit.html?id=`). |

## Qui construit quoi

Chaque chantier remplace entièrement ses pages provisoires (`EnTravaux`) et ne touche pas aux pages des autres.
Un composant utile à plusieurs chantiers va dans `src/components/` sous un nom neuf ; on ne modifie un composant du socle qu'en le signalant dans son commit.

| Chantier | Pages | Composants à créer |
| --- | --- | --- |
| C2 Catalogue, boutique, occasions | `boutique.astro`, `occasions.astro`, `favoris.astro` | filtres, liste des occasions avec date limite |
| C3 Configurateur et fiche | `index.astro`, `produit/[id].astro` | configurateur, aperçu SVG |
| C4 Pages éditoriales et légales | `atelier.astro`, `contact.astro`, `avis.astro`, `faq.astro`, `cgv.astro`, `mentions-legales.astro` | carte d'avis, formulaire de devis |
| C5 Panier, commande, devis | `panier.astro`, `suivi.astro` | lignes du panier, choix retrait / livraison |
| C6 Admin et questionnaire | admin à la racine du dépôt, `src/lib/donnees.ts` (source JSON) | assistant de démarrage |

## Règles (contrôlées à chaque livraison)

- Rien n'est inventé : une information manquante passe par `<ACompleter quoi="…" />`.
- Interdits du brief §3 : dégradés décoratifs, verre dépoli, ombres douces, cartes arrondies empilées, bordure gauche colorée, rangées d'icônes de réassurance, emojis, étoiles décoratives, slogans en trois temps, mots creux (« unique », « passion », « sublimer »), plus de deux polices par écran (hors aperçu de gravure), plus d'une couleur d'accent.
- Angles droits (`--rayon: 0`), filets de 1 px (`--filet`). Une seule animation : le texte qui se grave dans l'aperçu.
- Les titres décrivent, au « nous », phrases simples. Pas de tiret cadratin dans les textes.
- Cibles tactiles de 44 px au moins (`--cible`), contraste AA, focus visible.

## Mise en ligne de l'aperçu (Cloudflare Pages)

Projet Cloudflare Pages relié au dépôt `Noedio/site-mon-truc-en-bois` :

| Réglage | Valeur |
| --- | --- |
| Nom du projet | `mon-truc-en-bois` (adresse : https://mon-truc-en-bois.pages.dev) |
| Branche de production | `refonte` (le temps de la refonte) |
| Framework | Astro |
| Commande de build | `npm run build` |
| Dossier de sortie | `dist` |
| Dossier racine | `site` |
| Variable d'environnement | `NODE_VERSION` = `22` |

Tant que `PUBLIC_INDEXER` ne vaut pas `oui`, toutes les pages portent `noindex` : l'aperçu n'apparaît pas dans Google.
Le jour de la bascule : `PUBLIC_SITE_URL=https://montrucenbois.fr` et `PUBLIC_INDEXER=oui`.

## Démo (chantier C8)

La branche `demo` est une copie de `refonte` : Cloudflare Pages la construit en variante démo
(`CF_PAGES_BRANCH=demo`, voir `DEMO` dans `src/lib/donnees.ts`) à l'adresse https://demo.mon-truc-en-bois.pages.dev.
Le site s'y comporte comme une boutique ouverte ; `js/demo.js` simule dans le navigateur Supabase, Stripe,
les emails et la publication de l'admin. Guide et boîte mail : `/demo/`. Admin : `/admin.html`.

Mettre la démo à jour après un envoi sur `refonte` :

```bash
git push origin refonte:demo
```

En local : `MTB_DEMO=1 npm run build && npm run preview`.
Le déroulé de la présentation au commerçant est dans `docs/refonte/presentation.md`.

## Admin et publication pendant la refonte

L'admin servi avec l'aperçu (`/admin.html`) reçoit au build `window.MTB_ADMIN` (voir `scripts/copier-medias.mjs`) :
il publie `data/donnees.js` sur la branche d'où le site est construit (`refonte` en production Cloudflare,
la branche elle-même pour un aperçu de branche, `refonte` pour la démo ; `ADMIN_BRANCHE` force une autre branche).
Chaque publication est un commit sur `refonte` : Cloudflare reconstruit le site en une à deux minutes.
Le bouton « Prévisualiser » est masqué : le site étant construit à l'avance, il ne peut pas afficher un brouillon.
L'admin de l'ancien site (GitHub Pages) continue de publier sur `site-vitrine-boutique`.

- **Avant de pousser sur `refonte`**, récupérer ce que l'admin a publié : `git pull --rebase origin refonte`.
- **Publication par le serveur du commerçant** (une fois Supabase installé) : la branche est réglée côté serveur par
  la variable de dépôt `BRANCHE_SITE` (défaut `site-vitrine-boutique`, voir `.github/workflows/supabase.yml`).
  Pendant la refonte, la mettre à `refonte` avant de lancer l'installation : `gh variable set BRANCHE_SITE --body refonte`.
- **À la bascule** : fusionner `refonte` dans `site-vitrine-boutique`, mettre la branche de production Cloudflare sur
  `site-vitrine-boutique`, puis remettre `BRANCHE_SITE` (ou la supprimer) : admin, serveur et site visent alors la même branche.
