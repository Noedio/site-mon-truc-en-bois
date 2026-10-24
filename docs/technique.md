# Fiche technique — Mon Truc en Bois

Pour l'agence et les développeurs. La mise en ligne pas à pas est dans [guide-mise-en-ligne.md](guide-mise-en-ligne.md),
l'utilisation au quotidien dans [guide-commercant.md](guide-commercant.md), le choix des plateformes et leurs coûts dans
[benchmark-plateformes.md](benchmark-plateformes.md).

| Service | Rôle | Coût fixe |
|---|---|---|
| **Cloudflare Pages** | Hébergement du site (usage commercial autorisé), DNS, adresse contact@, statistiques sans cookie | Gratuit |
| **Nom de domaine** (.fr, registrar français) | montrucenbois.fr | ~10 € par an |
| **Supabase** (région Paris) | Commandes, clients, devis, codes promo, photos des clients, fonctions serveur | Gratuit pendant la mise en place, **Pro (25 $/mois)** dès l'ouverture : pas de mise en pause, sauvegarde quotidienne |
| **Stripe** | Paiement par carte, Apple Pay, Google Pay | Aucun : 1,5 % + 0,25 € par carte européenne |
| **Brevo** | Emails automatiques et newsletter (société française) | Gratuit jusqu'à 300 emails par jour |
| **Better Stack** | Surveillance du site et du serveur, alertes à l'agence | Gratuit |

> GitHub Pages ne convient pas en production : ses conditions interdisent les sites e-commerce. Il sert seulement pendant la mise en place.

Les clés secrètes sont chiffrées dans le navigateur et rangées dans les « secrets » GitHub, puis dans ceux du serveur : elles ne sont **jamais** publiées sur le site.

## Informations légales et régime de TVA

Dans **Infos boutique → Informations légales** : exploitant, forme juridique, SIRET, **régime de TVA**, médiateur de la consommation. Elles alimentent les CGV, les mentions légales et les factures après publication. Tant qu'elles manquent, le tableau de bord les signale (sans bloquer l'ouverture) et les pages légales affichent « [à compléter] ».

- **Franchise en base** : factures avec la mention « TVA non applicable, article 293 B du CGI » ; la caisse accepte les espèces.
- **Assujetti à la TVA** : factures avec HT, TVA et TTC ; les espèces doivent passer par une caisse certifiée, la caisse de l'admin (et le serveur) ne propose donc que carte, chèque et virement.
- **Médiateur** : obligatoire pour vendre aux particuliers (adhésion de 30 à 150 €).
- **Factures électroniques** : depuis le 1er septembre 2026, le commerçant doit pouvoir recevoir les factures de ses fournisseurs sur une plateforme agréée ; l'émission et le e-reporting des ventes suivront en septembre 2027 (chantier agence).

## Connexion à l'admin

- **Le commerçant** : son email et son mot de passe (compte Supabase listé dans la table `admins`). Le serveur publie ses modifications avec la **clé de publication**, une clé GitHub limitée à *Contents* gardée dans ses secrets (`CONTENU_GITHUB_TOKEN`). L'onglet Installation lui est caché. Si la clé de publication ne fonctionne plus (expirée, révoquée, GitHub injoignable), l'admin s'ouvre quand même sur le contenu en ligne avec un bandeau « Publication indisponible » : commandes, caisse, clients et demandes restent utilisables.
- **L'agence** (« Accès agence ») : une clé GitHub *fine-grained* limitée au dépôt, avec **Contents**, **Secrets** et **Variables** en *Read and write* et **Actions** en *Read-only*. Elle reste dans le navigateur de l'appareil utilisé.
- L'admin s'installe sur l'écran d'accueil du téléphone et s'ouvre en plein écran (`admin.webmanifest`).

## Pour les développeurs

- **Base de données** : `supabase/migrations/*.sql`, rejouables, appliquées dans l'ordre à chaque installation. Tables `commandes`, `clients`, `demandes`, `codes_promo`, `campagnes`, vue `stats_ventes` (hors commandes annulées et remboursées), fonction `utiliser_code_promo` (compteur des codes promo en une seule opération, maximum jamais dépassé). Accès réservé aux comptes de la table `admins` (RLS).
- **Fonctions serveur** (Deno) : `supabase/functions/`
  - `commande` : prix recalculés depuis le catalogue publié, codes promo, paiement Stripe. Les adresses d'envoi des photos sont préparées avant d'enregistrer la commande ; si Stripe ne répond pas, la commande et les emails partent quand même et le client paie depuis sa page de suivi.
  - `suivi` : page de suivi du client ; `?payer=1` ouvre directement un paiement Stripe neuf (les boutons « Payer » des emails passent par là : un lien Stripe direct expire en 24 h).
  - `contact` : devis, messages, inscription et désinscription à la newsletter. La désinscription en un clic demande la clé personnelle du lien reçu par email (HMAC de l'adresse, secret `DESINSCRIPTION_SECRET` ou à défaut la clé de service) ; sans elle, un email de confirmation est envoyé à l'adresse.
  - `admin` : vente en boutique, emails, liens de paiement (refusés pour une commande payée, remboursée ou annulée), campagnes, publication du contenu pour le commerçant.
  - `stripe-webhook` : marque la commande payée. Un paiement arrivé sur une commande remboursée ou annulée ne la modifie pas : la boutique reçoit un email « À vérifier ».
  - Emails : Brevo (`BREVO_API_KEY`) ou Resend (`RESEND_API_KEY`).
- **Tests** : `deno test --allow-env --allow-read supabase/tests/` (services simulés, lancés aussi avant chaque installation).
- **Installation** : `.github/workflows/supabase.yml`, déclenché par l'admin via `supabase/installation.json` (message de commit contenant `[installation]`), et à chaque modification de `supabase/` sur la branche `site-vitrine-boutique`. La branche publiée par le serveur est `site-vitrine-boutique` (variable de dépôt `BRANCHE_SITE` pour en choisir une autre). Pendant la refonte, le nouveau site est construit depuis `refonte` : voir « Admin et publication pendant la refonte » dans `site/README.md`. L'email « mot de passe oublié » part de l'adresse de `EMAIL_EXPEDITEUR` (expéditeur validé chez Brevo).
- **Garder Supabase gratuit éveillé** : `.github/workflows/supabase-reveil.yml`, deux fois par semaine. GitHub ne lance les tâches planifiées que depuis la **branche par défaut** du dépôt : elle doit être `site-vitrine-boutique`. Inutile en formule Pro.
- **Pages produits, plan du site, robots.txt** : `node outils/generer-pages.mjs` ; `node outils/construire.mjs` prépare `dist/` pour Cloudflare Pages (avec `_headers` et `admin.webmanifest`). Sur GitHub Pages, `.github/workflows/pages-produits.yml` les régénère à chaque modification de `data/donnees.js` (désactivé par la variable `HEBERGEMENT=cloudflare`).
- **Adresses courtes** : Cloudflare Pages sert `/admin.html` à l'adresse `/admin`. Les liens envoyés aux clients partent donc de l'adresse publique du site (*Infos boutique → Référencement*), et `robots.txt` comme `_headers` couvrent les deux formes.

## Mode démo (présentation au commerçant)

`demo.html` lance une démonstration complète du site (boutique, paiement, suivi, admin, caisse, clients, devis, marketing) sans aucun compte : sur GitHub Pages, `https://noedio.github.io/site-mon-truc-en-bois/demo.html`.

- `js/demo.js`, chargé juste après `data/donnees.js` sur chaque page, ne fait rien tant que la démo n'est pas lancée (`?demo=1` ou le bouton de `demo.html` ; `?demo=0` pour la quitter). Une fois lancée, il simule dans le navigateur la base Supabase (API REST, connexion, stockage des photos), Stripe (page `demo-paiement.html`, webhook signé), Brevo (boîte mail affichée dans `demo.html`) et la publication GitHub du contenu. Tout reste dans le navigateur (localStorage, IndexedDB) ; la démo démarre avec des exemples (clients, commandes sur plusieurs mois, devis, code `BIENVENUE10`).
- Les **vraies** fonctions serveur tournent dans le navigateur : `js/demo-serveur.js` est compilé depuis `supabase/functions`. Après toute modification de ces fonctions, le recompiler :
  `deno bundle --platform browser --format esm outils/demo-serveur.ts -o js/demo-serveur.js`
- Identifiants de l'admin en démo : `demo@montrucenbois.fr` / `demo1234` (déjà remplis). La démo utilise ses propres clés de stockage : elle ne se mélange pas avec le vrai admin sur le même appareil.
- `node outils/construire.mjs` n'emporte pas la démo en production (Cloudflare Pages) : pages et scripts de démo exclus, balise retirée des pages.

