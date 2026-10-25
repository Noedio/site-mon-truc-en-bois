# Présentation à Christophe et Laetitia : déroulé du rendez-vous

Objectif : leur montrer l'outil complet (site, commande, admin, caisse, fichier clients) et repartir avec les réponses au questionnaire de démarrage, ou au moins un rendez-vous pour le finir.
Durée : 45 minutes à 1 heure. Sur place à la boutique de préférence, avec leur téléphone en main.

## Les adresses

| Quoi | Adresse |
| --- | --- |
| Démo complète (site + admin, rien n'est envoyé ni payé) | https://demo.mon-truc-en-bois.pages.dev/demo/ |
| Aperçu du nouveau site (tel qu'il sera en ligne, commandes fermées) | https://mon-truc-en-bois.pages.dev |
| Admin de démo | https://demo.mon-truc-en-bois.pages.dev/admin.html (identifiants : demo@montrucenbois.fr / demo1234, déjà remplis) |
| Suivi de la refonte (audit, notes, actions, questions) | https://claude.ai/artifact/CTVrs9UjK7tMb5tv1TzE1i |

La démo garde tout dans le navigateur de l'appareil utilisé. « Repartir des exemples » (page Démo) remet la boutique d'exemple à zéro.

## Avant le rendez-vous (la veille)

- [ ] Ouvrir la démo sur l'ordinateur et sur un téléphone, cliquer « Repartir des exemples » sur les deux.
- [ ] Vérifier que la planche apéro, le panier, le paiement de démonstration et la boîte mail fonctionnent (parcours ci-dessous, 3 minutes).
- [ ] Imprimer ou garder ouverte la liste des 16 questions (onglet « Questions à l'atelier » du suivi), au cas où le questionnaire ne serait pas rempli en direct.
- [ ] Préparer de quoi noter : leurs concurrents, leurs remarques sur les textes.

## Déroulé

### 1. Pourquoi refaire le site (5 minutes)

- Montrer l'onglet « Vue d'ensemble » du suivi : les notes de l'audit, sans jargon. Trois messages :
  - aujourd'hui, un client ne peut ni commander ni savoir s'il sera livré à temps ;
  - le site ressemble à un modèle tout fait, alors que leur force est l'atelier et leurs pièces ;
  - il manque des informations obligatoires pour vendre en ligne.
- Ne pas montrer les captures de l'ancien site en détail : elles servent de preuve si une question vient.

### 2. Le site, côté client (15 minutes)

Leur faire faire, sur leur téléphone si possible :

1. **Accueil** : écrire un texte dans le configurateur, changer de pièce et de police, regarder l'aperçu se graver. Leur demander si les quatre polices sont gravables (sinon : essai de gravure, question 10).
2. **Fiche planche apéro** : deux prénoms et une date, la fiche technique avec ses `[À COMPLÉTER]`. Expliquer : chaque trou se remplit avec leurs réponses.
3. **Panier** : retrait gratuit coché d'office, code promo BIENVENUE10, « Payer maintenant par carte », page de paiement de démonstration.
4. **Suivi** : la frise de la commande, de « reçue, à maquetter » à « terminée ».
5. **Boîte mail de démo** (page Démo) : les emails que reçoivent le client et la boutique.
6. **Occasions et boutique** : la fête des mères, les pièces à moins de 30 €, la date limite à fixer.

À noter pendant ce temps : leurs réactions sur les photos, les textes, les prix affichés.

### 3. L'admin, côté boutique (15 minutes)

1. **Accueil de l'admin** : ce qui attend aujourd'hui (commandes, devis, à encaisser).
2. **Commandes** : ouvrir la commande qu'ils viennent de passer, la passer « En fabrication » puis « Prête » ; montrer l'email envoyé au client.
3. **Caisse** : une vente au comptoir en quatre gestes, avec la facture.
4. **Demandes** : le devis du club de foot, répondre, transformer en commande.
5. **Clients et marketing** : le fichier clients, un code promo, un email aux abonnés.
6. **Produits** : modifier un prix ou une fiche technique, « Publier ». Préciser : sur le vrai site, la mise à jour apparaît en une à deux minutes.

### 4. Le questionnaire de démarrage (15 à 20 minutes)

Dans l'admin, « Questionnaire ». Le remplir avec eux, dans l'ordre :

- **Pour vendre** (questions 1 à 6) : délais de fabrication en jours ouvrés, délais des occasions (date limite pour Noël et les fêtes datées), maquette, délai de réponse, paiement, livraison. C'est le plus important : sans délais, les clients ne commandent pas.
- **Sur les produits** (7 et 8) : fiches techniques (peut se finir plus tard, produit par produit), polices et motifs proposés aux clients avec l'essai de gravure. Produits sous licence et logos de clients : réglé (couverts par leurs accords, photos remises en ligne).
- **Sur eux** (9 à 12) : photos de l'équipe et de l'atelier, textes signés, clientèle, concurrents.
- **Mentions obligatoires** (13 à 16) : forme juridique, SIRET, TVA, médiateur, directeur de publication, domaine, fiche Google, Instagram, WhatsApp.

Ce qui ne se remplit pas en séance : noter qui s'en charge et pour quand.

### 5. La suite (5 minutes)

Ce qu'il faut de leur côté pour ouvrir les commandes en ligne :

- [ ] les réponses manquantes du questionnaire ;
- [ ] une séance photo : les pièces vierges et gravées sur un même fond, sans carte de visite ; l'atelier, la machine, eux deux s'ils l'acceptent ;
- [ ] un compte Stripe au nom de la boutique (paiement par carte) ;
- [ ] l'accès au domaine montrucenbois.fr et à la boîte mail contact@ ;
- [ ] la validation des textes (accueil, atelier, CGV une fois complétées).

De notre côté : brancher Supabase, Brevo et Stripe sur leurs comptes, relire les CGV avec les informations légales, basculer le domaine, puis une commande test réelle avec eux.

## Après le rendez-vous

- Reporter les réponses dans le suivi (onglet « Questions à l'atelier ») ; celles saisies dans l'admin de démo restent dans le navigateur utilisé : les recopier dans l'admin réel ou me les transmettre.
- Planifier la séance photo.
- Rejouer le test utilisateurs (`audit/test-utilisateurs.md`) avec 5 personnes sur l'aperçu.
