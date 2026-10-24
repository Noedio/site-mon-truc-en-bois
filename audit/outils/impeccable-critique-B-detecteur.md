# Critique impeccable — Assessment B : détecteur + preuve navigateur

Date : 24 octobre 2026. Branche `refonte`. Site servi sur http://localhost:4173/.
Outil : impeccable 4.7.1 (`scripts/impeccable`, lancé depuis la racine du dépôt avec Git Bash).
Audit en lecture seule : aucun fichier du site n'a été modifié. Le détecteur de l'overlay a été injecté par le navigateur, pas dans les fichiers HTML.

Fichiers produits :
- `audit/outils/impeccable-detect.json` : sortie JSON brute, 8 pages publiques.
- `audit/outils/impeccable-detect-tout.json` : sortie JSON brute, les 17 fichiers `.html` de la racine.
- `audit/outils/overlay/*.png` : 8 captures pleine page avec l'overlay (4 pages × 1440 px et 390 px).

## 1. Scan CLI (`impeccable detect --json`)

### Passage 1 : 8 pages publiques

Commande : `impeccable detect --json index.html boutique.html produit.html idees-cadeaux.html atelier.html panier.html contact.html avis.html`
Code de sortie : **2** (constats). **7 constats.** Aucun constat « advisory ».

| Règle | Nombre |
|---|---|
| cramped-padding (marge intérieure trop serrée) | 5 |
| tight-leading (interligne trop serré) | 2 |

| Fichier | Constats |
|---|---|
| index.html | 4 (1 tight-leading, 3 cramped-padding) |
| atelier.html | 2 (1 tight-leading, 1 cramped-padding) |
| contact.html | 1 (cramped-padding) |
| boutique.html, produit.html, idees-cadeaux.html, panier.html, avis.html | 0 |

Tous les constats ont `"line": 0` : le détecteur ne donne pas de numéro de ligne. Je les ai retrouvés à la main (section 3).

### Passage 2 : les 17 fichiers .html de la racine

Commande : `impeccable detect --json *.html` (admin, atelier, avis, boutique, cgv, contact, demo-paiement, demo, faq, favoris, idees-cadeaux, index, mentions-legales, newsletter, panier, produit, suivi).
Code de sortie : **2**. **Les mêmes 7 constats**, seul l'ordre change. Les 9 pages en plus (dont admin.html) ne donnent aucun constat.

Contrôle : le même scan avec `--no-config` donne aussi 7 constats. Il n'y a ni fichier de config impeccable, ni DESIGN.md, ni commentaire d'exclusion dans le site.

Limite importante du scan de fichiers : il lit le HTML tel qu'il est sur le disque. Il ne lance pas le JavaScript. Or les cartes produits, les catégories, le panier et le pied de page sont construits par `js/main.js` et des scripts dans les pages. Ce contenu n'est donc pas vu par le scan CLI. C'est l'overlay dans le navigateur qui le voit.

## 2. Preuve navigateur (overlay)

Déroulé :
1. `impeccable live-server --background` → `{"pid":56564,"port":8400,...}`, `/health` répond `ok`.
2. Playwright (Chrome, `channel: "chrome"`), un contexte neuf par page et par largeur.
3. Préflight de mutation réussi sur chaque page : `document.title` préfixé par `[Human]` et ajout d'une balise `<script>` dans le DOM du navigateur.
4. Retour en haut de page, injection de `http://localhost:8400/detect.js` par `page.addScriptTag`, attente de 3 s, lecture des messages console, capture pleine page.
5. `impeccable live-server stop --keep-inject` → « Stopped live server on port 8400. »

Pour le panier, j'ai d'abord ajouté la planche apéro depuis sa fiche (2 clics sur « Ajouter au panier » : le premier affiche un avertissement car aucun texte n'est saisi). Un premier passage avait été fait avec le panier vide : résultats notés plus bas. Les captures gardées montrent le panier avec 1 article.

Scripts : `C:\Users\yoann\AppData\Local\Temp\claude\C--Users-yoann-Desktop-Projets-divers-Mon-truc-en-bois\e53e7e4c-da10-4f44-8fd9-9f303b96b9d5\scratchpad\critique-b\overlay.js` et `verif.js`. Résultats bruts : `resultats-overlay.json` et `resultats-overlay-panier.json` dans le même dossier.

### Comptes de l'overlay

| Page | 1440 px | 390 px |
|---|---|---|
| index | 6 (4 straggler, 2 low-contrast) | 5 (3 straggler, 2 low-contrast) |
| boutique | 2 (1 low-contrast, 1 skipped-heading) | 3 (1 low-contrast, 1 straggler, 1 skipped-heading) |
| produit?id=planche-aperitif | 1 (low-contrast) | 2 (1 low-contrast, 1 straggler) |
| panier (1 article) | 3 (2 straggler, 1 skipped-heading) | 2 (1 straggler, 1 skipped-heading) |
| panier vide (1er passage) | 0 (« No anti-patterns found ») | 1 (straggler) |

Total sur les 8 captures gardées : **24 constats** : straggler 12, low-contrast 8, skipped-heading 4.

L'overlay ne relève **ni cramped-padding ni tight-leading** sur index, alors que le scan CLI les relève sur ce fichier.

### Messages console `impeccable` (texte relevé tel quel)

index 1440 : `[impeccable] 6 anti-patterns found`
- `straggler "occasions." alone on the last of 3 lines (15% of the measure)` → `p.chapeau` du héros
- `low-contrast 4.4:1 (need 4.5:1) — text #a8693a on #ffffff` → `span.signature` « Christophe et Laetitia » (19,2 px)
- `straggler "image." alone on the last of 3 lines (19% of the measure)` → description de catégorie (texte blanc, 14,4 px)
- `straggler "mariage." alone on the last of 3 lines (24% of the measure)` → description de catégorie
- `low-contrast 3.9:1 (need 4.5:1) — text #a8693a on #eef3ef` → `span.etiquette` « Gravure bois » (14,08 px), carte produit sur fond sauge
- `straggler "vous." alone on the last of 3 lines (13% of the measure)` → étape « Recevez »

index 390 : `[impeccable] 5 anti-patterns found`
- `low-contrast 4.4:1 (need 4.5:1) — text #a8693a on #ffffff` → `span.signature`
- `straggler "image." alone on the last of 3 lines (19% of the measure)`
- `straggler "boutique." alone on the last of 2 lines (20% of the measure)` → sous-titre « Les créations que l'on nous demande le plus en boutique. »
- `low-contrast 3.9:1 (need 4.5:1) — text #a8693a on #eef3ef` → `span.etiquette`
- `straggler "bijoux" alone on the last of 2 lines (12% of the measure)` → slogan du pied de page

boutique 1440 : `[impeccable] 2 anti-patterns found`
- `low-contrast 4.4:1 (need 4.5:1) — text #a8693a on #ffffff` → `span.etiquette`
- `skipped-heading <h1> "La boutique" followed by <h3> "Planche apéro gravée" (missing h2)`

boutique 390 : `[impeccable] 3 anti-patterns found` : les deux mêmes, plus `straggler "bijoux"` (pied de page).

produit 1440 : `[impeccable] 1 anti-pattern found` : `low-contrast 4.4:1 (need 4.5:1) — text #a8693a on #ffffff` → `span.etiquette` de la fiche.

produit 390 : `[impeccable] 2 anti-patterns found` : le même low-contrast, plus `straggler "bijoux"`.

panier 1440 (1 article) : `[impeccable] 3 anti-patterns found`
- `straggler "fabrication." alone on the last of 2 lines (15% of the measure)` → `p.chapeau`
- `straggler "étape." alone on the last of 4 lines (10% of the measure)` → `p.aide`
- `skipped-heading <h1> "Mon panier" followed by <h3> "Planche apéro gravée" (missing h2)`

panier 390 (1 article) : `[impeccable] 2 anti-patterns found` : `straggler "bijoux"` et le même skipped-heading.

Aucune erreur `[impeccable] scan failed` ni `visual contrast scan failed`. Aucune erreur JavaScript de page relevée.

## 3. Vérification de chaque constat

### Scan CLI

| # | Règle | Où (fichier:ligne) | Verdict | Raison |
|---|---|---|---|---|
| 1 | tight-leading 1.25x | `css/style.css:522` `.mot-atelier p { font: 500 1.35rem/1.25 … }`, utilisé à `index.html:39-41` | Vrai positif, mineur | Mesuré dans Chrome : 21,6 px, interligne 27 px (ratio 1,25), 2 lignes à 1440 px, 3 lignes à 390 px. C'est une citation en grand corps, pas un texte courant ; l'overlay navigateur ne la relève pas. Gravité faible. |
| 2 | tight-leading 1.25x | même règle CSS, utilisée à `atelier.html:35-37` | Vrai positif, mineur | 2 lignes à 1440 et 390 px. Même remarque. |
| 3-5 | cramped-padding `<section>` (×3) | `index.html:70`, `:110`, `:141` (`section.section.section-alt`), CSS `css/style.css:53-54` | Faux positif | Dans Chrome, chaque bande a 96 px de marge haute et basse à 1440 px (56 px à 390 px), et le contenu `.conteneur` est en retrait de 130 px (16 px à 390 px) de chaque côté (`css/style.css:52`). Le texte ne touche pas le bord du fond. L'overlay ne relève rien. Raison probable : le scan de fichiers ne calcule pas `clamp()` et `min()`. |
| 6 | cramped-padding `<section>` | `atelier.html:45` (`section-alt`) | Faux positif | Mêmes mesures que ci-dessus. |
| 7 | cramped-padding `<div> "carte"` | `contact.html:35` (et cartes `:48`, `:55`), CSS `css/style.css:289` `padding: clamp(20px, 3vw, 32px)` | Faux positif | Mesuré dans Chrome : 32 px de marge intérieure à 1440 px, 20 px à 390 px. Même raison probable (`clamp()` non calculé). |

### Overlay navigateur

| Règle | Où (fichier:ligne) | Verdict | Raison |
|---|---|---|---|
| low-contrast `.etiquette` | Couleur `--bois: #a8693a` (`css/style.css:15`), règle `.etiquette` (`css/style.css:56`, 0,88 rem soit 14,08 px, graisse 600). Rendue par `js/main.js:174` (cartes produits) et `produit.html:89` (fiche). | Vrai positif | Recalculé à la main : #a8693a sur #ffffff = 4,42:1, sur #eef3ef = 3,94:1. Texte de 14 px : le seuil est 4,5:1. L'overlay ne marque qu'une étiquette par page, mais toutes les étiquettes de catégorie des cartes produits ont la même couleur (visible sur la capture `produit-1440.png`, rubrique « Vous aimerez aussi »). Les étiquettes des tuiles de catégories de l'accueil (`index.html:193`) sont en blanc (`css/style.css:156`) et ne sont pas concernées. |
| low-contrast `.signature` | `css/style.css:523` (`font: 600 1.2rem/1`, couleur `--bois`), `index.html:41` | À confirmer (proche du vrai positif) | 4,42:1 sur blanc, texte de 19,2 px en graisse 600. Pour le WCAG, un texte « grand » doit faire au moins 18,66 px **en gras**. Les outils comme axe ne comptent comme gras qu'à partir de 700 : à 600, le seuil reste 4,5:1 et le constat tient. Il manque 0,08. Même règle à `atelier.html:37` (page non passée à l'overlay). |
| skipped-heading boutique | `boutique.html:29` (`<h1>`), puis `js/main.js:175` (`<h3>` de chaque carte) | Vrai positif | Titres visibles relevés dans Chrome : H1 « La boutique » puis directement les H3 des produits, sans H2. |
| skipped-heading panier | `panier.html:133` (`<h1>Mon panier`), `panier.html:146` (`<h3>` de la ligne), le `<h2>Votre commande` n'arrive qu'à `panier.html:206` | Vrai positif | Le H3 de l'article vient avant tout H2. |
| straggler héros | `p.chapeau` (`index.html:33`, texte `data/donnees.js:65`) | Vrai positif, cosmétique | Mot seul en dernière ligne à 1440 px. |
| straggler catégories | `index.html:195`, textes `data/donnees.js:93` et `:99` | Vrai positif, cosmétique | « image. » à 1440 et 390 px, « mariage. » à 1440 px. |
| straggler étape « Recevez » | `index.html:136` | Vrai positif, cosmétique | 1440 px. |
| straggler sous-titre | `index.html:75` | Vrai positif, cosmétique | 390 px. |
| straggler slogan du pied de page | `js/main.js:222`, texte `data/donnees.js:9` | Vrai positif, cosmétique | « bijoux » seul à 390 px, sur toutes les pages (index, boutique, produit, panier). |
| straggler panier | `panier.html:134` (`p.chapeau`) et `panier.html:231` (`p.aide`) | Vrai positif, cosmétique | 1440 px. |

Note sur les stragglers : ils dépendent de la largeur et du texte saisi dans l'admin. Le CSS n'a `text-wrap: balance` que sur les titres (`css/style.css:44`) ; les paragraphes sont en `text-wrap: wrap` (valeur mesurée dans Chrome).

## 4. Synthèse

- Scan CLI : 7 constats. Les **5 cramped-padding sont des faux positifs** (bandes `section-alt` et cartes de contact, qui ont en réalité 16 à 130 px de retrait). Les **2 tight-leading sont de vrais positifs mineurs** (interligne 1,25 de la citation `.mot-atelier p`).
- Overlay : 24 constats sur 8 vues. Problèmes réels distincts : le contraste de la couleur `--bois` (#a8693a) pour les petites étiquettes (4,4:1 sur blanc, 3,9:1 sur fond sauge), la hiérarchie de titres H1 → H3 sur la boutique et le panier, et des mots seuls en fin de paragraphe (cosmétique). La signature en `--bois` est à confirmer (4,42:1 en graisse 600).
- Le scan CLI et l'overlay ne se recoupent pas : le CLI ne lance pas le JavaScript et ne voit donc ni cartes produits, ni panier, ni pied de page ; l'overlay ne relève pas les cramped-padding (cohérent avec les mesures réelles).

## 5. Étapes ratées, écarts et limites

- **Premier passage du panier vide** : le clic sur « Ajouter au panier » n'avait rien ajouté (le premier clic sans texte affiche seulement un avertissement). Corrigé par un second clic ; le panier contenait alors 1 ligne (`panier-mtb` dans localStorage). Les captures du panier vide ont été remplacées par celles du panier rempli ; les résultats du passage vide restent dans `resultats-overlay.json`.
- **Effet de bord du live-server** : `impeccable live-server --background` a créé dans le dépôt le dossier `.impeccable/live/` avec `server.json`. Après `stop --keep-inject`, il restait les dossiers vides `.impeccable/live/annotations` et `.impeccable/live/sessions`. Je les ai supprimés (ils étaient vides et absents avant l'audit). Aucun fichier suivi par git n'a été modifié (`git diff` vide).
- **Pas de numéro de ligne** dans le JSON du CLI (`"line": 0` partout) : localisation faite à la main dans le code.
- **Couverture de l'overlay** : 4 pages seulement (index, boutique, produit, panier). atelier, contact, idées cadeaux et avis n'ont pas été passés à l'overlay ; leurs constats CLI ont été vérifiés par mesure dans Chrome (`verif.js`) pour atelier et contact.
- Le préflight, l'injection, la lecture console et l'arrêt du serveur ont tous fonctionné ; aucune étape n'a échoué.
