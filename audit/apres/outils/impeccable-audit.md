# Audit technique impeccable — nouveau site Mon Truc en Bois (après refonte)

Date : 24/10/2026. Branche `refonte` (dernier commit `443bb2b`).
Méthode : `reference/audit.md` du skill impeccable 4.7.1 (5 dimensions notées 0 à 4, constats P0 à P3), plus le volet « Assessment B » de `critique.md` (détecteur en ligne de commande, puis overlay injecté par le navigateur).
Audit en lecture seule : aucun fichier suivi du dépôt n'a été modifié. Seuls ce rapport, la sortie du détecteur et les captures de l'overlay ont été ajoutés dans `audit/apres/outils/`.

Ce qui a été audité :

- le site Astro construit en local (`cd site && npm run build`, sortie `site/dist/`, 61 fichiers HTML), servi sur `http://127.0.0.1:4180/` par un petit serveur statique ;
- la variante démo construite hors du dépôt (`MTB_DEMO=1 npx astro build --outDir <scratchpad>/dist-demo`), servie sur `http://127.0.0.1:4181/`, pour la page `/demo/` et l'admin (`/admin.html?demo=1`, identifiants de démo pré-remplis par `js/demo.js`) ;
- les mesures Lighthouse et axe déjà faites sur https://mon-truc-en-bois.pages.dev (`audit/apres/mesures/`), lues mais pas relancées.

Pages : accueil, boutique, fiche `planche-aperitif`, occasions, atelier, contact, avis, panier rempli, suivi, démo ; admin en mode démo : accueil, questionnaire, fiche produit (fenêtre « Modifier le produit »), caisse.

## D'où viennent les preuves

| Repère | Ce que c'est |
| --- | --- |
| **[code]** | Lecture du code, avec fichier:ligne. |
| **[détecteur]** | `impeccable detect --json site/dist` (61 fichiers HTML). Sortie brute : `audit/apres/outils/impeccable-detect-reaudit.json`. |
| **[overlay]** | `impeccable live-server --background`, `detect.js` injecté par le navigateur sur 4 pages en 1440 et 390 px, messages console lus, puis `live-server stop --keep-inject`. Captures : `audit/apres/outils/overlay/`. |
| **[PW 1440]** / **[PW 390]** | Playwright + Chrome installé (`channel: "chrome"`), 1440×900 (DPR 1) ou 390×844 (mobile, tactile, DPR 2). |
| **[PW zoom]** | Zoom de page 200 % simulé (720×450 et 640×400 à DPR 2, soit 1440 et 1280 px zoomés) ; texte seul 200 % (`html { font-size: 200% }` injecté) à 1440 et 390 px. |
| **[PW sans JS]** | Chrome avec JavaScript désactivé. |
| **[Lighthouse]** / **[axe]** | Rapports existants dans `audit/apres/mesures/` (site en ligne). |

Scripts et mesures brutes (hors dépôt) : `C:\Users\yoann\AppData\Local\Temp\claude\C--Users-yoann-Desktop-Projets-divers-Mon-truc-en-bois\e53e7e4c-da10-4f44-8fd9-9f303b96b9d5\scratchpad\reaudit-tech\` (`overlay.cjs`, `mesures1.cjs` à `mesures6.cjs`, `admin.cjs`, `marges.cjs`, résultats `.json`, captures dans `cap\`).

Limites : aucun appareil physique, aucun lecteur d'écran réel. Les gestes tactiles (glisser la rangée de navigation et les filtres) n'ont pas été synthétisés : seule la mise en page tactile émulée a été vérifiée. Les poids mesurés en local sont non compressés pour le HTML, le CSS et le JS (le serveur local ne compresse pas) : ils sont plus élevés que sur Cloudflare.

## Score de santé

| # | Dimension | Note | Constat principal |
| --- | --- | --- | --- |
| 1 | Accessibilité | 3 | Site public : tous les textes passent AA (le plus faible 4,6:1), focus visible et conservé. Reste : focus caché par les barres collées (panier, aperçu) et, dans l'admin, 17 arrêts de tabulation dans un menu invisible |
| 2 | Performance | 3 | Lighthouse mobile 94 à 97, LCP 2,0 à 2,3 s, CLS 0, WebP en `srcset`. Reste : 3 feuilles CSS bloquantes ; l'admin charge encore les polices de l'ancien site |
| 3 | Theming | 3 | Tokens partout (354 `var()`), 6 `#fff` en dur seulement. Pas de mode sombre ; l'admin recopie les tokens et la démo garde l'ancienne couleur `#a8693a` |
| 4 | Responsive | 3 | Aucun débordement à 390 px sur les 10 pages, zoom de page 200 % sans casse. Reste : lien « Contact » coupé dans la rangée de navigation entre 390 et 430 px, texte seul 200 % à 390 px |
| 5 | Intégrité d'implémentation | 3 | Interdits du brief respectés, aucun vrai positif « qualité » du détecteur. Reste : l'admin et la démo gardent des restes de l'ancien système |
| **Total** | | **15/20** | **Bon (travailler les points faibles)** |

## Verdict d'intégrité d'implémentation

**Réussi, avec des restes dans l'admin.** Le site public exprime un système propre à ce produit :

- Les tokens du brief §3 sont dans `site/src/styles/socle.css:13-49` et utilisés partout (354 appels `var()` dans `site/src`). Les seules couleurs écrites en dur sont 6 `#fff` (texte sur bouton d'achat) et les teintes de matière du SVG du configurateur (`site/src/lib/configurateur.ts:218,248-249`), qui dessinent le bois, l'ardoise et le papier : c'est leur rôle. **[code]**
- Les interdits du brief sont absents : aucun dégradé, aucun flou, aucun arrondi (`--rayon: 0`), aucune étoile, aucun pictogramme de réassurance, aucun mot creux (recherche dans `site/src`). Les seules `box-shadow` tracent des filets nets de 1 px (`GrillePieces.astro:21`). **[code]**
- L'aperçu de gravure est un SVG dessiné sur une pièce vierge, texte dans la teinte de gravure (5,68:1 sur le bois, 7,94:1 sur l'ardoise, calcul sur `configurateur.ts:218,248`). Une seule animation (le texte qui se grave, 1 100 ms) et elle disparaît en mouvement réduit. **[code]** + **[PW 1440]**
- Le contenu est dans le HTML : sans JavaScript, les 10 pages publiques affichent leur titre et leur texte ; le panier affiche un message `<noscript>` avec le téléphone et l'email. **[PW sans JS]**
- Le détecteur ne trouve aucun vrai positif « qualité » : ses 182 constats se ramènent à 3 règles, dont 2 faux positifs vérifiés et 1 choix imposé par le brief (détail plus bas). L'overlay rendu ne relève que des signaux typographiques et le titre-affiche de l'accueil. **[détecteur]** + **[overlay]**

Les restes de l'ancien système sont tous côté admin et démo : `admin.html:21` charge encore `css/style.css` de l'ancien site, qui importe 5 familles Google Fonts de l'ancienne charte (`css/style.css:1`) ; le bandeau démo est en `#a8693a` et en Figtree (`js/demo.js:476`) ; `css/admin.css:4-38` recopie les tokens au lieu de les partager.

## Résumé

- Score : **15/20 (Bon)**, contre 11/20 avant la refonte.
- Constats : **0 P0, 1 P1, 7 P2, 4 P3** (12 au total, contre 22 avant).
- Les plus importants :
  1. Admin, écrans de moins de 1000 px (téléphone, ou ordinateur zoomé à 150 %) : le menu latéral fermé reste dans l'ordre de tabulation. Les 17 premiers arrêts sont invisibles (P1).
  2. Le focus clavier passe sous la barre « Total / Finaliser » du panier et sous le bandeau d'aperçu collé de la fiche (P2).
  3. Dans la rangée de navigation sur téléphone, le lien « Contact » reste caché même quand il a le focus (P2).
  4. Sans JavaScript, le formulaire de devis met le nom, l'email et le message dans l'adresse de la page et n'envoie rien (P2).
  5. Le bandeau démo de l'admin est à 4,42:1 (P2).
- Suite conseillée : `/impeccable harden` pour le focus et le formulaire, `/impeccable adapt` pour la rangée de navigation, `/impeccable optimize` pour l'admin.

## Constats détaillés par gravité

### P1 — Majeur

**[P1] Admin : le menu latéral fermé reste atteignable au clavier, hors de l'écran**
- **Emplacement** : `css/admin.css:349-353` (sous 1000 px, le menu est seulement décalé par `transform: translateX(-102%)`, sans `visibility: hidden` ni `inert`) ; `admin.html:86-127` (menu) ; `js/admin.js:419-422` (`menu()` ne bascule qu'une classe).
- **Catégorie** : Accessibilité
- **Preuve** : **[PW]** après connexion en démo, à 390 px et à 853 px de large (1280 px zoomés à 150 %), les 17 premiers arrêts de tabulation (logo, Accueil, Commandes, Caisse, Clients…) sont hors de l'écran ; le premier élément visible n'arrive qu'au 18e arrêt. Le rectangle du menu fermé est mesuré à −306→−6 px.
- **Impact** : une personne au clavier (ou qui agrandit l'écran) ne voit pas où est le focus pendant 17 appuis sur Tab, à chaque ouverture de l'admin, puis repasse par ces arrêts invisibles à chaque tour de page.
- **WCAG** : 2.4.7 Visibilité du focus (AA) ; 2.4.3 Parcours du focus (A).
- **Recommandation** : quand le menu est fermé sous 1000 px, `visibility: hidden` (avec la transition sur `visibility`) ou l'attribut `inert` sur `#admin-nav` ; à l'ouverture, focus sur le premier onglet ; Échap referme et rend le focus au bouton « Plus ».
- **Commande** : `/impeccable harden`

### P2 — Mineur

**[P2] Panier sur téléphone : le focus passe sous la barre « Total / Finaliser »**
- **Emplacement** : `site/src/pages/panier.astro:1023-1033` (`.barre-mobile` en `position: fixed` en bas, 67 px de haut, jusqu'à 1000 px de large) ; aucun `scroll-padding-bottom` dans `socle.css`.
- **Catégorie** : Accessibilité / Responsive
- **Preuve** : **[PW 390]** en tabulant depuis le haut du panier rempli, le champ date (`#c-date`, 790→844 px) et le lien « Mentions légales » (772→804 px) sont cachés à 100 % par la barre (points testés par `elementFromPoint`). Capture `cap\panier-390-focus-date.png` (focus programmé, champ visible) pour comparaison.
- **Impact** : au clavier ou avec un clavier Bluetooth sur tablette, on ne voit pas le champ où l'on tape.
- **WCAG** : 2.4.11 Focus non masqué (AA, WCAG 2.2 ; la cible du brief est 2.1 AA, d'où P2).
- **Recommandation** : `html { scroll-padding-bottom: 80px; }` tant que la barre est visible (ou une classe posée par le script qui l'affiche).
- **Commande** : `/impeccable harden`

**[P2] Fiche et accueil sur téléphone : le bandeau d'aperçu collé cache le focus en remontant**
- **Emplacement** : `site/src/components/Configurateur.astro:148-161` (`.cfg-bandeau` en `position: sticky; top: 0`, 156 px de haut, sous 900 px).
- **Catégorie** : Accessibilité / Responsive
- **Preuve** : **[PW 390]** sur la fiche, Tab jusqu'au bouton d'achat puis Maj+Tab : la pastille de police choisie (39→112 px) est cachée à 100 % par `.cfg-bandeau-scene`. Capture `cap\fiche-390-maj-tab.png`. En descendant (Tab), rien n'est caché.
- **Impact** : en revenant changer la police au clavier, on ne voit pas la pastille active.
- **WCAG** : 2.4.11 Focus non masqué (AA, WCAG 2.2).
- **Recommandation** : `scroll-margin-top: 170px` sur `.cfg-groupe` et les champs du configurateur sous 900 px (ou `scroll-padding-top` sur `html` dans ce gabarit).
- **Commande** : `/impeccable harden`

**[P2] Rangée de navigation sur téléphone : « Contact » reste caché, même au focus**
- **Emplacement** : `site/src/components/Entete.astro:75-84` (`.navigation` en `flex-basis: 100%` avec `margin-inline: calc(-1 * var(--gouttiere))` : la marge de gauche décale la rangée, celle de droite ne l'élargit pas ; la rangée s'arrête à 358 px sur un écran de 390 ; `scrollbar-width: none`).
- **Catégorie** : Responsive / Accessibilité
- **Preuve** : **[PW]** Contact au focus clavier (8e Tab) : 1 px visible sur 63 à 390 px, 23 px à 412, 41 px à 430 ; entièrement visible à 360 et 375 px. Chrome ne fait pas défiler la rangée car le lien est « partiellement » visible (`scrollLeft` reste à 0). Capture `cap\nav-390-contact-focus.png` : seul un trait de l'anneau de focus dépasse. Le filet du haut de la rangée s'arrête aussi 32 px avant le bord. Au zoom de page 200 % (720 et 640 px), la rangée ne défile pas et Contact est visible.
- **Impact** : sur les téléphones les plus courants (390 à 430 px), « Contact » n'apparaît pas sans glisser la rangée, et au clavier le focus disparaît.
- **WCAG** : 2.4.11 Focus non masqué (AA, 2.2) ; 2.4.7 Visibilité du focus (AA) dans les faits, puisque l'indicateur est hors de la zone visible.
- **Recommandation** : `width: calc(100% + 2 * var(--gouttiere))` (ou `margin-right` négatif effectif) pour que la rangée aille au bord ; `scroll-padding-inline: var(--gouttiere)` ; ou passer la navigation sur deux lignes sous 430 px.
- **Commande** : `/impeccable adapt`

**[P2] Formulaire de devis sans JavaScript : données dans l'adresse, rien n'est envoyé**
- **Emplacement** : `site/src/components/FormulaireDevis.astro:13-20` (`<form>` sans `action` ni `method`, envoi géré seulement par le script `:129-130`) ; aucun `<noscript>` sur la page contact.
- **Catégorie** : Accessibilité / Intégrité d'implémentation
- **Preuve** : **[PW sans JS]** formulaire rempli avec des valeurs de test puis envoyé : la page se recharge sur `/contact/?nom=…&email=…&message=…`, aucun message, aucun envoi.
- **Impact** : le visiteur croit avoir envoyé sa demande ; son email et son message se retrouvent dans l'historique du navigateur et dans les journaux du serveur.
- **Recommandation** : `method="post"` (rien dans l'adresse) et un `<noscript>` qui donne le téléphone et l'email, comme le panier le fait déjà (`panier.astro:104-108`).
- **Commande** : `/impeccable harden`

**[P2] Admin en démo : bandeau à 4,42:1, couleur et police de l'ancien site**
- **Emplacement** : `js/demo.js:476` (`background:#a8693a;color:#fff;font:500 13px … Figtree`). Le site public le recolore (`site/src/layouts/Base.astro:222-226`, 6,01:1) ; l'admin non.
- **Catégorie** : Accessibilité / Theming
- **Preuve** : **[PW 1440/390]** liens « Boîte mail », « Guide », « Admin », « Quitter » et texte « Démo : rien n'est envoyé ni payé » à 4,42:1 en 13 px sur l'écran de connexion et les 4 vues de l'admin. Figtree est téléchargé par l'admin (liste des polices chargées).
- **Impact** : bandeau mal lisible pendant la présentation ; troisième famille de police et ancien accent à l'écran.
- **WCAG** : 1.4.3 Contraste minimum (AA). Classé P2 car visible seulement en mode démo, pas par les clients.
- **Recommandation** : reprendre dans `demo.js` les valeurs du site public (`var(--gravure)` et `var(--f-machine)`), ou ajouter la même règle `#bandeau-demo` dans `css/admin.css`.
- **Commande** : `/impeccable colorize`

**[P2] Admin : rôle « onglets » incomplet sur le menu**
- **Emplacement** : `admin.html:88` (`<nav role="tablist">` qui contient des `<p class="nav-groupe">` et un `<div class="nav-agence">`) ; boutons `role="tab"` sans `aria-controls`, tous dans l'ordre de tabulation, sans flèches ; `#contenu` est un `<main>`, pas un `tabpanel`.
- **Catégorie** : Accessibilité
- **Preuve** : **[PW]** enfants directs du `tablist` : `p`, `tab`, `div` ; onglet actif `tabindex=null aria-controls=null`.
- **Impact** : un lecteur d'écran annonce des onglets qui ne se comportent pas comme des onglets (« onglet 1 sur 15 », mais les flèches ne font rien).
- **WCAG** : 4.1.2 Nom, rôle et valeur (A).
- **Recommandation** : retirer `role="tablist"`/`role="tab"` et garder des boutons avec `aria-current="page"` sur la vue active (c'est une navigation, pas des onglets).
- **Commande** : `/impeccable harden`

**[P2] Admin : polices et feuille de style de l'ancien site chargées pour rien**
- **Emplacement** : `admin.html:21` (`css/style.css`, 41 Ko, dont la ligne 1 importe Bricolage Grotesque, Figtree, IBM Plex Mono, Dancing Script et Caveat) ; `admin.html:146-147` (supabase-js et qrcode depuis deux CDN, en synchrone) ; 7 scripts locaux synchrones (`js/admin.js` 89 Ko, `admin-crm.js` 66 Ko… non compressés).
- **Catégorie** : Performance
- **Preuve** : **[PW 390]** écran de connexion : 20 requêtes, 603 Ko ; après les 4 vues à 1440 px : 50 requêtes, 3 277 Ko. Polices chargées : Big Shoulders, Literata, et Figtree 500/600/700.
- **Impact** : ouverture de l'admin plus lente sur le téléphone de la boutique, en 4G ; chaîne CSS → `@import` → polices qui bloque le premier affichage.
- **Recommandation** : ne plus charger `css/style.css` (ou en retirer l'`@import`), passer les scripts en `defer`.
- **Commande** : `/impeccable optimize`

### P3 — Finition

**[P3] Texte seul agrandi à 200 % sur téléphone : défilement horizontal**
- **Emplacement** : rangée de navigation (`Entete.astro:75-84`), barre du panier (`panier.astro:1023`), adresses email longues (suivi, démo).
- **Catégorie** : Responsive
- **Preuve** : **[PW zoom]** zoom de page 200 % : aucun débordement sur les 10 pages. Texte seul 200 % : aucun débordement à 1440 px (l'en-tête ne déborde plus, contrairement à avant) ; à 390 px, pages larges de 453 à 487 px (barre « Finaliser » à 498 px, `contact@montrucenbois.fr` à 471 px).
- **WCAG** : 1.4.4 respecté par le zoom de page ; défaut de confort pour qui agrandit seulement le texte.
- **Recommandation** : `overflow-wrap: anywhere` sur les adresses ; barre du panier qui passe sur deux lignes.
- **Commande** : `/impeccable adapt`

**[P3] Erreurs du panier : le focus ne va pas à la première erreur de la page**
- **Emplacement** : `site/src/pages/panier.astro:618-623` (l'adresse, étape 03, est vérifiée après le nom, l'email et le téléphone de l'étape 04).
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 1440/390]** livraison choisie, envoi à vide : 5 champs en `aria-invalid`, message « 5 points à corriger » annoncé, focus sur `#c-nom` alors que `#c-adresse` est plus haut.
- **Recommandation** : vérifier dans l'ordre de la page (date, pièces, adresse, coordonnées, CGV).
- **Commande** : `/impeccable harden`

**[P3] Feuilles CSS bloquantes et polices non préchargées**
- **Emplacement** : `<head>` de chaque page (ex. accueil : `Base.css`, `ApercuGravure.css`, `index.css`) ; polices auto-hébergées sans `<link rel="preload">`.
- **Catégorie** : Performance
- **Preuve** : **[Lighthouse]** mobile : `render-blocking-resources` à 0 sur l'accueil et la fiche, FCP 2,1 s (accueil) ; scores 94 (accueil), 96 (boutique), 97 (fiche), tous au-dessus de la cible du brief (90).
- **Recommandation** : `inlineStylesheets: "always"` pour le CSS critique (il fait 13,7 Ko pour `Base`), `preload` de Big Shoulders 800 (le `<h1>` est l'élément LCP).
- **Commande** : `/impeccable optimize`

**[P3] Signaux typographiques de l'overlay et page interne publiée**
- **Emplacement** : `site/src/pages/index.astro:46` (h1 de 89 px, 40 % de la hauteur d'écran à 1440 px) ; mots seuls en fin de ligne (« gravés », « textile » dans l'encart atelier de l'accueil, « boutique » dans les infos de la fiche à 390 px, « ! » dans la légende de la photo) ; `panier.astro:913` (`.avis-fermeture` à environ 86 caractères par ligne) ; `site/src/pages/socle.astro` (nuancier interne publié sur `/socle/`).
- **Catégorie** : Intégrité d'implémentation
- **Preuve** : **[overlay]** `oversized-h1`, `straggler` ×4, `line-length` ; **[code]** pour `/socle/`.
- **Impact** : faible. Le titre-affiche est un choix du brief (`--t-affiche`, Big Shoulders 800) ; à 1440×900, il repousse le bouton « Personnaliser cette pièce » sous la ligne de flottaison (l'aperçu, lui, est visible).
- **Recommandation** : `max-width: 34em` sur `.avis-fermeture` ; `text-wrap: pretty` déjà en place sur `p`, l'étendre aux `dd` et `figcaption` ; sortir `/socle/` du build de production.
- **Commande** : `/impeccable typeset`

## Résultats du détecteur et faux positifs

### Scan des fichiers (`impeccable detect --json site/dist`)

Code de sortie 2. **182 constats sur 61 fichiers**, 3 règles seulement. Tous ont `"line": 0` : localisation faite à la main.

| Règle | Nombre | Où | Verdict après vérification |
| --- | --- | --- | --- |
| `low-contrast` « :hover state 2.8:1 — text #a4471c on #231a14 » | 59 | toutes les pages publiques (1 par page) | **Faux positif.** Les deux bandes brûlées ont leur propre survol : `Entete.astro:50` et `Pied.astro:38` (`color: var(--kraft)`). Mesuré dans Chrome en survolant : `rgb(215,191,156)` sur `rgb(35,26,20)`, soit 9,62:1, sur les 10 pages. Le scan de fichiers applique la règle globale `a:hover` (`socle.css:76`) sans voir les règles du composant. L'overlay rendu ne relève rien. |
| `cramped-padding` « `<div> "adresse"`: children flush against bg » | 59 | toutes les pages publiques | **Faux positif.** La marge est sur l'enfant `.conteneur`, pas sur `.adresse`. Retrait réel du texte : 11 px en haut et en bas, 84 px sur les côtés à 1440 ; 9 px et 16 px à 390 (`marges.cjs`). |
| `cramped-padding` « `<section> "bande"` » | 4 | accueil ×2 (« Par occasion », « Associations, clubs, entreprises »), atelier (« Venir à la boutique »), avis (« Laisser un avis ») | **Faux positif.** Retrait réel : 36 à 83 px en haut et en bas, 16 à 108 px sur les côtés (`.bande > .conteneur`, `socle.css:104`). |
| `cream-palette` « rgb(239, 230, 216) » | 60 | 59 pages + `admin.html` | **Vrai au sens de la règle, mais voulu.** C'est `--bouleau` #EFE6D8, fond principal imposé par le brief §3 (« palette tirée des matières »). Écart assumé, pas un défaut. |

Sur les 11 pages de la première passe après refonte (`audit/apres/mesures/impeccable-detect.json`, 37 constats), le résultat est identique : 11 survols, 15 marges (11 `adresse` + 4 `bande`), 11 fonds crème. Les trois jugements de cette passe sont confirmés : le contraste au survol est bien corrigé dans le rendu (le scan statique le signale encore), les 15 marges sont des faux positifs, les 11 fonds crème viennent du brief.

### Overlay dans le navigateur

Préflight réussi sur les 8 vues (titre préfixé `[Human]`, balise `<script>` ajoutée dans le DOM du navigateur), `detect.js` injecté, aucune erreur `[impeccable]`, aucune erreur JavaScript de page. Le live-server a été lancé depuis le dossier de travail (son dossier `.impeccable/` est hors du dépôt) et arrêté par `live-server stop --keep-inject`.

| Page | 1440 px | 390 px |
| --- | --- | --- |
| accueil | 5 : `oversized-h1` (89 px, 40 vh), 3 `straggler`, `cream-palette` | 1 : `cream-palette` |
| boutique | 1 : `cream-palette` | 1 : `cream-palette` |
| fiche planche-aperitif | 1 : `cream-palette` | 2 : `straggler` (« boutique »), `cream-palette` |
| panier rempli (1 ligne) | 2 : `line-length` (~86 car., `.avis-fermeture`), `cream-palette` | 1 : `cream-palette` |

Total : **14 constats** sur 8 vues, contre 24 avant la refonte. L'overlay ne relève **ni contraste, ni titre sauté, ni marge serrée**. Sur la capture `accueil-1440.png`, la photo de l'encart « L'atelier » apparaît vide : c'est un effet de la capture pleine page (image en `loading="lazy"` jamais atteinte par le défilement), pas un défaut du site.

### Fausses alertes de mes propres scripts (écartées)

- Occasions : les liens n'ont pas d'`outline` propre, mais la ligne entière reçoit l'anneau (`ListeOccasions.astro:52`, `.occasion:has(a:focus-visible)`).
- Champ date du panier et du devis : l'anneau est bien visible (capture `cap\panier-390-focus-date.png`).
- Échantillons de police (« Marie » 3 px plus haut que sa boîte) : aucune coupure visible (capture `cap\polices-1440.png`).
- Admin : boutons « Monter / Descendre dans la liste », flèches de photo et « Enregistrer la vente » sous 4,5:1 : ils sont désactivés (`opacity` de `css/admin.css:79,134`), donc exemptés par le WCAG.
- **[axe]** `region` (2 nœuds par page : bandeau « Site en préparation » et bande adresse) : déjà corrigé, le HTML en ligne et local place ces blocs dans `<aside aria-label="Information">` et `<header>` (`Base.astro:209-211`, `Entete.astro:16-22`).

## Problèmes systémiques

- **Les éléments collés à l'écran ne réservent pas leur place pour le focus** : barre du panier en bas, bandeau d'aperçu en haut. Aucun `scroll-padding` ni `scroll-margin` dans le socle.
- **L'admin vit encore à moitié dans l'ancien système** : `css/style.css` et ses polices, tokens recopiés dans `css/admin.css`, bandeau démo en ancienne couleur. C'est la source de 3 des 7 P2.
- **Les formulaires qui dépendent du script n'ont pas de repli** (devis), alors que le panier en a un.

## Ce qui fonctionne

- **Contrastes** : sur 10 pages et 2 largeurs, 55 à 158 textes testés par page, aucun sous le seuil. Couples les plus faibles : texte doux sur bouleau foncé 4,6:1, gravure sur bouleau 4,86:1. **[PW]** Lighthouse accessibilité 100 sur les 6 rapports. **[Lighthouse]**
- **Focus** : lien d'évitement en premier arrêt sur les 9 pages publiques (5e sur la démo, après le bandeau) ; anneau visible sur tous les arrêts (86 à 89 par page). **[PW]**
- **Focus conservé dans le panier** : flèche sur « Retrait / Livraison », bouton « + », « Retirer » puis « Annuler » : le focus reste sur le bon bouton, la quantité passe à 2, la ligne revient. **[PW 1440/390]**
- **Erreurs du panier** : message sous chaque champ, `aria-invalid`, résumé « 5 points à corriger » dans une zone `aria-live`, focus déplacé. **[PW]**
- **Configurateur** : vrais boutons radio dans un `fieldset`, flèches du clavier, SVG `role="img"` avec un `<title>` mis à jour (« … : « Léa », police Classique »), saisie reprise de l'accueil vers la fiche. **[PW]**
- **Structure** : un seul `<h1>` par page, aucun niveau sauté, aucune image sans `alt`, aucune image sans dimensions, aucun champ sans étiquette (hors champ piège anti-robot masqué), aucun `id` en double. **[PW]**
- **Responsive** : aucun débordement à 390 px, zoom de page 200 % sans casse (1440 et 1280 px), cibles de 44 px sur les boutons et pastilles (les liens du pied font 32 px de haut, au-dessus du seuil AA de 24). **[PW 390, PW zoom]**
- **Mouvement réduit** : l'animation de gravure n'est pas lancée, le texte est affiché d'emblée, les transitions passent à 0,01 ms ; le changement d'état reste visible. **[PW]**
- **Performance** : Lighthouse mobile 94 / 96 / 97, LCP 2,0 à 2,3 s, CLS 0, TBT 0 ms ; photos en WebP 320 à 800 px avec `sizes` (aucune image servie à plus de 1,6 fois sa taille, hors logo de 200 px affiché à 44 px) ; JavaScript de page de 0,2 à 20 Ko. **[Lighthouse]** + **[PW]**
- **Sans JavaScript** : toutes les pages publiques lisibles, aperçu SVG de départ affiché sur la fiche, message `<noscript>` dans le panier, suivi qui affiche « pas encore ouvert » au lieu d'un formulaire inutile. **[PW sans JS]**
- **Admin** : fenêtre « Modifier le produit » qui prend le focus, se ferme à Échap et rend le focus au bouton « Modifier ». **[PW]**

## Actions recommandées

1. **[P1] `/impeccable harden`** : rendre le menu fermé de l'admin `inert` (ou `visibility: hidden`) sous 1000 px, focus au premier onglet à l'ouverture, Échap pour fermer.
2. **[P2] `/impeccable harden`** : `scroll-padding-bottom` quand la barre du panier est visible, `scroll-margin-top` sous le bandeau d'aperçu ; formulaire de devis en `method="post"` avec `<noscript>` ; menu de l'admin sans faux rôle d'onglets ; ordre de vérification des erreurs du panier.
3. **[P2] `/impeccable adapt`** : rangée de navigation qui va jusqu'au bord et fait défiler le lien qui reçoit le focus ; textes longs coupables au texte agrandi.
4. **[P2] `/impeccable colorize`** : bandeau démo de l'admin aux couleurs et police du nouveau site.
5. **[P2] `/impeccable optimize`** : retirer `css/style.css` de l'admin, scripts en `defer` ; CSS critique en ligne et préchargement de Big Shoulders sur le site.
6. **[P3] `/impeccable typeset`** : mesure de `.avis-fermeture`, `text-wrap: pretty` sur `dd` et `figcaption`.
7. **`/impeccable polish`** : passe finale après les corrections.

Vous pouvez me demander de lancer ces commandes une par une, toutes à la fois, ou dans l'ordre de votre choix.

Relancez `/impeccable audit` après les corrections pour voir le score progresser.

## Par page

Poids : chargement complet après défilement, mesuré en local (HTML, CSS et JS non compressés). Les notes 0-4 s'appliquent au site entier ; ce tableau résume les constats de chaque page.

| Page | Accessibilité | Performance | Responsive | Intégrité |
| --- | --- | --- | --- | --- |
| **accueil** | 138 textes, 0 échec ; évitement en 1er ; configurateur au clavier **[PW]** | 24 req., 643 Ko (389 Ko d'images, 178 Ko de polices) ; Lighthouse mobile 94, LCP 2,1 s **[PW, Lighthouse]** | 0 débordement à 390 ; texte 200 % à 390 : 453 px ; bandeau d'aperçu masqué sous 900 px (vignette seule) **[PW]** | `oversized-h1` 89 px (choix du brief), 3 mots seuls **[overlay]** |
| **boutique** | 158 textes, 0 échec ; filtres = vrais liens vers des pages (`aria-current`) **[PW]** | 34 req., 948 Ko (787 Ko d'images, 27 photos) ; Lighthouse mobile 96, LCP 2,3 s ; 262 Ko d'économies `srcset` estimées par Lighthouse **[PW, Lighthouse]** | 0 débordement ; filtres en bandes défilantes (1 202 et 623 px dans 390), barre masquée mais pastille coupée en bord **[PW]** | Rien en overlay hors fond crème **[overlay]** |
| **fiche planche-aperitif** | 118 textes, 0 échec ; polices au clavier ; focus caché par le bandeau en Maj+Tab (P2) ; favori `aria-pressed` 44×44 **[PW]** | 22 req., 409 Ko ; Lighthouse mobile 97, LCP 2,0 s **[PW, Lighthouse]** | 0 débordement ; texte 200 % à 390 : 453 px **[PW]** | Aperçu SVG sur pièce vierge, `<title>` à jour ; pas de message sans JS pour l'ajout au panier **[PW sans JS]** |
| **occasions** | 86 textes, 0 échec ; ligne entière encadrée au focus **[PW]** | 10 req., 157 Ko **[PW]** | 0 débordement ; liens de 39 px de haut (seuil AA passé) **[PW]** | Dates limites signalées `[À COMPLÉTER]` en gravure 4,86:1 **[PW]** |
| **atelier** | 70 textes, 0 échec **[PW]** | 13 req., 415 Ko (464 Ko à 390) **[PW]** | 0 débordement **[PW]** | `cramped-padding` « bande » : faux positif (60/66 px de retrait) **[détecteur, PW]** |
| **contact** | 78 textes, 0 échec ; champs requis marqués `*` et `required`, validation native au focus du 1er champ **[PW]** | 10 req., 164 Ko **[PW]** | 0 débordement ; texte 200 % à 390 : 481 px **[PW]** | Sans JS : données en GET dans l'adresse (P2) **[PW sans JS]** |
| **avis** | 77 textes, 0 échec ; `footer` de citation dans les avis (pas de faux repère) **[PW]** | 11 req., 215 Ko **[PW]** | 0 débordement **[PW]** | `cramped-padding` « bande » : faux positif **[détecteur, PW]** |
| **panier rempli** | 101 textes, 0 échec ; focus conservé, erreurs annoncées ; focus caché par la barre à 390 (P2) ; ordre du focus d'erreur (P3) **[PW]** | 15 req., 220 Ko **[PW]** | 0 débordement ; radios 22×22 dans leur étiquette ; barre « Finaliser » à 498 px au texte 200 % **[PW]** | `line-length` 86 car. sur l'avis de fermeture **[overlay]** |
| **suivi** | 55 textes, 0 échec ; bouton « payer » sans texte mais caché tant qu'aucune commande n'est affichée **[PW]** | 14 req., 173 Ko **[PW]** | 0 débordement ; email à 471 px au texte 200 % **[PW]** | État « pas encore ouvert » honnête, aussi sans JS **[PW sans JS]** |
| **démo** (variante démo) | 99 textes, 0 échec ; bandeau démo recoloré 6,01:1 ; évitement en 5e arrêt, après les 4 liens du bandeau **[PW]** | 12 req., 229 Ko (66 Ko de scripts démo) **[PW]** | 0 débordement ; identifiants à 487 px au texte 200 % **[PW]** | Identifiants de démo affichés et pré-remplis : voulu pour la démonstration **[code]** |
| **admin : accueil** | Menu fermé atteignable hors écran sous 1000 px (P1) ; bandeau démo 4,42:1 (P2) ; faux `tablist` (P2) **[PW]** | Connexion : 20 req., 603 Ko ; Figtree chargé **[PW]** | 0 débordement à 390 ; liens du bandeau de 18 px de haut (passent par l'espacement) **[PW]** | Tokens recopiés, `css/style.css` de l'ancien site **[code]** |
| **admin : questionnaire** | 0 champ sans étiquette, étape courante en `aria-current="step"` **[PW]** | — | 0 débordement, 82 cibles dont 4 sous 44 px **[PW]** | — |
| **admin : fiche produit** | Fenêtre : focus à l'ouverture, Échap, retour au bouton **[PW]** | — | 2 cases à cocher de 17×17 trop proches d'autres cibles à 390 (seuil AA non tenu par l'espacement) **[PW]** | Boutons désactivés à 2,2–2,5:1 (exemptés) **[PW]** |
| **admin : caisse** | 0 champ sans étiquette ; « Enregistrer la vente » désactivé à 3,82:1 (exempté) **[PW]** | Après les 4 vues : 50 req., 3 277 Ko à 1440 **[PW]** | 0 débordement **[PW]** | — |

Note sur la fiche produit de l'admin : les deux cases de 17×17 px sous le seuil de 24 px sans espacement suffisant sont un écart AA (2.5.8) mineur, rattaché au P2 « rôle onglets » pour ne pas multiplier les entrées ; à corriger avec `/impeccable adapt` (étiquette cliquable de 44 px).

## Avant / après

### Score

| Dimension | Avant (site actuel) | Après (refonte) | Ce qui a changé |
| --- | --- | --- | --- |
| Accessibilité | 2 | 3 | Contrastes, focus conservé, titres, lien d'évitement, aperçu lisible ; reste le focus caché (barres collées, menu de l'admin) |
| Performance | 2 | 3 | WebP en `srcset`, polices auto-hébergées, contenu dans le HTML, JS minimal ; reste le CSS bloquant et l'admin |
| Theming | 2 | 3 | 76 couleurs en dur → 6 `#fff` ; 49 styles en ligne → 40 `style=""` qui portent presque tous une variable (`--pile`) ; toujours pas de mode sombre |
| Responsive | 3 | 3 | Texte 200 % : l'en-tête ne déborde plus à 1440 ; nouveau défaut sur la rangée de navigation mobile |
| Intégrité | 2 | 3 | Motifs interdits et étoiles retirés, aperçu juste ; restes de l'ancien système dans l'admin |
| **Total** | **11/20 (Acceptable)** | **15/20 (Bon)** | |

### Les 22 constats du premier audit

| Avant | Gravité | Après | Preuve |
| --- | --- | --- | --- |
| Focus perdu au redessin (panier, filtres) | P1 | **Corrigé** | Focus conservé sur radio, « + », « Retirer », « Annuler » ; filtres devenus des liens **[PW]** |
| Menu mobile : ordre de tabulation, Échap | P1 | **Remplacé** | Plus de menu à ouvrir ; nouvelle rangée qui défile, avec le défaut « Contact caché » (P2) |
| Étiquettes `--bois` à 4,42 et 3,94:1 | P1 | **Corrigé** | 0 texte sous le seuil, minimum 4,6:1 **[PW]** |
| Texte de l'aperçu sur photo à 2 à 3,5:1 | P1 | **Corrigé** | SVG sur pièce vierge, encre 5,68:1 sur bois **[code]** |
| Message d'envoi du panier non annoncé | P1 | **Corrigé** | Résumé dans `[data-etat-envoi]` `aria-live`, erreurs par champ **[PW]** |
| Choix de police sans groupe | P2 | **Corrigé** | `fieldset` + `legend` (`Configurateur.astro:90-91`) |
| Bordures de champs 1,33:1, focus de champ pâle | P2 | **Corrigé** | Filet brûlé 1 px, anneau gravure 2 px **[code, PW]** |
| Texte blanc sur photo des cartes univers | P2 | **Retiré** | Cartes supprimées |
| Hiérarchie de titres sautée | P2 | **Corrigé** | 0 saut sur les 10 pages **[PW]** |
| Pas de lien d'évitement | P2 | **Corrigé** | « Aller au contenu » en 1er arrêt **[PW]** |
| Focus caché par barre d'achat et bouton flottant | P2 | **Partiel** | Bouton flottant retiré ; barre du panier et bandeau d'aperçu cachent encore le focus (P2) |
| Une seule taille d'image, pas de WebP | P2 | **Corrigé** | WebP 320–800 px avec `sizes` **[code, PW]** |
| Images sans dimensions | P2 | **Corrigé** | 0 image sans `width`/`height` **[PW]** |
| Rendu bloqué par polices + JS | P2 | **Presque corrigé** | h1 dans le HTML, polices locales, JS minimal ; 3 CSS bloquants (P3) |
| Couleurs en dur, styles en ligne, pas de mode sombre | P2 | **Presque corrigé** | 6 `#fff` ; mode sombre toujours absent (non demandé par le brief) |
| Texte seul 200 % : débordements | P2 | **Réduit** | Plus rien à 1440 ; 453–487 px à 390 (P3) |
| Cibles sous 44 px, bandes sans repère | P2 | **Presque corrigé** | Boutons et pastilles à 44 px ; bandes à pastille coupée ; liens du pied à 32 px |
| Motifs interdits et étoiles sans données | P2 | **Corrigé** | Aucun dégradé, flou, arrondi, étoile ni picto **[code]** |
| L'aperçu ne montre pas le résultat | P2 | **Corrigé** | Configurateur SVG **[code, PW]** |
| Noms accessibles redondants | P3 | **Corrigé** | « Retirer du panier : nom », favori `aria-pressed`, « Quantité : nom » **[PW]** |
| `alt` identiques, `<h3>` dans un `<span>` | P3 | **Corrigé** | Atelier : 2 photos avec des `alt` distincts et le logo en `alt=""` ; page idées-cadeaux remplacée par les occasions ; aucune image sans `alt` **[PW, code]** |
| Signaux typographiques | P3 | **Persiste (faible)** | 4 mots seuls, 1 ligne longue **[overlay]** |

### Détecteur

| | Avant | Après |
| --- | --- | --- |
| Scan des fichiers | 7 constats (5 `cramped-padding` faux positifs, 2 `tight-leading` mineurs) sur 8 pages | 182 constats sur 61 fichiers, soit 3 par page : 2 faux positifs vérifiés (survol, marges) + fond crème voulu ; 0 vrai positif « qualité » |
| Overlay (8 vues) | 24 constats : 12 `straggler`, 8 `low-contrast`, 4 `skipped-heading` | 14 constats : 8 `cream-palette`, 4 `straggler`, 1 `oversized-h1`, 1 `line-length` ; **0 contraste, 0 titre sauté** |
