# Ré-audit après refonte : Mon Truc en Bois

Date : 24/10/2026. Branche `refonte`. Site audité : l'aperçu https://mon-truc-en-bois.pages.dev et la démo https://demo.mon-truc-en-bois.pages.dev.
Même grille que le premier audit (`audit/RAPPORT.md`, brief §4). Les `[À COMPLÉTER]` sont voulus : ce sont les informations attendues de l'atelier.

## Les sources

| Fichier | Contenu |
| --- | --- |
| `audit/apres/outils/impeccable-critique-A-revue-design.md` | Revue de design : 29/40 (25 avant), 5 parcours testés, temps de personnalisation |
| `audit/apres/outils/impeccable-audit.md` | Audit technique : 15/20 (11 avant), détecteur et overlay |
| `audit/apres/outils/antislop-audit-002-2026-10-24.md` | Revue anti-slop : 14 constats (28 avant), tableau avant / après |
| `audit/apres/outils/audit-code.md` | Audit du code et de l'architecture, liste « avant la mise en service » |
| `audit/apres/mesures/` | Lighthouse, axe, navigation, détecteur (premier contrôle) |
| `audit/benchmark-ecommerce.md` | Benchmark de 8 sites e-commerce en vogue, 15 idées, 8 pratiques à éviter |
| `audit/benchmark.md` | Benchmark des concurrents locaux et des 3 références du brief |

## Notes par axe

| Axe | Avant | Après | Cible du brief | Ce qui reste |
| --- | --- | --- | --- | --- |
| Identité / anti-slop | 1 | 4 | 0 FAIL bloquant | Site public : seul FAIL à la lettre, les trois polices du système du brief (contradiction interne du brief, à trancher). Admin : corrigé (bandeau, emojis, tirets) |
| Structure de l'accueil | 2 | 4 | Configurateur au 1er écran | Atteinte. L'atelier ne se voit pas encore en photo |
| Fiche produit | 3 | 4 | Personnaliser en < 60 s | 13 s mesurées, PC et téléphone. Délais et fiches techniques attendent l'atelier |
| Parcours d'achat | 2 | 4 | Commande test sans aide | Atteinte en démo (commande, paiement simulé, suivi). Commande réelle après branchement des comptes |
| Performance | 2 | 5 | ≥ 90, LCP < 2,5 s, CLS < 0,1 | Mobile 95 à 98, LCP 1,9 à 2,3 s, CLS 0 à 0,001 (accueil, boutique, fiche ; deux mesures chacune, après correction) |
| Accessibilité | 2 | 4 | 0 erreur critique AA | axe : 0 violation ; Lighthouse 100. Non testé avec un lecteur d'écran réel |
| SEO local | 3 | 4 | LocalBusiness + Product | Données structurées statiques, plan du site, redirections 301. Indexation coupée exprès jusqu'à la bascule |
| Confiance et légal | 2 | 3 | Mentions complètes | Plus de promesses inventées ; désinscription des emails réparée. SIRET, forme, TVA, médiateur attendent l'atelier |
| Photos | 2 | 2 | Une seule mise en scène | Photos sous licence masquées ; séance photo indispensable |
| Code | 3 | 4 | Liste de ce qu'on garde | Site statique, `astro check` sans erreur, 27 tests serveur, builds normal et démo verts |

## Corrigé à la suite du ré-audit

Commits `a8209a3` à `5a20574` sur `refonte`.

1. **Désinscription des emails** (bloquant) : nouvelle page `/newsletter/` pour l'inscription et le lien personnel des emails ; `newsletter.html` y est redirigé avec ses paramètres.
2. **Sécurité** : en-têtes remis (HSTS, X-Frame-Options, Permissions-Policy), politique de contenu en mode rapport, `noindex` et `no-cache` sur l'admin ; JSON échappé dans les balises `<script>`.
3. **Admin et publication** : la branche imposée par l'aperçu passe avant celle gardée dans le navigateur ; un brouillon fait pour une autre branche n'est plus proposé ; l'installation du serveur peut partir de `refonte`.
4. **Parcours du brief** : statuts « maquette envoyée » et « retouche » (migration, admin, emails, suivi).
5. **Promesse de maquette** : une seule formulation, tirée de la réponse au questionnaire (`site/src/lib/promesses.ts`).
6. **Favoris** : lien et compteur dans l'en-tête, message après l'appui sur le cœur. Le parcours « retrouver un favori » échouait.
7. **Téléphone** : cibles de 44 px, focus visible au-dessus des barres collantes, devis sûr sans JavaScript, navigation et en-tête en grille fixe. Ce dernier point a supprimé un décalage de page de 0,30 qui apparaissait quand la police arrivait.
8. **Admin** : menu « Plus » refermé par Échap et hors tabulation une fois fermé, rôles ARIA justes, bandeau démo aux couleurs du brief, plus d'emojis ni de tirets cadratins (objets d'email compris).
9. **Plan du site** et ligne `Sitemap:` du `robots.txt`.
10. **Build Cloudflare** : `sharp` remis en dépendance explicite (sans lui, le build échouait sur Linux).

## Reste à faire, sans l'atelier

| Point | Source | Effort |
| --- | --- | --- |
| Récapitulatif chiffré sous l'aperçu (pièce, options, total) | Benchmark, idée 3 | Faible |
| Barre vers la livraison offerte dans le panier (filet `--gravure` sur kraft) | Benchmark, idée 7 | Faible |
| Barre d'achat collante sur la fiche en téléphone, avec le prix à jour | Benchmark, idée 14 | Faible |
| Messages d'erreur du site à la place des bulles du navigateur sur le devis | Revue design | Faible |
| Purge des photos clients après 6 mois (promise par les CGV) | Audit du code | Moyen |
| Politique de contenu à durcir (passer du mode rapport au blocage) avant la bascule | Audit du code | Faible |
| Retirer l'ancien `css/style.css` chargé par l'admin | Audit technique | Moyen |

## Reste à faire, avec l'atelier

| Point | Débloque | Source |
| --- | --- | --- |
| Délais par famille de pièces | Date « prête le … » sur la fiche, dates limites des occasions | Revue design, benchmark idées 5 et 9 |
| Mesures et zones gravables | Fiche technique illustrée, aperçu calé sur la pièce | Benchmark idée 10 |
| Séance photo (pièces vierges sur un même fond, façade, mains au travail) | Aperçu sur la vraie photo, bloc « venir à l'atelier » | Benchmark idées 1, 6, 15 |
| Règles de saisie de la gravure (accents, symboles, longueur) | Texte d'aide sous le champ | Benchmark idée 4 |
| Informations légales | CGV et mentions définitives | Premier audit |
| Trancher : trois polices par écran (système du brief) ou deux (règle des interdits) | Delivery Gate anti-slop | Revue anti-slop 002 |
