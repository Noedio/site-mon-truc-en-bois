# Benchmark e-commerce : 8 sites de référence

But : regarder comment des boutiques en ligne réputées vendent la personnalisation, montrent la fabrication et font passer de la fiche au panier, pour nourrir la refonte de Mon Truc en Bois. Ce relevé complète `audit/benchmark.md` (3 concurrents locaux, Coutumes, Polène, Heyday Canning), sans reprendre ces sites.

Règles suivies :
- Chaque ligne s'appuie sur une capture ou un chiffre relevé le 24/10/2026. Rien n'est recopié mot pour mot : on décrit ce qu'on voit.
- Cookies non essentiels refusés sur chaque site (voir « Limites »). Aucun compte créé, aucun formulaire envoyé, aucun paiement.
- Un article a été ajouté au panier quand le site le permettait, seulement pour voir le panier et les frais affichés. Sur Opinel et Atelier Paulin, le mot « essai » a été tapé dans le module de gravure pour voir l'aperçu, sans l'ajouter au panier.
- Ce qu'on n'a pas pu relever s'écrit `[À COMPLÉTER : …]`.

Captures : `audit/benchmark/ecommerce/<site>/`, fichiers `accueil-1440.jpg`, `accueil-390.jpg`, `fiche-1440.jpg`, `fiche-390.jpg`, `panier-1440.jpg`, `panier-390.jpg` (pleine page), plus `configurateur-*.jpg` (Opinel, Atelier Paulin) et `ajout-panier-*.jpg` (Typology), et `lighthouse-accueil-mobile.report.json`. Le dossier `mtb-apercu/` contient les mêmes captures et la même mesure pour le nouveau site.

## Les 8 sites

| # | Site | Groupe | URL | Date du relevé | Plateforme visible | Pourquoi on le retient |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Opinel (Savoie) | 1. Personnalisation et gravure | https://www.opinel.com/fr-fr/ | 24/10/2026 | Sylius (formulaire `sylius_add_to_cart`) | Gravure laser en ligne dès une pièce, avec un module qui pose le texte sur la vraie photo du couteau, zone par zone. |
| P2 | Atelier Paulin (Paris) | 1. Personnalisation et gravure | https://atelierpaulin.com/ | 24/10/2026 | Shopify | Bijou prénom façonné à la main, aperçu réaliste du mot pendant la saisie, et un atelier-boutique où l'on retire sa commande. |
| P3 | Mapiful (Suède, site en français) | 1. Personnalisation et gravure | https://www.mapiful.com/fr/ | 24/10/2026 | WordPress 6.6.2 + WooCommerce | La fiche produit est un éditeur : chaque réglage change l'affiche en direct, puis on l'ajoute au panier. |
| F1 | Typology | 2. Marque française | https://www.typology.com/ | 24/10/2026 | Sur mesure [À COMPLÉTER : ni Shopify, ni WordPress, ni Next.js détectés] | Fiche très lisible : code produit, texte en police machine à écrire, frais de port visibles dès le panier. |
| F2 | Le Slip Français | 2. Marque française | https://www.leslipfrancais.fr/ | 24/10/2026 | Shopify | Ton reconnaissable, broderie en option sur la fiche, avis datés avec la date de l'expérience. |
| F3 | Asphalte | 2. Marque française | https://www.asphalte.com/ | 24/10/2026 | Shopify (boutique `myshopify`) avec une façade Nuxt | Vente en précommande avec date limite, date de livraison et nombre de précommandes sur la fiche. |
| A1 | Peg and Awl (Philadelphie, États-Unis) | 3. Atelier qui montre la fabrication | https://pegandawlbuilt.com/ | 24/10/2026 | Shopify | Atelier tenu par un couple : mains au travail à l'accueil, gravure en option, fiche technique illustrée pièce par pièce. |
| A2 | Atelier Tuffery (Florac, Lozère) | 3. Atelier qui montre la fabrication | https://www.ateliertuffery.com/ | 24/10/2026 | Shopify | Atelier familial depuis 1892 qui montre la coupe à la main, ouvre ses portes au public et répare ses pièces. |

Tous les sites répondaient (statut HTTP 200 sur l'accueil) au moment du relevé, le 24/10/2026 entre 21 h 30 et 22 h 50.

Sites essayés et écartés le même jour : Merci Maman (domaine parqué), Sézane (accès refusé, erreur 403), Mark & Graham (commande désactivée depuis la France, page « informative »), Grovemade (blocage anti-robot Cloudflare dès la fiche produit : non contourné), YETI Europe (version française introuvable). Grovemade a été remplacé par Peg and Awl, Mark & Graham par Mapiful.

## Grilles par site

### P1. Opinel

Pages relevées : accueil, fiche `n9-noyer` (couteau N°09 Noyer, 20,30 €), module de gravure ouvert, panier avec ce couteau.

| Critère | Observation |
| --- | --- |
| Premier écran | Carrousel plein écran sur une édition limitée, bouton « Découvrir l'édition limitée ». Bandeau rose pour une opération caritative au-dessus du menu. La personnalisation a son entrée dans le menu (« Personnalisation ») et un bloc plus bas sur l'accueil. |
| Personnalisation : aperçu | Le module s'ouvre dans un panneau latéral. Le couteau est montré deux fois (face et dos) avec un bouton « Ajouter » sur chaque zone gravable (lame et manche, recto et verso). Après validation, le texte s'affiche sur la lame dans la police choisie (`configurateur-apercu-1440.jpg`). |
| Personnalisation : choix | Une ligne de 20 caractères au plus, 4 styles de police montrés par « Ab ». Emballage cadeau en pochon à +7 €, avec un message possible. |
| Personnalisation : délai et maquette | Page « Personnalisation » : gravure dès un exemplaire, dès 6 €, faite dans les ateliers de Savoie, expédition sous 24 à 48 h en express. La gravure suit « au plus près » la simulation du module ; pas de maquette envoyée. Pièces gravées ni reprises ni échangées. |
| Fiche produit : photos | 3 vues du couteau sur fond gris clair, puis une photo en situation plus bas. |
| Fiche produit : infos pratiques | Date de livraison express en clair (« chez vous ce mardi »), « Made in France », garantie à vie. Caractéristiques techniques en accordéons fermés (longueur de lame, acier, manche, bague). |
| Fiche produit : preuves | Note Trustpilot avec 355 avis sous le titre. Le bloc « Avis & commentaires » est vide sur la capture (widget tiers non chargé, cookies refusés). |
| Panier et paiement | Page panier : la ligne du couteau propose « Ajouter une gravure » et « Ajouter un emballage » directement dans le panier. Code promo, sous-total, message « ajoutez 48,70 € pour la livraison gratuite » (seuil 69 €). Bouton « Étape suivante ». Frais de port non affichés à ce stade. Modes annoncés : Visa, Mastercard, PayPal, Alma. Retrait : points de vente listés, retrait d'une commande en ligne [À COMPLÉTER : non vu]. |
| Confiance | Note Trustpilot, garantie sans limite de durée, retours 30 jours (sauf gravure), portraits « Ils sont Opinel » nommés sur l'accueil. Bande de 4 pictos (livraison, retour, paiement, garantie) au-dessus du pied de page. |
| Ton et typographie | Serif d'affichage très grasse pour les titres, sans-serif pour le reste. Bleu marine dominant, bandeau rose, bulle d'aide violette : trois couleurs fortes à l'écran. Phrases courtes, factuelles sur la fiche. |
| Mobile | Barre collante en bas avec prix, « Personnaliser » et « Ajouter au panier ». Le module de gravure garde les deux vues du couteau et le récapitulatif chiffré (`configurateur-apercu-390.jpg`). |
| Lighthouse mobile (accueil) | Score 20 (3 mesures : 17 / 20 / 37), LCP 21,8 s, CLS 0,857, poids 23,6 Mo, 152 requêtes. |

### P2. Atelier Paulin

Pages relevées : accueil, fiche « Bracelet original personnalisé » en or jaune laminé (280 €), module « Écrire mon prénom », panier vide (le bijou ne s'ajoute qu'avec un prénom et une taille : pas fait).

| Critère | Observation |
| --- | --- |
| Premier écran | Photo portée plein écran (bijou au poignet), lien « Découvrir » sur la sélection du mois. Bandeau noir en haut avec l'adresse de l'atelier-boutique et ses horaires. |
| Personnalisation : aperçu | Bouton « Écrire mon prénom » : panneau en 2 étapes (Personnalisation, Taille). À gauche, un exemple de bracelet avec un prénom, marqué comme exemple. Pendant la saisie, le mot tapé apparaît en fil d'or sur le bracelet (`configurateur-apercu-1440.jpg`). Un bouton « Prévisualiser mon bijou » est aussi posé sur la photo de la fiche. |
| Personnalisation : choix | Matière en 6 vignettes (or 750 jaune, rose, blanc ; or laminé jaune, rose ; argent 925), prix qui change avec la matière. Règles écrites sous le champ : 1 à 10 lettres, minuscules, pas d'accents ni d'apostrophes. |
| Personnalisation : délai et maquette | Sur la fiche : fourchette de livraison datée (mardi 27 – jeudi 29 octobre) et « retrait gratuit en boutique dès lundi 26 octobre ». Accueil : expédition sous 24 à 48 h ouvrées. Pas de maquette : l'aperçu en tient lieu. |
| Fiche produit : photos | Grandes photos portées et détourées en colonne à gauche, une vidéo, photo de l'emballage. |
| Fiche produit : infos pratiques | Onglets Détails, Matière, Entretien, Livraisons. Bloc « Façonné à la main à Paris » avec photo des mains et du fil. Service de remise en état (« conciergerie »). FAQ produit en accordéons. |
| Fiche produit : preuves | 5 étoiles sous le titre, sans nombre d'avis visible à côté. |
| Panier et paiement | Panier vide relevé : page sobre avec un seul bouton. Paiement en 3 fois sans frais annoncé ; logos de paiement en pied de page. Livraison offerte dès 250 €. Frais en dessous [À COMPLÉTER : non relevés, panier vide]. |
| Confiance | Section « Derrière la porte bleue, l'atelier » : photo de la porte, adresse, 3 étapes pour entrer (sonner, la porte, l'artisan qui accueille), sans rendez-vous, 30 minutes pour personnaliser sur place, retrait gratuit. Garanties chiffrées (dix ans sur l'or 750, un an sur le laminé et l'argent). Bande de 4 pictos en bas d'accueil. |
| Ton et typographie | Capitales fines très espacées, fond blanc et rose poudré, une seule teinte forte (le noir du bouton). Texte au « nous », parfois lyrique sur la fiche. |
| Mobile | Aperçu en haut, champ en dessous, bouton « OK » dans le champ (`configurateur-apercu-390.jpg`). Deux bulles flottantes à l'écran (remise de 10 € et assistant). |
| Lighthouse mobile (accueil) | Score 56 (3 mesures : 37 / 56 / 59), LCP 3,9 s, CLS 0,241, poids 4,2 Mo, 296 requêtes. |

### P3. Mapiful

Pages relevées : accueil, éditeur d'affiche « Street map » (sert de fiche produit), panier avec l'affiche Paris proposée par défaut.

| Critère | Observation |
| --- | --- |
| Premier écran | Mosaïque de photos en situation, gros bandeau de remise (−25 %), titre qui dit ce qu'on fait (des affiches personnalisées), bouton « Créer ton affiche ». Bandeau Trustpilot 4,3 sur 5 tout en haut. |
| Personnalisation : aperçu | L'affiche occupe le centre de l'écran et change à chaque réglage. La carte se déplace et se zoome à la souris. |
| Personnalisation : choix | Barre d'outils verticale : Carte, Étiquettes, Style, Taille, Cadres, Icônes, Avancé. Lieux populaires proposés en un clic. Taille affichée sur l'aperçu (50 × 70 cm). Cadres en option (+35,99 €). |
| Personnalisation : délai et maquette | [À COMPLÉTER : délai non affiché dans l'éditeur ni au panier]. Pas de maquette : l'aperçu est le produit. Impression chez des partenaires locaux (accueil). |
| Fiche produit : photos | Aucune photo dans l'éditeur, seulement l'aperçu. Les photos en situation sont sur l'accueil et les pages de collection. |
| Fiche produit : infos pratiques | Prix barré (59,99 €) et prix remisé (44,99 €) dans le bouton d'achat collant en bas à gauche. Bloc sur le papier certifié FSC. |
| Fiche produit : preuves | Avis clients cités en anglais sous l'éditeur, note Trustpilot. |
| Panier et paiement | Panier sur une page : vignette de l'affiche avec le lieu et les coordonnées, prix barré, lien « Une autre affiche », total TTC avec la TVA estimée, bouton « Valider la commande » et paiement express Link. Frais de port non affichés au panier ; livraison gratuite dès 59 € annoncée sur l'accueil. Logos Klarna, Mastercard, Visa en pied de page. |
| Confiance | Note Trustpilot, nombre de clients revendiqué (plus de 314 000), logos de presse sous le premier écran. |
| Ton et typographie | Tutoiement, phrases courtes. Sans-serif géométrique, rose brique en accent, photos très décorées (fleurs, intérieurs). |
| Mobile | Aperçu en haut, barre d'outils en icônes juste en dessous, recherche de lieu ensuite. La page mesure 423 px de large pour un écran de 390 px : la page déborde sur le côté (mesure `innerWidth` au relevé). |
| Lighthouse mobile (accueil) | Score 46 (3 mesures : 41 / 46 / 48), LCP 6,7 s, CLS 0,010, poids 4,5 Mo, 91 requêtes. |

### F1. Typology

Pages relevées : accueil, fiche « Sérum Teinté T10 » (29,90 €), fenêtre qui s'ouvre après l'ajout, panier latéral.

| Critère | Observation |
| --- | --- |
| Premier écran | Vidéo plein écran d'un visage, nom d'un coffret en capitales, une phrase. Bandeau noir en haut sur l'édition limitée du moment. |
| Personnalisation | Pas de gravure. Un « diagnostic de peau » remplace le conseil en boutique. |
| Fiche produit : photos | 4 visuels du flacon sur fond gris, nuancier de 6 teintes en pastilles. |
| Fiche produit : infos pratiques | Code produit en tête (TEINTÉ-1001, 30 ml), texte descriptif en police machine à écrire, liste de points courts (sans nanoparticules, sans silicones…). FAQ produit, champ de recherche « des questions sur ce produit ? ». |
| Fiche produit : preuves | 4,1 sur 5 sur plus de 352 000 avis, présentés comme issus d'achats vérifiés. Avis filtrables par type de peau, âge, sensibilité. |
| Panier et paiement | Après l'ajout, une fenêtre propose une deuxième teinte, avec un lien « Continuer vers le panier » (`ajout-panier-1440.jpg`). Panier latéral : produit, 3 suggestions, sous-total 29,90 €, frais de livraison 4,90 €, total estimé, barre de progression vers la livraison gratuite (20,10 € restant, donc seuil à 50 €). Bouton « Finaliser ». |
| Confiance | « Fabriqué en France » répété, nombre d'avis très élevé sur l'accueil, produit offert dès 75 €. |
| Ton et typographie | Noir et blanc, une sans-serif et une police à chasse fixe pour les informations produit. Phrases courtes, factuelles. |
| Mobile | Fiche en une colonne, photo puis code produit, titre, note et teintes. Panier latéral en plein écran. |
| Lighthouse mobile (accueil) | Score 59 (3 mesures : 44 / 59 / 62), LCP 4,7 s, CLS 0,000, poids 1,7 Mo, 214 requêtes. |

### F2. Le Slip Français

Pages relevées : accueil, fiche « Slip blanc en coton – Intrépide » (25 €), panier avec ce slip en taille M.

| Critère | Observation |
| --- | --- |
| Premier écran | Photo portée avec gros titre de saison et bouton de remise (« jusqu'à −50 % et −20 % supp »). Bandeau défilant (livraison offerte en point relais). Pastille rouge de notifications sur une cloche dans l'en-tête. |
| Personnalisation : choix et prix | Option repliable « Broder mon article : +6,00 € » sous le choix de la taille. |
| Personnalisation : délai, maquette | [À COMPLÉTER : délai de broderie non relevé, option non ouverte]. |
| Fiche produit : photos | Grille de photos portées (face, dos, détail) et une vidéo. Sur mobile, la première image est un schéma annoté du slip (ceinture, matière, coutures). |
| Fiche produit : infos pratiques | Paliers de remise par quantité (−5 % dès 3, −10 % dès 4, −20 % dès 5), points de fidélité, disponibilité par taille (pastille verte), « expédition sous 24 h ouvrées », accordéons Composition, Conseil d'entretien, Traçabilité. |
| Fiche produit : preuves | 4,5 sur 5 sur 52 avis pour ce produit, répartition par note, chaque avis avec prénom, initiale, date de l'avis et date de l'expérience, mention « avis vérifié » et parfois une réponse de la marque. |
| Panier et paiement | Page panier : article, taille, prix, sous-total, « frais d'expédition calculés à l'étape de paiement ». Sous le panier, −20 % proposés contre l'inscription au programme de fidélité (champ e-mail et case à cocher). Paiement en 4 fois annoncé sur la fiche. |
| Confiance | Avis vérifiés (95 806 annoncés pour la marque), retours et échanges gratuits sous 30 jours, atelier de réparation. Bande de 5 pictos en pied de page. |
| Ton et typographie | Humour et jeux de mots dans les titres. Bleu, blanc, rouge très présents ; police d'affichage large en capitales. |
| Mobile | Fiche longue : schéma annoté, prix, paliers, tailles, option broderie, bouton d'ajout. Une fenêtre s'ouvre à l'arrivée (fermée pour la capture). |
| Lighthouse mobile (accueil) | Score 26 (3 mesures : 25 / 26 / 26), LCP 23,7 s, CLS 0,030, poids 5,2 Mo, 420 requêtes. |

### F3. Asphalte

Pages relevées : accueil (choix Homme ou Femme), fiche « Le Bonnet Fisherman » (39 € en précommande, 49 € en stock), panier latéral avec ce bonnet.

| Critère | Observation |
| --- | --- |
| Premier écran | Deux photos portées côte à côte, « L'homme » et « La femme », le logo au centre. Rien d'autre : il faut choisir pour entrer. |
| Personnalisation | Pas de personnalisation. Le modèle de vente est la précommande : on achète avant fabrication. |
| Fiche produit : photos | Grandes photos portées et de détail (maille, revers), en colonne. |
| Fiche produit : infos pratiques | Deux prix côte à côte (précommande et stock), étiquette rouge « plus que 8 jours », date de livraison (1 – 15 janvier), nombre de précommandes (388), liens Matière, Coupe, Entretien, Impact, Traçabilité, et un encart « Pourquoi la précommande ? ». |
| Fiche produit : preuves | 4,6 sur 5 et 87 avis, en lien sous le prix. |
| Panier et paiement | Il faut cliquer la taille même quand il n'y en a qu'une (« TU »), sinon un message d'erreur s'affiche. Puis panier latéral : article marqué « en précommande », suggestions, sous-total, « frais de port et remises calculés à la caisse », bouton « Passer la commande ». |
| Confiance | Satisfait ou remboursé, échanges et retours gratuits, paiement sécurisé : trois mentions en capitales séparées par des astérisques rouges au-dessus du pied de page, sans pictos. |
| Ton et typographie | Condensée très grasse en capitales (proche de Big Shoulders), bleu marine, jaune pour le bouton d'achat, rouge pour l'urgence : trois couleurs d'accent. |
| Mobile | Photo puis titre en grosses capitales, prix, coloris et bouton jaune collant. |
| Lighthouse mobile (accueil) | Score 46 (3 mesures : 35 / 46 / 50), LCP 7,8 s, CLS 0,000, poids 1,6 Mo, 87 requêtes. |

### A1. Peg and Awl

Pages relevées : accueil, fiche « Wyeth Plein Air Box » (boîte de peintre en bois, 1 550 € affichés en euros), panier avec cette boîte, sans gravure.

| Critère | Observation |
| --- | --- |
| Premier écran | Photo de mains qui écrivent sur un établi encombré d'outils et de tissus. Titre sur une collection anniversaire, bouton « Shop now ». |
| Personnalisation : choix | Sur la fiche, trois boutons : sans gravure, nom, citation. |
| Personnalisation : aperçu, délai, maquette | Pas d'aperçu. [À COMPLÉTER : délai de gravure et prix des options non relevés, options non cliquées]. Le panier rappelle l'option choisie (« Personalization : No Engraving ») et offre un champ « notes de commande et personnalisation ». |
| Fiche produit : photos | Photos en extérieur sur un mur de pierre, puis une photo à plat de toutes les pièces avec des numéros de 1 à 5. |
| Fiche produit : infos pratiques | Liste des matériaux, liste des pièces incluses, poids, tableau de mesures (fermé, ouvert, tiroirs, poche, trousse) avec un bouton pour passer en unités métriques. Pièces de rechange proposées sous le tableau. |
| Fiche produit : preuves | 3 avis, note 5 sur 5, avis avec photos des clients. |
| Panier et paiement | Page panier : photo, option de gravure, quantité, sous-total, bouton « Checkout ». Frais de port non affichés ; livraison offerte aux États-Unis dès 200 $ (bandeau). |
| Confiance | Vidéos de démonstration de l'objet, un entretien publié sur l'accueil, page « Materials », bijoux faits à la main dans leur atelier (« Barn Studio ») d'après l'accueil. Pas de bande de pictos. |
| Ton et typographie | Serif classique, fond crème, filets rouge brique fins sous les titres, jaune moutarde pour les boutons. Ton au « nous », chaleureux. |
| Mobile | Titre et prix d'abord, puis photo et vignettes, puis options de gravure. |
| Lighthouse mobile (accueil) | Score 46 (3 mesures : 42 / 46 / 55), LCP 21,3 s, CLS 0,000, poids 5,5 Mo, 286 requêtes. |

### A2. Atelier Tuffery

Pages relevées : accueil, fiche « Alphonse, jean homme droit ajusté Brut Flex » (149 €), panier latéral avec ce jean en 42.

| Critère | Observation |
| --- | --- |
| Premier écran | Photo portée plein écran, « Nouvelle collection », bouton « Découvrir ». Bandeau : livraison offerte dès 200 €, retours et échanges gratuits. |
| Personnalisation | Patch brodé à coudre soi-même proposé à 7,50 € (sur la fiche et dans le panier). Pas de gravure. |
| Fabrication montrée | Accueil : section « La fabrication chez Atelier Tuffery », photo d'archive des ouvriers, photo d'une couturière, équipe de Florac qui dessine, coupe et fabrique. Journal : visites guidées gratuites de la manufacture du 19 au 24 octobre 2026. Label Entreprise du Patrimoine Vivant cité. |
| Fiche produit : photos | 4 photos (jean détouré face et dos, porté face et dos) en grille, puis gros plan. |
| Fiche produit : infos pratiques | Tailles en boutons, « livraison sous 3 à 5 jours », encadré livraison offerte dès 200 €, retours 30 jours, paiement en plusieurs fois. Accordéons Caractéristiques, Engagements, Conseils et entretien, Avis. |
| Fiche produit : preuves | 387 avis en étoiles à côté du titre. |
| Panier et paiement | Panier latéral : article, taille, total, barre de progression (« plus que 51 € pour la livraison offerte »), patch proposé, lien « ajouter un message pour les équipes », case « j'accepte les CGV » à cocher avant « Procéder au paiement ». Taxes et frais de port « à l'étape suivante ». Modes : carte, PayPal, chèque, 3 fois sans frais, 4 fois avec Alma. |
| Confiance | Histoire depuis 1892 avec le nom du fondateur, réparation gratuite un an, portes ouvertes. Bande de 4 pictos en pied de page. Long texte de référencement en bas d'accueil (13 fois « jean(s) français » ou « made in France »). |
| Ton et typographie | Sans-serif en capitales pour les titres, bleu marine, phrases au « nous ». |
| Mobile | Barre « Acheter 149,00 € » collante en bas de la fiche. |
| Lighthouse mobile (accueil) | Score 35 (3 mesures : 35 / 35 / 36), LCP 14,8 s, CLS 0,000, poids 41,0 Mo, 350 requêtes. |

## Lighthouse mobile : synthèse

| Site | Score (médiane) | 3 mesures | LCP (s) | CLS | Poids | Requêtes |
| --- | --- | --- | --- | --- | --- | --- |
| P1 Opinel | 20 | 17 / 20 / 37 | 21,8 | 0,857 | 23,6 Mo | 152 |
| P2 Atelier Paulin | 56 | 37 / 56 / 59 | 3,9 | 0,241 | 4,2 Mo | 296 |
| P3 Mapiful | 46 | 41 / 46 / 48 | 6,7 | 0,010 | 4,5 Mo | 91 |
| F1 Typology | 59 | 44 / 59 / 62 | 4,7 | 0,000 | 1,7 Mo | 214 |
| F2 Le Slip Français | 26 | 25 / 26 / 26 | 23,7 | 0,030 | 5,2 Mo | 420 |
| F3 Asphalte | 46 | 35 / 46 / 50 | 7,8 | 0,000 | 1,6 Mo | 87 |
| A1 Peg and Awl | 46 | 42 / 46 / 55 | 21,3 | 0,000 | 5,5 Mo | 286 |
| A2 Atelier Tuffery | 35 | 35 / 35 / 36 | 14,8 | 0,000 | 41,0 Mo | 350 |
| Nouveau site MTB (aperçu) | 84 | 84 / 84 / 84 | 1,9 | 0,282 | 462 Ko | 22 |

Valeurs de la mesure médiane, rapport gardé dans `audit/benchmark/ecommerce/<site>/lighthouse-accueil-mobile.report.json`. Les scores bougent de 1 à 20 points d'une mesure à l'autre chez les 8 sites (scripts tiers, publicités, vidéos) ; le nouveau site donne 84 aux trois mesures. À lire comme un ordre de grandeur.

À retenir : aucun des 8 sites ne dépasse 59 en médiane, et 6 sur 8 ont un LCP mobile au-dessus de 6 s. Les deux sites les plus lourds (Opinel, Atelier Tuffery) chargent plus de 20 Mo dès l'accueil. Le nouveau site, à 84 et 462 Ko, est le plus rapide des 9, mais son CLS (0,282) est le plus mauvais après Opinel.

## Idées à reprendre chez Mon Truc en Bois

Pages du nouveau site : accueil `/`, fiche `/produit/<pièce>/`, panier `/panier/`, atelier `/atelier/`, occasions `/occasions/<occasion>/`, avis `/avis/`.

| # | Idée | Vu chez | Page du nouveau site | Effort | Compatibilité avec le brief |
| --- | --- | --- | --- | --- | --- |
| 1 | Aperçu posé sur la vraie photo de la pièce : le texte apparaît à l'endroit gravé, dans la police choisie, au lieu d'une illustration plate. | Opinel (lame), Atelier Paulin (fil d'or) | Fiche `/produit/planche-aperitif/` et toutes les pièces configurables | Fort (une photo de face par pièce, zone gravable mesurée, SVG calé dessus) | Oui. C'est l'animation signature du brief (le texte qui se grave). Prévoir la photo de chaque pièce sur le même fond. |
| 2 | Zones gravables cliquables (recto, verso, manche…) avec le prix de chaque zone ajouté au total. | Opinel (« Ajouter » sur 4 zones, +6 € par zone) | Fiche (planche recto/verso, verres, porte-clés) | Moyen | Oui. Boutons à angles droits, accent `--gravure` seulement pour le prix. |
| 3 | Récapitulatif chiffré sous l'aperçu : une ligne pour la pièce, une pour chaque option, puis le total. | Opinel | Fiche, au-dessus du bouton d'ajout | Faible | Oui. Tableau à filets fins en Courier Prime. |
| 4 | Règles de saisie écrites sous le champ (ce que la machine ne grave pas : accents, symboles, longueur) et un exemple marqué comme tel. | Atelier Paulin | Fiche, sous « Votre texte » | Faible (texte à valider par l'atelier) | Oui. Phrase simple, factuelle. |
| 5 | Date en clair sur la fiche : « livré entre le … et le … » ou « à retirer à Auchel dès le … », calculée avec le délai réel. | Atelier Paulin, Opinel (« chez vous ce mardi ») | Fiche (ligne « Délai de fabrication »), panier | Moyen (il faut le délai réel par famille de pièces) | Oui. Remplace les `[À COMPLÉTER : délai]`. Date en `--gravure`, comme prévu par le brief. |
| 6 | Bloc « venir à l'atelier » : photo de la façade, adresse, comment entrer en 3 étapes, horaires, temps pour graver sur place, retrait gratuit. | Atelier Paulin (« Derrière la porte bleue ») | `/atelier/` et bloc atelier de l'accueil | Faible (une photo de la vitrine, horaires déjà connus) | Oui. Pas de pictos : étapes numérotées 01, 02, 03 comme sur la fiche actuelle. |
| 7 | Barre de progression vers la livraison offerte dans le panier, avec le montant restant. | Typology, Atelier Tuffery, Opinel (message seul) | `/panier/` (seuil 60 € déjà dans les données) | Faible | Oui si la barre est un filet de 1 px plein en `--gravure` sur fond `--kraft`, sans dégradé. |
| 8 | Frais de livraison chiffrés dès le panier, pas « à l'étape suivante ». | Typology (4,90 € dans le panier latéral) | `/panier/` | Faible (déjà 5,90 € sur la fiche) | Oui. Garder ce que la fiche fait déjà et le répéter au panier. |
| 9 | Achat par occasion avec date limite affichée sur la pièce : « commandez avant le … pour l'avoir le … », avec un encart qui explique pourquoi (fabrication à la main, maquette). | Asphalte (« plus que 8 jours », livraison 1 – 15 janvier, « Pourquoi la précommande ? ») | `/occasions/noel/`, `/occasions/fete-meres/`, fiche | Moyen | Oui. Une seule couleur pour l'urgence (`--gravure`), pas de compteur inventé : afficher un nombre de commandes seulement s'il est réel. |
| 10 | Fiche technique illustrée : photo à plat de la pièce avec la zone gravable cotée, tableau de mesures, poids, matière. | Peg and Awl (pièces numérotées 1 à 5, tableau de mesures) | Fiche, bloc « Fiche technique » | Moyen (mesures et photo à faire à l'atelier) | Oui. C'est la fiche technique prévue par le brief (n° de pièce, matière, dimensions, zone gravable). Filets fins, Courier Prime. |
| 11 | Avis avec la date de l'avis, la pièce achetée et, si besoin, une réponse signée Christophe ou Laetitia. Note chiffrée au lieu d'étoiles. | Le Slip Français (date de l'avis et de l'expérience, réponse de la marque) | `/avis/` et bloc avis de la fiche | Faible | Oui. Le brief garde les avis Facebook nommés et datés et interdit les étoiles décoratives : écrire « 16 avis, 100 % recommandent » en texte. |
| 12 | Gravure proposée en option repliable sur les pièces vendues sans configurateur (« Graver un prénom : + x € »). | Le Slip Français (broderie +6 €), Peg and Awl (sans gravure / nom / citation) | Fiches bijoux et accessoires (`/boutique/bijoux/`) | Moyen | Oui. |
| 13 | Ajouter une gravure ou un emballage depuis la ligne du panier, sans revenir à la fiche. | Opinel | `/panier/` | Moyen | Oui, si l'emballage existe à la boutique [À COMPLÉTER : emballage cadeau proposé ?]. |
| 14 | Barre d'achat collante sur mobile avec le prix à jour (pièce + options). | Atelier Tuffery (« Acheter 149,00 € »), Opinel | Fiche en 390 px | Faible | Oui. Fond `--brule`, texte blanc, prix en Big Shoulders ; une seule barre, pas de bouton flottant « Appeler » (retiré par le brief). |
| 15 | Montrer la fabrication par des photos de mains au travail et une journée portes ouvertes ou une démonstration annoncée (marché, salon). | Peg and Awl (mains sur l'établi au premier écran), Atelier Tuffery (visites guidées) | Accueil, `/atelier/` | Moyen (séance photo à l'atelier) | Oui. Vraies photos seulement, pas d'images générées. |

## Pratiques à éviter vues chez eux

| # | Pratique | Où | Pourquoi l'éviter |
| --- | --- | --- | --- |
| 1 | Bandeau cookies sans bouton « Refuser » au premier niveau : le refus est caché derrière « Préférences » ou « Personnaliser ». Chez Typology et Asphalte, les cases statistiques et marketing sont déjà cochées dans ce second écran. | Typology, Asphalte, Mapiful (Cookiebot) | Contraire aux recommandations de la CNIL (refuser doit être aussi simple qu'accepter). Le nouveau site n'affiche aucun bandeau : tant qu'il reste sans traceur publicitaire ni statistique, il n'en a pas besoin. |
| 2 | Pages d'accueil très lourdes (vidéos, carrousels, scripts tiers) : 23,6 Mo chez Opinel et 41 Mo chez Tuffery en médiane, 420 requêtes chez Le Slip Français. | Opinel, Atelier Tuffery, Le Slip Français | Sur mobile, le contenu principal arrive après 14 s ou plus (voir la synthèse Lighthouse). Un client d'Auchel en 4G attend. |
| 3 | Remises partout et en permanence : prix barré sur tout le catalogue, bandeau de remise, paliers par quantité, fenêtre de réduction à l'arrivée. | Mapiful (−25 %, pastille et bandeau), Le Slip Français (−50 %, −20 % supp, paliers, −20 % contre inscription), Atelier Paulin (bulle −10 €) | Brouille le vrai prix et contredit un ton factuel. Mon Truc en Bois affiche des prix fixes : les garder lisibles. |
| 4 | Éléments flottants posés sur les boutons d'achat : bulle « assistant », bulle de remise, bulle d'aide. | Atelier Paulin (la bulle cache une partie du bouton « Choisir ma taille », `configurateur-apercu-1440.jpg`), Opinel | Gêne le geste principal, surtout sur téléphone. Le brief retire déjà le bouton flottant « Appeler ». |
| 5 | Rangées de 4 ou 5 pictos de réassurance au-dessus du pied de page. | Opinel, Atelier Paulin, Le Slip Français, Atelier Tuffery | Interdit par le brief, et elles répètent des informations déjà données sur la fiche. |
| 6 | Frais de port renvoyés « à l'étape suivante » ou absents du panier. | Asphalte, Atelier Tuffery, Le Slip Français, Mapiful, Peg and Awl | Le client découvre le coût réel au paiement. Mon Truc en Bois peut l'afficher dès le panier (5,90 € ou retrait gratuit). |
| 7 | Obliger à cliquer une taille alors qu'il n'y en a qu'une, avec message d'erreur sinon. | Asphalte (« TU ») | Un clic inutile et une erreur qui n'en est pas une. Sur MTB : présélectionner la taille par défaut (déjà le cas avec « Moyenne »). |
| 8 | Long texte de référencement en bas d'accueil qui répète les mêmes mots-clés. | Atelier Tuffery (13 fois « jean(s) français » ou « made in France ») | Illisible pour un humain et contraire au ton du brief. Mieux vaut des pages par occasion bien titrées. |

## Comparaison avec le nouveau site (aperçu)

Relevé du 24/10/2026 sur https://mon-truc-en-bois.pages.dev : accueil, fiche « Planche apéro gravée », panier vide. Captures dans `audit/benchmark/ecommerce/mtb-apercu/`.

Ce qu'il fait déjà aussi bien ou mieux :
- Le configurateur est au premier écran de l'accueil (texte, pièce, police, aperçu). Aucun des 8 sites ne met la personnalisation au premier écran de l'accueil ; Mapiful s'en approche avec un bouton vers l'éditeur.
- Les polices sont montrées avec un mot réel (« Marie ») et un nom compréhensible (Atelier, Classique, Machine à écrire, Manuscrite). Opinel montre seulement « Ab » dans 4 styles.
- La fiche affiche retrait gratuit, livraison 5,90 € offerte dès 60 € et mode de paiement à côté du bouton. Asphalte, Tuffery, Le Slip Français et Mapiful repoussent les frais au paiement.
- Le numéro de pièce et la police machine à écrire pour les données produit rejoignent ce que fait Typology (code produit, texte à chasse fixe).
- Pas de bandeau cookies affiché, pas de bande de pictos, pas de remise : ce que la liste « à éviter » reproche aux autres.
- Lighthouse mobile : score 84, LCP 1,9 s, pour une page de 462 Ko. C'est le seul des 9 sites mesurés au-dessus de 60 en médiane.

Ce qui lui manque :
- Un aperçu réaliste : l'aperçu actuel est une planche dessinée avec la mention « aperçu indicatif » (`mtb-apercu/fiche-1440.jpg`), là où Opinel et Atelier Paulin posent le texte sur la vraie pièce (idée 1).
- Les faits de la fiche : délai, maquette, matière, dimensions, zone gravable et entretien sont encore `[À COMPLÉTER]`. Sans délai, pas de date de livraison ni de date limite par occasion (idées 5, 9, 10).
- Le récapitulatif chiffré pièce + options et la barre vers la livraison offerte au panier (idées 3, 7).
- Les photos de l'atelier et des mains au travail, et un bloc « venir à l'atelier » (idées 6, 15).
- Le CLS mobile de l'accueil (0,282) dépasse la cible du brief (moins de 0,1) : à corriger avant la mise en ligne.

## Limites de ce relevé

- Cookies : refusés par le bouton « Refuser » ou « Tout refuser » quand il existe au premier niveau (Opinel, Atelier Paulin, Peg and Awl, Atelier Tuffery), par « Continuer sans accepter » (Le Slip Français), par le bouton « Refuser » du second écran Cookiebot (Typology, Asphalte, Mapiful), et par « Preferences » puis « Save preferences » sans rien cocher (Grovemade, écarté). Lighthouse, lui, mesure la page sans répondre au bandeau.
- Les captures pleine page sont prises après un défilement pour charger les images. Les éléments collants (en-tête, colonne d'achat) peuvent apparaître une seule fois ou laisser un blanc sur la longueur : ce n'est pas un défaut du site.
- Panier d'Atelier Paulin relevé vide (le bijou demande un prénom et une taille). Panier de Mapiful avec l'affiche proposée par défaut (Paris). Frais de port réels jamais relevés : aucun site n'a été suivi jusqu'à l'étape de livraison, qui demande une adresse.
- Peg and Awl est américain : prix convertis en euros par le site, livraison offerte réservée aux États-Unis.
- Lighthouse 12.8.2, profil mobile par défaut, catégorie performance, 3 mesures par site le 24/10/2026 sur le même ordinateur, l'une après l'autre. Le rapport gardé dans chaque dossier est la mesure médiane (score du milieu). Les écarts entre mesures sont notés dans la synthèse.
