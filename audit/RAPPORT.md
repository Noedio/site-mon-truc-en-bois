# Audit avant refonte : Mon Truc en Bois

Phase 0 du brief (`docs/refonte/BRIEF.md` §4). Date : 24/10/2026. Branche `refonte`, créée depuis `site-vitrine-boutique` au commit `fc9a00e` (version en ligne).
Site audité : la version en ligne, https://noedio.github.io/site-mon-truc-en-bois/, et la même version servie en local (`npx serve .`).
Aucun fichier du site n'a été modifié. Ce qui manque s'écrit `[À COMPLÉTER : …]`.

## Où trouver les preuves

| Dossier | Contenu |
| --- | --- |
| `audit/avant/` | 32 captures : 8 pages × (1440 px, 390 px) × (pleine page, premier écran). Dans les pleines pages, l'en-tête collant peut apparaître décalé : c'est un artefact de capture. |
| `audit/outils/impeccable-critique-A-revue-design.md` | `/impeccable critique`, volet A : revue de design, heuristiques de Nielsen, personas, constats par gabarit. |
| `audit/outils/impeccable-critique-B-detecteur.md` | `/impeccable critique`, volet B : détecteur (scan des fichiers + overlay dans le navigateur). JSON bruts : `impeccable-detect.json`, `impeccable-detect-tout.json`. Captures overlay : `outils/overlay/`. |
| `audit/outils/impeccable-audit.md` | `/impeccable audit` : audit technique en 5 dimensions, par gabarit. |
| `audit/outils/antislop-audit-001-2026-10-24.md` | Revue anti-slop en mode « after » : 28 constats numérotés, tableau des interdits du brief, Delivery Gate. |
| `audit/outils/parcours/` | Captures prises pendant les tests de parcours (fiche, panier, envoi). `m-` = téléphone, `d-` = PC. |
| `audit/outils/PRODUCT.md` | Copie du contexte produit écrit pour `/impeccable init`. |
| `audit/mesures/` | Lighthouse (6 rapports JSON + HTML), axe (`axe-brut.json`), requêtes et console (`navigation-brute.json`), liens (`liens-verifies.txt`). |
| `audit/test-utilisateurs.md` | Feuille de passation des 5 tâches du brief. |
| `audit/benchmark.md` | Grille vide : 3 concurrents locaux, Coutumes, Polène, Heyday Canning. |

## Ce que le brief ne dit pas (ou plus) : à savoir avant de lire

1. **Il n'y a pas de branche `master`.** GitHub Pages sert la branche `site-vitrine-boutique` (branche par défaut du dépôt `Noedio/site-mon-truc-en-bois`). La règle « ne jamais committer sur `master` » vaut donc pour `site-vitrine-boutique`.
2. **Une partie de l'architecture cible existe déjà dans le code** (brief §5, lots 4 à 6) : table `commandes` et CRM dans Supabase (`supabase/migrations/`), fonctions `commande`, `suivi`, `contact`, `admin`, `stripe-webhook` (`supabase/functions/`), paiement Stripe Checkout, emails Brevo, page de suivi (`suivi.html`), vue des commandes et caisse dans l'admin, 27 tests serveur, et un mode démo complet (`demo.html`). Rien de cela n'est branché en ligne : `supabaseUrl` et `supabaseCle` sont vides, le site est en mode aperçu (`site.apercu: true`).
3. **Le site est entièrement dessiné par JavaScript** à partir de `data/donnees.js` (en-tête, pied, cartes, fiche). C'est la cause principale des décalages de mise en page mesurés sur PC (voir Performance).

## Notes de méthode

- `/impeccable init` : `PRODUCT.md` écrit à la racine (non committé, comme convenu) et copié dans `audit/outils/`. Les clients principaux et le poids des demandes pro restent [À COMPLÉTER].
- `/impeccable critique` : volets A (revue de design) et B (détecteur) faits par deux agents isolés, puis croisés dans ce rapport. Deux étapes de la méthode n'ont pas été faites, pour rester dans le périmètre de l'audit : l'archivage dans `.impeccable/critique/` (dossier hors `audit/`) et les questions de priorisation de fin de critique (elles reviennent à la validation de ce rapport).
- Anti-slop : installé en skills seuls, sans plugin ni serveur MCP. Revue en mode « after » : rien n'a été corrigé.
- Outils : Lighthouse 12 et axe 4.14 via npx ; Playwright avec le Chrome installé. Pour axe, il a fallu un ChromeDriver accordé à la version de Chrome (paquet `chromedriver@155`, installé hors dépôt).
- `npx serve .` réécrit par défaut `produit.html?id=…` en `/produit` et perd l'identifiant du produit. Le serveur local a donc tourné avec `cleanUrls: false`.

---

## 1. Notes par axe

Échelle : 1 = très loin de la cible, 3 = correct avec des manques nets, 5 = cible atteinte.

| Axe | Note | Cible du brief | Atteinte ? |
| --- | --- | --- | --- |
| Identité / anti-slop | **1** | 0 FAIL bloquant | Non : 10 interdits sur 13 en FAIL, Delivery Gate FAIL |
| Structure de l'accueil | **2** | Configurateur visible au 1er écran | Non : aucun configurateur |
| Fiche produit | **3** | Personnaliser en < 60 s | Oui sur PC (3 actions au 1er écran), à l'aveugle sur téléphone |
| Parcours d'achat | **2** | Commande test complète sans aide | Non : l'envoi est refusé en ligne (mode aperçu) |
| Performance | **2** | Score ≥ 90, LCP < 2,5 s, CLS < 0,1 | Non : mobile 79 à 85, LCP 3,2 à 3,8 s ; CLS PC jusqu'à 1,42 |
| Accessibilité | **2** | 0 erreur critique WCAG 2.1 AA | Non : axe ne classe rien en « critical », mais 5 échecs AA majeurs (focus perdu, menu mobile, contrastes) |
| SEO local | **3** | LocalBusiness + Product présents | Oui, mais injectés par JavaScript (sauf Product sur `p/`) et sur le domaine github.io |
| Confiance et légal | **2** | Mentions de vente en ligne complètes | Non : SIRET, forme juridique, TVA, médiateur, directeur de publication manquants |
| Photos | **2** | Une seule mise en scène | Non : fonds variés, carte de visite dans une vingtaine de photos, 2 photos à risque de licence |
| Code | **3** | Liste de ce qu'on garde | Oui : voir §3 |

### 1.1 Identité / anti-slop : 1/5

- **Revue anti-slop « after » : Delivery Gate FAIL**, 28 constats (16 haute, 4 moyenne, 8 basse). Tableau des interdits du brief §3 : **10 FAIL, 3 PASS** (`audit/outils/antislop-audit-001-2026-10-24.md`).
- **Verdict de la critique impeccable : « le site est interchangeable »**. On pourrait remplacer photos et logo par ceux d'un fleuriste sans rien changer d'autre (`impeccable-critique-A-revue-design.md` §2).
- Interdits du brief présents, avec preuve :
  - bande de 4 pictos de réassurance : `index.html:48-55` ; liste de 3 pictos sous le bouton d'achat : `produit.html:143-147` ;
  - cartes catégories à dégradé sombre : `css/style.css:151` ;
  - bouton flottant « Appeler » : `js/main.js:273-284` (il recouvre la citation de l'accueil sur téléphone, `audit/avant/index-390-premier-ecran.png`) ;
  - logo 3 fois au premier écran PC de l'accueil (en-tête, héros `index.html:31`, avatar `index.html:40`), 4 fois sur la page (`audit/avant/index-1440-premier-ecran.png`) ;
  - titre jeu de mots « Offrez un cadeau unique, qui restera gravé dans les mémoires » (`data/donnees.js:64`) ; slogan en trois temps « Un objet, une envie, un message » (`index.html:61`) ; « unique » 4 fois ;
  - 3 polices affichées sur l'accueil et l'atelier (Bricolage Grotesque, Figtree, Caveat), 5 familles chargées sur chaque page (`css/style.css:1`) ;
  - deux couleurs d'accent (vert forêt `#24453a` et bois `#a8693a`), plus le jaune des étoiles ;
  - ombres douces (`--ombre`, `css/style.css:27`), en-tête en verre dépoli (`backdrop-filter`, `css/style.css:88`), cartes arrondies à 14 px empilées ;
  - étoiles ★★★★★ devant « Recommandé à 100 % sur Facebook » (`index.html:38`, `produit.html:96`).
- Détecteur impeccable : 7 constats au scan des fichiers, dont 5 faux positifs (marges calculées par `clamp()`) ; 24 dans le navigateur (12 mots isolés en fin de ligne, 8 contrastes faibles, 4 sauts de titres) (`impeccable-critique-B-detecteur.md`).
- PASS : pas d'emoji, pas de bordure gauche colorée, vraies photos de vraies pièces.

### 1.2 Structure de l'accueil : 2/5

- **Pas de configurateur au premier écran**, ni sur PC ni sur téléphone. Le premier écran PC montre logo, titre, deux boutons (« Découvrir la boutique », « Demander un devis »), étoiles et citation (`audit/avant/index-1440-premier-ecran.png`). Sur téléphone, aucune photo de pièce n'est visible au premier écran (`audit/avant/index-390-premier-ecran.png`).
- **10 sections** dans l'ordre d'un gabarit : héros, pictos, catégories, coups de cœur, atelier, occasions, avis, 4 étapes, visite, bandeau devis (`index.html:28-167`). La même composition « titre + phrase + lien + grille » revient 5 fois.
- **Doublons** : téléphone 4 fois (bandeau, bouton flottant, bloc visite, pied), horaires 2 fois, les 3 photos du héros reprises en tête des coups de cœur (`index.html:180-183`), Winnie l'Ourson 2 fois.
- Le bandeau jaune « Site en construction » occupe 3 lignes (84 px) en haut de chaque page sur téléphone.
- Points forts : vraies photos, prix visibles, adresse et « Ouvert maintenant » exacts.

### 1.3 Fiche produit : 3/5

- **Ce qui marche** : aperçu en direct du texte, 4 polices affichées dans leur propre style, aperçu collant sur PC, garde-fou si le texte est vide, panier qui rappelle texte et police. Sur PC, texte et police tiennent dans le premier écran : 3 actions (champ texte à 548 px, polices à 738 px, écran de 900 px). Les flèches du clavier changent la police.
- **Sur téléphone, on écrit à l'aveugle** : l'aperçu se termine à 582 px, le champ texte commence à 1 067 px ; après « Personnaliser », le bas de l'aperçu est 88 px au-dessus de l'écran (mesuré, `audit/outils/parcours/m-produit-saisie.png`).
- **L'aperçu ne ressemble pas à une gravure** : texte blanc ombré posé sur la photo d'une planche déjà gravée « J'ai essayé le sport… » (`css/style.css:253`, `audit/outils/parcours/m-produit-apercu-rempli.png`). Un texte de 200 caractères recouvre tout (`parcours/d-produit-texte-long.png`). Contraste de « Votre texte ici » sur le bois clair : 2,36:1 au pire.
- **Délai invisible** : l'encart existe (`produit.html:99`) mais ne s'affiche que si `delai` est rempli ; il vaut 0 pour les 27 produits.
- **Pas de fiche technique** : aucun produit n'a de matière, dimensions ou zone gravable dans les données ; tailles « Moyenne / Grande (+8 €) » sans centimètres (`data/donnees.js:121-133`).
- « Disponible » en vert alors qu'on ne peut pas commander (`produit.html:69`). Polices de l'aperçu (Georgia, Dancing Script, Figtree, IBM Plex Mono, `produit.html:24-29`) différentes de celles du site.
- Le temps réel de personnalisation reste à mesurer avec des humains (tâche 2 de `audit/test-utilisateurs.md`).

### 1.4 Parcours d'achat : 2/5

- Ajout au panier, compteur, message de confirmation, panier en 3 étapes : fonctionnent (`parcours/d-panier-plein.png`, `parcours/m-produit-ajoute.png`).
- **L'envoi est refusé en fin de parcours** : après avoir rempli tout le formulaire, « Envoyer ma commande » affiche « le site est encore en construction » (`js/main.js:471-489`, testé). Sur PC, le message apparaît loin du bouton (`parcours/envoi-1440.png`). **Le formulaire de devis est bloqué de la même façon** alors que 3 boutons y mènent (testé sur `contact.html`).
- **La livraison à 5,90 € est cochée par défaut** (`panier.html:26`), alors que le retrait gratuit est un argument clé.
- On ne peut pas corriger un texte depuis le panier, seulement « Retirer », sans annulation (`panier.html:282-287`).
- Sur téléphone, le bouton « Envoyer ma commande » est à 2 174 px sur 3 512, sans total collant (mesuré).
- La date de l'occasion est dans une étape facultative, sans contrôle par rapport au délai.
- Le parcours complet (commande, maquette, paiement, suivi) fonctionne dans la démo (`demo.html`), pas sur le site public.

### 1.5 Performance : 2/5

Lighthouse 12, version en ligne (GitHub Pages), 24/10/2026 (`audit/mesures/lighthouse-*.report.html`) :

| Page | Mobile | LCP mobile | CLS mobile | Desktop | CLS desktop | Poids | Requêtes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Accueil | 79 | 3,8 s | 0 | 82 | **0,302** | 1 348 Ko | 21 |
| Boutique | 85 | 3,2 s | 0 | 73 | **1,423** | 2 292 Ko | 32 |
| Fiche planche | 81 | 3,7 s | 0 | 91 | **0,159** | 743 Ko | 17 |

- **Polices** : 5 familles chargées par `@import` dans le CSS (`css/style.css:1`), soit une chaîne bloquante CSS → CSS Google → fichiers. 5 fichiers woff2, 15 à 75 Ko chacun, jusqu'à 168 Ko par page. Lighthouse estime 2,1 à 2,3 s gagnables sur mobile en supprimant les ressources bloquantes.
- **Images** : JPEG 800 × 800 servis même pour des vignettes ; 3,8 Mo au total dans `img/`. Économies estimées : jusqu'à 2,3 Mo sur la boutique (formats modernes et tailles adaptées). `logo.webp` pèse 135 Ko pour un affichage d'environ 120 px. Images sans dimensions déclarées sur l'accueil.
- **Décalages de mise en page (CLS) sur PC** : le contenu de `<main>` est injecté par JavaScript, puis les polices changent la hauteur des lignes (`layout-shifts` de `lighthouse-boutique-desktop`). Sur la boutique, l'image principale (LCP) est en `loading="lazy"`.
- Pas de cache long : 15 à 32 ressources sans durée de cache (limite de GitHub Pages).
- 0 erreur console, 0 requête en échec, 0 débordement horizontal sur les 16 vues (`navigation-brute.json`).
- Réserve : mesures faites pendant que d'autres analyses tournaient sur la même machine ; les scores peuvent varier de quelques points.

### 1.6 Accessibilité : 2/5

- Lighthouse accessibilité : 93 (accueil), 94 (boutique), 96 (fiche).
- axe 4.14 (WCAG 2.0/2.1 A et AA + bonnes pratiques, `audit/mesures/axe-brut.json`) : **aucune violation « critical »**, mais des violations « serious » qui sont des échecs AA :
  - contraste de `.etiquette` couleur bois `#a8693a` : 4,42:1 sur blanc, 3,94:1 sur le fond sauge (WCAG 1.4.3) : 9 éléments sur l'accueil, 27 sur la boutique, 5 sur la fiche ;
  - lien du logo dont le nom lu ne contient pas le texte visible (WCAG 2.5.3) : 1 par page ;
  - ordre des titres (H1 puis H3) sur l'accueil et la boutique ; bandeau et bouton flottant hors des zones de page.
- Constats complémentaires (anti-slop, audit impeccable) :
  - bordure des champs à 1,31:1 (WCAG 1.4.11) ;
  - focus des champs remplacé par un filet de 1 px (`css/style.css:231`) ;
  - cibles tactiles de 23 à 39 px sur téléphone (cœurs favoris 38 × 38, « Retirer » 42 × 23, filtres 35 px) ;
  - le bouton flottant recouvre le bas des pages.
- **Audit technique impeccable : 11/20** (accessibilité 2, performance 2, theming 2, responsive 3, intégrité 2), 22 constats dont 5 P1 (`audit/outils/impeccable-audit.md`) :
  - le focus clavier retombe sur `<body>` quand le panier ou les filtres de la boutique se redessinent (WCAG 2.4.3, vérifié à 1280 px) ;
  - menu mobile : liens avant le bouton dans l'ordre de tabulation, Échap ne le ferme pas, pas d'`aria-controls` (WCAG 2.4.3, vérifié à 390 px) ;
  - contraste des étiquettes couleur bois (WCAG 1.4.3) ;
  - texte de l'aperçu à 2,0 à 3,0:1 sur la photo sans l'ombre (WCAG 1.4.3) ;
  - message « envoi non ouvert » du panier hors zone annoncée et loin du bouton (WCAG 4.1.3).
- Autres constats de l'audit technique : radios de police sans `fieldset`, pas de lien d'évitement, focus caché par la barre d'achat de la fiche, texte seul agrandi à 200 % qui fait déborder l'en-tête à 1280 px et 4 gabarits à 390 px.
- Points forts vérifiés : toutes les images ont un `alt`, tous les champs ont une étiquette, focus visible sur les liens et boutons, zoom de page à 200 % sans casse, `prefers-reduced-motion` respecté, aucun débordement horizontal à 390 px.
- Non testé : lecteur d'écran réel, appareil physique, gestes tactiles.

### 1.7 SEO local : 3/5

- Titres et descriptions présents et propres à chaque page ; Lighthouse SEO 100 sur les 3 pages ; `sitemap.xml` (10 pages + 27 fiches) et `robots.txt` présents.
- **LocalBusiness** : présent comme `Store` (sous-type de LocalBusiness), mais **ajouté par JavaScript** sur chaque page (`js/main.js:287-317`), donc absent du HTML reçu.
- **Product** : présent en dur dans les 27 pages statiques `p/*.html` (avec fil d'Ariane), générées par `outils/generer-pages.mjs`. Sur `produit.html?id=…`, il est ajouté par JavaScript et le titre de départ est « Produit — Mon Truc en Bois ».
- Les adresses canoniques pointent vers `noedio.github.io`, pas vers `montrucenbois.fr`. Le domaine `montrucenbois.fr` existe (DNS et serveur de mail actifs) : [À COMPLÉTER : qui le gère et où il pointe].
- La page avis annonce une note Google (`avis.html:71-73`) qui ne s'affiche que si des avis Google existent : aujourd'hui 0.
- Pas de fiche Google Business Profile reliée : [À COMPLÉTER : lien de la fiche Google].

### 1.8 Confiance et légal : 2/5

- **Avis** : 10 avis Facebook nommés et datés, 100 % de recommandation sur 16 avis. Les cartes disent « Recommande » sans inventer d'étoiles (`js/main.js:324`). C'est le point fort.
- **Mentions légales incomplètes** (rendu de `mentions-legales.html`) : forme juridique, exploitant, SIRET et directeur de la publication affichés « [à compléter] ». Il n'y a pas d'objet `legal` dans `data/donnees.js`.
- **CGV : modèle non terminé**. La page commence par « Modèle à relire et compléter (les passages entre crochets) avant la mise en ligne ». Restent vides : forme juridique, SIRET, mention de TVA (art. 4 « Les prix sont indiqués en euros, [à compléter] »), médiateur de la consommation (art. 9). Les CGV citent le paiement Stripe et Supabase, qui ne sont pas actifs.
- Le bouton final s'appelle « Envoyer ma commande » (`panier.html:226`). Si le paiement en ligne est ouvert, la loi demande une mention claire de l'obligation de payer : à faire valider.
- **Délais absents** partout (fiche, panier, FAQ qui renvoie à la fiche).
- **Promesses à vérifier ou fausses** :
  - étoiles ★★★★★ sans note derrière ;
  - « avis Facebook et Google » (`avis.html:30`) alors qu'il n'y a aucun avis Google ;
  - « Maquette validée avant toute fabrication » (`index.html:52`) contre « maquette si besoin » ailleurs ;
  - « sous 48 h » (`panier.html:231`) et « Fait main à Auchel » sans source ;
  - deux citations signées « Christophe et Laetitia » (`index.html:41`, `atelier.html:37`) ajoutées par la passe de design `2a8f966`, sans validation connue de l'atelier ;
  - la FAQ annonce le paiement par carte et un lien de suivi par email, qui ne sont pas actifs.
- Sur les cartes de visite visibles dans les photos (ex. `img/bracelet-jonc.jpg`), on lit un numéro SIREN (9 chiffres) et un second téléphone. À faire confirmer avant tout usage ; le SIRET reste [À COMPLÉTER : SIRET].

### 1.9 Photos : 2/5

Planche contact des 40 images de `img/` relue une par une.

- **Atout** : ce sont de vraies pièces et une vraie boutique ; aucune image générée à la place d'une pièce.
- **Mises en scène multiples** : mur végétal artificiel (une dizaine de photos, ex. `plaque-message.jpg`, `verres-graves.jpg`, `mug-personnalise.jpg`), planches grises, voilage clair, toile de jute, fond blanc, rayonnages de la boutique. Lumière et cadrage changent d'une photo à l'autre.
- **Carte de visite dans le cadre** sur une vingtaine des 34 photos produits (ex. `planche-aperitif.jpg`, `bracelet-jonc.jpg`, `tableau-scrabble.jpg`).
- **Une seule photo par produit** (27 produits, 27 images), aucune photo de la pièce vierge (utile pour l'aperçu), aucune photo de détail de gravure.
- **Risques de licence** :
  - `img/plaque-naissance-bois.jpg` : Winnie l'Ourson, personnage sous licence (confirmé). L'image sert de carte de catégorie « Naissance, mariage & fêtes » (`data/donnees.js:100`), de produit et de photo dans la galerie de l'atelier ;
  - `img/verre-imprime.jpg` : écussons du RC Lens, du PSG et d'Arsenal (marques déposées) ;
  - `img/tirelire.jpg` : logo d'un commerce tiers (« Le Comptoir de la Friterie »), probablement un client : [À COMPLÉTER : accord du client].
- `img/boutique-auchel.jpg` est un visuel de flyer (collage + slogan), pas une photo.
- Aucune photo de Christophe et Laetitia ni de la machine laser.

### 1.10 Code : 3/5

- **Structure** : site statique sans framework. 17 pages HTML à la racine, chacune avec son script en ligne ; `js/main.js` (607 lignes) dessine l'en-tête, le pied, les cartes et les avis par gabarits de texte ; `css/style.css` (580 lignes) a des jetons de couleur mais aussi des valeurs en dur. Le contenu vient de `data/donnees.js` (1 055 lignes, JSON après `window.DONNEES =`).
- **Admin** : `admin.html` + `js/admin*.js` (environ 3 300 lignes) pour le catalogue, les textes, les infos boutique, la publication sur GitHub, plus les commandes, la caisse et le CRM (actifs une fois Supabase branché).
- **Serveur** : 5 fonctions Supabase (Deno), 3 migrations SQL avec règles d'accès, emails, webhook Stripe signé, 27 tests qui passent.
- **Outils** : `outils/generer-pages.mjs` (pages produits statiques, SEO, sitemap), `outils/construire.mjs` (build pour Cloudflare Pages, retire la démo).
- **Problèmes** : rendu 100 % côté navigateur (CLS, SEO dépendant du JS), un script par page sans partage, le bundle de démo `js/demo-serveur.js` (1 399 lignes) à reconstruire à chaque changement serveur, 5 polices en `@import`.

---

## 2. Les 10 actions, classées par impact sur la vente et par effort

Impact : effet attendu sur le nombre de commandes et de devis. Effort : F = quelques heures, M = quelques jours, É = une semaine ou plus. « Dépend de C&L » : bloqué par une information ou une photo de Christophe et Laetitia.

| # | Action | Impact | Effort | Dépend de C&L | Lot |
| --- | --- | --- | --- | --- | --- |
| 1 | **Rendre la commande et le devis possibles.** Brancher Supabase (le code existe) ou, tant que le mode aperçu dure, remplacer les envois refusés par un appel ou un email prérempli avec le récapitulatif. Mettre le retrait gratuit coché par défaut. | Très fort | F à M | Oui (comptes Supabase, Brevo) | 4 |
| 2 | **Afficher les délais** : délai par produit (le champ et l'encart existent), « prêt vers le … », date limite par occasion, « Pour quelle date ? » en tête du panier avec alerte. | Très fort | F (code) | Oui (délais réels) | 2-3 |
| 3 | **Retirer ce qui est faux ou contradictoire** : étoiles, « et Google », une seule promesse sur la maquette, citations non validées, FAQ sur Stripe ; retirer les photos sous licence. | Fort (confiance) | F | Oui (validation des textes) | 7 |
| 4 | **Compléter mentions légales et CGV** : forme juridique, SIRET, TVA, médiateur, directeur de publication, libellé du bouton de commande. | Fort (droit de vendre) | F | Oui | 7 |
| 5 | **Mettre le configurateur en tête de l'accueil** : pièce, texte, police, prix, « Personnaliser cette pièce » (maquette `docs/refonte/maquette/accueil.dc.html`). | Fort | M | Non | 3 |
| 6 | **Aperçu de gravure réaliste et visible pendant la saisie** : SVG sur pièce vierge, zone gravable, texte brun, limite de lignes ; aperçu collé en haut sur téléphone. | Fort | M à É | Oui (photos de pièces vierges, zones gravables) | 3 |
| 7 | **Fiche technique par pièce** : N° de pièce, matière, dimensions des tailles, zone gravable, délai, entretien. | Moyen à fort | M | Oui (mesures) | 2-3 |
| 8 | **Une séance photo unique** : même fond et même lumière, sans carte de visite, pièce vierge + pièce gravée + détail, l'atelier, la machine, Christophe et Laetitia. | Moyen à fort | É (hors code) | Oui | 2 |
| 9 | **Performance** : 2 ou 3 polices auto-hébergées sans `@import`, images WebP/AVIF à la bonne taille avec dimensions, HTML rendu au build (Astro) pour supprimer le CLS. | Moyen | M | Non | 1 |
| 10 | **Appliquer la direction du brief §3** : polices de gravure, palette des matières, angles droits, filets ; retirer pictos, dégradés, bouton flottant, logo en double ; titres qui décrivent. | Moyen | M | Non | 1 |

Ordre conseillé : 1 à 4 d'abord. Ils coûtent peu, et sans eux un visiteur convaincu ne peut ni commander ni savoir s'il sera livré à temps. Ils peuvent aussi être corrigés sur le site actuel en attendant la refonte. Ensuite 5 à 7 (le cœur de la refonte), puis 8 à 10.

---

## 3. Ce qu'on garde du code actuel

| Élément | Où | Pourquoi le garder | Ce qui change |
| --- | --- | --- | --- |
| Logique de l'aperçu en direct | `produit.html:24-29`, `:188-270` | Liaison texte → aperçu, liste de polices, compteur, garde-fou texte vide, réduction de photo à 900 px (canvas) | Le rendu passe en SVG (brief §5) ; polices = celles du site |
| Format des données | `data/donnees.js` | Produits, catégories, occasions, avis, FAQ déjà structurés ; édités depuis l'admin | Passe en JSON lu au build ; ajouter `numero`, `matiere`, `dimensions`, `zoneGravable`, `entretien`, `dateLimite` (occasions), et remplir `delai` |
| Admin | `admin.html`, `js/admin*.js` | Catalogue, textes, infos boutique, publication GitHub, commandes, caisse, CRM, mode dégradé, brouillons | Doit écrire le JSON et déclencher le build Astro au lieu d'écrire `donnees.js` |
| Panier dans le navigateur | `js/main.js:102-140`, `panier.html` | Stockage local, compteur, calcul des frais (`simuler`), modes de retrait et de paiement | Nouveau gabarit ; retrait par défaut ; modifier une ligne |
| Serveur Supabase | `supabase/functions/`, `supabase/migrations/`, `supabase/tests/` | Couvre déjà les lots 4 à 6 : commandes, suivi, devis, Stripe Checkout, webhook signé, emails, CRM ; 27 tests | À relire face au parcours du brief (statut « à maquetter », maquette envoyée, retouche) avant d'écrire du neuf |
| Données structurées et pages produits | `outils/generer-pages.mjs`, `js/main.js:287-317` | Product, BreadcrumbList, Store, sitemap, robots | Repris dans les gabarits Astro, en HTML statique |
| Mode démo | `js/demo.js`, `demo.html` | Faire tester le parcours complet sans compte réel | À garder pour les tests utilisateurs, exclu du build de production |
| Horaires et « Ouvert maintenant » | `js/main.js:358-390` | Calcul juste et utile | Repris tel quel |

**À jeter** : `css/style.css` (toute la couche visuelle), les gabarits de `js/main.js` (`entete`, `pied`, `carteProduit`, bouton flottant, bandeaux), les icônes de réassurance, les 5 polices actuelles, les pages `p/*.html` générées (remplacées par les pages Astro), les scripts en ligne de chaque page.

---

## 4. Risques

1. **Refaire ce qui existe.** Le brief décrit les lots 4 à 6 comme à construire alors que le code les couvre en grande partie. Le plan de migration doit partir du code existant.
2. **Publication depuis l'admin.** Aujourd'hui l'admin écrit `data/donnees.js` dans le dépôt par l'API GitHub, et le site le lit tel quel. Avec Astro, chaque modification devra déclencher un build (GitHub Actions ou Cloudflare Pages) : délai de mise en ligne et nouveau point de panne pour le commerçant.
3. **Redirections 301.** GitHub Pages ne sait pas faire de redirection serveur. Les règles `_redirects` de Cloudflare Pages ne lisent pas le paramètre `?id=` : il faudra une page `produit.html` qui redirige en JavaScript, ou des règles sur les pages `p/*.html`.
4. **Domaine.** `montrucenbois.fr` existe déjà, avec un serveur de mail actif ([À COMPLÉTER : registraire et hébergeur]). Changer les DNS sans précaution peut couper les emails de la boutique.
5. **Licences.** Photos de Winnie l'Ourson et d'écussons de clubs : risque pour le site, et peut-être pour la vente de ces produits eux-mêmes. Question à poser avant toute mise en avant.
6. **Textes attribués sans validation.** Deux citations signées « Christophe et Laetitia », « Fait main », « sous 48 h » : à faire valider ou retirer avant toute mise en ligne de la refonte.
7. **Dépendance aux informations de l'atelier.** Délais, dimensions, matières, zones gravables, photos de pièces vierges, informations légales : sans elles, les lots 2, 3 et 7 restent bloqués ou remplis de `[À COMPLÉTER]`.
8. **Polices de gravure.** Big Shoulders 800 et Sacramento ne sont pas encore validées sur le bois (essai prévu au brief). Si l'essai échoue, la typographie du site change aussi.
9. **Légal de la vente en ligne.** Paiement après validation de maquette : le moment où la commande devient ferme, le libellé du bouton et la non-application du droit de rétractation aux pièces personnalisées sont à faire relire.
10. **Mesures.** Scores Lighthouse pris sur GitHub Pages avec d'autres analyses en parallèle : ils servent de point de départ, pas de valeur exacte. Les tests humains (`test-utilisateurs.md`) n'ont pas encore eu lieu.

---

## 5. Questions pour Christophe et Laetitia

**Pour vendre**
1. Quel délai de fabrication pour chaque produit (ou par famille) ? Et en période de fête ?
2. Quelle date limite pour commander avant la fête des mères, la fête des pères, Noël ?
3. Envoyez-vous une maquette pour chaque commande, ou seulement quand c'est nécessaire ?
4. Le rappel « sous 48 h » après une commande ou un devis est-il tenu ?
5. Quels modes de paiement voulez-vous : après validation de la maquette, en boutique, carte en ligne ?
6. Livraison : 5,90 € et gratuite dès 60 €, c'est toujours juste ? Quel transporteur, quelles zones ? L'emballage cadeau existe-t-il ?

**Sur les produits**
7. Pour chaque produit : matière, dimensions de chaque taille (Moyenne, Grande…), zone gravable, entretien.
8. Les produits avec Winnie l'Ourson ou des écussons de clubs : les vendez-vous ? avec quelle autorisation ? Peut-on retirer ces photos du site ?
9. Le logo « Le Comptoir de la Friterie » sur la tirelire : le client est-il d'accord pour qu'on le montre ?
10. Pouvez-vous faire un essai de gravure avec les polices prévues (Big Shoulders, Literata, Courier Prime, Sacramento) ?

**Sur vous**
11. Acceptez-vous d'apparaître en photo sur le site ? Peut-on photographier l'atelier et la machine laser ?
12. Les deux phrases signées « Christophe et Laetitia » sur l'accueil et la page atelier vous conviennent-elles, ou voulez-vous les écrire vous-mêmes ? « Fait main à Auchel » vous convient-il ?
13. Quelle part de vos clients vient d'Auchel et des environs, et quelle part se fait livrer ? Quelle part des commandes vient des associations et des entreprises ?
14. Quels concurrents locaux connaissez-vous (pour le benchmark) ?

**Pour les mentions obligatoires**
15. Forme juridique, SIRET (le numéro SIREN imprimé sur votre carte de visite est-il le bon ?), inscription au répertoire des métiers ou au RCS, régime de TVA.
16. Qui est le directeur de la publication ? Quel médiateur de la consommation avez-vous choisi ?
17. Le domaine `montrucenbois.fr` : chez qui est-il, et qui gère les emails ?
18. Avez-vous une fiche Google (avis Google), un compte Instagram, un WhatsApp professionnel ?
