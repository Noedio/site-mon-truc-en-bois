# Revue antislop n° 001 : site actuel Mon Truc en Bois

antislop actif : after (choix de session).

- Date : 24/10/2026. Branche `refonte`. Site servi en local sur http://localhost:4173/.
- Pages : index, boutique, produit.html?id=planche-aperitif, idees-cadeaux, atelier, panier, contact, avis. Largeurs : PC 1440 px et téléphone 390 px.
- Règles appliquées : `.agents/skills/antislop/SKILL.md` (cœur, R-01 à R-38) et les skills `antislop-ui`, `antislop-copywriting`, `antislop-layoutmobile`, `antislop-human` (vérificateur de contraste `contrast-check.py`), `antislop-code`.
- Direction de référence : `PRODUCT.md` et `docs/refonte/BRIEF.md` §3. La revue porte sur le site actuel, pas sur la maquette de la refonte.
- Audit en lecture seule. Rien n'est corrigé tant que des numéros ne sont pas choisis.

## Méthode

- Lecture du code : les 8 pages, `css/style.css`, `js/main.js`, `data/donnees.js`.
- Captures : `audit/avant/*.png`, découpées dans le dossier temporaire de la session (Pillow n'est pas installé : découpe faite avec System.Drawing).
- Mesures dans le navigateur à 390 px (index, boutique, produit, panier avec un article de test, atelier) : largeur de défilement, taille des cibles cliquables, polices réellement affichées. L'article de test a été retiré du stockage du navigateur après la mesure.
- Contraste : `contrast-check.py` pour les couleurs du CSS. Pour le texte posé sur la photo de la fiche produit : pixels de la photo lus sur un canvas, sous la zone du texte.
- Console et liens : `audit/mesures/navigation-brute.json` (0 erreur console, 0 requête en échec, `debordement: false` sur les 16 captures).
- Limites : le panneau du navigateur était en arrière-plan, donc l'état focus n'a pas pu être vu à l'écran (jugé sur le code). Aucun formulaire n'a été envoyé : leur comportement est jugé sur le code.

Priorité : Hard Gate = HAUTE, Purpose-Gate = MOYENNE, Quality Locks = BASSE.

## Constats

### HAUTE (Hard Gate)

**1. R-02, HAUTE. Toutes les pages.**
Preuve : `js/main.js:266` « Site en construction — les prix sont provisoires… » (bandeau en haut de chaque page, visible sur `audit/avant/index-1440-premier-ecran.png`). Aussi `js/main.js:264` (bandeau brouillon).
Raison : tiret cadratin dans un texte affiché sur tout le site.

**2. R-02, HAUTE. Les 8 pages (onglet du navigateur, partage, lecteur d'écran).**
Preuve : `index.html:6` et `:12`, `boutique.html:6` et `:12`, `produit.html:6` et `:53`, `idees-cadeaux.html:6`, `atelier.html:6`, `panier.html:6`, `contact.html:6`, `avis.html:6` (« … — Mon Truc en Bois ») ; `js/main.js:201` (aria-label du logo « … — accueil »).
Raison : tiret cadratin dans les titres de page et dans un libellé lu à voix haute.

**3. R-02, HAUTE. Produit, panier, contact.**
Preuve : `produit.html:109` (exemple « Marie & Paul — 14.06.2026 »), `produit.html:110` (« 0/200 caractères — l'aperçu… »), `produit.html:215` (texte de partage) ; `panier.html:149` (« Texte : « … » — Classique »), `panier.html:86` et `:215` ; `contact.html:118` et `:123` (objet du mail « Demande de devis — … »).
Raison : tiret cadratin dans des textes vus par le client.

**4. R-25, HAUTE. Produit (PC et téléphone).**
Preuve : `css/style.css:253` (texte blanc posé sur la photo, seule une ombre portée), `css/style.css:542` (indice à 75 % d'opacité), `produit.html:197`. Mesure sous « Votre texte ici » sur `img/planche-aperitif.jpg` : 3,14:1 en moyenne, 2,36:1 sur la zone la plus claire, avant même l'opacité de 75 %. Capture : `audit/avant/produit-planche-aperitif-390-premier-ecran.png`.
Raison : texte de 19 px sous le seuil de 3:1 sur une partie de la photo (bois clair).

**5. R-25, HAUTE. Index, boutique, produit, atelier.**
Preuve : `css/style.css:56` (`.etiquette`, 14 px, couleur `--bois` #a8693a, `css/style.css:15`). Vérificateur : 4,42:1 sur blanc, 3,94:1 sur le fond sauge #eef3ef. Utilisée pour la catégorie sur chaque carte produit (`js/main.js:174`), au-dessus du titre produit (`produit.html:89`), et pour « Christophe et Laetitia · depuis 2024 » (`atelier.html:32`).
Raison : texte normal sous 4,5:1, pire encore dans la section « Nos coups de cœur » sur fond sauge.

**6. R-25 (volet non-texte de antislop-human, WCAG 1.4.11), HAUTE. Boutique, produit, panier, contact.**
Preuve : `css/style.css:228`, bordure des champs `--trait` #e5e0d8 sur blanc : 1,31:1.
Raison : le contour est le seul repère du champ et il est sous 3:1.

**7. R-32, HAUTE. Boutique, produit, panier, contact.**
Preuve : `css/style.css:231` `input:focus, select:focus, textarea:focus { outline: none; border-color: var(--foret); box-shadow: 0 0 0 3px rgba(36, 69, 58, 0.15) }`. Le halo vaut environ 1,3:1 sur blanc ; le seul repère net est un filet de 1 px. Les autres éléments ont un contour de 2 px (`css/style.css:49`).
Raison : contour supprimé et remplacé par un indicateur plus faible que celui du reste du site.

**8. R-03, HAUTE. Index, boutique, produit, panier (390 px).**
Preuve, mesurée à 390 px : bouton favori 38×38 (`css/style.css:361`) sur chaque carte produit ; filtres de catégorie 35 px de haut (`css/style.css:215`) ; « Retirer » 42×23 (`css/style.css:275`) ; boutons Favori, Partager et téléphone de la fiche 39 px de haut (`css/style.css:414`).
Raison : cibles sous 44 px sur téléphone.

**9. R-03, HAUTE. Toutes les pages (390 px).**
Preuve : liens du pied de page 24 px de haut avec 7 px d'écart (`css/style.css:322`) ; fil d'Ariane de la fiche 23 px ; liens « Tout le catalogue », « Tous les avis », « Continuer mes achats » 26 px (`.lien-fleche`, `css/style.css:60`).
Raison : liens empilés trop petits et trop serrés pour le pouce.

**10. R-03, HAUTE. Toutes les pages (390 px).**
Preuve : bouton flottant « Appeler » (`css/style.css:441` à `449`, `js/main.js:273` à `284`). En bas de `atelier.html` à 390 px : bouton aux coordonnées 328 à 374 × 782 à 828, texte « Fait main à Auchel » aux coordonnées 263 à 374 × 799 à 820. `body` n'a aucune marge basse réservée.
Raison : le bouton fixe recouvre la dernière ligne de la page. Le brief §2 prévoit aussi de retirer ce bouton.

**11. R-38 (et R-36), HAUTE. Index, produit.**
Preuve : `index.html:38` et `produit.html:96`, cinq étoiles ★★★★★ devant « Recommandé à 100 % sur Facebook (16 avis) ». `data/donnees.js:33` à `44` : Facebook donne un taux de recommandation, Google a 0 avis.
Raison : les étoiles font croire à une note de 5 sur 5 qui n'existe nulle part.

**12. R-38, HAUTE. Index, atelier.**
Preuve : `index.html:41` « Chaque pièce passe entre nos mains… » et `atelier.html:37` « Venez nous voir : on aime parler de votre projet autour de l'établi », signées « Christophe et Laetitia ». Ces deux phrases arrivent avec le commit `2a8f966` (passe de design co-écrite par Claude). Aucun document ne montre que l'atelier les a écrites ou validées.
Raison : citation attribuée à des personnes réelles sans source. Le constat tombe si l'atelier confirme les phrases.

**13. R-38, HAUTE. Avis.**
Preuve : `avis.html:30` « Des avis laissés sur nos pages Facebook et Google ». `data/donnees.js:39` à `44` : Google a 0 avis ; les 10 avis affichés viennent tous de Facebook.
Raison : la phrase annonce des avis Google qui n'existent pas.

**14. R-38, HAUTE. Panier.**
Preuve : `panier.html:231` « Nous vous recontactons sous 48 h ». `PRODUCT.md` (Faits manquants) : délais [À COMPLÉTER].
Raison : engagement chiffré sans source dans les données du projet. À confirmer avec l'atelier ; s'il est réel, le constat tombe.

**15. R-36, HAUTE. Index et pied de page de toutes les pages.**
Preuve : `index.html:50` « Fait main à Auchel », `js/main.js:257` (pied de page). Le catalogue décrit de la gravure laser et de l'impression (`data/donnees.js:87`, `:93`).
Raison : affirmation à faire valider par l'atelier pour des pièces faites à la machine. « Fabriqué dans notre atelier d'Auchel » dirait la même chose sans risque.

**16. R-37, HAUTE. Tout le site.**
Preuve : `css/style.css:6` à `29` (palette forêt, bois, sauge ; polices Bricolage Grotesque, Figtree, Caveat ; rayons de 14 px et 10 px) face à `docs/refonte/BRIEF.md` §3 (Big Shoulders, Literata, Courier Prime ; bouleau, brûlé, gravure ; angles de 0 à 2 px).
Raison : la direction validée existe et le site actuel ne l'applique pas. C'est l'objet même de la refonte, mais en l'état ce n'est pas un livrable conforme.

### MOYENNE (Purpose-Gate)

**17. R-01, MOYENNE. Index (section catégories).**
Preuve : `css/style.css:151`, dégradé noir de 0 à 88 % sur les 4 cartes catégories ; aucune raison écrite. Capture : `audit/avant/index-1440.png` (section « Un objet, une envie, un message »).
Raison : dégradé posé par défaut ; le brief §2 retire ces cartes à dégradé sombre.

**18. R-04, MOYENNE. Index, produit, atelier.**
Preuve : icônes à trait fin et bouts arrondis, style Lucide (`js/main.js:54` à `81`, `css/style.css:62`). Elles servent en rangée de réassurance (`index.html:48` à `55`, `produit.html:143` à `147`) et sur les 4 savoir-faire (`atelier.html:49` à `52`).
Raison : jeu d'icônes au look de bibliothèque, sans raison écrite ; le brief interdit ces rangées.

**19. R-06, MOYENNE. Toutes les pages.**
Preuve : `css/style.css:21` et `22` (Bricolage Grotesque, Figtree) : aucune raison de marque écrite, le commentaire `css/style.css:3` à `5` ne justifie que l'écriture manuscrite. Mesuré à 390 px : 3 polices affichées sur index et atelier (Figtree, Bricolage Grotesque, Caveat). `css/style.css:1` charge 5 familles sur chaque page. Le configurateur utilise encore 4 autres polices (`produit.html:24` à `29`).
Raison : polices choisies sans raison écrite et sans lien avec les polices de gravure, comme le demande le brief.

**20. R-14, MOYENNE. Index, atelier.**
Preuve : garanties ×4 (`index.html:50` à `53`), étapes ×4 (`index.html:133` à `136`), savoir-faire ×4 (`atelier.html:49` à `52`) : même taille, même icône ou numéro, même marge.
Raison : blocs identiques sans hiérarchie ni raison écrite.

### BASSE (Quality Locks)

**21. R-16, BASSE. Index, atelier, produit.**
Preuve : titre d'accueil « Offrez un cadeau unique, qui restera gravé dans les mémoires » (`data/donnees.js:64`, jeu de mots que le brief interdit) ; « chaque pièce est unique et préparée avec soin » (`data/donnees.js:69`) ; « Cadeaux uniques » (`index.html:13` et `:18`, description du site) ; « fabriquée avec soin » (`index.html:136`) ; « Le cadeau parfait » (`data/donnees.js:116`, fiche planche) ; « parfait pour » (`:183`) ; « Idéal pour » (`:267`). La photo `img/boutique-auchel.jpg` porte le même slogan écrit dans l'image (`audit/avant/index-1440.png`, section « Venez nous voir »).
Raison : mots creux à la place de faits (matière, dimension, délai).

**22. R-15, BASSE. Index, panier.**
Preuve : « Découvrir la boutique » (`index.html:35`), « Découvrir l'atelier » (`index.html:93`), « Découvrez nos créations personnalisables » (`panier.html:121`).
Raison : appels à l'action génériques (« Discover »).

**23. R-05, BASSE. Index.**
Preuve : `index.html:28` à `167`, ordre du gabarit : héros avec 2 boutons, bande de réassurance, cartes catégories, grille produits, bloc atelier, occasions, avis, étapes numérotées 1 à 4, visite, bandeau d'appel final. La même composition « titre + phrase + lien à droite + grille » revient 5 fois (`index.html:59`, `:72`, `:100`, `:112`, `:126`). Même marge pour toutes les sections (`css/style.css:53`).
Raison : page d'accueil construite sur le gabarit par défaut, pas sur le parcours voulu (le configurateur n'est pas au premier écran).

**24. R-05 (règle « Rule of Three » de antislop-copywriting), BASSE. Index.**
Preuve : `index.html:61` « Un objet, une envie, un message ».
Raison : slogan en trois temps, interdit par le brief.

**25. R-29, BASSE. Index, produit, avis.**
Preuve : vert forêt #24453a (boutons, liens, compteur), bois #a8693a (étiquettes, icônes, chiffres, signature), sauge #eef3ef (fonds), jaune #d99a1e (étoiles, `css/style.css:119`), bleu Facebook #1b4fa8 (`css/style.css:474`), rouge #c0392b (favori actif, `css/style.css:367`), vert #2fa36b (point « Aperçu en direct », `css/style.css:544`).
Raison : plus de 3 couleurs actives hors neutres, et deux couleurs jouent le rôle d'accent (forêt et bois).

**26. R-31, BASSE. Index, atelier.**
Preuve : logo affiché 3 fois au premier écran PC de l'accueil (en-tête, `index.html:31`, `index.html:40`) et de la page atelier (en-tête, `atelier.html:31`, `atelier.html:36`) ; 2 fois à 390 px. Capture : `audit/avant/index-1440-premier-ecran.png`.
Raison : répétition sans raison écrite qui dispute le point focal au titre ; le brief §2 retire le logo en double.

**27. R-31 (antislop-code, séparateurs décoratifs), BASSE. Code.**
Preuve : `js/main.js:4`, `:54`, `:85`, `:142`, `:183`, `:195`, `:319`, `:357`, `:391`, `:434`, `:511`, `:529` (« // ---------- … ---------- ») ; `css/style.css:64`, `:80`, `:85`, `:112`, `:125`, `:142`, `:164`, `:179`, `:187`, `:201`, `:207`, `:212`, `:223`, `:245`, `:263`, `:286`, `:293`, `:308`, `:314`, `:333` à `335`, `:498`, `:517` à `519`, `:553` à `555` ; `data/donnees.js:1` à `4` (bannière en capitales). Tirets cadratins dans les commentaires `css/style.css:3` et `data/donnees.js:2`.
Raison : bannières décoratives qui n'apportent pas d'information.

**28. R-20, BASSE. Tout le site.**
Preuve : en-tête blanc flouté, héros en 2 colonnes, cartes à coins arrondis, pied sombre en 4 colonnes (captures `audit/avant/*-1440.png`).
Raison : sans les photos et les prénoms, la mise en page pourrait servir à n'importe quelle boutique ; l'identité tient aux photos seules.

### Hors règles antislop (pour information)

- `img/plaque-naissance-bois.jpg` montre un personnage sous licence. Elle sert encore de carte catégorie « Naissance, mariage & fêtes » (`data/donnees.js:100`) et dans la galerie de l'atelier (`data/donnees.js:76`). `PRODUCT.md` et le brief disent de ne pas la réutiliser.
- `faq.html` (lien « Questions » de l'en-tête, hors des 8 pages revues) annonce le paiement par carte via Stripe et un email avec lien de suivi (`data/donnees.js`, réponses « Comment payer ? » et « Comment suivre ma commande ? »), alors que ni le paiement en ligne ni Supabase ne sont actifs (`data/donnees.js:46` à `53`). À revoir sous R-38 lors d'une revue de cette page.

## Interdits du brief §3

| Interdit | Résultat | Preuve |
| --- | --- | --- |
| Dégradés décoratifs | FAIL | `css/style.css:151`, dégradé sombre sur les cartes catégories (retrait prévu au brief §2). Il sert à la lisibilité du texte blanc, mais sans raison écrite. |
| Glassmorphism | FAIL | `css/style.css:88`, en-tête en `backdrop-filter: blur(12px)`. Un seul élément, donc dans la limite de R-10, mais le brief l'interdit. |
| Ombres douces | FAIL | `--ombre` (`css/style.css:28`) sur le menu mobile (`:106`) et le récapitulatif du panier (`:571`) ; autres ombres floues `:252`, `:354`, `:362`, `:421`, `:444`, `:521`, `:543`. |
| Cartes arrondies empilées | FAIL | Grille de 10 cartes d'avis à coins de 14 px (`css/style.css:387`, `audit/avant/avis-1440.png`) ; aussi `.carte` (`:289`), `.occasion-carte` (`:378`), `.score` (`:468`), `.appel` (`:202`). |
| Bordure gauche colorée | PASS | Seul `border-left` du CSS : filet gris de 1 px entre les garanties (`css/style.css:129`), pas une bande de couleur. |
| Rangées d'icônes de réassurance | FAIL | `index.html:48` à `55` (4 garanties avec icône) ; `produit.html:143` à `147` (3 lignes avec icône). |
| Emojis | PASS | Analyse des 8 pages, de `main.js`, `donnees.js` et `style.css` : aucun emoji. Seuls des caractères texte : ✓ (`produit.html:286`, `css/style.css:493`) et ★. |
| Étoiles décoratives | FAIL | ★★★★★ en `aria-hidden` à `index.html:38` et `produit.html:96`, sans note derrière (voir constat 11). |
| Slogans en trois temps | FAIL | `index.html:61` « Un objet, une envie, un message ». |
| Mots creux « unique / passion / sublimer » | FAIL | « unique » : `data/donnees.js:64`, `:69`, `index.html:13` et `:18`. « passion » et « sublimer » : absents. |
| Plus de deux polices par écran | FAIL | Mesuré à 390 px : index et atelier affichent Figtree, Bricolage Grotesque et Caveat. La fiche produit en affiche 2, plus les polices du configurateur (aperçu de gravure, toléré par le brief). |
| Plus d'une couleur d'accent | FAIL | Vert forêt (boutons, liens, compteur) et bois (étiquettes, icônes, numéros, signature) jouent tous deux l'accent, plus le jaune des étoiles (`css/style.css:119`). |
| Images générées par IA | PASS, avec réserve | Les photos produits montrent la carte de visite de l'atelier et de vrais décors (captures `audit/avant/`). Les fichiers n'ont pas de données EXIF : la preuve est visuelle et vient de `PRODUCT.md`, pas des métadonnées. |

Bilan : 10 FAIL, 3 PASS (dont 1 avec réserve).

## Delivery Gate

Résultat global : **FAIL**. Le site actuel n'est pas livrable en l'état au sens d'antislop.

### Bloc 1 : Hard Gate

| Règle | Statut | Preuve |
| --- | --- | --- |
| R-02 tiret cadratin | FAIL | Constats 1, 2, 3. |
| R-03 téléphone | FAIL | Aucun débordement horizontal (mesuré à 390 px et `navigation-brute.json`), mais cibles trop petites et bouton flottant qui masque du texte : constats 8, 9, 10. |
| R-17 chiffres | PASS | « 100 % » et « 16 avis » viennent de Facebook (`data/donnees.js:33` à `38`, confirmé par `PRODUCT.md`). |
| R-18 témoignages | PASS | Avis nommés et datés, source Facebook (`data/donnees.js` « avis »), confirmés par `PRODUCT.md`. |
| R-23 visuels créés sans accord | PASS | Logo fourni par l'atelier ; avatar du « mot » = logo, pas un faux visage ; aucune statistique inventée. |
| R-24 navigation | PASS | Les 5 liens de l'en-tête et les liens du pied mènent à des fichiers présents (`navigation-brute.json`, liste des fichiers). |
| R-25 contraste | FAIL | Constats 4, 5, 6. |
| R-26 contrôles morts | PASS | Favori, partage, filtres, tri, burger, onglets de photos : chacun a un code réel (`js/main.js:555` à `560`, `:592` à `596` ; `produit.html:207` à `221` ; `boutique.html:115` à `122`). En mode aperçu, commande et devis affichent un message au lieu de partir (`js/main.js:471` à `489`). |
| R-27 états | PASS | Panier vide (`panier.html:121`), aucun résultat (`boutique.html:106`), produit introuvable (`produit.html:51`), pas d'avis (`avis.html:38`), erreur serveur (`panier.html:399`). Données locales : pas de chargement réseau à afficher. |
| R-28 FAQ | PASS | Questions propres au métier (`data/donnees.js`, « faq »). Réserve sur deux réponses, voir « Hors règles ». |
| R-32 clavier | FAIL | Constat 7. Le reste suit `:focus-visible` (`css/style.css:49`) ; radios et dépôt de photo ont un focus visible (`:240`, `:547`, `:570`). |
| R-33 script de retouche | PASS | `outils/generer-pages.mjs` réécrit seulement les blocs SEO entre balises (`<!-- seo:debut -->`), pas de fonction d'interface. À surveiller. |
| R-34 thèmes | PASS | Un seul thème, pas de bascule. |
| R-35 vérification | FAIL | Vérifié : 0 erreur console, 0 débordement, liens présents, cibles et polices mesurées. Non vérifié en vrai : clic sur chaque contrôle et envoi des formulaires (jugés sur le code seulement). La règle demande le parcours clic par clic enregistré. |
| R-36 affirmations | FAIL | Constats 11 et 15. |
| R-37 direction | FAIL | Constat 16. |
| R-38 contenu réel | FAIL | Constats 11, 12, 13, 14. |

### Bloc 2 : Purpose-Gate

| Règle | Statut | Preuve |
| --- | --- | --- |
| R-01 dégradés | FAIL | Constat 17. |
| R-04 icônes | FAIL | Constat 18. |
| R-06 typographie | FAIL | Constat 19. Pas de capitales espacées ni de grande police à chasse fixe. |
| R-07 fond quadrillé | PASS | Aucun motif de fond dans `css/style.css`. |
| R-08 flèches | PASS | Seulement « Nom (A → Z) » (`boutique.html:41`) et l'annonce, désactivée (`js/main.js:268`). |
| R-09 badges | PASS | Aucun badge actif dans le catalogue (`"badge": ""` sur les 27 produits). « Aperçu en direct » marque un vrai état. |
| R-10 verre dépoli | PASS | Un seul élément (`css/style.css:88`). Le brief l'interdit quand même. |
| R-12 ombres | PASS | Pas d'ombre sur chaque composant. Le brief les interdit quand même. |
| R-13 halo lumineux | PASS | Aucun. |
| R-14 cartes identiques | FAIL | Constat 20. |
| R-19 animations | PASS | Survols et transitions courtes, `prefers-reduced-motion` respecté (`css/style.css:50`). |
| R-22 illustrations | PASS | Vraies photos uniquement. |

### Bloc 3 : vivacité

| Point | Statut | Preuve |
| --- | --- | --- |
| Réglages ENERGY / RHYTHM / MOTION déclarés | FAIL | Aucun dans le code ni dans `PRODUCT.md`. |
| Rendu cohérent avec les réglages | FAIL | Rien à comparer, faute de réglages. |
| Un point focal par écran | FAIL | Accueil PC : logo du héros, titre, mosaïque et citation se disputent le premier écran (constat 26). |
| Blancs qui structurent | FAIL | Même marge pour toutes les sections (`css/style.css:53`). |
| Un seul accent voulu | FAIL | Deux accents (constat 25). |
| Motif d'identité | PASS | Le « mot de l'atelier » manuscrit revient sur l'accueil et l'atelier (mais voir constat 12 sur la source des phrases). |
| Lecture de direction déclarée avant création | FAIL | Aucune trace. |

### Bloc 4 : savoir-faire et cohérence

| Point | Statut | Preuve |
| --- | --- | --- |
| C-1 choix par défaut | FAIL | Polices, dégradé, icônes sans raison (constats 17 à 19). |
| C-2 contrôles inutiles | PASS | Voir R-26. |
| C-3 sections de gabarit | FAIL | Bande de réassurance, étapes 1 à 4 et bandeau d'appel final qui répète « Demander un devis » du héros (constat 23). |
| C-4 tenue | FAIL | Téléphone et contraste (constats 4 à 10). |
| C-5 preuves | FAIL | Constats 11 à 14. |
| R-05 mise en page | FAIL | Constats 23 et 24. |
| R-11 rayons | PASS | Rayons variés (10 px boutons, 14 px cartes, pilules pour filtres et pastilles), pas tout en pilule. |
| R-15 boutons d'action | FAIL | Constat 22. |
| R-16 mots creux | FAIL | Constat 21. |
| R-20 identité | FAIL | Constat 28. |
| R-21 thème sombre | PASS | Thème clair fixe, cohérent avec la palette claire du brief §3. |
| R-29 palette | FAIL | Constat 25. |
| R-30 copie d'un produit connu | PASS | Aucune ressemblance avec Linear, Vercel, Stripe ou Notion. |
| R-31 raisons écrites | FAIL | Constats 26 et 27 ; pas de raison écrite pour les polices, le dégradé ni les ombres. |

## Suite

Mode after : choisissez les numéros à corriger. Les numéros non cités ne seront pas touchés. Beaucoup de constats (polices, palette, angles, réassurance, accueil) seront traités d'office par la refonte (lots 1 à 3 du brief) ; les constats 1 à 3, 4 à 10 et 11 à 15 peuvent se corriger sur le site actuel sans attendre.
