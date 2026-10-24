# Revue antislop n° 002 : nouveau site Mon Truc en Bois et son admin, après refonte

antislop actif : after (choix de session).

- Date : 24/10/2026. Branche `refonte` (dernier commit `443bb2b`).
- Site revu en ligne : https://mon-truc-en-bois.pages.dev (aperçu, `site.apercu: true`).
- Démo et admin : build démo servi en local sur `127.0.0.1:4391` (dossier `dist-demo` de la session). Les fichiers de l'admin y sont identiques à ceux de https://demo.mon-truc-en-bois.pages.dev (comparaison faite fichier par fichier, fins de ligne mises à part) et au dépôt.
- Pages : accueil, boutique, fiche planche-aperitif, occasions, atelier, contact, avis, panier rempli (1 planche de test), suivi, CGV, demo ; admin en mode démo : connexion, accueil, questionnaire, produits, caisse. Largeurs : PC 1440 px et téléphone 390 px.
- Règles : `.agents/skills/antislop/SKILL.md` (cœur, lu en entier), puis `antislop-ui`, `antislop-copywriting`, `antislop-layoutmobile`, `antislop-human` (vérificateur `contrast-check.py`) et `antislop-code`, tous présents dans `.agents/skills/`.
- Direction de référence : `docs/refonte/BRIEF.md` §3. Revue précédente : `audit/outils/antislop-audit-001-2026-10-24.md`.
- Lecture seule : rien n'est corrigé. Les `[À COMPLÉTER : …]` sont voulus et ne sont pas comptés comme défauts.

## Méthode

- Lecture du code : `site/src/` (layout, 25 composants, 20 pages, bibliothèques), `site/scripts/`, `admin.html`, `css/admin.css`, `css/style.css` (chargé par l'admin), `js/admin*.js`, `js/demo.js`, `data/donnees.js`.
- Captures et mesures avec Playwright (Chrome), scripts `mesurer.mjs` et `admin.mjs` dans le dossier de session `…\scratchpad\reaudit-antislop\`. Captures neuves dans `…\scratchpad\reaudit-antislop\cap\` (dossier temporaire de la session, non versionné) ; mesures brutes dans `cap/mesures-site.json` et `cap/mesures-admin.json`. Les captures versionnées de `audit/apres/*.png` restent valables pour les pages du site.
- Mesuré sur chaque page et chaque largeur : débordement horizontal, polices réellement affichées dans le premier écran, cibles de moins de 44 px, contraste calculé pour chaque élément de texte contre son fond réel (formule WCAG, mêmes calculs que `contrast-check.py`), tirets cadratins et emojis dans le texte affiché, rayons de plus de 2 px, ombres, flou, dégradés, couleurs utilisées, éléments fixes. Sur PC : 25 appuis sur Tab par page avec relevé du contour de focus.
- Contraste de la palette : `contrast-check.py` (résultats cités dans les constats).
- Admin : connexion de démo par le bouton « Se connecter » (identifiants de démo déjà remplis par `js/demo.js`), puis les quatre vues par le menu.
- Limites : aucun formulaire n'a été envoyé (devis, commande, caisse) ; leur comportement est jugé sur le code. Les autres vues de l'admin (commandes, clients, marketing…) sont jugées sur le code seulement.

Priorité : Hard Gate = HAUTE, Purpose-Gate = MOYENNE, Quality Locks = BASSE.

## Constats

### HAUTE (Hard Gate)

**1. R-03, HAUTE. Toutes les pages du site (390 px).**
Preuve : le numéro de téléphone de la barre d'adresse mesure 116 × 20 px (`site/src/components/Entete.astro:20`, `:51`, `:69` : lien texte dans une bande de 6 px de marge). Mesures `cap/mesures-site.json`, entrée « 07 83 39 40 28 | 116x20 » sur les 10 pages.
Raison : c'est le premier lien de chaque page sur téléphone et il fait moins de la moitié de la cible minimale de 44 px.

**2. R-03, HAUTE. Pied de page de toutes les pages (390 px).**
Preuve : liens du pied à 32 px de haut (`site/src/components/Pied.astro:37`, `min-height: 32px`), séparés de 6 px (`Pied.astro:18` et `:25`, `--pile: 6px`). Mesuré sur les 10 pages (7 liens à 32 px chacune).
Raison : liens empilés sous 44 px et trop serrés pour le pouce. C'était déjà le constat 9 de la revue 001.

**3. R-03, HAUTE. Panier rempli (390 px).**
Preuve : la barre fixe « Total / Finaliser » (`site/src/pages/panier.astro:277`, styles `:1023` à `:1034`) reste affichée jusqu'en bas de la page. La place réservée (`panier.astro:1052`, `padding-bottom: 72px`) est posée sur `.page-panier`, pas sous le pied de page. Page déroulée jusqu'en bas : la barre occupe y = 777 à 844 et le lien « Mentions légales » (y = 772 à 804) est caché dessous (test `elementFromPoint`, capture `cap/panier-390-bas.png`).
Raison : une barre fixe masque le dernier lien de la page, le même défaut que le bouton « Appeler » de la revue 001 (constat 10).

**4. R-03, HAUTE. Bandeau de démo, sur le site de démo et dans l'admin (390 px et PC).**
Preuve : sur le site, les liens « Boîte mail », « Guide », « Admin », « Quitter » mesurent 32 px de haut (`site/src/layouts/Base.astro:105`) ; dans l'admin, où ce réglage ne s'applique pas, ils mesurent 18 px de haut (styles en ligne `js/demo.js:476` à `:484`). Mesures `cap/mesures-admin.json` (« Guide | 35x18 ») et `demo-390` (« Guide | 40x32 »).
Raison : cibles sous 44 px sur l'outil que la démo met en avant.

**5. R-25, HAUTE. Admin en mode démo, toutes les vues.**
Preuve : le bandeau de démo est écrit en blanc sur `#a8693a`, en 13 px (`js/demo.js:476`). Contraste mesuré dans la page : 4,42:1 (seuil 4,5:1). Sur le site, `Base.astro:100` à `:104` remplace ce fond par `--gravure` (blanc sur gravure : 6,01:1 avec `contrast-check.py`), mais l'admin n'a pas ce remplacement. Captures `cap/admin-accueil-1440.png`, `cap/admin-caisse-390-premier-ecran.png`.
Raison : texte normal sous 4,5:1, en haut de chaque écran de l'admin de démo.

**6. R-32, HAUTE. Admin sur téléphone (390 px).**
Preuve : le menu « Plus » s'ouvre par-dessus la page (`css/admin.css:349` à `:353`, `js/admin.js:419` à `:439`) mais aucun code n'écoute la touche Échap : après Échap, le menu reste ouvert (test Playwright, `classList.contains("ouvert")` = vrai). Menu fermé, ses boutons restent atteignables au clavier alors qu'ils sont hors de l'écran (x = −294) : Tab passe par « Accueil », « Commandes », « Caisse »… invisibles avant d'atteindre la page.
Raison : panneau non fermable avec Échap et ordre de tabulation qui passe par des éléments cachés.

**7. R-02, HAUTE. Admin (textes affichés et emails envoyés).**
Preuve : tirets cadratins dans du texte vu par la boutique ou ses clients : titre de l'onglet `admin.html:6` (« Administration — Mon Truc en Bois ») ; aide `admin.html:72` ; champ client de la caisse `js/admin-crm.js:187` (« Client existant (nom, email…) — ou laissez vide », visible sur `cap/admin-caisse-1440.png`) ; ligne des ventes de l'accueil `js/admin-crm.js:723` (« 377,20 € — Téléphone 48 % », relevée dans le texte de `admin-accueil`) ; objet de l'email au client `js/admin-crm.js:812` (« Votre demande… — Mon Truc en Bois ») ; aussi `js/admin-crm.js:412`, `:489`, `:517`, `:826` ; `js/admin-commandes.js:162` (police), `:253`, `:323` (mention SIRET de la facture) ; `js/admin-installation.js:119`, `:179`, `:191` ; `js/admin.js:676`, `:1041`, `:1109`, `:1310`. Exemples de la démo : `js/demo.js:457` et `:459`.
Raison : le site n'en a plus aucun (0 dans `site/src/`, 0 dans le texte des 10 pages mesurées), l'admin en garde une vingtaine, dont un dans un email et un sur la facture.

### MOYENNE (Purpose-Gate)

**8. R-04 (emojis, antislop-ui), MOYENNE. Admin : fiche commande et marketing.**
Preuve : 📅 `js/admin-commandes.js:151`, 📷 `:164`, 🎁 `:176`, 💬 `:177` (détail d'une commande) ; 🎁 dans l'exemple d'objet de campagne `js/admin-crm.js:592` ; 🎁 et 👉 dans le texte de partage d'un code promo `js/admin-crm.js:850`.
Raison : emojis décoratifs dans l'interface et dans un texte proposé à la boutique ; le brief §3 les interdit.

**9. R-04, MOYENNE. Admin : menu et barre du bas.**
Preuve : icônes à trait fin, bouts et coins arrondis (`admin.html:89` à `:115` et `:143` à `:147`, style `css/style.css:62` : `stroke-width: 1.8`, `stroke-linecap: round`, rectangles en `rx="1.5"` à `rx="2"`), dont une étoile pour « Avis clients » (`admin.html:100`). Aucune raison écrite.
Raison : jeu d'icônes au look de bibliothèque, et coins arrondis à côté des angles droits du brief. Les libellés sont toujours écrits à côté, ce qui limite le défaut.

**10. R-06, MOYENNE. Admin.**
Preuve : `admin.html:21` charge `css/style.css`, dont la ligne 1 importe cinq familles de l'ancien site (Bricolage Grotesque, Figtree, IBM Plex Mono, Dancing Script, Caveat). En démo, Figtree est affichée par le bandeau (`js/demo.js:476`) : 4 polices mesurées dans le premier écran de chaque vue (Figtree, Big Shoulders, Courier Prime, Literata) et Figtree 500/600/700 téléchargée.
Raison : police sans raison de marque, restée de l'ancien site ; elle ajoute une quatrième police à l'écran.

### BASSE (Quality Locks)

**11. R-16, BASSE. Fiches produit.**
Preuve : descriptions affichées telles quelles : « Le cadeau parfait pour un papa, un parrain ou un ami » (`data/donnees.js:116`, fiche planche-aperitif, `cap/produit-planche-aperitif-1440.png`), « parfait pour un mariage ou un anniversaire » (`:183`), « Idéal pour papy, mamie ou la maison » (`:267`).
Raison : mots creux à la place d'un fait (matière, dimension, usage). Reste du constat 21 de la revue 001.

**12. R-16 et R-15, BASSE. Admin, onglet Marketing.**
Preuve : exemple de message « Pour la fête des mères, offrez un cadeau unique… » (`js/admin-crm.js:593`) ; exemple de texte de bouton « Découvrir » (`js/admin-crm.js:602`).
Raison : l'admin souffle à la boutique le mot creux et le bouton générique que le site a retirés.

**13. R-31 (antislop-code, séparateurs décoratifs), BASSE. Code.**
Preuve : `site/src/styles/socle.css:1` et `:5` (bannière `/* ==== */`) ; `site/src/pages/panier.astro:331`, `:347`, `:365`, `:479`, `:521`, `:591`, `:605` ; `site/src/lib/serveur.ts:53` et `:111` ; `site/src/lib/panier.ts:64` (« // ---------- … ---------- ») ; `css/admin.css:237`, `:253`, `:284`, `:309` à `:311`, `:490` à `:492` ; `js/admin-crm.js:114` à `:116` (et 4 autres blocs), `js/admin-questionnaire.js:50`, `:82`, `:160`, `:471`, `js/demo.js:468`.
Raison : bannières qui n'apportent rien au libellé. Les commentaires du nouveau code sont par ailleurs courts et utiles (raisons, contraintes) : seules les bannières sont visées.

**14. R-29 (« un seul accent voulu »), BASSE. Fiche produit, toutes les pages avec un manque.**
Preuve : la couleur gravure, réservée par le brief §3 à « achat, prix, date limite », colore aussi les numéros d'étapes 01 à 04 (`site/src/pages/produit/[id].astro:412`) et toutes les marques `[À COMPLÉTER]` (`site/src/components/ACompleter.astro:14`) : 8 marques sur la fiche, 9 sur occasions et sur les CGV.
Raison : l'accent est dilué sur la fiche, où le prix et le bouton d'achat devraient être les seuls points orange. Les marques disparaîtront avec les réponses de l'atelier ; les numéros d'étapes resteront.

### Hors règles antislop (pour information)

- Contradiction du brief, non tranchée : §3 fixe trois polices de site (Big Shoulders, Literata, Courier Prime) et interdit « plus de deux polices par écran (hors aperçu de gravure) ». Le site applique la première règle : les trois polices sont mesurées dans le premier écran des 10 pages, aux deux largeurs (la Sacramento de l'aperçu s'ajoute sur la fiche, ce que le brief tolère). Cette revue marque l'interdit en FAIL à la lettre ; c'est à l'atelier et à l'agence de dire laquelle des deux règles prévaut.
- Maquette : l'accueil (`index.astro:122`) et la fiche (`produit/[id].astro:199`) marquent « maquette à chaque commande ou sur demande ? » en `[À COMPLÉTER]`, mais l'atelier (`atelier.astro:26`) et le panier vide (`panier.astro:259`) l'affirment (« nous vous envoyons la maquette avant de graver »). La source est la FAQ de `data/donnees.js` et le parcours du brief §5 ; à harmoniser après la question 3 du questionnaire.
- Caisse de l'admin : les tuiles produit n'ont qu'un filet `#b5a083` sur papier (2,36:1 avec `contrast-check.py`, `css/admin.css:259`). La tuile se reconnaît à sa photo, son nom et son prix, donc ce n'est pas compté comme défaut WCAG 1.4.11.
- `site/scripts/copier-medias.mjs:36` réécrit `public/admin.html` au build pour y poser un réglage (`window.MTB_ADMIN`). C'est un réglage, pas une fonction d'interface : pas un défaut R-33, mais à surveiller.
- Photos : toujours sur fonds variés avec la carte de visite dans le cadre (axe « Photos » du brief §4, pas une règle antislop). Les trois photos à risque (licence, écussons, logo client) sont masquées sur le site (`site/src/lib/images.ts:16` à `:20`) mais visibles dans la caisse de l'admin (« Verre imprimé », `cap/admin-caisse-1440.png`), ce qui est normal pour un outil interne.

## Interdits du brief §3

| Interdit | Site | Admin | Preuve |
| --- | --- | --- | --- |
| Dégradés décoratifs | PASS | PASS | Aucun `gradient` dans `site/src/` ni dans `css/admin.css` ; 0 dégradé mesuré sur les 30 écrans. |
| Glassmorphism | PASS | PASS | Aucun `backdrop-filter` actif ; `css/admin.css:336` le neutralise (`backdrop-filter: none`). 0 flou mesuré. |
| Ombres douces | PASS | PASS | Seule ombre du site : le filet de 1 px des grilles (`GrillePieces.astro:21`). Admin : `--ombre: none` (`css/admin.css:38`), seul un liseré intérieur de 1 px sur la tuile choisie de la caisse. |
| Cartes arrondies empilées | PASS | PASS | `--rayon: 0` (`socle.css:46`), `--r: 0` (`css/admin.css:36`) ; 0 élément de plus de 2 px de rayon mesuré. |
| Bordure gauche colorée | PASS | PASS | `border-left` = filet brûlé de la grille (`GrillePieces.astro:19`) et de la frise mobile (`FriseEtapes.astro:38`) ; séparateur gris des chiffres de l'admin. Aucune bande de couleur. |
| Rangées d'icônes de réassurance | PASS | sans objet | Le site n'a plus d'icônes (seul le cœur du favori) ; retrait et livraison sont écrits en texte (`index.astro:53` à `:56`). |
| Emojis | PASS | FAIL | Site : 0 dans `site/src/` et dans le texte affiché. Admin : constat 8. |
| Étoiles décoratives | PASS | PASS, avec réserve | Site : avis sans étoiles (`CarteAvis.astro:2` et `:3`, `avis.astro:2` à `:4`). Admin : étoile du menu « Avis clients » (`admin.html:100`) et ★ du choix de note (`js/admin.js:1080`), utiles à la saisie, pas décoratives. |
| Slogans en trois temps | PASS | PASS | Titres descriptifs (« Votre texte, gravé au laser dans notre atelier d'Auchel », « Le catalogue », « Par occasion »). |
| Mots creux « unique / passion / sublimer » | PASS | FAIL | Site : aucun des trois mots affiché (`aPropos[1]` et `heroTitre`, qui contiennent « unique », ne sont plus utilisés). Admin : « cadeau unique » (`js/admin-crm.js:593`, constat 12). Voir aussi « parfait / idéal » (constat 11). |
| Plus de deux polices par écran | FAIL à la lettre | FAIL | Site : 3 polices sur chaque écran, comme le brief le demande lui-même (contradiction signalée plus haut, non tranchée). Admin démo : 4 polices (constat 10). |
| Plus d'une couleur d'accent | PASS | FAIL (démo) | Site : seule `--gravure` (#a4471c) et sa teinte foncée de survol. Admin démo : le bandeau garde le `#a8693a` de l'ancien site (`js/demo.js:476`), un second orangé à côté de la gravure. |
| Images générées par IA | PASS, avec réserve | PASS | Mêmes photos réelles que l'ancien site (carte de visite de l'atelier dans le cadre). Pas de données EXIF : preuve visuelle seulement. |

Bilan site : 12 PASS (dont 2 avec réserve), 1 FAIL lié à la contradiction du brief. Bilan admin : 4 FAIL (emojis, « unique », 4 polices, second accent en démo).

## Delivery Gate

Résultat global : **FAIL**. Le site public est proche du but (aucun défaut de contraste, de tiret ni de focus), mais le Hard Gate tombe sur le téléphone (constats 1 à 4) et sur l'admin (constats 5 à 7), et la vérification clic par clic n'est pas enregistrée.

### Bloc 1 : Hard Gate

| Règle | Statut | Preuve |
| --- | --- | --- |
| R-02 tiret cadratin | FAIL | Site : PASS (0 dans le code, 0 dans les 10 pages, titres en « · »). Admin : constat 7. |
| R-03 téléphone | FAIL | Aucun débordement horizontal sur les 30 écrans mesurés. Cibles et barre fixe : constats 1 à 4. |
| R-17 chiffres | PASS | « Recommandé à 100 % · 16 avis » vient de `plateformesAvis.facebook` ; « 27 pièces » et les nombres par catégorie sont comptés au build. Les chiffres de l'admin de démo sont des données d'exemple signalées par le bandeau « Démo : rien n'est envoyé ni payé ». |
| R-18 témoignages | PASS | 10 avis Facebook nommés et datés, sans étoiles ni note (`avis.astro`, `CarteAvis.astro`). |
| R-23 visuels créés sans accord | PASS | Logo de l'atelier ; avatars de l'admin à initiales ; photos manquantes en cadre `[À COMPLÉTER]` (`atelier.astro:28`, `:80` à `:84`). |
| R-24 navigation | PASS | Les 5 liens de l'en-tête et les 7 du pied mènent à des pages servies (mesurées ou présentes dans le build). |
| R-25 contraste | FAIL | Site : 0 texte sous le seuil sur les 20 écrans (contraste calculé élément par élément) ; palette vérifiée avec `contrast-check.py` (brûlé/bouleau 13,81, texte doux/bouleau 5,33, gravure/bouleau 4,86, gravure foncée/bouleau foncé 5,44). Admin : constat 5. |
| R-26 contrôles morts | PASS | Code lu : configurateur, onglets aperçu/photo, quantité, favori, filtres (pages statiques), devis (envoi ou email préparé, `FormulaireDevis.astro:129` à `:155`), panier (email prérempli tant que la commande en ligne est fermée), suivi, démo. |
| R-27 états | PASS | Panier : chargement, vide, rempli, email, erreurs (`panier.astro:89`, `:253`, `:117`) ; boutique vide (`PageBoutique.astro:47`) ; suivi : fermé, chargement, erreur (`suivi.astro:48`, `:60`, `:45`) ; photo absente (`PhotoPiece.astro:31`). |
| R-28 FAQ | PASS | Questions du métier ; réponses sur des services pas encore ouverts réécrites (`faq.astro:3` à `:5`, `:22` à `:30`). |
| R-32 clavier | FAIL | Site : 25 Tab par page sur PC, contour de 2 px gravure visible partout (`socle.css:78`) ; champ date vérifié à part (`outline: 2px solid`). Admin : constat 6. |
| R-33 script de retouche | PASS | Pas de fonction d'interface ajoutée par script. `copier-medias.mjs:36` pose un réglage dans `admin.html` (à surveiller). L'admin habille `css/style.css` par surcharge, sans le réécrire. |
| R-34 thèmes | PASS | Un seul thème clair, sans bascule. |
| R-35 vérification | FAIL | Fait ici : captures, mesures, Tab, connexion démo, menu de l'admin, barre du panier. Non fait : envoi des formulaires et clic sur chaque contrôle de l'admin. Le contrôle C9 (`fe56bc8`) a des mesures (Lighthouse, axe, captures) mais pas de parcours clic par clic enregistré, et ne couvre pas l'admin. |
| R-36 affirmations | PASS | « Fait main » retiré ; « devis gratuit » et « sous 48 h avec photos » (CGV) reprennent les textes de l'ancien site (`contact.html:30`, `cgv.html:52`). |
| R-37 direction | PASS | Brief §3 appliqué : tokens `socle.css:13` à `:48`, polices des aperçus = polices du site (`lib/polices.ts`), repris dans `css/admin.css:4` à `:39`. |
| R-38 contenu réel | PASS | Manques affichés en `[À COMPLÉTER]` (2 sur l'accueil, 8 sur la fiche, 5 sur l'atelier, 9 sur occasions et CGV) ; plus de citation signée inventée (`atelier.astro:5`, `:70`). Réserve : phrase sur la maquette (hors règles). |

### Bloc 2 : Purpose-Gate

| Règle | Statut | Preuve |
| --- | --- | --- |
| R-01 dégradés | PASS | Aucun. |
| R-04 icônes | FAIL | Admin : constats 8 et 9. Site : seul le cœur du favori, avec libellé (`BoutonFavori.astro:8`). |
| R-06 typographie | FAIL | Site : raison écrite (`socle.css:2` à `:4`, brief §3) ; capitales des titres sans espacement large (0,005 em). Admin : constat 10. |
| R-07 fond quadrillé | PASS | Aucun motif de fond ; le veinage est dessiné sur la pièce de l'aperçu, pas sur la page. |
| R-08 flèches | PASS | Une seule flèche, en fin de ligne de chaque occasion (`ListeOccasions.astro:31`), qui signale que la ligne entière est un lien (`:49` et `:50`). Aucun bouton fléché. |
| R-09 badges | PASS | Aucun badge sur le site ; pastilles de l'admin = vrais statuts (commande, paiement, question). |
| R-10 verre dépoli | PASS | Aucun. |
| R-12 ombres | PASS | Filets de 1 px à la place des ombres. |
| R-13 halo lumineux | PASS | Aucun. |
| R-14 cartes identiques | PASS, avec réserve | Les 4 étapes de la fiche (`produit/[id].astro:213` à `:218`) sont de même forme, mais c'est une suite d'étapes en filets, sans icône, qui décrit le vrai parcours. |
| R-19 animations | PASS | Une seule animation, le texte qui « se grave » (`lib/configurateur-client.ts:26`), conforme au brief ; transitions de survol courtes ; `prefers-reduced-motion` respecté (`socle.css:94`). L'animation infinie de l'admin est un indicateur de chargement (`css/admin.css:238` à `:240`). |
| R-22 illustrations | PASS | Photos réelles et aperçu SVG de la pièce. |

### Bloc 3 : vivacité

| Point | Statut | Preuve |
| --- | --- | --- |
| Réglages ENERGY / RHYTHM / MOTION déclarés | FAIL | Aucun dans le brief, `PRODUCT.md` ni `docs/refonte/`. Le brief implique MOTION 1 (« une seule animation »), rien pour ENERGY et RHYTHM. |
| Rendu cohérent avec les réglages | PASS, partiel | MOTION 1 respecté. ENERGY et RHYTHM non déclarés, donc non vérifiables. |
| Un point focal par écran | PASS | Accueil : un titre, le configurateur et son aperçu ; 1 seul logo par écran mesuré sur les 10 pages. |
| Blancs qui structurent | PASS | Marges variées selon la section (`index.astro:160`, `:202` ; `--section` en `clamp`). |
| Un seul accent voulu | PASS, avec réserve | Gravure seule sur le site ; dilution sur la fiche (constat 14). |
| Motif d'identité | PASS | N° de pièce, étiquettes en machine à écrire, grilles à filets, polices des aperçus = polices du site. |
| Lecture de direction déclarée avant création | FAIL | Pas de ligne « Reading this as… » ; le brief §3 donne la direction mais pas cette lecture. |

### Bloc 4 : savoir-faire et cohérence

| Point | Statut | Preuve |
| --- | --- | --- |
| C-1 choix par défaut | FAIL | Admin : bandeau de démo et polices restés de l'ancien site (constats 5 et 10). Site : PASS. |
| C-2 contrôles inutiles | PASS | Voir R-26. |
| C-3 sections de gabarit | PASS | Accueil : configurateur, catalogue, occasions, atelier, avis, séries, chacun nourri par les données. Plus de bande de réassurance ni de bandeau d'appel répété. |
| C-4 tenue | FAIL | Barre du panier, cibles du téléphone, clavier de l'admin (constats 1 à 6). |
| C-5 preuves | PASS | Voir R-17, R-18, R-38. |
| R-05 mise en page | PASS | Compositions variées (grille, liste à filets, photo + définitions, citations). Le pied a 4 colonnes, mais elles suivent le contenu (adresse, horaires, contact, commandes). |
| R-11 rayons | PASS | Angles droits partout, comme le brief le demande. |
| R-15 boutons d'action | FAIL | Site : PASS (« Personnaliser cette pièce · dès 24,90 € », « Ajouter au panier », « Demander un devis »). Admin : « Découvrir » proposé (constat 12). |
| R-16 mots creux | FAIL | Constats 11 et 12. |
| R-20 identité | PASS | Sans le logo, la palette bois, les grilles à filets, les n° de pièce et l'aperçu gravé restent propres à l'atelier. |
| R-21 thème sombre | PASS | Thème clair fixe, cohérent avec la palette du brief. |
| R-29 palette | PASS | 9 couleurs mesurées sur l'accueil, toutes des tokens du brief (brûlé, bouleau, kraft, gravure, texte doux, gravure foncée, papier, bouleau foncé, blanc). Réserve : bandeau démo de l'admin. |
| R-30 copie d'un produit connu | PASS | Aucune ressemblance avec Linear, Vercel, Stripe ou Notion. |
| R-31 raisons écrites | FAIL | Constat 13 (bannières) ; polices de l'ancien site dans l'admin sans raison (constat 10). |

## Avant / après (les 28 constats de la revue 001)

| N° 001 | Règle | Constat d'origine | État | Preuve aujourd'hui |
| --- | --- | --- | --- | --- |
| 1 | R-02 | Tiret cadratin dans le bandeau « Site en construction — … » | Corrigé | `Base.astro:88` : « Site en préparation : pour commander… ». |
| 2 | R-02 | Tirets dans les titres de page et l'aria-label du logo | Corrigé | Titres en « · » (`Base.astro:17`), mesurés sur les 10 pages. Le lien du logo n'a plus de libellé à tiret. |
| 3 | R-02 | Tirets dans les exemples, le partage, le panier, l'objet du mail de devis | Corrigé | 0 tiret dans `site/src/` (exemple : « Ex. : Marie & Paul, 14.06.2026 », `Configurateur.astro:22`). L'admin en a encore : constat 7 (hors périmètre de la revue 001). |
| 4 | R-25 | Texte blanc sur la photo de la fiche | Corrigé | Aperçu en SVG sur fond kraft, texte brûlé (`ApercuGravure.astro`) ; 0 défaut de contraste mesuré. |
| 5 | R-25 | Étiquettes `--bois` à 4,42:1 | Corrigé | Étiquettes en Courier brûlé (`socle.css:113`) ; texte doux à 5,33:1. Le `#a8693a` ne survit que dans le bandeau démo de l'admin (constat 5). |
| 6 | R-25 non-texte | Bordure des champs à 1,31:1 | Corrigé | Champs : filet brûlé sur papier (`socle.css:83` à `:86`). |
| 7 | R-32 | `outline: none` sur les champs | Corrigé | `:focus-visible` 2 px gravure (`socle.css:78`) ; vérifié au clavier. |
| 8 | R-03 | Favori, filtres, « Retirer », boutons de la fiche sous 44 px | Corrigé | Favori 44 × 44 (`BoutonFavori.astro:38` et `:39`), filtres 44 px (`NavFiltres.astro:28`) ; aucune de ces cibles dans les mesures à 390 px. |
| 9 | R-03 | Liens du pied 24 px, fil d'Ariane 23 px, liens fléchés 26 px | Toujours là, en partie | Fil d'Ariane et liens de section à 44 px ; pied encore à 32 px (constat 2). |
| 10 | R-03 | Bouton flottant « Appeler » qui masque du texte | Corrigé | Bouton retiré. Nouveau défaut du même type dans le panier : constat 3. |
| 11 | R-38 | ★★★★★ devant « Recommandé à 100 % » | Corrigé | Aucune étoile sur le site (`CarteAvis.astro:2` et `:3`). |
| 12 | R-38 | Citation signée Christophe et Laetitia sans source | Corrigé | Remplacée par `[À COMPLÉTER : mot de Christophe et Laetitia]` (`atelier.astro:70`). |
| 13 | R-38 | « Avis Facebook et Google » sans avis Google | Corrigé | Google affiché seulement si des avis existent (`avis.astro:12`, `:50`). |
| 14 | R-38 | « Nous vous recontactons sous 48 h » | Corrigé | Plus de délai promis ; champ `delaiReponse` vide = rien de promis (`lib/donnees.ts:99` à `:100`). |
| 15 | R-36 | « Fait main à Auchel » | Corrigé | Phrase absente ; titre « gravé au laser dans notre atelier d'Auchel » (`index.astro:46`). |
| 16 | R-37 | Direction du brief non appliquée | Corrigé | Tokens, polices et angles du brief (`socle.css:13` à `:48`). |
| 17 | R-01 | Dégradé noir des cartes catégories | Corrigé | Cartes retirées ; catégories en liens texte (`index.astro:71` à `:75`). |
| 18 | R-04 | Icônes style Lucide en rangée de réassurance | Corrigé sur le site | Plus d'icône sur le site. L'admin garde ce jeu d'icônes : constat 9. |
| 19 | R-06 | Polices sans raison, 3 polices par écran | Corrigé pour la raison ; nombre toujours à 3 | Raison écrite (`socle.css:2` à `:4`, brief §3). Trois polices par écran, voulues par le brief (contradiction non tranchée). |
| 20 | R-14 | Garanties, étapes et savoir-faire ×4 identiques | Corrigé | Garanties retirées ; savoir-faire en liste de définitions (`atelier.astro:51` à `:56`). Les 4 étapes de la fiche restent de même forme, jugées acceptables (Bloc 2, R-14). |
| 21 | R-16 | « unique », « avec soin », « Le cadeau parfait », « parfait pour », « Idéal pour » | Toujours là, en partie | « unique » et « avec soin » ne sont plus affichés ; « parfait » et « Idéal » restent dans les descriptions (constat 11). |
| 22 | R-15 | « Découvrir la boutique », « Découvrir l'atelier » | Corrigé | « Voir la boutique », « Voir l'atelier et la boutique », « Personnaliser cette pièce ». L'admin propose encore « Découvrir » (constat 12). |
| 23 | R-05 | Accueil sur le gabarit par défaut | Corrigé | Configurateur au premier écran (`audit/apres/index-1440-premier-ecran.png`), sections de forme différente. |
| 24 | R-05 | « Un objet, une envie, un message » | Corrigé | Titre « Le catalogue ». |
| 25 | R-29 | 7 couleurs actives, 2 accents | Corrigé | Palette du brief, un seul accent (mesure de l'accueil). |
| 26 | R-31 | Logo 3 fois au premier écran | Corrigé | 1 logo par écran sur les 10 pages (mesure `logosEcran`). |
| 27 | R-31 | Bannières `// ---------- … ----------` | Toujours là | Constat 13 (`socle.css`, `panier.astro`, `serveur.ts`, `panier.ts`, admin). |
| 28 | R-20 | Mise en page générique | Corrigé | Grilles à filets, n° de pièce, aperçu gravé, palette bois (captures `audit/apres/*-1440.png`). |

Bilan : 23 corrigés, 4 toujours là en tout ou en partie (9, 19 pour le nombre de polices, 21, 27), 0 sans objet. Le constat 10 est corrigé mais un défaut de même nature apparaît dans le panier (constat 3).

Hors règles de la revue 001 : la photo au personnage sous licence est masquée sur le site (`lib/images.ts:17`) ; les réponses de la FAQ sur Stripe et le suivi sont réécrites (`faq.astro:3` à `:5`). Les deux points sont corrigés.

## Suite

Mode after : choisissez les numéros à corriger. Les numéros non cités ne seront pas touchés. Les constats 1 à 4 se règlent dans quelques lignes de CSS (en-tête, pied, panier, `Base.astro`) ; 5, 8 et 10 viennent du bandeau de `js/demo.js:476` et de `css/style.css:1` ; 6 demande un écouteur Échap et un `inert` sur le menu fermé ; 7 est un rechercher-remplacer dans l'admin. La contradiction du brief sur les polices est à trancher par l'atelier et l'agence.
