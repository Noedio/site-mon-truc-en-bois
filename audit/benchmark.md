# Benchmark : grille remplie

But : comparer le site actuel de Mon Truc en Bois à 3 concurrents locaux et à 3 sites de référence, sur les mêmes critères que la grille d'audit du brief. Les références ne sont pas des concurrents : on les regarde pour la façon de montrer un savoir-faire, de raconter la fabrication et de vendre sans template.

Règles :
- Une ligne remplie = une observation vérifiable (capture, URL, prix relevé, date du relevé).
- Captures en 1440 px et 390 px, rangées dans `audit/benchmark/<site>/` (dossier créé au moment du relevé).
- Rien n'est recopié mot pour mot : on note ce qu'on observe, pas le texte du site.
- Notes de 1 (faible) à 5 (excellent), comme dans `audit/RAPPORT.md`. « — » : critère sans objet pour ce site.
- Ce qu'on n'a pas pu relever s'écrit `[À COMPLÉTER : …]`.

Date de tous les relevés : 24/10/2026. Relevé par : Claude (session benchmark), sans compte créé, sans formulaire rempli, sans rien ajouter au panier, cookies non essentiels refusés quand le site le permet.

## Les 6 sites

| # | Site | Type | URL | Date du relevé | Relevé par |
| --- | --- | --- | --- | --- | --- |
| C1 | Hibrido (La Couture, près de Béthune) | Concurrent local | https://www.hibrido.fr/ | 24/10/2026 | Claude (benchmark) |
| C2 | LTBZ Création (Côte d'Opale, Pas-de-Calais) | Concurrent local | https://ltbz-creation.com/ | 24/10/2026 | Claude (benchmark) |
| C3 | Jolibois Déco-Cadeaux (Saint-Martin-lez-Tatinghem, près de Saint-Omer) | Concurrent local | https://sites.google.com/view/joliboisdco-cadeaux/accueil | 24/10/2026 | Claude (benchmark) |
| R1 | Coutumes | Référence | https://coutumes.com/fr | 24/10/2026 | Claude (benchmark) |
| R2 | Polène | Référence | https://www.polene-paris.com/ | 24/10/2026 | Claude (benchmark) |
| R3 | Heyday Canning | Référence | https://heydaycanning.com/ | 24/10/2026 | Claude (benchmark) |
| — | Mon Truc en Bois (actuel) | Notre site | https://noedio.github.io/site-mon-truc-en-bois/ | 24/10/2026 | audit |

### Pourquoi ces trois concurrents

La recherche web n'a trouvé aucune boutique de gravure laser qui vende en ligne à Auchel, Bruay-la-Buissière, Lillers, Lens ou Arras. Les trois retenus sont les plus proches qui aient un site public, et aucun n'a la même offre que Mon Truc en Bois. Distances à vol d'oiseau, estimées : à confirmer sur une carte.

| # | Distance d'Auchel | Pourquoi on le retient | Limite |
| --- | --- | --- | --- |
| C1 Hibrido | environ 20 km (La Couture, Pas-de-Calais) | Le plus proche. Atelier de gravure laser sur bois et plexiglas et d'impression UV, qui cite Béthune et Lens parmi ses zones d'intervention. Il a de vrais clients du coin. | C'est d'abord une agence web et print. Pas de boutique en ligne : tout passe par un rendez-vous ou un devis. |
| C2 LTBZ Création | environ 70 km (atelier « Côte d'Opale », siège dans les CGV à Wailly-Beaucamp, Pas-de-Calais) | Le seul des trois qui vende en ligne : boutique avec prix, panier, verres et objets en bois gravés avec prénom. Même type d'offre que la boutique en ligne visée. | Atelier d'une personne, pas de planches ni de plaques de naissance au catalogue (21 articles vus). Pas de retrait sur place. |
| C3 Jolibois Déco-Cadeaux | environ 55 km (centre commercial Carrefour de Saint-Martin-lez-Tatinghem) | Boutique-atelier de cadeaux personnalisés et de gravure (verre, miroir, bois), avec des pièces de naissance, mariage et fêtes des mères comme Mon Truc en Bois. Même clientèle de proximité. | Site vitrine sur Google Sites : pas de prix, pas de panier. On y vient en boutique. |

Pistes vues et écartées : AD Gravure (Biache-Saint-Vaast, près d'Arras : annuaire seulement, site non trouvé), La French Fabrik (pages par ville qui semblent génériques), Techni-Grav et Gravure Laser Concept (ville inconnue), ateliers hors région (Ariège, Jura, Lyon, Lille pour les pros uniquement).

**À compléter avec Christophe et Laetitia** : ils pourront citer d'autres concurrents locaux, en particulier ceux qu'ils croisent sur les marchés et les salons, et ceux dont on n'a vu que le nom (question 14 de `audit/RAPPORT.md`). Si l'un d'eux vend en ligne avec des planches ou des plaques de naissance, il remplace C3 ou s'ajoute à la grille.

### Pages relevées

| # | Accueil | Page produit ou équivalent |
| --- | --- | --- |
| C1 | `hibrido.fr/` (agence). Page atelier à part : `hibrido.fr/notre-atelier/` | `hibrido.fr/numeros-de-table-bois-gravure-laser/` : article sur des numéros de table en rondin gravé. Pas de fiche produit : il n'y a pas de boutique. |
| C2 | `ltbz-creation.com/` | `ltbz-creation.com/product/verre-vin-grave-personnalise/` : verre gravé avec prénom, le plus proche d'une pièce à personnaliser. |
| C3 | `…/joliboisdco-cadeaux/accueil` | `…/joliboisdco-cadeaux/cadeaux-saint-omer` : page « idées cadeaux et gravures ». Pas de fiche produit. |
| R1 | `coutumes.com/fr` | `coutumes.com/fr/products/create-your-own` : le Souvenirs Club, configurateur de collier avec gravure laser. Choisi parce que c'est la seule fiche personnalisable des trois références. |
| R2 | `polene-paris.com/` | `polene-paris.com/products/cyme-mini-textured-camel` : sac Cyme Mini, fiche typique. |
| R3 | `heydaycanning.com/` | `heydaycanning.com/products/tomato-alla-vodka-cannellini-beans` : boîte de haricots, fiche typique. |

Les captures sont dans `audit/benchmark/<site>/` : `accueil-1440.png`, `accueil-390.png`, `fiche-1440.png`, `fiche-390.png` (plus `atelier-1440.png` et `atelier-390.png` pour C1) et `lighthouse-accueil-mobile.report.json`. Dossiers : `c1-hibrido`, `c2-ltbz-creation`, `c3-jolibois`, `r1-coutumes`, `r2-polene`, `r3-heyday-canning`.

## 1. Premier écran et message

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ce qu'on comprend en 5 secondes (qui, quoi, où) | Une agence de communication web et print. L'atelier de gravure est un pôle parmi cinq, plus bas. Le lieu (Béthune) vient dans le texte de la page. | Un atelier de gravure laser personnalisable, sur la Côte d'Opale. Une phrase d'accroche défile sur une bannière sombre. | Une boutique de cadeaux personnalisés et de gravure en Audomarois. Quoi et où sont dits en texte dès le titre. | Une marque de bijoux pour homme. Le titre du premier écran parle de la collection du moment, pas de la marque. | Une maison de sacs en cuir. Le nom, un sac porté en campagne et une carte produit avec prix. | Une marque de conserves et un plat prêt. Le titre parle du dîner, pas de la boîte. | Une boutique de personnalisation à Auchel. Le titre en jeu de mots ne dit pas ce qu'on vend ; le sous-titre le dit. |
| Produit ou atelier visible au premier écran (oui / non, lequel) | Non : un visuel abstrait et le logo. | Oui : une toile gravée (martin-pêcheur) en fond, des créations plus bas. | Non : photo floue de l'intérieur de la boutique en bandeau. | Oui : photos portées, un bracelet à l'écran. | Oui : un sac porté, et le sac Cyme Mini avec son prix. | Oui : un plat de pâtes. La boîte n'apparaît qu'en dessous. | Oui : 3 pièces gravées (planche, verres, planche avec chevaux). |
| Action principale proposée (libellé du bouton) | « Planifier un rendez-vous », « Nous contacter », bouton avec le téléphone. | « Découvrir les créations ». | Un lien vers les idées cadeaux de la fête des mamies. | Aucun bouton au premier écran ; le menu propose « Personnaliser ». Une fenêtre propose la livraison offerte contre un e-mail. | Aucun bouton au premier écran ; « Ajouter au panier » sur la fiche. | « Find a store » (« Trouver un magasin »). | « Découvrir la boutique » et « Demander un devis ». |
| Le lieu de fabrication est-il dit ? | Oui : La Couture, Pas-de-Calais, au pied de page et dans le texte. | Oui : « Côte d'Opale », en titre. | Oui : Saint-Martin-lez-Tatinghem, près de Saint-Omer. | Oui, sur la fiche : pendentifs fabriqués en Toscane. Pas sur l'accueil. | Oui, sur la fiche : confection par des artisans d'Ubrique, en Espagne. | Non sur l'accueil. | Oui : Auchel, dans l'en-tête et le sous-titre. |
| Note 1-5 | 2 | 3 | 3 | 4 | 4 | 4 | 3 |

## 2. Identité visuelle

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Polices (nombre, style) | 3 familles de marque : une condensée en capitales, une très grasse, une serif d'accent. Plus Open Sans sur l'article. | 6 familles : Montserrat, DM Sans, Poppins, Playfair Display, Unna, Satisfy (manuscrite). | 2 : Lato pour les titres, Arial pour le texte (réglages de Google Sites). | 2 : une grotesque condensée en capitales (orange sur les photos) et une serif d'affichage. | 3 familles nommées « principale, secondaire, tertiaire » : serif fine en capitales et texte courant fin. | 3 : une grotesque extra-large, une serif (GT Alpina) et une sans maison. | 3 affichées (Bricolage Grotesque, Figtree, Caveat), 5 chargées. |
| Palette (couleurs dominantes, accent) | Blanc, jaune vif en accent, brun et violet doux. | Noir et or, effet lumineux sur les cadres. | Blanc, un bleu-vert pour les titres, photo sombre en bandeau. | Blanc et noir, un jaune-orange saturé pour les titres et le pied de page. | Blanc et noir ; les couleurs viennent des photos (cuir caramel, crème, tons de paysage). | Crème, vert olive, orange, jaune vif. | Vert forêt `#24453a` et bois `#a8693a`, plus le jaune des étoiles. |
| Motifs de template repérés (pictos de réassurance, cartes arrondies, dégradés…) | Thème Divi : bandeaux en dents de scie, cartes blanches, boutons arrondis, dégradé orangé sur le titre de l'article. | Trois pictos de réassurance (paiement, envoi, service), cadres aux bords lumineux, boutons dorés arrondis. | Gabarit Google Sites : emojis dans les titres de paragraphes, grand bandeau photo. | Bande de 4 mentions de service en petites capitales, sans pictos. Une fenêtre d'inscription e-mail. | Aucun repéré. Pas de bande de réassurance, pas de carte arrondie. | Pas de picto. Cartes en polaroïd, carrousels. | Bande de 4 pictos de réassurance, cartes arrondies, dégradés sombres, bouton flottant « Appeler ». |
| Ce qui le rend reconnaissable | Le jaune et le logo manuscrit. Le reste suit le thème. | Le fond noir et l'or, très marqués, sur tout le site. | Rien : la mise en page est celle de Google Sites. | Les titres en capitales orange posés sur les photos et le grand mot « COUTUMES » en pied de page. | Le blanc, la photo de campagne en plein écran et les capitales fines. | Les capitales extra-larges sur fond crème, les boîtes en vedette, un ton de voix drôle. | Le logo et les vraies photos de pièces. Le reste est interchangeable (verdict de l'audit). |
| Note 1-5 | 3 | 3 | 1 | 5 | 5 | 5 | 1 |

## 3. Photos

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fond et lumière (unique ou variés) | Variés : objets sur tables, fonds colorés, lumière d'atelier. | Variés : verre sur une table de jardin, pièces sur fonds noirs ou clairs. | Photos de gravures sur fond noir, photo de boutique floue en bandeau. | Un seul parti pris : lumière naturelle, tons sobres, peau et tissus. | Un seul parti pris : campagne en paysage, lumière douce ; produit détouré sur fond blanc sur la fiche. | Un seul parti pris : boîtes détourées sur fond neutre, plats colorés sur nappes. | Variés : mur végétal artificiel, planches grises, voilage, toile de jute, fond blanc. Carte de visite dans environ 20 photos. |
| Cadrage (carré, détourné, mis en scène) | Mis en scène (rondin avec décor de table) ; carrés dans la grille. | Mis en scène et détourné (verre sur table) ; vignettes carrées. | Photos de pièces gravées, cadrées de près ; texte et images séparés. | Mis en scène (portés) et détourné (charms sur fond blanc, 4 rangées). | Mis en scène (campagne) et détourné (sac seul), fiche en 2 colonnes. | Détourné (boîte seule) et mis en scène (plats, polaroïds). | Carré 800 × 800, pièce posée, cadre variable. |
| Photos de fabrication ou d'atelier | Oui : la page atelier montre machines et pièces en cours. | Oui : une vidéo de fabrication est annoncée sur l'accueil, photo de l'artisan. | Non : seulement l'intérieur de la boutique, floue. | Oui : photos de l'émail posé à la main et de l'atelier. | Non d'atelier ; photo aérienne du village d'Ubrique pour le savoir-faire. | Non. | Non : aucune photo de l'atelier, de la machine ni de Christophe et Laetitia. |
| Nombre de photos par fiche produit | 1 (article) | 5 vignettes | 3 | Une dizaine de visuels éditoriaux sur la page du configurateur | 6 vignettes de coloris et de vues, plus 3 grandes photos portées | 2 vignettes (boîte, plat) plus une photo « à marier avec » | 1 |
| Note 1-5 | 2 | 3 | 2 | 5 | 5 | 5 | 2 |

## 4. Personnalisation et fiche produit

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aperçu en direct du texte (oui / non) | Non. | Non : la photo du modèle reste fixe, le prénom se tape dans un champ. | Non : la gravure se fait sur place en boutique. | [À COMPLÉTER : le configurateur a un champ de gravure avec compteur de caractères ; l'aperçu n'a pas été testé] | — | — | Oui : texte posé sur la photo, mais l'effet ne ressemble pas à une gravure. |
| Choix de police, de taille, de matière | Au cas par cas selon la demande : essence du bois et dimensions à discuter. | Modèle de phrase (5), couleur de gravure blanche ou noire, 1 ou 2 verres. Pas de choix de police. | Non précisé. | Matière (argent 925, doré, cuir, tissu), chaîne et longueur, charms par catégorie, pierres. | Coloris du sac (6 vignettes). | — | 4 polices, 2 tailles (« Moyenne / Grande + 8 € »), pas de matière. |
| Maquette envoyée avant fabrication (dit ou non) | Non dit. | Pour les projets sur mesure : réponse en 24 h avec une simulation visuelle. Sur la fiche : non dit, et les CGV prévoient d'ajuster la police. | Non dit ; on voit le résultat sur place. | Non : les pièces gravées ne sont ni reprises ni échangées. | — | — | Dit de deux façons : « validée avant toute fabrication » (accueil), « si besoin » (fiche). |
| Fiche technique (matière, dimensions, zone gravable, entretien) | Dimensions du rondin (environ 8 cm de diamètre, 1,5 cm d'épaisseur) et choix d'essences. | Matière, contenance (50 cl), type de gravure, origine. Pas de zone gravable ni d'entretien. | Non. | Matières, pierres, longueurs de chaîne, lieu de fabrication. Pas de zone gravable. | Onglets Détails, Matières, Livraison et retours ; [À COMPLÉTER : contenu replié, non lu]. | Ingrédients et nutrition, repliés ; pas de dimensions. | Non : aucun produit n'a de matière ni de dimensions. |
| Délai de fabrication affiché | Non. | Pas sur la fiche. CGV : 48 h ouvrées avant expédition, livraison jusqu'à 30 jours ouvrés. | « Sans délai » : gravure sur place en boutique. | Oui, sur la page : 72 h de plus pour les pièces gravées. Livraison standard d'environ 6 jours (FAQ). | [À COMPLÉTER : page livraison protégée, non lue] | — | Non : le champ existe mais vaut 0 pour les 27 produits. |
| Temps pour personnaliser un objet (chronométré, en s) | [À COMPLÉTER : à chronométrer en test avec un humain] | 4 choix à faire : modèle, couleur, prénom, quantité. [À COMPLÉTER : non chronométré] | — | Parcours en plusieurs étapes. [À COMPLÉTER : non chronométré] | — | — | [À COMPLÉTER : tâche 2 de `audit/test-utilisateurs.md`] ; 3 actions au premier écran sur PC, écriture à l'aveugle sur téléphone. |
| Note 1-5 | 1 | 3 | 1 | 4 | — | — | 3 |

## 5. Prix et parcours d'achat

Notes données sans passer commande : rien n'a été ajouté au panier.

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fourchette de prix d'un objet comparable (planche, plaque) | Pas de prix. Le modèle de rondin est vendu sur une autre boutique de la même agence, non visitée. | Verre gravé 14 €. Boîte à bijoux bois gravée 30 €, tirelire 30 €, décoration murale à partir de 12 €. Pas de planche ni de plaque. Le lot de 2 verres est à 26 € dans la description, +11 € dans l'option : les chiffres diffèrent. | Pas de prix sur le site. Texte : des cadeaux gravés dès 5 € en boutique. | Chaînes de collier de 60 à 80 € dans le configurateur, avant les charms. | Sac Cyme Mini 390 € ; autres modèles vus de 440 à 480 €. | Pack de 4 boîtes à 20 $ (site américain). Pas de prix à la boîte sur la fiche. | Planche apéro 24,90 €, plaques à message ou de naissance de 29,90 à 39,90 €. |
| Frais de livraison et seuil de gratuité | — | « Frais de port » en plus, offerts dès 80 €. [À COMPLÉTER : montant des frais, visible seulement au panier] | — | Offerte dès 150 € et sur la première commande (contre un e-mail). Colissimo standard environ 6 jours, express 48 h, relais environ 5 jours. | [À COMPLÉTER : page livraison protégée par un contrôle anti-robot] | [À COMPLÉTER : non trouvé sur l'accueil, la fiche ni la FAQ] | 5,90 €, offerte dès 60 € (`data/donnees.js`). |
| Retrait sur place proposé | Oui, à l'atelier, du lundi au vendredi de 9 h à 17 h (prise de rendez-vous). | Non d'après les CGV : Mondial Relay ou Colissimo. | Oui : on passe en boutique, du lundi au samedi de 9 h à 19 h. | Une boutique physique (page « Boutique »), adresse non relevée sur le site ; [À COMPLÉTER : retrait d'une commande en ligne] | Boutiques listées ; [À COMPLÉTER : retrait d'une commande en ligne] | — (vente en magasins) | Oui, gratuit à Auchel ; mais la livraison est cochée par défaut au panier. |
| Modes de paiement | Sur devis. | Carte (logos Visa, Mastercard, Amex, Discover) ; Stripe et PayPal cités sur l'accueil. | En boutique. [À COMPLÉTER : modes acceptés] | Paiement en 3 fois avec Alma annoncé. [À COMPLÉTER : le reste] | Visa, Mastercard, PayPal et un quatrième logo illisible, en pied de page. | [À COMPLÉTER : non relevé] | Prévus : carte (Stripe), après validation de maquette, en boutique. Rien d'actif en ligne (mode aperçu). |
| Nombre d'étapes du panier à la confirmation | [À COMPLÉTER : sans objet, pas de panier] | [À COMPLÉTER : non testé] | — | [À COMPLÉTER : non testé] | [À COMPLÉTER : non testé] | [À COMPLÉTER : non testé] | 3 étapes ; l'envoi est refusé à la fin (« site en construction »). |
| Achat par occasion ou date limite (fête des mères, Noël) | Un article sur des numéros de table de mariage. Pas de date limite. | Une bannière « édition Halloween » en tête d'accueil et des idées par occasion dans la fiche. Pas de date limite. | Pages « fête des mamies » et « Saint-Valentin » dans le menu. Pas de date limite. | Collection du mois (« édition d'octobre »), carte cadeau, sac cadeau à 5 € proposé dans le panier. | Campagne de saison, sans date limite. | — | Occasions sur l'accueil ; date de l'occasion dans une étape facultative, sans contrôle du délai. |
| Note 1-5 | 1 | 3 | 1 | 4 | 4 | 3 | 2 |

## 6. Confiance et légal

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Avis clients (source, nombre, nommés et datés) | 30 avis Google annoncés (5/5) pour l'agence ; témoignages nommés avec l'entreprise, non datés. | Onglet « Avis (0) » sur la fiche : aucun avis. | Une invitation à laisser un avis Google ; aucun avis affiché. | Aucun avis relevé sur l'accueil ni sur la fiche. | Aucun avis relevé sur la fiche. | 4,83/5 sur 6 avis, prénoms et initiales, âge relatif (« il y a 8 mois »), badge « recommande », outil d'avis tiers. | 10 avis Facebook nommés et datés, 100 % de recommandation sur 16 avis ; étoiles sans note derrière. |
| Personnes nommées (artisans, équipe) | La fondatrice est nommée sur l'accueil. | L'exploitant est nommé dans les CGV ; la page « à propos » raconte son parcours à la première personne. | Non. | [À COMPLÉTER : page « À propos » non lue en entier] | Fondation par trois frères et sœurs, non nommés ; artisans d'Ubrique cités en nombre (2 200), sans noms. | Non : le texte parle de « nous ». | « Christophe et Laetitia » en citation sur l'accueil (non validée par l'atelier). |
| CGV et mentions légales complètes | Mentions légales, confidentialité et cookies en pied de page. CGV : sans objet, pas de vente en ligne. | CGV lues : statut d'entrepreneur individuel, SIRET, TVA non applicable (article 293 B), délais, livraison, rétractation exclue pour les pièces personnalisées, médiateur. Elles disent aussi que des outils d'IA aident à générer certains motifs. | [À COMPLÉTER : pas de page de mentions légales repérée dans le menu visible] | Liens CGV, retours et mentions légales en pied de page. [À COMPLÉTER : lecture des textes] | Liens CGV, mentions légales, confidentialité en pied de page. [À COMPLÉTER : lecture des textes] | Pas de lien vers des CGV dans le pied de l'accueil (shop, about, FAQs, press, wholesale…). | Mentions et CGV incomplètes : SIRET, forme juridique, TVA, médiateur manquants. |
| Contact direct (téléphone, adresse, horaires) | Téléphone, adresse et horaires (lundi au vendredi, 9 h à 17 h). | Téléphone et e-mail sur la page contact ; pas d'adresse d'atelier ni d'horaires. | Adresse, horaires (lundi au samedi, 9 h à 19 h), téléphone, e-mail. | Page contact et FAQ ; [À COMPLÉTER : adresse et horaires de la boutique] | Aide, boutiques ; [À COMPLÉTER : coordonnées du service client] | Une adresse e-mail en pied de page. | Téléphone (4 fois sur l'accueil), adresse et horaires exacts. |
| Note 1-5 | 3 | 4 | 2 | 3 | 3 | 4 | 2 |

## 7. Commandes pro et séries

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Parcours devis visible (où, libellé) | Oui : « Demande de devis » et « Prendre rendez-vous » dans le menu et le pied de page. L'offre pro est la cible. | Oui : page « Créations sur mesure » et bouton « Discuter de mon projet ». | Pas de formulaire ; cadeaux d'entreprise, trophées d'association et plaques funéraires listés, contact par téléphone ou en boutique. | Non repéré. | Non repéré. | « Wholesale » vers une plateforme tierce, pour les revendeurs. | « Demander un devis » au premier écran, et formulaire « Demande de devis » sur la page contact. |
| Envoi de logo ou de fichier possible | [À COMPLÉTER : non vu] | Oui, par e-mail : JPG, PNG ou PDF, avec des conseils sur la netteté des fichiers. | Non. | — | — | — | Non : pas de champ fichier dans le formulaire de devis. |
| Délai de réponse annoncé | « On vous rappelle dans la journée » (page atelier). | 24 h, avec une simulation visuelle et un devis. | Non. | — | — | — | « Sous 48 h » annoncé, non validé par l'atelier ; le formulaire est bloqué en mode aperçu. |
| Note 1-5 | 4 | 4 | 2 | — | — | 3 | 2 |

## 8. Technique (mesures Lighthouse mobile, page d'accueil)

Lighthouse 12, profil mobile par défaut, catégorie performance, une seule mesure par site le 24/10/2026, sur le même ordinateur que la mesure de MTB actuel, mais pas au même moment. Les scores varient de quelques points d'une mesure à l'autre ; sur les sites très lourds l'écart peut être plus grand. À lire comme un ordre de grandeur. Rapports : `audit/benchmark/<site>/lighthouse-accueil-mobile.report.json`.

| Critère | C1 | C2 | C3 | R1 | R2 | R3 | MTB actuel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Score performance | 30 | 52 | 43 | 42 | 28 | 55 | 79 |
| LCP (s) | 7,8 | 14,7 | 22,5 | 11,8 | 32,3 | 18,0 | 3,8 |
| CLS | 0,051 | 0,033 | 0,003 | 0 | 0 | 0 | 0 |
| Poids de la page (Ko) | 2 842 | 2 553 | 3 343 | 2 438 | 8 193 | 4 699 | 1 348 |
| Plateforme (Shopify, WooCommerce, Wix, sur mesure…) | WordPress, thème Divi | WordPress, Elementor, WooCommerce | Google Sites | Shopify | Shopify | Shopify | statique sur mesure |

Les valeurs « MTB actuel » viennent de `audit/mesures/lighthouse-accueil-mobile.report.json` (24/10/2026).

À retenir : aucun des 6 sites ne dépasse 55. Le site actuel de Mon Truc en Bois, à 79, est plus rapide que les 6. La cible du brief (90 et plus) reste hors de portée des références : on ne la prend pas sur elles.

## Ce qu'on retient

| Idée observée | Site | Applicable chez MTB ? | Lot de la refonte concerné |
| --- | --- | --- | --- |
| Dire le délai au moment où on ajoute la gravure : le configurateur prévient que la pièce gravée prend 72 h de plus et qu'elle n'est pas reprise. | R1 Coutumes | Oui. Il faut le délai réel de chaque famille de produits (questions 1 et 2 du rapport). | 3 (configurateur et fiche), 2 (champ délai) |
| Afficher les délais sur la fiche et pas seulement dans les CGV. LTBZ les écrit (48 h ouvrées, livraison jusqu'à 30 jours) mais dans un texte légal, donc peu lu. | C2 LTBZ | Oui. C'est le point que le rapport classe en action 2. | 3, 7 (textes légaux) |
| Proposer des modèles de phrases à compléter (« Le meilleur apéro, c'est chez [prénom] ») à côté du texte libre. | C2 LTBZ | Oui, avec les phrases que Christophe et Laetitia vendent déjà. Réduit le temps pour personnaliser. | 3 |
| Parcours devis avec envoi de fichier et délai de réponse annoncé, plus des conseils sur la netteté du logo. | C2 LTBZ | Oui. Le formulaire actuel n'a pas de champ fichier, et « sous 48 h » reste à valider. | 4 (panier et commandes) |
| Raconter la fabrication avec une photo du geste et du lieu, pas avec des pictos : l'émail posé à la main (Coutumes), le village des maroquiniers (Polène). | R1 Coutumes, R2 Polène | Oui, mais il faut la séance photo : atelier, machine laser, mains qui travaillent (action 8 du rapport). | 7 (pages éditoriales), 1 (tokens) |
| Fiche produit en deux colonnes : informations collées à droite, photos qui défilent à gauche, détails repliés (« Conçu avec minutie », « Envoyé avec soin »). Sert de modèle pour la fiche technique (matière, dimensions, entretien). | R2 Polène | Oui. Une pièce vierge, une pièce gravée et un détail suffisent pour trois photos. | 3 |
| Avis en entier : note, répartition, prénom, ancienneté, mention « recommande ». MTB a déjà 10 avis Facebook nommés et datés ; on les montre ainsi, sans étoiles inventées. | R3 Heyday | Oui. | 7, 3 (bloc d'avis sur la fiche) |
| Aucun concurrent local relevé ne montre un aperçu en direct, un prix de planche ou de plaque, ni un délai. MTB peut se distinguer sur ces trois points et sur le retrait gratuit à Auchel. | C1, C2, C3 | Oui. C'est l'argument à porter à Christophe et Laetitia. | 2, 3 |

## Limites de ce relevé

- Une seule mesure Lighthouse par site (voir §8). Pas de mesure sur ordinateur.
- Aucun panier, aucun compte, aucun formulaire : les lignes « étapes du panier » et « frais de livraison » sont donc souvent à compléter.
- Cookies : refusés quand le site propose un bouton de refus (C1, C2, C3 accueil, R1, R2). Sur la page de C3 « idées cadeaux », la bannière Google n'offre que « OK » : elle est restée affichée sur la capture, sans accepter. Sur R1, une fenêtre d'inscription e-mail a été fermée avec « Non merci ».
- La page de livraison de Polène est protégée par un contrôle anti-robot : non lue, non contournée.
- C1 : la page d'accueil est celle de l'agence. La page de l'atelier est dans `atelier-1440.png` et `atelier-390.png`.
- R3 : le site est américain (prix en dollars, magasins américains).
- Les notes sont un avis de l'auteur du relevé sur ce qu'on voit, à relire avec Christophe et Laetitia.
