# Critique impeccable — Assessment A : revue de design

Méthode : Assessment A seul (revue de design), fait par un sous-agent isolé. Aucun détecteur lancé, aucune sortie de détecteur lue.
Date : 24/10/2026. Branche `refonte`. Site servi sur http://localhost:4173/.
Sources : `PRODUCT.md`, `docs/refonte/BRIEF.md`, captures `audit/avant/`, code (`*.html`, `css/style.css`, `js/main.js`, `data/donnees.js`), tests dans Chrome sans écran (Playwright).

Captures faites pendant cette revue :
`audit/outils/parcours/` (copie des captures prises pendant les tests).
(noté `pw/` plus bas : `m-` = téléphone 390 px, `d-` = PC 1440 px).

---

## 1. Score de santé du design (heuristiques de Nielsen)

| # | Heuristique | Note | Problème principal |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 2 | Le compteur du panier et le message « Ajouté au panier » marchent. Mais sur téléphone, l'aperçu sort de l'écran pendant la saisie. Et les formulaires de commande et de devis refusent l'envoi seulement à la fin. |
| 2 | Correspondance avec le monde réel | 3 | Français simple, noms de polices parlants (Classique, Manuscrite…). Mais « Disponible » en vert alors qu'on ne peut pas commander, et tailles « Moyenne / Grande » sans centimètres. |
| 3 | Contrôle et liberté | 2 | Dans le panier, on ne peut pas corriger le texte ou la police : seulement « Retirer », sans confirmation ni annulation (`panier.html:282-287`). |
| 4 | Cohérence et standards | 3 | Composants visuels cohérents. Mais la promesse change d'une ligne à l'autre : « Maquette validée avant toute fabrication » puis « maquette si besoin ». Menu « Qui sommes-nous ? » pour une page `atelier.html`. |
| 5 | Prévention des erreurs | 2 | Bon garde-fou si le texte est vide. Mais rien n'empêche un texte de 200 caractères qui recouvre la pièce, rien ne relie la date voulue au délai, et la livraison payante est cochée par défaut. |
| 6 | Reconnaissance plutôt que rappel | 3 | Polices affichées dans leur propre style, panier qui rappelle texte et police. Mais sur téléphone il faut se souvenir de l'aperçu pendant qu'on écrit. |
| 7 | Souplesse et efficacité | 3 | Recherche, tri, filtres par occasion et budget, favoris, partage, téléphone partout. |
| 8 | Esthétique et minimalisme | 2 | Accueil en 10 sections, logo 4 fois, téléphone 4 fois, horaires 2 fois, mêmes photos répétées dans le héros, les catégories, les coups de cœur et la galerie. |
| 9 | Aide à corriger les erreurs | 3 | Messages clairs avec une solution (« Appelez-nous au… »). Sur PC, le message de blocage s'affiche loin du bouton qui l'a déclenché. |
| 10 | Aide et documentation | 2 | Une FAQ existe. Mais sa réponse sur le délai renvoie à la fiche produit, qui n'affiche aucun délai (`donnees.js:1026-1027`). |
| **Total** | | **25/40** | **Acceptable** : de gros progrès sont nécessaires avant que les clients soient à l'aise. |

---

## 2. Verdict de spécificité du design

**Le site est interchangeable.** On pourrait remplacer les photos et le logo par ceux d'une bougie artisanale ou d'un fleuriste sans rien changer d'autre.

- **La structure suit un gabarit de boutique en ligne standard** : héros en deux colonnes (grand titre, deux boutons, étoiles, mosaïque de photos), bande de 4 pictos, cartes catégories à dégradé sombre, grille de 8 produits, bloc « à propos » texte-photo, pastilles d'occasions, cartes d'avis, 4 étapes numérotées, horaires, bandeau vert « devis gratuit », pied de page sombre en 4 colonnes (`index.html:28-167`).
- **Les choix visuels sont génériques** : Bricolage Grotesque + Figtree (un duo très courant), vert forêt et vert sauge (ni bois, ni ardoise, ni verre), angles arrondis à 14 px partout (`style.css:25`), ombres douces (`style.css:27`), en-tête en verre dépoli (`style.css:87`).
- **Le seul élément vraiment propre au métier est caché et mal rendu** : l'aperçu de gravure. Il n'est pas sur l'accueil. Sur la fiche, il pose un texte blanc avec une ombre noire sur la photo d'une planche déjà gravée (`style.css:253`). Le résultat fait penser à une légende de mème, pas à une gravure (une gravure laser est brun foncé, en creux).
- **Ce qui est propre à l'atelier** : les vraies photos, l'adresse, les horaires, les avis nommés et datés, la phrase manuscrite signée « Christophe et Laetitia ». C'est la bonne matière, mais elle est rangée dans un gabarit qui l'écrase.
- **Occasion manquée** : faire du texte qui « se grave » dans le bois le centre de l'accueil. Montrer les matières (bouleau, ardoise, verre) comme palette. Donner à chaque pièce une fiche technique et un numéro. Le brief demande tout cela.

---

## 3. Impression générale

Le site est propre, lisible et honnête sur l'essentiel : prix affichés, retrait gratuit, vraies photos, vrais avis. Mais il vend « des cadeaux » au lieu de vendre « votre texte gravé par nous ». La personnalisation, qui est le produit, n'apparaît qu'à la troisième page. Sur téléphone, elle se fait à l'aveugle. Et le délai, qui compte pour un cadeau à date fixe, n'apparaît nulle part.
**La plus grosse opportunité** : mettre l'aperçu de gravure en tête de l'accueil, rendu comme une vraie gravure, avec le délai juste à côté.

---

## 4. Ce qui marche (3 points forts)

1. **Les preuves sont réelles.** Photos des vraies pièces et de la boutique, avis Facebook nommés et datés. Les cartes d'avis disent « Recommande » au lieu d'inventer des étoiles (`js/main.js:324`). Adresse, horaires et « Ouvert maintenant » sont exacts et visibles.
2. **La fiche produit sur PC est efficace.** Tout tient dans le premier écran : taille, texte, 4 polices, aperçu collant à gauche (`produit-planche-aperitif-1440-premier-ecran.png`, `style.css:248`). Chaque police est écrite dans son propre style. Un message prévient si on ajoute au panier sans texte (`produit.html:267-270`). Le panier rappelle le texte et la police choisis (`pw/d-panier-plein.png`). Les flèches du clavier changent bien de police (testé).
3. **Les mots rassurent aux bons endroits.** « Aucun paiement n'est demandé à cette étape », « Nous vous recontactons sous 48 h » (panier), « Retrait gratuit à la boutique d'Auchel » (fiche et panier). Le bandeau jaune dit clairement que les commandes en ligne ne sont pas ouvertes.

---

## 5. Problèmes prioritaires

### [P1] 1. La personnalisation n'est pas mise en avant, et son aperçu ne montre pas la gravure

- **Constat.**
  - Accueil : aucun configurateur, ni sur PC ni sur téléphone (`index-1440-premier-ecran.png`, `index-390-premier-ecran.png`, `index.html:28-46`).
  - Fiche sur téléphone : l'aperçu est fixe (`style.css:249`). Il se termine à 582 px du haut de la page, alors que le champ texte commence à 1 067 px. Après un appui sur « Personnaliser » dans la barre du bas, le bas de l'aperçu est à 88 px au-dessus de l'écran (mesuré). On écrit sans voir le résultat (`pw/m-produit-saisie.png`).
  - L'aperçu pose un texte blanc ombré sur une planche déjà gravée « J'ai essayé le sport… la bière » (`pw/m-produit-apercu-rempli.png`). Un texte long recouvre tout le motif (`pw/d-produit-texte-long.png`).
- **Pourquoi c'est grave.** Le but écrit dans `PRODUCT.md` : « personnaliser une pièce en moins d'une minute ». Le brief demande « configurateur visible au 1er écran ». Le client ne voit ni ce qui sera gravé, ni où, ni de quelle couleur. Le moment fort du parcours est raté sur téléphone.
- **Correctif.**
  - Mettre un configurateur court en tête de l'accueil : une pièce, un champ texte, 3 ou 4 polices, un bouton « Continuer ».
  - Sur la fiche, faire un aperçu SVG sur une photo de la pièce **vierge**, avec une zone gravable dessinée, un texte brun foncé et une limite de lignes.
  - Sur téléphone, garder l'aperçu collé en haut de l'écran (en plus petit) pendant la saisie, ou le placer juste sous le champ texte.
- **Commande suggérée** : `/impeccable shape`, puis `/impeccable layout`.

### [P1] 2. Le délai de fabrication est invisible partout

- **Constat.**
  - L'encart du délai n'apparaît que si `produit.delai` est rempli (`produit.html:99`). Or il vaut 0 pour tous les produits (`donnees.js:146`, `173`, `217`…).
  - La FAQ dit que le délai est « indiqué sur la fiche produit quand il est connu » (`donnees.js:1027`).
  - Dans le panier, la date de l'occasion est cachée dans l'étape facultative « C'est pour offrir ? », sans aucun contrôle par rapport au délai (`pw/d-panier-plein.png`).
  - Les pages d'occasions (Fête des mères, Noël…) ne donnent aucune date limite (`idees-cadeaux-1440_00`).
- **Pourquoi c'est grave.** `PRODUCT.md` le dit : la commande est « souvent liée à une date d'occasion ». Sans délai, le client qui a une date ne peut pas décider. Il appelle ou il part. C'est la tâche 3 du test utilisateurs du brief.
- **Correctif.**
  - Obtenir les délais réels de Christophe et Laetitia. En attendant, afficher « Délai : [À COMPLÉTER] » plutôt que rien.
  - Écrire « Commandé aujourd'hui, prêt vers le … » sur la fiche, à côté du prix.
  - Monter « Pour quelle date ? » en tête du panier et prévenir si la date est trop proche.
  - Ajouter « À commander avant le … » sur chaque occasion.
- **Commande suggérée** : `/impeccable clarify`.

### [P1] 3. Des parcours sans issue : commande et devis refusés après avoir tout rempli

- **Constat.**
  - On peut ajouter au panier et remplir tout le formulaire de commande. Au clic sur « Envoyer ma commande », on lit alors : « Le site est encore en construction : l'envoi en ligne n'est pas encore ouvert » (`js/main.js:471-489`, testé).
  - Sur PC, ce message s'affiche dans la colonne de gauche (à 759 px du haut de l'écran), alors que le bouton est à droite (à 392 px) (`pw/envoi-1440.png`).
  - Le formulaire de devis est bloqué de la même façon, car Supabase n'est pas configuré (`main.js:476`, testé sur `contact.html`). Pourtant trois boutons y mènent : « Demander un devis » (héros), « Demander un devis gratuit », « Demander conseil ».
  - La fiche affiche « Disponible » en vert (`produit.html:69`).
- **Pourquoi c'est grave.** D'après la règle pic-fin (on retient surtout le meilleur moment et le dernier), la fin du parcours est ici le pire moment : un refus après plusieurs minutes de saisie. Le bandeau jaune parle des commandes, pas du devis. La tâche 4 du test utilisateurs (« devis pour 50 pièces ») échoue.
- **Correctif.** Tant que le mode aperçu est actif :
  - Remplacer « Envoyer ma commande » et « Envoyer ma demande » par des actions qui marchent : appeler, ou un lien `mailto:` qui contient déjà le récapitulatif.
  - Ou bien dire clairement, dès le haut du formulaire, que l'envoi en ligne n'est pas ouvert.
  - Remplacer « Disponible » par « Fabriqué sur commande ».
- **Commande suggérée** : `/impeccable harden`.

### [P1] 4. L'identité visuelle enfreint les interdits du brief (§2 et §3)

- **Constat** (chaque point est un interdit du brief) :
  - Bande de 4 pictos de réassurance (`index.html:48-55`, `style.css:125-140`).
  - Cartes catégories à dégradé sombre (`style.css:151`).
  - Bouton flottant « Appeler » (`main.js:273-284`, `style.css:440-450`), qui chevauche la citation sur téléphone (`index-390-premier-ecran.png`).
  - Logo 4 fois sur l'accueil PC, 3 fois sur téléphone (mesuré : 4 images `logo` sur `index.html` et `atelier.html`).
  - Titres à jeu de mots et mots creux : « Offrez un cadeau unique, qui restera gravé dans les mémoires » (`donnees.js:64`), « Un objet, une envie, un message » (`index.html:61`), « Le cadeau parfait » (`donnees.js:116`), « chaque pièce est unique » (`donnees.js:69`).
  - 3 polices sur l'accueil et l'atelier : Bricolage Grotesque, Figtree, Caveat (mesuré).
  - Plusieurs couleurs d'accent : vert forêt, bois `#a8693a`, jaune des étoiles `#d99a1e`, rouge des favoris.
  - Ombres douces (`style.css:27`, `444`, `571`), verre dépoli (`style.css:87`), cartes arrondies empilées (`.carte`, `.avis-carte`, `.occasion-carte`).
  - Étoiles décoratives ★★★★★ (`index.html:38`, `produit.html:96`).
- **Pourquoi c'est grave.** Le brief vise « 0 FAIL bloquant » sur l'axe identité. Ces motifs donnent au site l'allure d'un gabarit et effacent l'atelier.
- **Correctif.** Appliquer le brief §3 : Big Shoulders, Literata et Courier Prime ; jetons couleur `--bouleau`, `--brule`, `--gravure` ; angles de 0 à 2 px ; filets de 1 px. Supprimer la bande de pictos, les dégradés, le bouton flottant, le logo du héros et l'avatar-logo. Réécrire les titres pour qu'ils décrivent.
- **Commande suggérée** : `/impeccable typeset`, `/impeccable colorize`, `/impeccable quieter`.

### [P2] 5. Des promesses et des preuves qui se contredisent ou exagèrent

- **Constat.**
  - ★★★★★ à côté de « Recommandé à 100 % sur Facebook » (`index.html:38`, `produit.html:96`) : Facebook ne donne pas de note sur 5, donc cette note est inventée.
  - « Des avis laissés sur nos pages Facebook et Google » (`avis.html:30`, et dans les métadonnées `avis.html:13,18`) alors qu'il n'existe aucun avis Google (`PRODUCT.md`).
  - « Maquette validée — Avant toute fabrication » (`index.html:52`), mais « maquette si besoin » ailleurs (`index.html:135`, `produit.html:85`, `produit.html:144`, panier). Le principe 4 de `PRODUCT.md` dit « Rien n'est gravé sans maquette validée ».
  - Winnie l'Ourson (personnage sous licence) sur l'accueil, deux fois (`index-1440_01.png`), sur Idées cadeaux, dans la galerie de l'atelier et en boutique. Écussons du PSG, d'Arsenal et du RC Lens sur « Verre imprimé » (`boutique-1440_01.png`).
- **Pourquoi c'est grave.** Le positionnement repose sur la confiance (« ce qui n'est pas connu s'affiche comme manquant, jamais comme inventé »). Une contradiction vue par un client sérieux suffit à le faire douter. Les images sous licence sont un risque juridique.
- **Correctif.**
  - Retirer les étoiles et écrire « 16 avis Facebook, 100 % recommandent ».
  - Retirer « et Google » tant qu'aucun avis Google n'existe.
  - Choisir une seule promesse sur la maquette et l'écrire pareil partout.
  - Retirer `img/plaque-naissance-bois.jpg` et la photo du verre aux écussons.
- **Commande suggérée** : `/impeccable clarify`.

---

## 6. Charge cognitive

**Liste de contrôle (8 points)**

| Point | Résultat | Preuve |
|---|---|---|
| Une seule priorité | Échec | Accueil en 10 sections. Fiche : « Ajouter au panier » entouré de Favori, Partager, téléphone, bouton flottant et barre collante sur téléphone. |
| Petits groupes (≤ 4) | Échec | 9 occasions en vrac (`index-1440_02.png`) ; 9 cartes + 3 budgets (`idees-cadeaux-1440_00.png`). |
| Regroupement | OK | Filets, cartes et fonds alternés séparent bien les blocs. |
| Hiérarchie visuelle | OK | Grands titres nets ; le bouton principal est le seul plein. |
| Une chose à la fois | OK | Panier en étapes numérotées 1-2-3. |
| Peu de choix (≤ 4) | Échec | Voir les points de décision ci-dessous. |
| Mémoire de travail | Échec | Sur téléphone, on doit se souvenir de l'aperçu en écrivant (aperçu hors écran, mesuré). |
| Affichage progressif | OK | Le champ adresse n'apparaît qu'en cas de livraison (`panier.html:172`). |

**4 échecs : charge cognitive élevée.**

**Points de décision à plus de 4 options**
- Boutique, premier écran : 5 pastilles de catégorie + recherche + tri + occasion + budget = **9 réglages** avant le premier produit (`boutique.html:34-53`, `boutique-1440-premier-ecran.png`).
- Accueil, « Un cadeau pour quelle occasion ? » : **9 pastilles** (`index.html:98-106`).
- Idées cadeaux : **9 cartes d'occasion + 3 budgets** (`idees-cadeaux.html:34-43`).
- En-tête : **5 liens + favoris + panier**, plus le bouton flottant « Appeler » = 8 entrées.
- Fiche produit, autour de l'achat : **5 actions** (Ajouter, Favori, Partager, téléphone, Appeler flottant) (`produit.html:133-142`).

---

## 7. Parcours émotionnel

1. **Arrivée.** Première chose vue sur chaque page : un bandeau jaune « Site en construction » (3 lignes sur téléphone, 84 px). Ensuite un slogan générique. Sur téléphone, aucune photo de pièce au premier écran (`index-390-premier-ecran.png`) : ce qui rend l'atelier attachant n'apparaît pas tout de suite.
2. **Découverte.** Les vraies photos rassurent (coups de cœur, boutique, salon). Mais les mêmes 4 images reviennent 3 ou 4 fois, ce qui donne une impression de petit catalogue.
3. **Pic attendu : voir son texte sur la pièce.** Sur PC, ça marche (aperçu collant). Sur téléphone, le pic se produit hors de l'écran. Dans les deux cas, le rendu (texte blanc sur une pièce déjà gravée) ne fait pas rêver.
4. **Moment à fort enjeu : « sera-t-il prêt à temps ? »** Aucune réponse. Pas de délai, pas de date limite.
5. **Fin.** Long formulaire, puis refus « site en construction ». La fin est le pire moment du parcours. C'est l'inverse de ce que demande la règle pic-fin.
6. **Bonnes notes de réassurance** : « Aucun paiement n'est demandé à cette étape », « Nous vous recontactons sous 48 h ».

---

## 8. Signaux d'alerte par persona (e-commerce : Casey, Riley, Jordan)

**Casey (sur téléphone, d'une main, souvent interrompue)**
- Elle écrit son texte sans voir l'aperçu : le bas de l'aperçu est à 88 px au-dessus de l'écran après « Personnaliser » (mesuré, `pw/m-produit-saisie.png`).
- La barre collante « Personnaliser » reste affichée alors qu'elle est déjà en train de personnaliser, et cache le champ « Précisions » (`pw/m-produit-saisie.png`).
- Le bouton flottant chevauche la citation de l'accueil (`index-390-premier-ecran.png`) et les cartes d'occasion (`idees-cadeaux-390_00`).
- Les cœurs favoris font 38 × 38 px, sous le minimum de 44 px (mesuré, `style.css:361`).
- Dans la boutique, les textes d'aide des champs sont coupés (« Rechercher un pro », « Toutes les occasio ») (`boutique-390-premier-ecran.png`).
- Le bouton « Envoyer ma commande » est à 2 174 px sur 3 512, après 3 étapes, sans total collant (mesuré).
- La livraison à 5,90 € est cochée par défaut (`panier.html:26`).

**Riley (teste les cas limites)**
- Un texte de 200 caractères recouvre tout le motif et devient illisible. Aucune limite de lignes, aucun avertissement (`pw/d-produit-texte-long.png`).
- Le formulaire de commande et le formulaire de devis refusent l'envoi après saisie complète (testé). La fiche disait « Disponible ».
- Impossible de corriger le texte depuis le panier : seulement « Retirer », sans annulation (`panier.html:282-287`).
- La page avis promet « Facebook et Google », mais il n'y a aucun avis Google. Les étoiles 5/5 ne correspondent à aucune note réelle.
- Le champ « Pour quelle date ? » accepte demain sans prévenir que c'est trop tôt (`panier.html:190`, `min` = aujourd'hui seulement).

**Jordan (première visite, lit tout, prend tout au pied de la lettre)**
- L'accueil ne dit pas comment personnaliser : les deux boutons du héros sont « Découvrir la boutique » et « Demander un devis ».
- « Maquette validée avant toute fabrication » puis « maquette si besoin » : il ne sait pas s'il recevra une maquette.
- Aucun délai nulle part. La FAQ le renvoie à la fiche, qui n'en affiche pas.
- Le menu « Qui sommes-nous ? » ouvre une page titrée « Deux artisans, une boutique à Auchel » à l'adresse `atelier.html`, et l'accueil y renvoie par « Découvrir l'atelier ». Trois noms pour la même page.
- Tailles « Moyenne / Grande (+8 €) » sans dimensions (`donnees.js:121-133`).

---

## 9. Par gabarit

### Accueil (`index.html`)
1. **Pas de configurateur au premier écran**, ni sur PC ni sur téléphone. Le premier écran contient logo, titre, 2 boutons, étoiles et citation (`index-1440-premier-ecran.png`, `index-390-premier-ecran.png` ; `index.html:28-46`).
2. **Logo en double, et même plus** : en-tête (`main.js:83`), héros (`index.html:31`), avatar de la citation (`index.html:40`), pied de page. Cela fait 4 logos sur PC et 3 sur téléphone, où celui du héros est masqué (`style.css:463`). L'avatar de « Christophe et Laetitia » est le logo, pas leur photo.
3. **Bandeau de 4 pictos de réassurance** : « Fait main à Auchel / 100 % personnalisé / Maquette validée / Retrait gratuit » (`index.html:48-55` ; `index-1440_00.png`, vers y = 1 000-1 105).
4. **Cartes catégories à dégradé sombre** (`style.css:151` ; `index-1440_01.png`, en haut). Celle de la catégorie « Naissance » montre Winnie l'Ourson, qu'on revoit dans les coups de cœur (même capture).
5. **Titres jeux de mots et slogans en trois temps** : « …qui restera gravé dans les mémoires » (`donnees.js:64`), « Un objet, une envie, un message » (`index.html:61`), « Un atelier, deux paires de mains » (`index.html:90`).
6. **Bouton flottant « Appeler »** présent sur PC et téléphone (`main.js:273-284`). Sur téléphone, il recouvre la fin de la citation (`index-390-premier-ecran.png`). Le numéro apparaît 4 fois sur l'accueil : bandeau, bouton flottant, bloc visite, pied de page.

### Boutique (`boutique.html`)
1. **9 réglages avant le premier produit**, sur deux rangées mal alignées : recherche et tri à droite, occasion et budget en dessous à gauche (`boutique.html:34-53` ; `boutique-1440-premier-ecran.png`).
2. **Sur téléphone, champs coupés** (« Rechercher un pro », « Toutes les occasio »). Les pastilles de catégorie sortent de l'écran sans indice de défilement (`boutique-390-premier-ecran.png`).
3. **Les cartes ne donnent que catégorie, nom et prix.** Ni matière, ni taille, ni délai. 27 produits en une seule liste (`boutique-1440_01.png`).
4. **Images sous licence** : Winnie l'Ourson (plaque de naissance) et écussons PSG / Arsenal / RC Lens (verre imprimé) (`boutique-1440_01.png`).
5. **Contraste faible des étiquettes de catégorie** : bois `#a8693a` sur blanc = 4,42:1, sous le seuil de 4,5:1 pour un texte de 14 px. Sur le fond sauge de l'accueil, c'est 3,94:1 (calculé ; `style.css:58`).
6. **Cœurs favoris de 38 × 38 px** (`style.css:361`), sous la cible tactile de 44 px.

### Fiche produit (`produit.html?id=planche-aperitif`)
1. **Temps pour personnaliser (texte + police).** Non chronométré avec des humains, seulement compté.
   - Sur PC : 3 actions, toutes dans le premier écran (champ texte à 548 px, polices à 738 px, écran de 900 px). C'est faisable en moins de 60 s.
   - Sur téléphone : faire défiler d'environ 480 px ou appuyer sur « Personnaliser », écrire, choisir la police (à 1 279 px), remonter d'environ 1 000 px pour voir l'aperçu, puis redescendre jusqu'à « Ajouter » (à 1 529 px). Faisable, mais à l'aveugle (mesuré).
2. **Aperçu hors écran pendant la saisie sur téléphone** (`style.css:249`, l'aperçu n'y est plus collant ; `pw/m-produit-saisie.png`).
3. **L'aperçu ne ressemble pas à une gravure** : texte blanc ombré sur la photo d'une planche déjà gravée ; un texte long recouvre tout (`style.css:253` ; `pw/m-produit-apercu-rempli.png`, `pw/d-produit-texte-long.png`). Les polices de l'aperçu (Georgia, Dancing Script, Figtree, IBM Plex Mono, `produit.html:24-29`) ne sont pas celles du site.
4. **Délai de fabrication non affiché** : `produit.html:99` ne montre l'encart que si `delai` n'est pas nul, or il vaut 0 partout (`donnees.js:146`).
5. **Pas de fiche technique** : ni matière, ni dimensions, ni zone gravable. « Moyenne / Grande (+8 €) » sans centimètres (`donnees.js:121-133` ; `produit-planche-aperitif-1440_00.png`).
6. **« Disponible » en vert alors qu'on ne peut pas commander** (`produit.html:69`). « Maquette… si besoin » écrit deux fois (`produit.html:85`, `produit.html:144`). Liste de 3 pictos de réassurance sous le bouton (`produit.html:143-147`).

### Idées cadeaux (`idees-cadeaux.html`)
1. **Mêmes photos pour plusieurs occasions** : la planche « bière » sert pour Anniversaire, Fête des pères et Noël ; la plaque « cœur » pour Fête des mères et Merci (`idees-cadeaux-1440_00.png`). On croit à une erreur.
2. **Aucune date limite par occasion**, alors que le brief demande « Achat par occasion avec date limite » (§2).
3. **9 cartes arrondies empilées, plus 3 pastilles de budget**, sans priorité selon la saison (`idees-cadeaux.html:34-43`).
4. **Le bandeau « Vous ne savez pas quoi choisir ? » → « Demander conseil »** mène au formulaire de devis, qui est bloqué (testé).
5. **Titre générique** : « Trouvez le cadeau qui fera plaisir » (`idees-cadeaux.html:29`).

### Atelier (`atelier.html`)
1. **Logo en grand dans le héros** (`atelier.html:31`), plus l'en-tête, l'avatar (`atelier.html:36`) et le pied de page : 4 logos (mesuré). Aucune photo de Christophe et Laetitia, aucune photo de la machine laser (`atelier-1440_00.png`, `atelier-390-premier-ecran.png`).
2. **Texte copié mot pour mot de l'accueil** (`donnees.js:68-69`, utilisé sur les deux pages).
3. **« Ce que nous fabriquons » = rangée de 4 icônes + titre + texte**, un motif de gabarit (`atelier.html:49-52` ; `atelier-1440_00.png`, en bas).
4. **La galerie répète des photos déjà vues en boutique**, dont Winnie l'Ourson (`donnees.js:73-82` ; `atelier-1440_01.png`).
5. **Trois noms pour une seule page** : « Qui sommes-nous ? » (menu), « Découvrir l'atelier » (lien), `atelier.html` (adresse).

### Panier (`panier.html`)
1. **Parcours testé** : ajout, compteur de l'en-tête à 1, message « Ajouté au panier » avec lien, panier qui rappelle taille, texte et police (`pw/m-produit-ajoute.png`, `pw/d-panier-plein.png`). Le bouton flottant est retiré sur cette page (`panier.html:13`) : c'est bien.
2. **La livraison à 5,90 € est cochée par défaut** (`panier.html:26`), alors que le retrait gratuit est un argument clé du positionnement.
3. **La date de l'occasion est dans l'étape facultative « C'est pour offrir ? »**, sans lien avec un délai (`pw/d-panier-plein.png`).
4. **Sur téléphone, le récapitulatif et le bouton arrivent après les 3 étapes** : bouton à 2 174 px sur 3 512, sans total collant (mesuré ; `pw/m-panier-plein.png`).
5. **Envoi refusé en mode aperçu après saisie complète.** Sur PC, le message s'affiche loin du bouton (`pw/envoi-1440.png` ; `main.js:471-489`).
6. **On ne peut pas corriger une personnalisation**, seulement « Retirer », sans confirmation ni annulation (`panier.html:282-287`). Le panier vide affiche seulement un titre et un bouton (`panier-1440.png`).

### Contact (`contact.html`)
1. **Formulaire de devis refusé après saisie** (testé ; `main.js:476`), alors que le site y mène par 3 boutons.
2. **Sur téléphone, le formulaire arrive en troisième**, après la carte adresse et les 7 lignes d'horaires (`contact-390_00.png`, formulaire vers 1 200 px).
3. **Horaires affichés deux fois** sur la même page : carte et pied de page (`contact-1440.png`).
4. **Trois cartes arrondies à bordure empilées** (`style.css:289`), un interdit du brief.
5. **Pas de champ « date souhaitée »** dans le devis, seulement un exemple gris dans le champ texte (`contact.html:71`). Pour une série ou un mariage, la date est pourtant l'information clé.

### Avis (`avis.html`)
1. **« Des avis laissés sur nos pages Facebook et Google »** (`avis.html:30`), mais aucun avis Google n'existe (`PRODUCT.md`).
2. **Bon point** : les cartes disent « Recommande » + Facebook, sans fausses étoiles (`main.js:324` ; `avis-1440-premier-ecran.png`). C'est l'inverse de l'accueil et de la fiche, qui affichent ★★★★★ (`index.html:38`, `produit.html:96`).
3. **Le bouton « Laisser un avis Facebook » passe avant les avis** : la page demande avant de montrer (`avis-1440-premier-ecran.png`).
4. **Aucun lien d'un avis vers le produit concerné** sur cette page. Le bloc « Ils l'ont offert » n'existe que sur la fiche, et seulement si l'avis est relié à un produit (`produit.html:150-157`).

---

## 10. Observations mineures

- Le bandeau jaune fait 3 lignes (84 px) sur téléphone, sur chaque page (`index-390-premier-ecran.png`).
- Horaires complets en pied de page sur toutes les pages, en plus des blocs horaires de l'accueil et du contact.
- Le message de confirmation commence par « ✓ » (`produit.html:286`) ; le brief interdit les emojis (cas limite).
- Les photos produits ont des fonds variés (mur végétal, voilage, bois) et la carte de visite dans presque chaque cadre (`boutique-1440_01.png`), ce qui confirme le point déjà relevé dans le brief.
- Les noms de produits passent sur 2 lignes sur téléphone, ce qui décale les prix d'une carte à l'autre (`boutique-390_01.png`).
- Le focus clavier est visible et les flèches changent bien de police (testé). Le contour reste vert forêt, donc à reprendre avec la nouvelle palette.
- Le héros reprend les 3 mêmes produits que le début des coups de cœur, juste en dessous (`index.html:180-183`).

---

## 11. Questions à se poser

- Et si l'accueil était **un seul geste** : « Écrivez votre texte », avec la planche qui se grave en direct, et rien d'autre au-dessus ?
- Pourquoi montrer une planche déjà gravée « J'ai essayé le sport… » comme fond d'aperçu, au lieu de la pièce vierge que le client va recevoir ?
- Si le délai n'est pas connu aujourd'hui, est-il plus honnête d'écrire « Délai : nous vous le confirmons sous 48 h » que de ne rien écrire ?
- Faut-il vraiment un panier et un formulaire de commande tant que les commandes en ligne sont fermées ? Un bouton « Réserver par téléphone » avec le récapitulatif ne vendrait-il pas plus ?
- À quoi ressemblerait une version **sûre d'elle** du site : une seule couleur d'accent (la gravure), des filets fins, une fiche technique par pièce, et pas une seule icône de réassurance ?
- Christophe et Laetitia sont l'argument n° 1 du positionnement. Pourquoi ne les voit-on nulle part en photo ?
