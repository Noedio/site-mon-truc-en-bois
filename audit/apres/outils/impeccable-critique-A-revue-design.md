# Critique impeccable, Assessment A : revue de design (après refonte)

Méthode : Assessment A seul (revue de design), fait par un sous-agent isolé. Aucun détecteur lancé, aucune sortie de détecteur lue (`audit/apres/mesures/impeccable-detect.json` non ouvert).
Date : 24/10/2026. Branche `refonte`, nouveau site Astro (`site/`).
Sites testés : https://mon-truc-en-bois.pages.dev (aperçu, commandes fermées) et https://demo.mon-truc-en-bois.pages.dev (démo, tout fonctionne en simulation).
Sources : `PRODUCT.md`, `docs/refonte/BRIEF.md` (§3 et §4), `site/README.md`, code de `site/src/`, premier audit `audit/outils/impeccable-critique-A-revue-design.md` (25/40).
Outil : Chrome piloté par Playwright, en 1440 × 900 et 390 × 844 (téléphone tactile émulé).

Captures et journal des parcours : `audit/apres/outils/parcours/` (noté `parcours/` plus bas). Le journal brut des mesures est `parcours/journal-parcours.txt`.

---

## 1. Score de santé du design (heuristiques de Nielsen)

| # | Heuristique | Note | Problème principal |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 3 | Aperçu collé en haut de l'écran pendant la saisie sur téléphone, message « Ajouté au panier », frise de suivi, alerte de date dans le panier. Mais le cœur des favoris ne dit rien quand on appuie dessus et ne mène nulle part (`BoutonFavori.astro:24-27`). |
| 2 | Correspondance avec le monde réel | 3 | Français simple, polices nommées comme au comptoir (Atelier, Classique, Machine à écrire, Manuscrite). Mais « Disponible » sur toutes les fiches alors que le site dit « Site en préparation », et tailles « Moyenne / Grande » toujours sans centimètres. |
| 3 | Contrôle et liberté | 3 | Texte et police modifiables dans le panier, « Annuler » après « Retirer », « Modifier ma commande » après l'email préparé. La saisie de l'accueil suit le visiteur jusqu'à la fiche. |
| 4 | Cohérence et standards | 3 | Système visuel très cohérent sur toutes les pages. Mais la promesse sur la maquette change encore selon la page, et le devis affiche les bulles d'erreur du navigateur alors que le panier a ses propres messages. |
| 5 | Prévention des erreurs | 3 | 48 caractères et 3 lignes au plus, retrait gratuit coché par défaut, alerte si la date est proche, avertissement si on ajoute sans texte. Mais un texte long passe sur une seule ligne minuscule, sans avertissement (`parcours/fiche-1440-texte-long.png`). |
| 6 | Reconnaissance plutôt que rappel | 3 | Les échantillons de police reprennent le premier mot du client, le panier rappelle texte et police. Mais la page des favoris n'a aucun lien : il faut connaître l'adresse `/favoris/`. |
| 7 | Souplesse et efficacité | 2 | Plus de recherche, plus de tri, filtres exclusifs (catégorie ou budget ou occasion, jamais deux ensemble), favoris inatteignables. Les flèches du clavier marchent sur les choix (vrais boutons radio). |
| 8 | Esthétique et minimalisme | 3 | Mise en page éditoriale nette, un seul logo, un seul bouton d'achat par écran. Le bruit vient des marques `[À COMPLÉTER]` dans la couleur d'achat et des cadres photo vides de l'atelier. |
| 9 | Aide à corriger les erreurs | 3 | Panier exemplaire : message sous chaque champ, avec un exemple, et focus sur le premier champ en faute (`parcours/panier-demo-390-erreurs.png`). Le devis, lui, se contente de « Veuillez renseigner ce champ » du navigateur (`parcours/devis-390-3-vide.png`). |
| 10 | Aide et documentation | 3 | FAQ, aides sous les champs, guide de la démo, texte d'alerte de date qui donne le numéro. La réponse FAQ sur le délai renvoie toujours à la fiche, qui affiche `[À COMPLÉTER]`. |
| **Total** | | **29/40** | **Bon** : base solide, quelques points faibles à reprendre. (Premier audit : 25/40, Acceptable.) |

---

## 2. Verdict de spécificité du design

**Le site est maintenant fait pour cet atelier.** On ne pourrait pas le donner tel quel à un fleuriste.

- **Le produit est au centre.** Le premier écran de l'accueil est le configurateur : trois pièces, un champ texte, quatre polices, et une planche dessinée où le texte apparaît en brun gravé (`index.astro:41-61`, `parcours/accueil-1440-premier-ecran.png`). C'était le manque n° 1 du premier audit.
- **Les choix visuels viennent du métier.** Les polices du site sont celles proposées pour la gravure. La palette vient des matières (bouleau, brûlé, kraft). Les étiquettes en « Machine à écrire », le N° de pièce et la fiche technique donnent un air d'atelier, pas de boutique en ligne standard (`socle.css:259-295`).
- **Les interdits du brief sont respectés** sur toutes les pages vues : pas de pictos de réassurance, pas de dégradé, pas d'ombre, pas d'angle arrondi, pas d'étoiles, pas de bouton flottant. Un seul logo par page (mesuré : 1 image `logo` sur chaque page, contre 4 avant).
- **Ce qui reste générique** : les photos produits. Elles ont toujours des fonds variés (mur végétal, bois, voilage) et la carte de visite dans le cadre (`parcours/boutique-1440.png`). Dans la grille à filets, très ordonnée, ce désordre se voit encore plus. Et l'atelier lui-même n'est pas montré : pas de photo de Christophe et Laetitia, ni de la machine (trois cadres vides, `parcours/atelier-1440.png`).
- **Occasion manquée** : la page Occasions et la liste de l'accueil sont une liste de noms. Le jour où les dates limites seront connues, elles peuvent devenir l'argument fort (« Fête des mères : commander avant le … »). Aujourd'hui, cette colonne est remplie de `[À COMPLÉTER]`.

---

## 3. Impression générale

La refonte a réglé les gros problèmes du premier audit. On personnalise une planche en une dizaine de secondes, on voit son texte pendant qu'on l'écrit, même sur téléphone, et le site ne promet plus rien de faux. Le panier est devenu le meilleur écran du site.
Ce qui manque maintenant tient surtout à des **faits que l'atelier n'a pas encore donnés** (délai, maquette, dimensions, photos), et à **deux trous de navigation** : les favoris et le chemin du devis sur téléphone.
**La plus grosse opportunité** : obtenir le délai et la règle de la maquette, puis les afficher partout de la même façon. C'est ce qui décide un client qui a une date.

---

## 4. Ce qui marche (3 points forts)

1. **Le configurateur est la marque.** Même police à l'écran et sur la pièce, planche dessinée vierge, texte brun foncé, limite de caractères et de lignes (`configurateur.ts:185`). Sur téléphone, l'aperçu reste collé en haut pendant la saisie (mesuré : bandeau à 163-319 px, champ à 378 px, `parcours/fiche-390-saisie.png`). La saisie commencée sur l'accueil est reprise sur la fiche, police comprise (`configurateur-client.ts:67-76`, testé). Résultat : personnalisation jusqu'au panier en 13,1 s au rythme simulé (voir §8).
2. **Le site est honnête et sobre.** Avis Facebook nommés et datés, « Recommandé à 100 % · 16 avis sur Facebook », plus d'étoiles ni de mention Google (`parcours/avis-390-premier-ecran.png`). Les photos sous licence sont remplacées par « Photo en attente de validation ». Ce qui n'est pas connu s'affiche `[À COMPLÉTER]` au lieu d'être inventé.
3. **Le panier guide sans piéger.** « Pour quelle date ? » arrive en premier, avec une vraie alerte (« C'est dans 3 jours… Appelez-nous avant de commander », `parcours/panier-demo-390-date-proche.png`). Retrait gratuit coché par défaut (`ChoixReception.astro:8`). Texte modifiable, retrait annulable. Barre « Total / Finaliser » collée en bas sur téléphone. Quand la commande en ligne est fermée, la page le dit dès le haut et finit sur un email prérempli : plus de refus après saisie (`panier.astro:94-101`).

---

## 5. Problèmes prioritaires

### [P1] 1. Les favoris sont introuvables

- **Constat.**
  - Le cœur existe sur les fiches, mais aucun lien ne mène à `/favoris/`. Mesuré sur l'accueil, la boutique, une fiche, le panier et le contact : 0 lien, en 1440 comme en 390 (`parcours/journal-parcours.txt`). Le seul lien est dans le guide de la démo (`demo.astro:21`).
  - L'en-tête n'a que « Panier » (`Entete.astro:123-129`, `:150`).
  - Après un appui sur le cœur, rien ne s'affiche à côté : le cœur se remplit, c'est tout (`BoutonFavori.astro:24-27`, `parcours/favori-1440-1-coeur.png`).
  - La page elle-même marche bien quand on connaît l'adresse (`parcours/favori-1440-2-page.png`).
- **Pourquoi c'est grave.** C'est la tâche 5 du test utilisateurs du brief. Un client qui met une pièce de côté pour la montrer à quelqu'un ne la retrouvera pas. Il ne contactera pas l'atelier pour ça : il partira.
- **Correctif.**
  - Ajouter « Favoris (n) » dans l'en-tête, à côté de « Panier (n) », avec le même compteur.
  - Après un appui sur le cœur, écrire dans la zone de confirmation de la fiche : « Mise de côté · Voir mes favoris ».
  - Ajouter « Mes favoris » dans le pied, colonne « Commandes ».
- **Commande suggérée** : `/impeccable clarify`.

### [P1] 2. Délai et maquette : les deux réponses qui décident un achat daté manquent ou se contredisent

- **Constat.**
  - Délai : `[À COMPLÉTER]` sur la fiche, juste sous le bouton d'achat (`produit/[id].astro:185-191`), dans la fiche technique, dans le panier (`panier.astro:121-122`) et sur les 9 lignes de la page Occasions (`ListeOccasions.astro:115-121`). La FAQ dit que le délai est « indiqué sur la fiche produit quand il est connu » : la réponse tourne en rond (`/faq/`).
  - Maquette, quatre versions :
    - atelier : « avec une maquette si nécessaire » (`atelier.astro:26`) ;
    - FAQ : « avec une maquette si nécessaire » ;
    - fiche et accueil : `[À COMPLÉTER : maquette envoyée au client : à chaque commande ou sur demande ?]` (`produit/[id].astro:199`, `index.astro:122`) ;
    - panier : « Nous vous envoyons une maquette à valider avant de graver », écrit deux fois, suivi de `[À COMPLÉTER : maquette pour chaque commande ou seulement si besoin]` (`panier.astro:25-28`, `:97`, `:121`, `parcours/panier-rempli-1440.png`). La page affirme et dit qu'elle ne sait pas, dans la même ligne.
- **Pourquoi c'est grave.** `PRODUCT.md` : la commande est « souvent liée à une date d'occasion ». La tâche 3 du test (« trouver le délai et le retrait ») réussit à moitié : le retrait se trouve partout, le délai nulle part. Le premier audit relevait déjà cette contradiction sur la maquette.
- **Correctif.**
  - Faire remplir les questions « délai » et « maquette » du questionnaire de l'admin avant la bascule ; c'est la seule vraie réponse.
  - En attendant, une seule source pour la phrase de la maquette (`commandes.maquette`), lue par l'atelier, la FAQ, la fiche et le panier. Tant qu'elle est vide, ne pas écrire de phrase affirmative dans le panier : garder seulement la marque à compléter.
  - Réécrire la réponse FAQ sur le délai pour qu'elle ne renvoie pas à la fiche tant que le délai est vide.
- **Commande suggérée** : `/impeccable clarify`.

### [P2] 3. Les `[À COMPLÉTER]` prennent la couleur d'achat et gênent la lecture à trois endroits

Les marques sont voulues. Elles posent problème seulement là où elles dominent la page.

- **Constat.**
  - Elles sont dans la couleur `--gravure` (`ACompleter.astro:48`), que le brief réserve à « achat, prix, date limite ».
  - Fiche produit : 8 marques orange, dont deux juste sous « Ajouter au panier » (délai, maquette). Elles font concurrence au prix et au bouton (`parcours/produit-planche-1440.png`).
  - Page Occasions : une colonne de 9 marques orange en gras, une par ligne. C'est ce qu'on voit en premier (`parcours/occasions-1440.png`).
  - Atelier : la section « Dans l'atelier » n'est faite que de trois cadres vides, plus une citation vide (`parcours/atelier-1440.png`, environ 500 px de page sans contenu).
- **Pourquoi c'est grave.** L'œil va vers l'orange. Ici l'orange dit « il manque quelque chose » au lieu de « achetez ici ». Pour la présentation au commerçant c'est utile ; pour un client, c'est du bruit.
- **Correctif.**
  - Donner aux marques un style neutre : texte doux, filet pointillé, sans la couleur d'achat.
  - Sur la page Occasions, si aucune occasion n'a de date limite, une seule phrase au-dessus de la liste au lieu de 9 répétitions (l'accueil le fait déjà, `index.astro:83-85`).
  - Sur l'atelier, regrouper les trois photos manquantes en une seule ligne tant qu'aucune n'existe.
- **Commande suggérée** : `/impeccable quieter`.

### [P2] 4. Sur téléphone, le chemin du devis est long et caché

- **Constat.**
  - Dans la navigation du téléphone, « Contact » est coupé hors de l'écran, sans indice de défilement (`parcours/accueil-390-premier-ecran.png`, `Entete.astro:191-201`).
  - Le bouton « Demander un devis » de l'accueil mène à `/contact/` et non à `/contact/#devis` (`index.astro:154`), alors que l'atelier et la FAQ le font bien (`atelier.astro:112`).
  - Sur la page Contact en 390 px, le formulaire commence à 1 480 px, après les coordonnées et 7 lignes d'horaires (mesuré, `parcours/contact-390.png`). C'était déjà relevé au premier audit.
  - Le formulaire n'a pas `novalidate` : un envoi vide affiche la bulle du navigateur « Veuillez renseigner ce champ », pas les messages du site (`FormulaireDevis.astro:13`, `parcours/devis-390-3-vide.png`).
- **Pourquoi c'est grave.** Les associations et entreprises sont une cible écrite de `PRODUCT.md`. La tâche 4 du test réussit (voir §8), mais avec 1 480 px de défilement et un vocabulaire d'erreur différent du panier.
- **Correctif.**
  - Lien `/contact/#devis` sur l'accueil.
  - Sur téléphone, placer le formulaire avant les horaires (ordre de la grille de `contact.astro` sous 900 px).
  - Reprendre dans le devis les messages du panier (sous le champ, avec un exemple) et ajouter `novalidate`.
  - Dans la navigation mobile, laisser voir un bout de « Contact » ou réduire l'écart entre les liens pour que les 5 tiennent en 390 px.
- **Commande suggérée** : `/impeccable adapt`.

### [P2] 5. Les photos produits cassent la mise en scène

- **Constat.** Fonds différents d'une photo à l'autre, carte de visite (avec téléphone et SIREN) dans la plupart des cadres, cadrages variés (`parcours/boutique-1440.png`, `parcours/produit-bracelets-1440.png`). Trois cases « Photo en attente de validation » dans la grille de la boutique. Le brief vise « une seule mise en scène ».
- **Pourquoi c'est grave.** Tout le reste du site est rangé, à filets, en angles droits. Les photos sont le seul endroit où le site fait encore « page Facebook ». Et l'aperçu dessiné ne vaut que si la photo réelle donne envie.
- **Correctif.** Une séance photo à l'atelier : même fond (bouleau ou kraft), même lumière, pièce seule, cadrage carré. Commencer par les 8 pièces mises en avant sur l'accueil et les 3 pièces du configurateur. Retirer la carte de visite du cadre.
- **Commande suggérée** : `/impeccable polish` (après la séance photo).

---

## 6. Charge cognitive

**Liste de contrôle (8 points)**

| Point | Résultat | Preuve |
|---|---|---|
| Une seule priorité | OK | Accueil : un seul bouton orange au premier écran. Fiche : un seul bouton d'achat. |
| Petits groupes (≤ 4) | Échec | Page Occasions : 9 lignes à la suite (`parcours/occasions-1440.png`). Boutique : 27 pièces en une seule grille, sans regroupement. |
| Regroupement | OK | Filets et bandes de fond séparent bien les blocs ; étapes numérotées dans le panier. |
| Hiérarchie visuelle | OK, avec réserve | Titres nets, un seul accent. Réserve : les `[À COMPLÉTER]` orange concurrencent le prix sur la fiche. |
| Une chose à la fois | OK | Configurateur en 3 étapes numérotées sur l'accueil ; panier en 5 étapes. |
| Peu de choix (≤ 4) | OK | 3 pièces, 4 polices, 2 tailles, 2 modes de réception, 2 ou 3 modes de paiement. |
| Mémoire de travail | OK | L'aperçu reste visible pendant la saisie sur téléphone ; le panier rappelle texte et police. (Seule exception : retrouver les favoris demande de connaître l'adresse.) |
| Affichage progressif | OK | Adresse de livraison seulement si livraison, horaires repliés, édition du texte repliée dans le panier. |

**1 échec : charge cognitive faible** (4 échecs au premier audit).

**Points de décision à plus de 4 options**
- Page Occasions et liste de l'accueil : **9 occasions** (`ListeOccasions.astro`, `index.astro:86-96`). Elles sont triées par date, ce qui aide.
- Boutique : **5 catégories + 3 budgets = 8 filtres**, mais en deux rangées titrées (`PageBoutique.astro:39-42`). Acceptable.
- Navigation : **5 liens + panier**. Sur téléphone, le 5e lien est hors écran.
- Guide de la démo : **13 parcours** (5 client, 8 boutique), mais en deux colonnes numérotées. Normal pour un guide.

---

## 7. Parcours émotionnel

1. **Arrivée.** Le titre dit ce qu'on vend (« Votre texte, gravé au laser dans notre atelier d'Auchel ») et la planche porte déjà un texte. Sur téléphone, le titre et l'aperçu tiennent dans le premier écran (`parcours/accueil-390-premier-ecran.png`). Petit frein : 190 px de bandeaux avant le contenu, avec le numéro de téléphone deux fois.
2. **Pic : voir son texte sur la pièce.** Réussi. Le texte s'écrit dans l'aperçu à chaque lettre, et « se grave » au changement de police (seule animation, `configurateur-client.ts:26-45`). Sur téléphone, le bandeau reste visible (`parcours/perso-390-1-accueil-saisie.png`).
3. **Moment à fort enjeu : « sera-t-il prêt à temps ? »** Toujours la vallée du parcours. Le panier rattrape en partie avec l'alerte de date, mais la fiche et les occasions ne répondent pas.
4. **Fin, site en aperçu.** Plus de refus : la page dit dès le haut que la commande en ligne n'est pas ouverte et prépare un email complet. La fin est honnête.
5. **Fin, démo.** Paiement simulé, puis page de suivi « Merci pour votre commande » avec la frise des étapes (`parcours/suivi-demo-1440.png`). Bonne fin, mais elle commence sous le titre générique « Suivre ma commande » et la phrase « indiquez votre numéro de commande et votre email » (`suivi.astro:26`). Sur téléphone, « Merci » arrive à 600 px (`parcours/suivi-demo-390-premier-ecran.png`).
6. **Notes rassurantes bien placées** : « Retrait gratuit en boutique » sous le bouton de l'accueil, « Rien à payer aujourd'hui » sous le bouton final du panier.

---

## 8. Parcours testés sur la démo

Tous les parcours ont été faits en 1440 px et en 390 px (téléphone tactile émulé). Détail chiffré dans `parcours/journal-parcours.txt`.

| Parcours | Résultat | Chemin et mesure |
|---|---|---|
| 1. Personnaliser une planche avec deux prénoms et une date, jusqu'au panier | **Réussi** | Accueil → effacer le texte d'exemple → « Julie & Marc » + « 21.09.2027 » → police Manuscrite → « Personnaliser cette pièce » → fiche (texte et police repris) → « Ajouter au panier » → « Voir le panier ». **13,1 s** en 1440 et en 390 au rythme simulé (frappe à 5 caractères par seconde, 1,2 s d'hésitation avant chaque appui) ; 3,2 s sans pause. 5 appuis + 22 caractères. Le panier affiche « Texte à graver · Manuscrite · Julie & Marc 21.09.2027 ». Objectif `PRODUCT.md` (< 60 s) atteint avec une large marge. Captures `parcours/perso-390-1` à `-5`, `parcours/perso-1440-1` à `-5`. |
| 2. Cadeau de fête des mères à moins de 30 € | **Réussi** | 2 clics : « Occasions » → « Fête des mères ». Les pièces sont triées du prix le plus bas au plus haut : mug 14,90 €, bracelet jonc 19,90 €, ardoise 24,90 €, plaque à message 29,90 €, toutes dans la première rangée en 1440 (`parcours/fete-1440-2-fete-meres.png`). Date affichée : 30 mai 2027. Date limite : `[À COMPLÉTER]`. |
| 3. Trouver le délai et le mode de retrait | **À moitié** | Retrait : trouvé partout (accueil sous le bouton, fiche, panier, FAQ). Délai : `[À COMPLÉTER]` sur la fiche, le panier et les occasions ; la FAQ renvoie à la fiche (`parcours/delai-390-faq.png`). |
| 4. Devis pour 50 pièces (association) | **Réussi** | Accueil, bandeau « Associations, clubs, entreprises » → Contact → formulaire (type « Commande pro ou association », quantité 50, date souhaitée) → « Merci, votre demande est bien partie… » (`parcours/devis-1440-2-envoye.png`). Les deux emails (client et boutique) arrivent dans la boîte de démo. Frein : en 390, le bouton de l'accueil est à 6 503 px et le formulaire à 1 480 px de la page Contact. |
| 5. Retrouver un favori | **Échec** | Le cœur se remplit, sans message. Aucun lien vers `/favoris/` sur 5 pages testées. La page marche seulement si on tape l'adresse (`parcours/favori-1440-2-page.png`). |

Commande complète sur la démo (en plus) : panier → erreurs claires à l'envoi vide → code BIENVENUE10 → « Commander et payer 22,41 € » → page de paiement simulée → suivi « Merci pour votre commande », paiement « Payée » (`parcours/panier-demo-1440-rempli.png`, `parcours/paiement-demo-1440.png`, `parcours/suivi-demo-1440.png`). Aucun blocage.

---

## 9. Signaux d'alerte par persona (e-commerce : Casey, Riley, Jordan)

**Casey (sur téléphone, d'une main, souvent interrompue)**
- Sur l'accueil, le champ contient déjà « Marie & Paul / 14.06.2026 » comme vraie valeur, pas comme exemple grisé (`index.astro:38`). Il faut effacer 23 caractères au pouce avant d'écrire. Sur la fiche, c'est un exemple grisé : le même champ se comporte de deux façons.
- Après « Personnaliser cette pièce », elle arrive sur la fiche et doit redescendre jusqu'au bouton « Ajouter au panier », à 1 925 px du haut (mesuré).
- « Contact » est hors de l'écran dans la navigation (390 px).
- Formulaire de devis à 1 480 px de la page Contact.
- 190 px de bandeaux en haut de chaque page, numéro affiché deux fois.
- Points forts pour elle : aperçu collé pendant la saisie, barre « Total / Finaliser » collée en bas du panier, cibles de 44 px (cœur compris, `BoutonFavori.astro:38-39`), panier gardé dans le navigateur.

**Riley (teste les cas limites)**
- Un texte de 48 caractères tient sur une seule ligne et devient minuscule sur la planche ; il est coupé au milieu d'un mot (« … Jean-Pierre et Mar »), seul le compteur « 48 / 48 » le signale (`parcours/fiche-1440-texte-long.png`).
- Bracelets émaillés (pièce sans texte) : la fiche affiche « Paiement : Après validation de la maquette » et « Maquette : [À COMPLÉTER] », et le champ « Précisions » propose « Emplacement… » (`parcours/produit-bracelets-1440.png`, `produit/[id].astro:160`, `:198-199`). Il n'y a rien à maquetter.
- Après un paiement par carte, la frise du suivi dit encore à l'étape 3 « Vous réglez selon le mode choisi » (`etapes.ts:12`) alors que l'encadré dit « Payée ».
- Le devis et le panier ne réagissent pas pareil à un envoi vide (bulle du navigateur contre messages du site).
- La grille « Le catalogue » de l'accueil a 7 pièces : une case vide en fin de deuxième rangée en 1440 (`parcours/accueil-1440.png`).

**Jordan (première visite, lit tout, prend tout au pied de la lettre)**
- Il lit « Nous vous envoyons une maquette à valider avant de graver » dans le panier, puis « avec une maquette si nécessaire » sur l'atelier. Il ne sait pas s'il en recevra une.
- Après avoir écrit son texte sur l'accueil, le bouton dit encore « Personnaliser cette pièce ». Il peut croire que ce qu'il a écrit ne compte pas (le texte est pourtant repris).
- « Disponible » à côté du prix, alors que le bandeau dit « Site en préparation : pour commander, appelez » (`produit/[id].astro:35`, toutes les pièces ont `dispo: "disponible"`).
- Il ne sait pas quelle taille choisir : « Moyenne / Grande (+8 €) » sans dimensions, et « l'aperçu est indicatif ».
- Il met une pièce en favori et ne sait pas où elle est passée.

---

## 10. Par page

### Accueil (`index.astro`)
1. **Configurateur au premier écran, en 1440 et en 390** (`parcours/accueil-1440-premier-ecran.png`, `parcours/accueil-390-premier-ecran.png`). Objectif du brief §4 atteint.
2. **Texte d'exemple saisi comme vraie valeur** dans le champ (`index.astro:38`, `:43`), à effacer avant d'écrire.
3. **Bouton « Personnaliser cette pièce · dès 24,90 € »** : le libellé ne change pas après la saisie (`index.astro:50-52`). « Continuer avec ce texte » dirait ce qui se passe.
4. **Grille de 7 pièces** avec une case vide en 1440 (`index.astro:22`, `parcours/accueil-1440.png`).
5. **Lien « Demander un devis » vers `/contact/`** sans l'ancre `#devis` (`index.astro:154`).

### Boutique et page catégorie (`PageBoutique.astro`, `boutique/[categorie].astro`)
1. **Filtres simplifiés** : deux rangées titrées (Catégorie, Budget), une page statique par filtre, page en cours marquée (`NavFiltres.astro`). Les 9 réglages du premier audit ont disparu.
2. **Plus de recherche ni de tri**, et on ne peut pas croiser catégorie et budget. Avec 27 pièces c'est supportable ; à surveiller si le catalogue grossit.
3. **Méta des cartes cassée en colonnes étroites** : « N° / 011 » et « Sérigraphie & / impression » sur deux lignes en 390 et dans la grille 1440 (`CartePiece.astro:119-122`, `parcours/boutique-390-premier-ecran.png`, `parcours/fete-390-2-fete-meres-entier.png`).
4. **3 cases « Photo en attente de validation »** au milieu de la grille (`parcours/boutique-1440.png`) : bon choix juridique, mais trois trous dans le catalogue.
5. **Page catégorie** : même gabarit, chapeau de la catégorie, filtre actif marqué (`parcours/categorie-gravure-1440.png`).

### Fiche produit, planche apéro (`produit/[id].astro`)
1. **Onglets « Votre aperçu / Photo réelle »** en 1440 ; l'aperçu passe en premier (`ApercuGravure.astro:26-31`, `parcours/produit-planche-1440.png`).
2. **Sur téléphone, la photo réelle passe d'abord, et l'aperçu arrive en bandeau collé dès qu'on atteint les réglages** (`ApercuGravure.astro:98-102`, `Configurateur.astro:146-166`, `parcours/fiche-390-saisie.png`). Le bandeau masque le haut du groupe qui le suit (« 1. La pièce » coupé sur l'accueil, `parcours/perso-390-1-accueil-saisie.png`).
3. **8 `[À COMPLÉTER]` orange**, dont délai et maquette sous le bouton d'achat.
4. **Texte long sur une seule ligne minuscule**, coupé au 48e caractère (`parcours/fiche-1440-texte-long.png`).
5. **« Disponible »** sur une pièce qu'on ne peut pas commander en ligne (`produit/[id].astro:35`).
6. **Bonne section « Comment se passe votre commande »** en 4 étapes, avec « Christophe ou Laetitia, à Auchel » (`produit/[id].astro:210-219`).

### Fiche produit sans texte, bracelets émaillés
1. **Même mise en page sans configurateur** : photo, prix, précisions, quantité, achat (`produit/[id].astro:107-111`, `parcours/produit-bracelets-1440.png`).
2. **Lignes « Paiement après validation de la maquette » et « Maquette » affichées** alors que la pièce ne se grave pas (`produit/[id].astro:198-199`).
3. **Exemple « Emplacement, couleur, date souhaitée… »** hors sujet pour un bracelet (`produit/[id].astro:160`).
4. **Fiche technique entièrement à compléter** sauf le N° de pièce (`FicheTechnique.astro`).

### Occasions et page d'une occasion (`occasions.astro`, `occasions/[id].astro`)
1. **Triées par date, la plus proche d'abord** ; dates calculées justes (Noël 25 décembre 2026, fête des mères 30 mai 2027, fête des pères 20 juin 2027) (`occasions.ts:188-198`, `parcours/occasions-1440.png`).
2. **Colonne de 9 `[À COMPLÉTER]` orange en gras**, plus visible que les noms (`ListeOccasions.astro:115-121`).
3. **Page d'une occasion triée par prix** : le parcours « moins de 30 € » se fait sans filtre (`occasions/[id].astro:40`, `parcours/fete-1440-2-fete-meres.png`).
4. **Bloc Date / Date limite clair** en tête de page, lien retour « Toutes les occasions », autres occasions en pied.

### Atelier (`atelier.astro`)
1. **Photo de la boutique au premier écran**, titre qui décrit (« L'atelier-boutique de la rue Salengro ») (`parcours/atelier-1440.png`). Plus de logo géant, plus de rangée d'icônes.
2. **« Avant fabrication : … avec une maquette si nécessaire »** (`atelier.astro:26`) contredit le panier.
3. **Section « Dans l'atelier » faite de trois cadres vides** et citation vide : environ 500 px sans contenu.
4. **Les 4 catégories en titres + texte**, sans icônes : la structure reste un peu celle d'un gabarit, mais sans les motifs interdits.

### Contact (`contact.astro`, `FormulaireDevis.astro`)
1. **Avis clair en haut du formulaire** quand l'envoi en ligne est fermé, et email prérempli au lieu d'un refus (`FormulaireDevis.astro:23-28`, `parcours/contact-390.png`).
2. **Champ « Date souhaitée » et « Quantité »** ajoutés (`FormulaireDevis.astro:47-55`) : le premier audit les demandait.
3. **Formulaire à 1 480 px sur téléphone**, après les horaires.
4. **Erreurs du navigateur** au lieu des messages du site (`parcours/devis-390-3-vide.png`).
5. **Horaires en tableau lisible**, jours fermés grisés ; mais encore répétés dans le pied de la même page.

### Avis (`avis.astro`)
1. **« Recommandé à 100 % · 16 avis sur Facebook »** sans étoiles, avis recopiés avec prénom et mois (`parcours/avis-390-premier-ecran.png`).
2. **Plus de mention « Google »**.
3. **Les avis passent avant le bouton « Laisser un avis sur Facebook »**, placé en bas de page (corrigé depuis le premier audit, `parcours/avis-1440.png`).
4. **10 avis affichés pour « 16 avis sur Facebook »**, sans lien vers la pièce concernée : un avis qui cite une commande de 200 pièces pour une association pourrait mener au devis.

### Panier rempli (`panier.astro`)
1. **Date en première étape**, alerte claire si elle est proche (`parcours/panier-demo-390-date-proche.png`).
2. **Ligne lisible** : vignette, N°, taille, texte dans sa police sur fond kraft, « Modifier le texte ou la police » (`parcours/perso-390-5-panier.png`).
3. **Phrase de maquette affirmée deux fois, puis `[À COMPLÉTER]`** (`panier.astro:97`, `:121`).
4. **Messages d'erreur exemplaires** et focus sur le premier champ (`parcours/panier-demo-390-erreurs.png`).
5. **Barre collée « Total / Finaliser »** sur téléphone ; bouton final à 3 545 px de la page en 390, mais toujours atteignable par la barre.

### Suivi (`suivi.astro`)
1. **Site en aperçu : la page le dit** (« Le suivi en ligne n'est pas encore ouvert ») et montre les 6 étapes (`parcours/suivi-1440.png`). Cohérent avec la FAQ.
2. **Démo : frise des étapes avec l'étape en cours marquée**, détail de la commande, paiement « Payée », boutons Appeler / Nous écrire (`parcours/suivi-demo-1440.png`).
3. **Le « Merci » arrive sous un titre et une phrase de recherche** qui ne servent plus quand on vient de payer (`suivi.astro:26`, `:68-69`).
4. **Étape 3 « Vous réglez selon le mode choisi »** même quand c'est déjà payé (`etapes.ts:12`).

### Page démo (`demo.astro`)
1. **Guide clair en deux colonnes** (côté client, côté boutique), identifiants affichés, bouton « Repartir des exemples » avec confirmation (`parcours/demo-1440.png`).
2. **Bandeau orange « Démo : rien n'est envoyé ni payé »** sur toutes les pages, avec accès à la boîte mail, au guide et à l'admin.
3. **C'est le seul endroit qui mène aux favoris** (`demo.astro:21`).
4. **Les chiffres des étapes sont dans la couleur d'achat**, comme sur la fiche (« 01 » à « 04 ») : petit écart à la règle « une couleur d'accent pour l'achat, le prix, la date limite ».

---

## 11. Avant / après

| Point du premier audit (25/40) | État aujourd'hui |
|---|---|
| Pas de configurateur sur l'accueil | **Corrigé.** Configurateur au premier écran en 1440 et 390. |
| Aperçu = texte blanc ombré sur une planche déjà gravée | **Corrigé.** Planche dessinée vierge, texte brun, limites de caractères et de lignes. |
| Sur téléphone, on écrit sans voir l'aperçu (88 px au-dessus de l'écran) | **Corrigé.** Bandeau d'aperçu collé en haut pendant la saisie (mesuré). |
| Délai invisible partout | **En partie.** Il s'affiche comme manquant (`[À COMPLÉTER]`) et le panier alerte sur les dates proches. Le vrai délai n'est toujours pas connu. |
| Commande et devis refusés après saisie complète | **Corrigé.** Avis dès le haut, email prérempli à la fin. Sur la démo, tout fonctionne. |
| 4 pictos, dégradés, bouton flottant, logo ×4, ombres, verre dépoli, angles arrondis | **Corrigé.** Aucun motif interdit vu. Un logo par page. |
| 3 polices Bricolage / Figtree / Caveat, plusieurs accents | **Corrigé.** Big Shoulders, Literata, Courier Prime (+ Sacramento dans l'aperçu), un seul accent. |
| Étoiles ★★★★★ inventées, « Facebook et Google » | **Corrigé.** |
| Winnie l'Ourson, écussons de clubs | **Corrigé.** Remplacés par « Photo en attente de validation ». |
| Promesse de maquette contradictoire | **Pas corrigé.** Quatre versions selon la page. |
| « Disponible » alors qu'on ne peut pas commander | **Pas corrigé.** |
| Tailles sans centimètres | **Pas corrigé** (dimensions à compléter par l'atelier). |
| Livraison payante cochée par défaut | **Corrigé.** Retrait gratuit par défaut. |
| Panier : seulement « Retirer », sans annulation ni modification | **Corrigé.** Modifier, Annuler. |
| Date de l'occasion cachée dans une étape facultative | **Corrigé.** « Pour quelle date ? » en étape 01. |
| Boutique : 9 réglages, champs coupés sur téléphone | **Corrigé.** Deux rangées de filtres. (Recherche et tri retirés.) |
| Cœurs favoris de 38 px | **Corrigé** (44 px). Mais **nouveau problème** : aucun lien vers les favoris. |
| Formulaire de devis en troisième sur téléphone | **Pas corrigé** (1 480 px). |
| Pas de champ date dans le devis | **Corrigé.** |
| Photos sur fonds variés avec carte de visite | **Pas corrigé** (demande une séance photo). |
| Aucune photo de Christophe et Laetitia | **Pas corrigé**, mais signalé honnêtement par une marque à compléter. |
| Charge cognitive élevée (4 échecs) | **Corrigé.** 1 échec. |

---

## 12. Observations mineures

- **Trois polices par écran** (Big Shoulders, Literata, Courier Prime) sur toutes les pages mesurées, plus Sacramento dans l'aperçu. C'est exactement le système du brief §3, mais le même brief interdit « plus de deux polices par écran ». La contradiction est dans le brief, pas dans le site (voir questions).
- Le numéro de téléphone apparaît deux fois dans les 90 premiers pixels sur téléphone (bandeau « Site en préparation » et barre d'adresse).
- La couleur d'achat sert aussi aux numéros d'étapes (fiche, démo) et aux `[À COMPLÉTER]`.
- Le focus clavier est un contour orange de 2 px (`socle.css:324`) ; les choix de pièce et de police sont de vrais boutons radio. Lecteur d'écran non testé dans cette revue.
- La liste des occasions de l'accueil ne montre pas les dates (Noël, fête des mères), alors que la page Occasions les montre.
- Horaires complets dans le pied de chaque page, en plus du tableau de la page Contact.
- Sur l'accueil, la « vraie pièce » en vignette 72 px à côté de l'aperçu est la planche « J'ai essayé le sport… la bière » : elle ne correspond pas au texte du client, mais elle est bien présentée comme photo réelle.
- Aucune erreur JavaScript relevée sur les 13 pages testées, ni de débordement horizontal en 390 px (mesuré).

---

## 13. Questions à se poser

- Le brief fixe trois polices pour le site et interdit plus de deux polices par écran : laquelle des deux règles fait foi ? Faut-il réserver Courier Prime aux seules étiquettes de pièce et passer les autres en Literata ?
- Si l'atelier répond « maquette à chaque commande », est-ce que cette phrase ne devrait pas être la plus visible du site, juste sous le bouton d'achat, à la place de « Disponible » ?
- Les `[À COMPLÉTER]` aident la présentation au commerçant. Le jour de la bascule, qu'est-ce qui garantit qu'aucune ne reste visible par un client ?
- Pourquoi garder les favoris si on ne les montre nulle part ? Un lien dans l'en-tête, ou les retirer ?
- Que deviendrait la page Occasions avec de vraies dates limites, triée par urgence (« Fête des mères : plus que 12 jours pour commander ») ?
- La séance photo ne serait-elle pas aujourd'hui le meilleur rapport effort / effet sur la vente, maintenant que la mise en page est prête ?
