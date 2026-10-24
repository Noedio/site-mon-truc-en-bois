# Audit technique impeccable — site actuel Mon Truc en Bois

Date : 24/10/2026. Branche `refonte`, site servi sur http://localhost:4173/.
Méthode : `reference/audit.md` du skill impeccable 4.7.1, appliquée gabarit par gabarit.
Audit en lecture seule : aucun fichier du site n'a été modifié.
Lighthouse et axe ne sont pas utilisés ici (faits par ailleurs).

Gabarits audités : `index.html`, `boutique.html`, `produit.html?id=planche-aperitif`, `idees-cadeaux.html`, `atelier.html`, `panier.html` (avec un article dans le panier), `contact.html`, `avis.html`.
Code lu : les 8 fichiers HTML, `css/style.css`, `js/main.js`, `js/demo.js`, `data/donnees.js`.
Contexte : `PRODUCT.md`, `docs/refonte/BRIEF.md`.

## D'où viennent les preuves

Chaque constat dit quelle source l'a produit. Les sources sont :

| Repère | Ce que c'est |
| --- | --- |
| **[code]** | Lecture du code, avec fichier:ligne. |
| **[détecteur fichiers]** | `impeccable detect --json` sur les 8 fichiers HTML, sans exécuter le JavaScript. |
| **[détecteur 1280]** / **[détecteur 390]** | `impeccable detect --json` sur les 8 URL, rendu Chrome, viewport 1280×800 puis 390×844. |
| **[PW 390]** / **[PW 1280]** | Playwright 1.64.1 + Chrome installé (`channel: "chrome"`), viewport émulé 390×844 (mobile, tactile, DPR 3) ou 1280×800 (DPR 1). |
| **[PW zoom]** | Playwright : zoom de page 200 % simulé par un viewport 640×400 à DPR 2 (équivaut à 1280 px zoomé à 200 %), et texte seul à 200 % (`html { font-size: 200% }` injecté) à 1280 et 390 px. |
| **[PW pixel]** | Playwright : capture de la zone du texte avec le texte rendu transparent, puis contraste calculé contre le pixel le plus clair (pire cas), le 90e centile et la médiane du fond. |

Sortie brute du détecteur : `audit/outils/impeccable-audit-detect.json`.
Scripts Playwright et mesures brutes (hors dépôt) : `C:\Users\yoann\AppData\Local\Temp\claude\C--Users-yoann-Desktop-Projets-divers-Mon-truc-en-bois\e53e7e4c-da10-4f44-8fd9-9f303b96b9d5\scratchpad\audit-tech\` (`mesures.js` à `mesures5.js`, `mesures.json`, `mesures2.json`, `mesures3.json`, captures `.png`).

Ce qui n'a pas été testé : aucun appareil physique, aucun lecteur d'écran réel. Les gestes tactiles (glisser les bandes défilantes) n'ont pas été synthétisés : seule la mise en page tactile émulée a été vérifiée. Les temps de chargement mesurés sont locaux (serveur sur la même machine) : ils ne disent rien du réseau réel.

## Score de santé

| # | Dimension | Note | Constat principal |
| --- | --- | --- | --- |
| 1 | Accessibilité | 2 | Le focus clavier est perdu quand le panier ou les filtres se redessinent ; étiquettes couleur bois à 4,42:1 et 3,94:1 |
| 2 | Performance | 2 | Une seule taille d'image (800 px JPEG) pour tous les écrans : 1,17 Mo sur l'accueil et 1,45 Mo sur la boutique à 390 px |
| 3 | Theming | 2 | Les tokens existent, mais 76 couleurs sont écrites en dur hors `:root` (27 valeurs), 49 styles en ligne, pas de mode sombre |
| 4 | Responsive | 3 | Aucun débordement à 390 px, zoom de page 200 % sans casse ; le texte seul à 200 % fait déborder l'en-tête et 4 gabarits |
| 5 | Intégrité d'implémentation | 2 | Motifs interdits par le brief encore présents, étoiles affichées pour des avis Facebook sans note, aperçu posé sur une photo déjà gravée |
| **Total** | | **11/20** | **Acceptable (travail important à prévoir)** |

## Verdict d'intégrité d'implémentation

**Échec.** Le site a un système interne cohérent (tokens de couleur et de police dans `:root`, 218 appels `var()`, composants réutilisés depuis `js/main.js`). Mais ce système n'est pas propre à ce produit, et il s'écarte du brief :

- Les motifs listés comme interdits dans `docs/refonte/BRIEF.md` §3 sont en place : cartes catégories à dégradé sombre (`css/style.css:151`), rangée de 4 pictos de réassurance (`index.html:48-55`), bouton flottant « Appeler » (`js/main.js:273-284`), en-tête en verre dépoli (`css/style.css:88`), ombres douces (`--ombre`, `css/style.css:28` ; 13 lignes avec une ombre), cartes arrondies à 14 px. **[code]**
- Contenu trompeur : cinq étoiles « ★★★★★ » s'affichent à côté de « Recommandé à 100 % sur Facebook (16 avis) » (`index.html:38`, `produit.html:96`). Facebook ne donne pas de note sur 5 : les étoiles ne correspondent à aucune donnée. **[code]** + **[PW 1280]** (texte du lien lu pendant la tabulation).
- L'aperçu en direct, cœur du produit, pose le texte du client sur une photo de planche déjà gravée d'un autre texte (« J'ai essayé le sport… »). L'aperçu ne montre donc pas le résultat de la gravure. **[PW 390]** capture `apercu-saisi-390.png`.
- Le contenu principal dépend du JavaScript : le `<h1>` de l'accueil est vide dans le HTML (`index.html:32`), la fiche produit et le panier ont un `<main>` vide (`produit.html:15`, `panier.html:16`). **[code]** + **[détecteur fichiers]** (les scans fichiers ne trouvent presque rien car la page est vide sans JS).
- Le détecteur trouve peu de motifs déterministes. Après vérification : 3 vrais positifs (contraste de `--bois`, contraste au pixel sur photo, titre sauté sur la boutique), des signaux typographiques mineurs, et 4 faux positifs (`cramped-padding`, détaillés plus bas).

## Résumé

- Score : **11/20 (Acceptable)**.
- Constats : **0 P0, 5 P1, 14 P2, 3 P3** (22 au total).
- Les plus importants :
  1. Le focus clavier tombe sur `<body>` quand on change retrait/livraison ou la quantité dans le panier, et quand on choisit un filtre dans la boutique (P1).
  2. Le menu mobile : ses liens sont avant le bouton dans l'ordre de tabulation, Échap ne le ferme pas (P1).
  3. Les étiquettes couleur bois (`--bois` #a8693a) échouent au contraste AA sur toutes les grilles produit (P1).
  4. Le texte de l'aperçu en direct est peu lisible sur la photo : 2,0 à 3,0:1 sans l'ombre, 3,5:1 avec l'ombre (P1).
  5. Le message « l'envoi en ligne n'est pas encore ouvert » du panier n'est pas annoncé aux lecteurs d'écran et s'affiche loin du bouton (P1).
- Suite conseillée : corriger les P1 d'accessibilité avec `/impeccable harden` et `/impeccable colorize`, puis les images et les polices avec `/impeccable optimize`.

## Constats détaillés par gravité

### P1 — Majeur

**[P1] Le focus clavier est perdu quand la page se redessine (panier, filtres de la boutique)**
- **Emplacement** : `panier.html:105-116` (`afficher()` réécrit tout `#contenu` en `innerHTML`), déclenché par `panier.html:246-261` (mode, quantité, emballage) ; `boutique.html:79-83` (les boutons de filtre sont recréés à chaque clic) et `boutique.html:115-120`.
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 1280]** focus sur le bouton radio « Livraison », flèche gauche : « Retrait » est bien coché, mais `document.activeElement` = `BODY`. Même résultat après une quantité modifiée puis Tab, et après Entrée sur le filtre « Gravure bois ». Le texte déjà saisi (nom) est bien conservé.
- **Impact** : une personne au clavier ou au lecteur d'écran repart du haut de la page à chaque choix. Dans le panier, elle doit retraverser l'en-tête et les lignes pour revenir au formulaire. Les flèches ne permettent plus de parcourir les deux boutons radio.
- **WCAG** : 2.4.3 Parcours du focus (A).
- **Recommandation** : ne redessiner que le récapitulatif et le bloc adresse, pas le formulaire. Sinon, mémoriser l'`id` de l'élément actif avant le rendu et lui rendre le focus après. Dans la boutique, mettre à jour `aria-pressed` sur les boutons existants au lieu de les recréer.
- **Commande** : `/impeccable harden`

**[P1] Menu mobile : ordre de tabulation à l'envers, pas de fermeture par Échap**
- **Emplacement** : `js/main.js:203-212` (la `<nav>` est avant les icônes et le bouton burger dans le DOM), `js/main.js:592-596` (gestion du clic seulement).
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 390]** focus sur « Menu », Entrée : le menu s'ouvre. Tab suivant : « Découvrir la boutique » (hors du menu). Échap : le menu reste ouvert. Le bouton n'a pas d'`aria-controls`. Les liens du menu sont placés avant les icônes favoris et panier : il faut revenir en arrière avec Maj+Tab (le premier Maj+Tab mène à l’icône panier). Le même menu sert sur ordinateur dès que la fenêtre fait 860 px de large ou moins (par exemple 1280 px zoomés à 150 % ou plus).
- **Impact** : au clavier, les liens du menu sont introuvables après l'ouverture. Le menu ouvert ne se referme qu'en recliquant sur le bouton.
- **WCAG** : 2.4.3 Parcours du focus (A) ; 2.1.1 Clavier (A) pour la fermeture attendue.
- **Recommandation** : placer le bouton avant la `<nav>` dans le DOM (ou déplacer le focus sur le premier lien à l'ouverture), ajouter `aria-controls`, fermer sur Échap et rendre le focus au bouton.
- **Commande** : `/impeccable harden`

**[P1] Étiquettes couleur bois sous le seuil de contraste**
- **Emplacement** : `css/style.css:15` (`--bois: #a8693a`), `css/style.css:56` (`.etiquette`), `css/style.css:523` (`.signature`). Utilisées sur chaque carte produit (`js/main.js:174`), l'étiquette équipe de l'atelier (`atelier.html:32`) et la signature manuscrite (`index.html:41`, `atelier.html:37`).
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 390]** et **[PW 1280]** contraste calculé 4,42:1 sur blanc (texte de 14,1 px) et 3,94:1 sur le fond sauge `#eef3ef` (cartes « coups de cœur » de l'accueil). Confirmé par **[détecteur 1280]** et **[détecteur 390]** : « 4.4:1 — #a8693a on #ffffff » et « 3.9:1 — #a8693a on #eef3ef ». La signature en Caveat (19,2 px) est aussi à 4,42:1, avec une police manuscrite plus difficile à lire.
- **Impact** : la catégorie de chaque produit est mal lisible pour les personnes malvoyantes ou en plein soleil sur téléphone. Le défaut se répète sur toutes les grilles.
- **WCAG** : 1.4.3 Contraste minimum (AA).
- **Recommandation** : foncer le token pour le texte (au moins 4,5:1 sur blanc et sur sauge), ou séparer un token « bois décoratif » (icônes, chiffres de 35 px qui passent à 3:1) d'un token « bois texte ». Le brief prévoit `--gravure` #A4471C, à revalider sur le fond retenu.
- **Commande** : `/impeccable colorize`

**[P1] Texte de l'aperçu en direct peu lisible sur la photo**
- **Emplacement** : `css/style.css:253` (`.apercu-texte` blanc avec ombre portée), `css/style.css:542` (`.indice` à 75 % d'opacité), `produit.html:194-200`.
- **Catégorie** : Accessibilité
- **Preuve** : **[PW pixel]** sur la planche apéro, ombre retirée : texte saisi « Marie & Paul — 14.06.2026 » à 2,39:1 (pire cas) / 2,98:1 (médiane) à 390 px, 1,55:1 / 2,92:1 à 1280 px. Indice « Votre texte ici » : 2,04 / 2,45:1 à 390 px. **[détecteur 390]** avec l'ombre : « pixel contrast 3.5:1 (need 4.5:1) on text shadow, img underlay ». À 390 px le texte fait 19,2 px non gras : le seuil est 4,5:1.
- **Impact** : c'est la fonction centrale du site (« la personnalisation est le produit »). Sur téléphone, le client lit mal le texte qu'il est en train de composer, surtout sur les bois clairs.
- **WCAG** : 1.4.3 Contraste minimum (AA).
- **Recommandation** : afficher le texte dans la couleur de la gravure (brun foncé) plutôt qu'en blanc, ou poser un fond uni derrière la zone de texte. Le configurateur SVG prévu au lot 3 du brief peut régler les deux points d'un coup.
- **Commande** : `/impeccable harden`

**[P1] Message d'envoi du panier non annoncé et affiché loin du bouton**
- **Emplacement** : `js/main.js:471-489` (en mode aperçu, le message est ajouté à la fin du formulaire, sans `aria-live` ni `role="status"`) ; bouton d'envoi dans le récapitulatif `panier.html:226` (attribut `form`).
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 1280]** formulaire rempli, CGV cochées, clic sur « Envoyer ma commande » : le message apparaît dans la colonne de gauche, en bas de l'écran (haut du message à 759 px sur 800), coupé ; il n'est dans aucune zone live. Capture `panier-envoi-apercu-1280.png`. À 390 px, il est visible (haut à 39 px).
- **Impact** : avec un lecteur d'écran, rien ne se passe après le clic. Sur ordinateur, la personne voyante peut ne pas voir le message. Tant que `site.apercu` vaut `true`, c'est la seule issue du parcours de commande.
- **WCAG** : 4.1.3 Messages d'état (AA).
- **Recommandation** : écrire ce message dans la zone `#envoi-etat` qui existe déjà sous le bouton (`panier.html:228`, déjà en `aria-live="polite"`).
- **Commande** : `/impeccable harden`

### P2 — Mineur

**[P2] Choix de la police sans groupe nommé**
- **Emplacement** : `produit.html:112-117` : un `<span class="label">` suivi de boutons radio, sans `<fieldset>`/`<legend>` ni `role="radiogroup"`.
- **Catégorie** : Accessibilité
- **Preuve** : **[code]** + **[PW 1280]** (`.choix` n'a ni fieldset parent ni rôle).
- **Impact** : le lecteur d'écran annonce « Classique, bouton radio » sans dire qu'il s'agit de la police d'écriture.
- **WCAG** : 1.3.1 Information et relations (A).
- **Recommandation** : `<fieldset><legend>Police d'écriture</legend>…`, comme le panier le fait déjà (`panier.html:166`).
- **Commande** : `/impeccable harden`

**[P2] Bordures de champs et anneau de focus des champs trop pâles**
- **Emplacement** : `css/style.css:228` (bordure `--trait` #e5e0d8), `css/style.css:231` (`outline: none` remplacé par une ombre à 15 % d'opacité).
- **Catégorie** : Accessibilité
- **Preuve** : **[code]** bordure #e5e0d8 sur blanc = 1,33:1 (calcul). **[PW 1280]** focus sur le champ date : `outline: none`, ombre `rgba(36,69,58,0.15)`, seule la bordure passe au vert forêt.
- **Impact** : les champs se distinguent mal du fond. Le focus d'un champ se résume à un changement de couleur d'une bordure de 1 px.
- **WCAG** : 1.4.11 Contraste du contenu non textuel (AA).
- **Recommandation** : bordure d'au moins 3:1 ; garder l'anneau `:focus-visible` global (`css/style.css:49`) sur les champs au lieu de l'effacer.
- **Commande** : `/impeccable harden`

**[P2] Texte blanc sur photo des cartes « univers » par endroits sous 4,5:1**
- **Emplacement** : `css/style.css:151` (dégradé), `css/style.css:156` (étiquette à 80 % d'opacité), `index.html:186-199`.
- **Catégorie** : Accessibilité
- **Preuve** : **[PW pixel]** étiquettes « 6 produits » et « 7 produits » : pire cas 3,74 à 3,95:1, 90e centile 4,23 à 5,03:1 (390 et 1280 px). Les titres et descriptions passent (pire cas ≥ 5,58:1). **[détecteur 1280]** : « pixel contrast 4.0:1 median 4.0:1 on "7 produits" ».
- **Impact** : le nombre de produits se lit mal sur les zones claires des photos. Le résultat change avec chaque photo.
- **WCAG** : 1.4.3 Contraste minimum (AA).
- **Recommandation** : étiquette en opacité pleine. Le brief retire de toute façon ces cartes à dégradé.
- **Commande** : `/impeccable colorize`

**[P2] Hiérarchie de titres sautée**
- **Emplacement** : titres de cartes produit en `<h3>` (`js/main.js:175`) directement sous le `<h1>` de la boutique ; `<h3>` des lignes de panier (`panier.html:146`) sous le `<h1>` ; pied de page en `<h4>` sur toutes les pages (`js/main.js:225,233,238,248`).
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 390/1280]** plan des titres : boutique `H1 > H3…`, panier `H1 > H3 > H2`, avis `H1 > H4` (aucun H2), et `H2 > H4` en fin de chaque page. **[détecteur 1280/390]** : « skipped-heading — <h1> "La boutique" followed by <h3> ».
- **Impact** : la navigation par titres au lecteur d'écran donne une structure incohérente.
- **WCAG** : 1.3.1 Information et relations (A), bonne pratique.
- **Recommandation** : un `<h2>` (visuellement discret si besoin) avant chaque grille, `<h2>` pour les colonnes du pied de page.
- **Commande** : `/impeccable harden`

**[P2] Pas de lien d'évitement**
- **Emplacement** : `js/main.js:196-215` (en-tête), toutes les pages.
- **Catégorie** : Accessibilité
- **Preuve** : **[PW 1280]** les 8 premiers arrêts de tabulation sont le logo, 5 liens de menu, favoris et panier, sur chaque page ; aucun lien « Aller au contenu ».
- **Impact** : 8 tabulations avant le contenu sur chaque page. Les repères `header`/`nav`/`main`/`footer` existent, ce qui aide les lecteurs d'écran, pas les personnes au clavier seul.
- **WCAG** : 2.4.1 Contourner des blocs (A), satisfait au minimum par les repères ; le lien reste attendu.
- **Recommandation** : un lien visible au focus vers `<main id="contenu">` (l'`id` n'existe aujourd'hui que sur la fiche et le panier).
- **Commande** : `/impeccable harden`

**[P2] Focus caché par la barre d'achat et le bouton flottant**
- **Emplacement** : `css/style.css:418-429` (`.barre-achat` fixée en bas), `css/style.css:441-449` (`.contact-flottant`).
- **Catégorie** : Accessibilité / Responsive
- **Preuve** : **[PW 390]** (mouvement réduit pour lire après défilement), 40 tabulations par page : sur la fiche, le lien « ★★★★★ Recommandé à 100 % » est **entièrement** couvert par la barre d'achat ; deux cartes produit et « Mentions légales » sont partiellement couvertes. Sur l'accueil, « Fête des mères » est partiellement sous le bouton flottant.
- **Impact** : la personne au clavier ne voit pas où elle est.
- **WCAG** : 2.4.11 Focus non masqué (AA, WCAG 2.2 ; la cible du brief est 2.1 AA).
- **Recommandation** : `scroll-padding-bottom` égal à la hauteur de la barre ; le brief retire le bouton flottant.
- **Commande** : `/impeccable adapt`

**[P2] Images : une seule taille, aucun format moderne**
- **Emplacement** : `js/main.js:146` (`visuel()`), `index.html:181-183` (mosaïque), `atelier.html:31` (`img/logo.webp`, 640×587, 139 Ko, affiché à 210 px), `atelier.html:77` (galerie) ; fichiers `img/*.jpg` de 62 à 194 Ko.
- **Catégorie** : Performance
- **Preuve** : **[PW 1280]** images servies 2,6 à 3,6 fois plus grandes que leur affichage (ex. vignettes de 96 px des idées cadeaux servies en 800 px : ×2,8 ; vignette panier 72 px : ×3,7 à 390 px). **[PW 390]** cache vide : accueil 19 requêtes / 1 174 Ko dont 959 Ko d'images ; boutique 22 requêtes / 1 450 Ko dont 1 308 Ko d'images. Aucun `srcset`, aucun WebP/AVIF pour les photos.
- **Impact** : téléchargement inutile sur mobile, LCP plus lent sur réseau réel.
- **Recommandation** : 2 ou 3 tailles par photo (`srcset` + `sizes`), WebP ou AVIF, `logo-200.webp` sur l'atelier.
- **Commande** : `/impeccable optimize`

**[P2] Images sans dimensions : un décalage au chargement est possible**
- **Emplacement** : `index.html:143` (`img/boutique-auchel.jpg`, ni `width`/`height` ni `aspect-ratio`), toutes les images générées par `js/main.js:146`.
- **Catégorie** : Performance
- **Preuve** : **[PW 1280/390]** avant son chargement différé, `boutique-auchel.jpg` mesure 558×0 px (1280) et 358×0 px (390) : la section grandira d'un coup. Le CLS mesuré en local au chargement est 0, car cette image est sous la ligne de flottaison ; les cartes produit sont protégées par leur conteneur `aspect-ratio: 1`.
- **Impact** : saut du contenu au défilement sur l'accueil.
- **Recommandation** : `width`/`height` sur toutes les images (connues : 800×800 pour le catalogue).
- **Commande** : `/impeccable optimize`

**[P2] Rendu bloqué par la chaîne polices + JavaScript**
- **Emplacement** : `css/style.css:1` (`@import` Google Fonts de 5 familles) ; `index.html:32` (h1 vide rempli par `js/main.js:572`) ; `js/demo.js` (33 Ko) chargé en synchrone sur chaque page publique (`index.html:173` et équivalents) alors qu'il s'arrête aussitôt hors démo (`js/demo.js:11-18`).
- **Catégorie** : Performance
- **Preuve** : **[code]** chaîne HTML → `style.css` → CSS Google → fichiers de police. **[PW 390]** l'élément LCP de l'accueil est le `<h1>`, injecté par le JavaScript ; 2 à 4 polices par page (169 Ko sur l'accueil et l'atelier). `display=swap` est bien présent.
- **Impact** : le titre principal attend le CSS, les polices et l'exécution de trois scripts.
- **Recommandation** : `<link rel="preconnect">` + `<link rel="stylesheet">` des polices dans le `<head>` au lieu de `@import` ; textes de l'accueil écrits dans le HTML (le brief prévoit Astro statique) ; `demo.js` chargé seulement quand la démo est active.
- **Commande** : `/impeccable optimize`

**[P2] Couleurs codées en dur, styles en ligne, pas de mode sombre**
- **Emplacement** : `css/style.css` après `:root` : 76 couleurs hexadécimales (27 valeurs distinctes, dont 35 `#fff`, `#9b2c2c`, `#c0392b`, `#d99a1e`, `#b42318`, `#2b4c7e`…) et 17 `rgba()` ; 49 attributs `style=""` dans les 8 gabarits (13 sur la fiche) ; polices du configurateur en dur dans `produit.html:24-29` ; aucun `prefers-color-scheme`.
- **Catégorie** : Theming
- **Preuve** : **[code]** comptage `grep` sur `css/style.css` et les HTML.
- **Impact** : changer la palette (prévu au lot 1 du brief) demande de reprendre des dizaines de lignes une par une ; plusieurs rouges proches (`#9b2c2c`, `#c0392b`, `#b42318`, `#a5281b`) font le même travail.
- **Recommandation** : tokens d'état (succès, alerte, erreur), tokens de surface, polices du configurateur reliées aux tokens de police (le brief les fusionne). Décider explicitement si un mode sombre est voulu.
- **Commande** : `/impeccable document`

**[P2] Texte seul agrandi à 200 % : débordements et texte coupé**
- **Emplacement** : `css/style.css:91` et `:97` (en-tête en une ligne, liens `nowrap`), `css/style.css:147-148` (cartes univers `aspect-ratio` + `overflow: hidden`), cartes avis, carte contact (adresse e-mail sans coupure).
- **Catégorie** : Responsive
- **Preuve** : **[PW zoom]** zoom de page 200 % : aucun débordement sur les 8 gabarits. Texte seul 200 % : à 1280 px, l'en-tête pousse les icônes favoris et panier à 1 771 px (défilement horizontal) sur les 8 gabarits ; à 390 px, débordements sur l'accueil et les avis (472 px), la boutique (417 px), le contact (506 px), le bouton « Personnaliser » de la fiche (447 px) ; texte des cartes univers coupé (contenu 299 à 309 px de large dans une boîte de 279 à 283 px).
- **Impact** : les personnes qui agrandissent seulement le texte (réglage du navigateur ou du téléphone) perdent l'accès au panier dans l'en-tête et doivent défiler en largeur.
- **WCAG** : 1.4.4 Redimensionnement du texte (AA) est respecté par le zoom de page ; le comportement au texte seul reste un défaut.
- **Recommandation** : en-tête qui passe au menu compact selon la place disponible, `overflow-wrap: anywhere` sur les cartes, cartes univers sans hauteur imposée.
- **Commande** : `/impeccable adapt`

**[P2] Cibles tactiles sous 44 px et bandes défilantes sans repère**
- **Emplacement** : `.filtre` (`css/style.css:215`), `.favori` 38×38 (`css/style.css:360-364`), `.supprimer` (`css/style.css:275`), fil d'Ariane ; bandes `.filtres` et `.categories` à barre masquée (`css/style.css:159-160`, `:328`).
- **Catégorie** : Responsive
- **Preuve** : **[PW 390]** toutes les cibles passent le seuil AA de 24 px, parfois grâce à l'exception d'espacement (« Retirer » 42×23, fil d'Ariane 57×23 et 80×23). Sous 44 px : 42 cibles sur 79 dans la boutique (filtres à 35 px de haut, 28 boutons favoris à 38×38), 24 sur 57 sur l'accueil. Les filtres font 814 px de large dans 390 px, les univers 1 185 px, avec `scrollbar-width: none`.
- **Impact** : risque d'appui à côté (cœur favori posé sur la photo cliquable). Sur mobile, rien n'indique que d'autres filtres existent à droite.
- **WCAG** : 2.5.8 Taille de la cible (AA) respecté ; 2.5.5 (AAA, 44 px) non respecté.
- **Recommandation** : filtres et favoris à 44 px ; un indice visuel de suite (carte coupée ou fondu de bord) sur les bandes.
- **Commande** : `/impeccable adapt`

**[P2] Motifs de gabarit interdits par le brief et étoiles sans données**
- **Emplacement** : `css/style.css:151` (dégradé), `index.html:48-55` (4 pictos de réassurance), `js/main.js:273-284` (bouton flottant), `css/style.css:88` (verre dépoli), `index.html:38` et `produit.html:96` (★★★★★ pour un taux de recommandation Facebook), `index.html:31` + en-tête (logo deux fois au premier écran sur ordinateur), « unique(s) » dans le `<h1>` et la meta description (`data/donnees.js:64`, `index.html:13,18`).
- **Catégorie** : Intégrité d'implémentation
- **Preuve** : **[code]** comparé à `docs/refonte/BRIEF.md` §2 et §3 (colonnes « On retire » et « Interdits »).
- **Impact** : le site ressemble à un modèle générique. Les étoiles laissent croire à une note qui n'existe pas.
- **Recommandation** : retirer ces éléments au lot 1 ; afficher le taux Facebook sans étoiles.
- **Commande** : `/impeccable distill`

**[P2] L'aperçu en direct ne montre pas le résultat**
- **Emplacement** : `produit.html:77-81` et `:197` : le texte est posé en blanc sur la première photo du produit.
- **Catégorie** : Intégrité d'implémentation
- **Preuve** : **[PW 390]** capture `apercu-saisi-390.png` : « Marie & Paul — 14.06.2026 » s'affiche sous une gravure existante « J'ai essayé le sport… mais je préfère la bière ».
- **Impact** : le client ne voit ni l'emplacement réel, ni le rendu gravé. L'aperçu donne une image fausse de la pièce.
- **Recommandation** : photo de support vierge et texte dans la teinte de gravure, ou configurateur SVG (lot 3 du brief).
- **Commande** : `/impeccable shape`

### P3 — Finition

**[P3] Noms accessibles redondants ou peu précis**
- **Emplacement** : `js/main.js:146` + `:175` (le lien de carte contient l'`alt` puis le `<h3>` du même nom : « Plaque bois à message Gravure bois Plaque bois à message 29,90 € ») ; `js/main.js:161` (« Ajouter … aux favoris » reste le même quand le bouton est déjà activé) ; `panier.html:156-157` (« Quantité » et « Retirer » sans nom de produit).
- **Catégorie** : Accessibilité
- **Preuve** : **[code]** + **[PW 1280]**.
- **WCAG** : 2.4.6 En-têtes et étiquettes (AA), confort.
- **Recommandation** : `alt=""` sur l'image de carte ; libellé « Favori : nom du produit » avec `aria-pressed` ; « Retirer Planche apéro gravée ».
- **Commande** : `/impeccable clarify`

**[P3] Textes alternatifs identiques et balisage invalide**
- **Emplacement** : `atelier.html:77` (8 photos avec le même `alt` « Réalisation Mon Truc en Bois ») ; `idees-cadeaux.html:72-73` (`<h3>` dans un `<span>`).
- **Catégorie** : Accessibilité
- **Preuve** : **[code]** + **[PW 1280]** liste des images.
- **WCAG** : 1.1.1 Contenu non textuel (A), qualité des alternatives.
- **Recommandation** : nommer chaque pièce ; `<div>` à la place du `<span>`.
- **Commande** : `/impeccable clarify`

**[P3] Signaux typographiques du détecteur**
- **Emplacement** : `css/style.css:522` (`.mot-atelier p`, interligne 1,25) ; mots seuls en fin de ligne (« bijoux » dans le slogan du pied de page à 390 px, « » » sur un avis).
- **Catégorie** : Intégrité d'implémentation
- **Preuve** : **[détecteur fichiers]** `tight-leading` sur l'accueil et l'atelier ; **[détecteur 1280/390]** `straggler` (avertissements consultatifs).
- **Impact** : faible : citation courte de 2 lignes.
- **Recommandation** : `text-wrap: pretty` sur les paragraphes courts.
- **Commande** : `/impeccable typeset`

### Résultats du détecteur et faux positifs

| Règle | Où | Statut après vérification |
| --- | --- | --- |
| `low-contrast` #a8693a sur blanc (4,4:1) et sur #eef3ef (3,9:1) | accueil, boutique, fiche, atelier | **Vrai positif**, recalculé 4,42 et 3,94:1 (P1) |
| `low-contrast` au pixel « 7 produits » (4,0:1) | accueil, 1280 | **Vrai positif**, mesuré 3,82 à 3,89:1 au pire (P2) |
| `low-contrast` au pixel « Votre texte ici » (3,5:1) | fiche, 390 | **Vrai positif** (P1) |
| `skipped-heading` h1 → h3 | boutique | **Vrai positif** (P2) |
| `tight-leading` 1,25 | accueil, atelier (fichiers) | Vrai, impact faible (P3) |
| `straggler` | plusieurs pages | Consultatif (P3) |
| `cramped-padding` sur `<section>` (×4) et `.carte` | accueil, atelier, contact (scan fichiers seulement) | **Faux positif** : le scan sans rendu ne voit pas la marge de `.conteneur` (16 px minimum) ni le `padding` de `.carte` ; les scans rendus à 1280 et 390 px ne le signalent pas |

## Problèmes systémiques

- **Redessiner tout le bloc à chaque changement** : le panier et la boutique réécrivent leur HTML entier à chaque saisie ou clic. C'est la cause commune de la perte du focus et d'une partie du coût de rendu.
- **Contenu fabriqué en JavaScript** : en-tête, pied de page, h1 de l'accueil, fiche et panier entiers. Sans JS, ces pages sont vides ; le rendu dépend de trois scripts synchrones.
- **Un token de couleur sert à la fois au texte et au décor** : `--bois` est bon pour les icônes et les grands chiffres, trop clair pour du texte de 14 px.
- **Une seule taille d'image pour tous les usages** : 800 px partout, de la vignette de 72 px à la grande photo.
- **Les éléments fixés en bas d'écran** (barre d'achat, bouton flottant) couvrent le contenu et le focus.

## Ce qui fonctionne

- Anneau de focus global visible (`:focus-visible`, `css/style.css:49`) : **[PW 1280/390]** sur 45 arrêts de tabulation par gabarit, tous les éléments ont un indicateur.
- Tous les champs des 8 gabarits ont une étiquette (0 champ sans `label` ni `aria-label`, **[PW]**). Le panier regroupe ses étapes en `fieldset`/`legend`, avec `autocomplete` sur les coordonnées.
- `lang="fr"` et repères `header`/`nav`/`main`/`footer` sur chaque page ; fil d'Ariane dans une `nav` nommée.
- Zones `aria-live` déjà en place : confirmation d'ajout au panier (`produit.html:137`), nombre de résultats de la boutique (`boutique.html:57`), retour du formulaire de devis (`contact.html:75`).
- `prefers-reduced-motion` bien traité : **[PW 390]** défilement doux coupé, transitions à 0 s, et la barre d'achat apparaît quand même (le changement d'état est conservé).
- Aucun débordement horizontal à 390 px sur les 8 gabarits ; zoom de page 200 % sans casse **[PW 390, PW zoom]**.
- Seuil AA de 24 px respecté partout **[PW 390]** ; burger et icônes d'en-tête à 44×44.
- Images sous la ligne de flottaison en `loading="lazy"` ; conteneurs `aspect-ratio` sur les cartes produit (CLS local 0 sur les 8 pages, **[PW 390]**).
- Données échappées avec `echapper()` avant chaque injection HTML (`js/main.js:43-44`).
- Prise en compte des zones sûres (`env(safe-area-inset-*)`) pour l'en-tête, la barre d'achat et le bouton flottant.

## Actions recommandées

1. **[P1] `/impeccable harden`** : garder le focus après chaque mise à jour du panier et des filtres ; remettre le menu mobile dans le bon ordre avec Échap et `aria-controls` ; envoyer le message d'aperçu dans `#envoi-etat` ; rendre lisible le texte de l'aperçu en direct.
2. **[P1] `/impeccable colorize`** : séparer « bois texte » (≥ 4,5:1 sur blanc et sauge) et « bois décor » ; étiquettes des cartes univers en opacité pleine.
3. **[P2] `/impeccable harden`** : `fieldset` pour le choix de police, bordures de champs à 3:1, anneau de focus sur les champs, lien d'évitement, titres h2 avant les grilles et dans le pied de page.
4. **[P2] `/impeccable optimize`** : `srcset` + WebP/AVIF, `width`/`height` sur les images, polices en `<link>` dans le `<head>`, textes de l'accueil dans le HTML, `demo.js` chargé à la demande.
5. **[P2] `/impeccable adapt`** : en-tête robuste au texte agrandi, cartes sans hauteur imposée, cibles de 44 px, repère sur les bandes défilantes, `scroll-padding-bottom` pour la barre d'achat.
6. **[P2] `/impeccable document`** : formaliser les tokens du brief (couleurs d'état, surfaces, polices du configurateur) et remplacer les 76 couleurs en dur.
7. **[P2] `/impeccable distill`** : retirer dégradés, pictos de réassurance, bouton flottant, verre dépoli et étoiles sans données.
8. **[P2] `/impeccable shape`** : un aperçu qui montre la vraie zone de gravure sur un support vierge.
9. **[P3] `/impeccable clarify`** : noms accessibles des cartes, favoris et boutons « Retirer » ; textes alternatifs de la galerie.
10. **`/impeccable polish`** : passe finale après les corrections.

Vous pouvez me demander de lancer ces commandes une par une, toutes à la fois, ou dans l'ordre de votre choix.

Relancez `/impeccable audit` après les corrections pour voir le score progresser.

## Par gabarit

Notes par page non calculées (la grille 0-4 s'applique au site entier). Le tableau résume les constats clés de chaque page, avec la source de la preuve.

| Page | Accessibilité | Performance | Theming | Responsive | Intégrité |
| --- | --- | --- | --- | --- | --- |
| **index** | Étiquettes bois 3,94:1 sur sauge (cartes coups de cœur) ; « 6/7 produits » sur photo 3,7–3,9:1 au pire ; `H2 > H4` en fin de page ; menu mobile **[PW, détecteur]** | 19 req., 1 174 Ko à 390 px (959 Ko d'images) ; LCP = `<h1>` injecté en JS ; images ×2,6 à ×3,6 à 1280 ; `boutique-auchel.jpg` haute de 0 px avant chargement **[PW]** | 4 styles en ligne dont `background:#fff` sur le logo (`index.html:40`) **[code]** | 0 débordement à 390 ; texte 200 % : cartes avis à 472 px, texte des univers coupé ; bande univers de 1 185 px sans barre **[PW]** | Dégradé des univers, 4 pictos, ★★★★★ pour Facebook, « unique » dans le h1, logo en double, bouton flottant **[code]** |
| **boutique** | Étiquettes bois 4,42:1 sur chaque carte ; focus perdu après un filtre ; `H1 > H3` **[PW, détecteur]** | 22 req., 1 450 Ko à 390 px (1 308 Ko d'images) ; grille de 28 cartes recréée à chaque frappe **[PW, code]** | 3 styles en ligne ; badges en couleurs codées en dur (`#b42318`, `#d99a1e`, `#4b4b4b`) **[code]** | Filtres à 35 px de haut, bande de 814 px sans barre ; 28 favoris à 38×38 ; texte 200 % : carte à 417 px **[PW]** | Le paramètre de recherche `q` est retiré de l'URL par `history.replaceState` (`boutique.html:108-112`) **[code]** |
| **produit** | Aperçu 2,0–3,0:1 (3,5:1 avec ombre) ; radios de police sans groupe ; lien d'avis entièrement caché par la barre d'achat ; étiquette bois 4,42:1 **[PW pixel, détecteur, code]** | 15 req., 498 Ko ; 4 polices (Dancing Script et IBM Plex Mono pour le sélecteur) **[PW]** | 13 styles en ligne ; polices du configurateur en dur (`produit.html:24-29`) **[code]** | 0 débordement à 390 ; texte 200 % : bouton « Personnaliser » à 447 px ; barre d'achat fixe **[PW]** | Aperçu posé sur une photo déjà gravée ; `<main>` vide sans JS ; ★★★★★ **[PW, code]** |
| **idees-cadeaux** | Aucun contraste en échec ; `<h3>` dans un `<span>` **[PW, code]** | 16 req., 730 Ko ; vignettes de 96 px servies en 800 px (×2,8) **[PW]** | 6 styles en ligne **[code]** | 0 débordement à 390 et au texte 200 % **[PW]** | Rien de bloquant ; cartes arrondies à ombre au survol **[code]** |
| **atelier** | Étiquette équipe et signature à 4,42:1 ; 8 `alt` identiques dans la galerie **[PW, code]** | 13 req., 562 Ko ; `logo.webp` 139 Ko (640 px) affiché à 210 px **[PW]** | 4 styles en ligne dont `#fff` **[code]** | 0 débordement à 390 et au texte 200 % **[PW]** | Rangée de 4 icônes de savoir-faire (motif de gabarit) ; `tight-leading` mineur **[code, détecteur]** |
| **panier** | Focus perdu au changement de mode et de quantité ; message d'aperçu non annoncé ; « Retirer » sans nom de produit ; `H1 > H3` **[PW, code]** | 11 req., 266 Ko ; formulaire entier redessiné à chaque changement **[PW, code]** | 8 styles en ligne **[code]** | 0 débordement à 390 et au texte 200 % ; « Retirer » 42×23 (passe par l'espacement) **[PW]** | Bouton d'envoi hors du formulaire (attribut `form`) avec un message affiché dans l'autre colonne **[PW, code]** |
| **contact** | Bordures de champs 1,33:1 ; aucun contraste de texte en échec **[code, PW]** | 10 req., 163 Ko : la page la plus légère **[PW]** | 5 styles en ligne **[code]** | Texte 200 % à 390 px : carte « La boutique » à 506 px (adresse e-mail non coupée) **[PW]** | `cramped-padding` du détecteur : faux positif **[détecteur, PW]** |
| **avis** | `H1` puis directement `H4` (aucun H2) **[PW]** | 10 req., 162 Ko **[PW]** | Couleurs Facebook et Google codées en dur (`css/style.css:474-475`) **[code]** | Texte 200 % à 390 px : cartes à 472 px **[PW]** | `<a class="score">` peut sortir sans `href` si aucun lien n'est saisi (`js/main.js:337-339`) **[code]** |
