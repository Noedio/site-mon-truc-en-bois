# Audit du code et de l'architecture : refonte, avant la mise en service

Date : 24 octobre 2026. Branche `refonte`, commit `443bb2b` (socle `a3ac895`, chantiers C2 à C9 fusionnés ensuite).
Lecture seule : aucun fichier du dépôt n'a été modifié. Les builds ont réécrit `site/dist/` et `site/public/{img,css,js,data,admin.html,admin.webmanifest}`, qui ne sont pas versionnés.

Grille : correction, sécurité, maintenabilité, performance, dette.
Priorités : **P0** bloque la mise en service · **P1** à corriger avant la bascule · **P2** à corriger dans le mois · **P3** à planifier.

Documents lus avant l'audit : `site/README.md`, `docs/technique.md`, `docs/refonte/BRIEF.md` §5, `audit/RAPPORT.md` §1.10 et §3, `docs/refonte/bascule-domaine.md`.

---

## 1. Contrôles lancés

| Contrôle | Résultat |
| --- | --- |
| `npm install` (site) | Passe. 1 vulnérabilité « high » (sharp, voir P2-3). Avertissement `EBADENGINE` : `undici@8.12.3` (dépendance d'Astro) demande Node ≥ 22.19.0, la machine a 22.17.1. |
| `npm run build` | Passe. 59 pages, `dist/_redirects` : 42 redirections. Aucun avertissement Astro ou Vite. |
| `MTB_DEMO=1 npm run build` | Passe. 59 pages, 42 redirections. Aucun avertissement. |
| `npx astro check` (`@astrojs/check` et `typescript` installés avec `--no-save`, `package.json` et `package-lock.json` inchangés) | **8 erreurs**, 0 avertissement, 15 indications. 7 erreurs viennent de l'absence de `@types/node` (`donnees.ts:5,6,120,132`, `occasions.ts:15`). 1 erreur réelle de type : `panier.astro:687`. Les 15 indications portent sur les fichiers de l'admin copiés dans `public/` (variables inutilisées, `document.write` déprécié, code mort de `demo-serveur.js`). |
| `deno test --allow-env --allow-read supabase/tests/` (Deno 2.5.6) | **27 tests passés, 0 échec.** |
| `deno bundle … outils/demo-serveur.ts` vers un dossier temporaire | Identique à `js/demo-serveur.js` commité : le bundle de démo est à jour. |
| Aperçu en ligne `https://mon-truc-en-bois.pages.dev` (requêtes HEAD) | `/suivi.html?jeton=…&payer=1` → 301 vers `/suivi/?jeton=…&payer=1` (paramètres gardés). `/produit.html?id=…` → 308 vers `/produit?id=…` puis redirection en JavaScript : fonctionne. En-têtes servis : seulement `X-Content-Type-Options` et `Referrer-Policy`. `/sitemap.xml` : 404. `/socle/`, `/demo/`, `/js/demo.js` : 200. |

Poids du JavaScript livré : 0,2 ko (en-tête) sur une page éditoriale, environ 15 ko sur une fiche produit, environ 21 ko sur le panier. L'objectif « zéro JS hors configurateur et panier » du brief est tenu, à deux petits scripts près (compteur du panier, bouton favori).

---

## 2. Constats

### P0 : bloque la mise en service

**P0-1. Le lien « Se désinscrire » des emails ne désinscrit plus personne.**
- Où : `supabase/functions/_shared/emails.ts:270-271` construit `…/newsletter.html?desinscription=1&email=…&cle=…` ; `site/scripts/redirections.mjs:23` redirige `/newsletter.html` vers `/contact/` ; aucun fichier de `site/src/` ne lit `desinscription` ni n'appelle `contact` avec `action: "desinscription"`. Vérifié sur l'aperçu : la redirection garde les paramètres, mais la page Contact les ignore.
- Impact : chaque email de campagne et chaque accusé d'inscription mène à une page qui ne fait rien. Le droit d'opposition aux emails commerciaux doit être simple et gratuit (CPCE art. L34-5, RGPD art. 21). L'article 8 des CGV (`site/src/pages/cgv.astro:89`) promet ce lien.
- Correctif : créer `src/pages/newsletter.astro` (noindex) qui lit `email` et `cle`, appelle `appelServeur("contact", { action: "desinscription", email, cle })` et affiche le résultat ; sans clé, proposer le formulaire qui déclenche l'email de confirmation. Rediriger `/newsletter.html` vers `/newsletter/` et faire pointer `lienDesinscription` vers `/newsletter/`. Tester avec un vrai lien avant la première campagne.

### P1 : avant la bascule

**P1-1. Les en-têtes de sécurité de l'ancien site ont été perdus, et l'admin partage l'origine du site.**
- Où : `site/public/_headers:1-10` ne garde que `nosniff` et `Referrer-Policy`. Le `_headers` de la racine (ancien site) avait en plus `X-Frame-Options`, `Strict-Transport-Security`, `Permissions-Policy`, et pour `/admin` et `/admin.html` : `X-Robots-Tag: noindex, nofollow` et `Cache-Control: no-cache`. Aucune CSP, ni avant ni maintenant.
- Impact : l'admin peut être affiché dans un cadre sur un autre site (risque de clic forcé sur « Publier »). La clé GitHub de l'agence (droits Contents, Secrets et Variables en écriture) est gardée dans `localStorage` sur la même origine que le site public (`js/admin.js:34-41`) : la moindre faille XSS sur le site permettrait de la lire.
- Correctif : reprendre les en-têtes de l'ancien `_headers`, ajouter `frame-ancestors 'none'` et une CSP, d'abord en `Content-Security-Policy-Report-Only`. Point de départ pour le site : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://<projet>.supabase.co; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'`. L'admin a besoin en plus de `https://api.github.com`, des polices Google (ou de polices auto-hébergées, voir P3) et d'une empreinte pour le script en ligne `window.MTB_ADMIN` ; `public/produit.html` a aussi un script en ligne. À terme, servir l'admin sur un sous-domaine séparé ou derrière Cloudflare Access.

**P1-2. Une branche mémorisée dans le navigateur passe avant celle posée par le build.**
- Où : `js/admin.js:18` met `REGLAGES.branche` dans `DEFAUT`, puis `js/admin.js:32-35` écrase `cfg` avec ce qui est gardé dans `localStorage`, branche comprise (enregistrée par `enregistrerCfg`, `js/admin.js:353-363`). Le brouillon rechargé ne vérifie pas non plus `b.depot` (`js/admin.js:285`).
- Impact : après la bascule, la production Cloudflare passe de `refonte` à `site-vitrine-boutique` sur la même origine. Un poste de l'agence qui avait coché « se souvenir » continuera de publier sur `refonte` : la publication réussit, mais le site en ligne ne change pas, sans aucun message.
- Correctif : après la lecture du stockage, forcer `cfg.branche = REGLAGES.branche` quand il est défini ; ne plus enregistrer la branche ; au rechargement d'un brouillon, l'écarter si `b.depot` ne correspond pas au dépôt et à la branche actuels.

**P1-3. L'installation du serveur ne peut pas démarrer depuis l'admin du nouveau site.**
- Où : `js/admin-installation.js:370-377` enregistre `supabase/installation.json` sur `cfg.branche`, donc `refonte` pour l'admin de l'aperçu ; `.github/workflows/supabase.yml:16-18` ne se déclenche que sur un envoi vers `site-vitrine-boutique`.
- Impact : après 4 minutes d'attente, l'admin affiche « L'installation n'a pas démarré. Vérifiez que GitHub Actions est activé », ce qui est faux. Le secret `ADMIN_MOT_DE_PASSE` reste dans GitHub jusqu'à une installation terminée (`js/admin-installation.js:226`, `:405`). Contournement possible : lancer l'installation depuis l'ancien admin (GitHub Pages), ce que `site/README.md` ne dit pas.
- Correctif : déclencher le workflow par l'API (`POST /repos/…/actions/workflows/supabase.yml/dispatches` avec `ref` et `inputs.installation`), ce qui demande Actions en écriture sur la clé de l'agence ; ou ajouter `refonte` à `branches` le temps de la refonte. Supprimer aussi `ADMIN_MOT_DE_PASSE` quand l'installation échoue ou ne démarre pas.

**P1-4. Pas de plan du site, et `robots.txt` ne l'annonce pas.**
- Où : aucun sitemap n'est produit (pas de `@astrojs/sitemap` dans `site/package.json`) ; `site/public/robots.txt:1-7` n'a pas de ligne `Sitemap:` ; l'ancien `/sitemap.xml` de la racine liste des adresses `noedio.github.io` et n'est pas copié. `docs/refonte/bascule-domaine.md`, étape 5, prévoit d'envoyer le plan du site à la Search Console.
- Impact : référencement plus lent des 27 fiches et des pages de catégories et d'occasions après la bascule.
- Correctif : ajouter `@astrojs/sitemap` en excluant `/panier/`, `/suivi/`, `/favoris/`, `/demo/`, `/demo-paiement/`, `/socle/` et `/404/` ; écrire `robots.txt` au build avec `Sitemap: ${PUBLIC_SITE_URL}/sitemap-index.xml` ; ajouter `Disallow: /admin` (Cloudflare sert l'admin sous `/admin`, `/admin.html` renvoie en 308).

**P1-5. Le parcours « maquette envoyée » puis « retouche » du brief §5 n'existe pas côté serveur.**
- Où : `supabase/migrations/20261017000000_commandes.sql:39-40` (statuts permis), `supabase/functions/_shared/outils.ts:341-349` (`STATUTS`), `supabase/functions/_shared/emails.ts:194-196` (frise des emails, 4 étapes à partir de `confirmee`). `site/src/lib/etapes.ts:4-5` le signale : l'étape « Maquette envoyée » de la frise du suivi ne peut jamais être l'étape en cours.
- Impact : l'envoi et la validation de la maquette se font hors du système (téléphone, email). Le client voit « Commande reçue, à maquetter » jusqu'à « Maquette validée ». Aucun email ne prévient le client qu'une maquette l'attend.
- Correctif : nouvelle migration qui ajoute `maquette_envoyee` (et `retouche` si l'atelier le veut) à la contrainte ; compléter `STATUTS`, les textes de `emailStatut`, la frise des emails, les filtres de l'admin des commandes et les tests ; recompiler `js/demo-serveur.js`.

**P1-6. Deux marqueurs « [À COMPLÉTER] » sont écrits en dur sur chaque fiche produit.**
- Où : `site/src/pages/produit/[id].astro:199` (« maquette envoyée au client ») et `:215` (« comment la maquette est envoyée et validée »). Le champ existe pourtant : `site.commandes.maquette`, rempli par le questionnaire et déjà lu par `site/src/pages/panier.astro:26-29`.
- Impact : 54 marqueurs dans `dist/` (sur les 27 fiches) qu'aucune réponse dans l'admin ne peut faire disparaître. Au total, 44 pages construites contiennent encore au moins un marqueur.
- Correctif : lire `commandes.maquette` (et `delaiReponse`) comme le panier. Ajouter un contrôle au build : si `PUBLIC_INDEXER=oui` et qu'il reste un `data-a-completer` dans `dist/`, lister les pages concernées, voire faire échouer le build.

### P2 : dans le mois

**P2-1. La démo part en production.**
- Où : `site/scripts/copier-medias.mjs:12-19` copie tout `js/` (dont `demo.js` et `demo-serveur.js`) ; `admin.html:148` charge `js/demo.js`, qui s'active avec `?demo=1` et le garde en mémoire (`js/demo.js:12-15`) ; les pages `/demo/` et `/demo-paiement/` sont construites dans tous les cas ; `site/src/pages/demo.astro:10-14` calcule l'adresse `demo.<domaine>`, qui donnera `demo.montrucenbois.fr`, une adresse qui n'existe pas. L'ancien `outils/construire.mjs:17-25` retirait tout cela de la production.
- Impact : un lien `…/admin?demo=1` bascule l'admin du commerçant sur des données fictives, et il y reste jusqu'à `?demo=0`. Le bouton « Ouvrir la démo » mène à une adresse morte après la bascule.
- Correctif : hors `DEMO`, ne pas copier `js/demo*.js`, retirer la balise de `admin.html` et ne pas construire `demo*.astro` (ou les rendre en 404). Donner l'adresse de la démo par une variable (`PUBLIC_DEMO_URL`).

**P2-2. Données JSON insérées dans des balises `<script>` sans échappement.**
- Où : `site/src/components/Configurateur.astro:50`, `site/src/pages/produit/[id].astro:93-94` et `:115`, `site/src/layouts/Base.astro:71`, `site/src/pages/faq.astro:49`, `site/src/pages/avis.astro:48`. `JSON.stringify` n'échappe pas `</script>`. Le panier (`panier.astro:84`) et le suivi (`suivi.astro:14-20`) le font déjà avec `.replace(/</g, "\\u003c")`.
- Impact : un nom de produit, une question de FAQ ou un avis client recopié contenant `</script>` casse la page, ou exécute du code sur l'origine de l'admin (voir P1-1). Seuls ceux qui publient peuvent le faire, mais les avis sont des textes de tiers.
- Correctif : une fonction `jsonPourScript()` dans `src/lib/format.ts`, utilisée partout.

**P2-3. Dépendance `sharp` directe, vulnérable et inutile.**
- Où : `site/package.json` déclare `sharp ^0.34.5` ; Astro 7.3.8 embarque sa propre version (`node_modules/astro/node_modules/sharp` 0.35.5), que son service d'images utilise. `npm audit` : 1 « high » sur sharp ≤ 0.35.5-rc.1 (failles de libvips, libheif et librsvg).
- Impact : faible en pratique (sharp ne traite au build que les photos du dépôt), mais l'alerte restera à chaque installation.
- Correctif : retirer `sharp` des dépendances, ou passer à `^0.35.5`, puis vérifier que `npm audit` ne signale plus rien.

**P2-4. Le build dépend de la forme exacte des données publiées par l'admin.**
- Où : `site/src/pages/index.astro:17-19` (`prixDe(premiere)` plante si `planche-aperitif` est masquée ou renommée) ; `site/src/lib/configurateur.ts:126-135` (identifiants de produits en dur) ; `site/src/lib/donnees.ts:119-125` (lecture sans validation).
- Impact : un build Cloudflare en échec laisse l'ancienne version en ligne. L'admin a affiché « publié » : le commerçant croit sa modification en ligne.
- Correctif : garde-fous (configurateur sans la pièce manquante), validation des champs indispensables avec un message clair, notifications d'échec de build Cloudflare envoyées à l'agence.

**P2-5. Les dates des occasions sont figées au moment du build.**
- Où : `site/src/lib/occasions.ts:13-19` et `:59-70`.
- Impact : sans publication pendant quelques semaines, une date limite passée reste affichée (« commander avant le … ») et la « prochaine » fête peut être déjà passée.
- Correctif : reconstruction quotidienne (crochet de déploiement Cloudflare appelé par une tâche planifiée GitHub, qui ne tourne que sur la branche par défaut), ou masquer dans le navigateur une date limite dépassée.

**P2-6. Deux chemins vers le serveur.**
- Où : `site/src/lib/serveur.ts:5-51` et `site/src/lib/demande.ts:6-39` ont chacun leur transport, leur `remplacerTransport` et un type `ConfigServeur` de forme différente.
- Impact : deux endroits à corriger pour tout changement (en-têtes, délai, messages d'erreur). Le commentaire de `serveur.ts` (« seul point d'appel ») est faux.
- Correctif : `envoyerDemande` appelle `appelServeur("contact", corpsContact(d))`.

**P2-7. Aucune limite d'envoi sur les formulaires publics.**
- Où : `supabase/functions/contact/index.ts:57-109` envoie un accusé de réception à n'importe quelle adresse saisie ; seul un champ piège arrête les robots. `commande` n'a pas de limite non plus (comportement antérieur à la refonte).
- Impact : envoi d'emails en masse à des tiers au nom de la boutique, quota Brevo gratuit (300 par jour) épuisé, réputation du domaine abîmée juste après l'authentification Brevo.
- Correctif : Cloudflare Turnstile sur le devis et le panier, ou limite par IP et par adresse dans les fonctions.

**P2-8. Promesses de conservation des données non tenues par le code.**
- Où : `site/src/pages/cgv.astro:93` promet la suppression des photos 6 mois après la livraison et une conservation de 3 ans ; rien dans `supabase/` ni dans `.github/workflows/` ne le fait. Côté navigateur, `retirerLigne` (`site/src/lib/panier.ts:73`) et le changement de photo sur la fiche (`site/src/lib/photo-piece.ts:41-53`) laissent les photos en haute qualité dans IndexedDB (`mtb-photos`) sans limite de durée.
- Correctif : tâche planifiée côté Supabase (pg_cron) ou bouton de purge dans l'admin ; dans le navigateur, supprimer la photo quand la ligne est retirée pour de bon ou la photo remplacée, et purger au chargement du panier les clés qu'aucune ligne ne référence.

### P3 : à planifier

- **Vérification des types incomplète.** Erreur réelle `site/src/pages/panier.astro:687` : `etatEnvoi(...suite: Node[])` reçoit des chaînes ; ça marche, mais le type est faux. `@types/node` et `@astrojs/check` manquent dans `devDependencies`, donc le script `npm run check` ne fonctionne pas tel quel. `site/tsconfig.json` inclut `public/` : exclure `public` pour ne pas vérifier l'admin copié.
- **Duplications.** `site/src/lib/photo-piece.ts:6-29` et `site/src/lib/photos-panier.ts:5-28` (même base IndexedDB ; `stockerPhoto` n'est jamais appelée) ; deux listes `POLICES` (`site/src/lib/polices.ts`, `site/src/lib/configurateur.ts:25-30`) plus celle de `js/admin-questionnaire.js:11-16` ; `el()` recopiée dans `panier.astro:324` et `suivi.astro:132` ; `eur` (`site/src/lib/commande.ts:96`) double `euros` de `format.ts` ; `site/scripts/redirections.mjs:46-47` relit `../data/donnees.js` en ignorant `DONNEES_CHEMIN`.
- **Incohérences de règles.** Pièce gravable : `!!options.texte` dans `panier.astro:65`, `options.texte !== false` sur la fiche (`produit/[id].astro:27`). Longueur du texte : 200 caractères dans le panier (`ModeleLigne.astro:36`, `panier.astro:781`) et côté serveur, contre la limite du gabarit sur la fiche (48 pour la planche) : le panier permet de dépasser ce que l'aperçu montrait. Frise : 6 étapes sur le site, 4 dans les emails.
- **Référencement.** La page 404 a une balise canonique vers `/404/` (`Base.astro:18`) : ne pas en mettre. `/socle/` (nuancier interne) est publié en production : l'exclure du build. Le panier, le suivi et les favoris sont à la fois en `noindex` et en `Disallow` : Google ne lit donc pas le `noindex` ; garder seulement le `noindex`.
- **Liens des emails.** `emails.ts:125` pointe vers `/suivi.html` (301 vérifiée) et la valeur de repli de `commande/index.ts:77` et `suivi/index.ts:29` aussi : passer à `/suivi/` pour éviter un saut.
- **Redirections.** `redirections.mjs:70` crée une redirection pour tous les produits, même masqués : la cible sera une 404. Filtrer sur `visible !== false` ou rediriger les masqués vers `/boutique/`.
- **Version de Node.** `engines: ">=22"` alors qu'`undici` demande 22.19 : écrire `>=22.19` et fixer `NODE_VERSION=22.19` (ou plus) sur Cloudflare.
- **Polices de l'admin chargées chez Google** (`admin.html:18-20`) : l'adresse IP du commerçant part chez Google, alors que le site auto-héberge ses polices. Utiliser les fichiers `@fontsource` déjà installés.
- **Export CSV de l'admin** (`js/admin-commandes.js:330-340`, antérieur à la refonte) : un nom de client qui commence par `=` devient une formule dans Excel. Préfixer d'une apostrophe les cellules qui commencent par `= + - @`.
- **Poids mort en production.** L'ancien `js/main.js` et `css/style.css` sont copiés dans `dist/` alors que seul l'admin s'en sert.
- **Cache des photos.** `/img/*` est gardé 7 jours (`site/public/_headers:5-6`) alors que l'admin remplace des photos sous le même nom.
- **Pas de test pour le code du site.** Un test de contrat utile : les lignes produites par `lignesServeur` passées à `calculerCommande` du serveur donnent les mêmes totaux que `totaux()` du navigateur.

---

## 3. Contrat navigateur et serveur (vérifié)

| Appel | Envoyé par le site | Attendu par la fonction | Écart |
| --- | --- | --- | --- |
| `commande` (simulation) | `{ simulation, lignes, mode_reception, cadeau: { emballage }, code_promo }` (`serveur.ts:102`) | `DemandeCommande` (`outils.ts:132-143`) | Aucun. |
| `commande` (envoi) | `client`, `mode_reception`, `lignes` (`id`, `quantite`, `variante` = index, `texte`, `police`, `remarque`, `photo`), `cadeau`, `message`, `paiement_mode`, `code_promo`, `consentement_marketing`, `retour` (`panier.astro:650-660`) | idem | Aucun. `retour` = `origine/suivi/` : accepté seulement si `SITE_URL` est exactement l'origine visitée (`commande/index.ts:77`). |
| Photos | PUT `image/jpeg` vers l'adresse signée, index `envoi.ligne` = rang de la ligne envoyée | `envois_photos[{ ligne, url }]` | Aucun. |
| `suivi` | `{ jeton }`, `{ numero, email }`, `{ jeton, action: "payer", retour }` | `suivi/index.ts:5` | Aucun. La réponse ajoute bien `jeton` et `paiement_possible` (`suivi/index.ts:32`). |
| `contact` (devis) | `type: "devis"`, `nom`, `email`, `tel`, `sujet`, `quantite`, `message` (date ajoutée au message), `consentement_marketing`, `site_web` (`demande.ts:47-60`) | `contact/index.ts:5-17` | Aucun. |
| `contact` (désinscription) | **jamais envoyé** | `action: "desinscription"`, `email`, `cle` | Voir P0-1. |

Les fonctions recalculent tous les prix depuis `SITE_URL/data/donnees.js`. Le nouveau site publie bien ce fichier (copié par `copier-medias.mjs`) : il faut que `SITE_URL` désigne le nouveau site.

---

## 4. Ce qui est sain

- **Architecture conforme au brief §5** : Astro statique, HTML rendu au build, JavaScript limité au configurateur, au panier, au suivi et à deux petits scripts. Le catalogue reste le fichier publié par l'admin, lu au build : un seul format de données pour l'admin, le site et le serveur.
- **Contrat du panier respecté** : même clé `panier-mtb`, même forme de ligne que l'ancien site, même base IndexedDB pour les photos. Un panier commencé sur l'ancien site se retrouve sur le nouveau.
- **Le serveur décide des prix** : le navigateur affiche un calcul local, puis le montant simulé par le serveur (code promo compris) ; seul le calcul serveur part à Stripe.
- **Affichage sans injection côté client** : le panier, le suivi, les favoris et la fiche construisent le DOM avec `textContent`, `replaceChildren` et `setAttribute`. Les quatre `innerHTML` restants sont des textes fixes. Le SVG du configurateur échappe le texte saisi et le titre (`configurateur.ts:218`).
- **Données personnelles côté navigateur** : aucun cookie, aucun traceur, aucune police ni carte chargée chez un tiers sur le site public ; le brouillon de commande est en `sessionStorage` et jamais dans l'adresse ; l'email ne reste pas dans l'adresse du suivi.
- **Admin** : les rendus échappent les champs saisis par les clients (`echapper` dans `admin-commandes.js`, `admin-crm.js`, `admin-questionnaire.js`), y compris dans le nouveau questionnaire. La publication refuse d'écraser une version plus récente (contrôle du `sha`).
- **Serveur** : signature Stripe vérifiée avec tolérance de temps, codes promo comptés en une seule opération, jeton de suivi aléatoire, champs publics filtrés (`champsPublics`), RLS sur toutes les tables. 27 tests au vert, bundle de démo à jour.
- **Variante démo** propre : un seul interrupteur (`DEMO`) et une configuration dédiée ; le build normal ne charge pas `demo.js` sur les pages du site.
- **Redirections des anciennes adresses** : 42 règles, paramètres de requête conservés, `produit.html?id=` géré.
- **Indexation coupée par défaut** : `noindex` partout tant que `PUBLIC_INDEXER` ne vaut pas `oui`.
- **Code lisible** : fichiers courts, commentaires en français qui expliquent le pourquoi, une source par sujet dans `src/lib/` (à deux duplications près).

---

## 5. Avant la mise en service (dans l'ordre)

1. Réparer la désinscription (P0-1) et la tester avec un vrai lien d'email.
2. Rétablir les en-têtes de sécurité et poser une CSP en mode rapport, avec `frame-ancestors 'none'` (P1-1). Vérifier avec `curl -I` sur `/`, `/admin` et `/panier/`.
3. Corriger le choix de branche de l'admin (P1-2), puis demander à chaque poste de l'agence de se reconnecter.
4. Rendre l'installation du serveur possible depuis le nouvel admin, ou documenter le passage par l'ancien admin (P1-3).
5. Ajouter le plan du site et la ligne `Sitemap:` de `robots.txt` (P1-4).
6. Remplacer les deux marqueurs écrits en dur des fiches et ajouter le contrôle des marqueurs au build ; faire remplir par l'atelier les champs qui restent (délais, fiche technique, mentions légales : SIRET, forme juridique, immatriculation, exploitant) (P1-6).
7. Décider avec l'atelier du statut « maquette envoyée » ; s'il est retenu, migration, emails et tests avant l'ouverture des commandes (P1-5).
8. Sortir la démo du build de production (P2-1), retirer `/socle/` et la canonique de la 404.
9. Échapper le JSON des balises `<script>` (P2-2) et retirer `sharp` des dépendances (P2-3) ; `npm audit` doit revenir à zéro.
10. Ajouter Turnstile ou une limite d'envoi sur le devis et la commande (P2-7).
11. Variables et réglages, le jour de la bascule :
    - Cloudflare (production) : `PUBLIC_SITE_URL=https://montrucenbois.fr`, `PUBLIC_INDEXER=oui`, `NODE_VERSION` ≥ 22.19, branche de production `site-vitrine-boutique` ; choisir entre `www` et le domaine nu et rediriger l'autre.
    - GitHub (variables du dépôt) : `SITE_URL` = l'origine exacte retenue, `SITE_ORIGINES` qui la contient (sinon la fonction répond avec une autre origine et le navigateur bloque la commande, `outils.ts:14-19`), `BRANCHE_SITE` remis à `site-vitrine-boutique` ou supprimé, `HEBERGEMENT=cloudflare` pour couper `pages-produits.yml`. Relancer l'installation pour que les fonctions prennent les nouvelles valeurs.
    - Supabase : le modèle d'email « mot de passe oublié » et les adresses de redirection d'Auth sur le nouveau domaine.
12. Commande test réelle de bout en bout (Stripe en mode réel, petit montant remboursé) : retour de paiement sur `/suivi/`, emails reçus en boîte de réception, photo envoyée, lien « Payer » d'un email, désinscription.
13. Après la bascule : notifications d'échec de build Cloudflare vers l'agence (P2-4), reconstruction quotidienne pour les dates (P2-5), purge des photos (P2-8), Search Console et envoi du plan du site, coupure ou redirection de l'ancien site GitHub Pages (`docs/refonte/bascule-domaine.md`, étape 6).
