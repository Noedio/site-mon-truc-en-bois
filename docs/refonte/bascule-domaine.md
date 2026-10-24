# Bascule du domaine montrucenbois.fr

Préparé le 24/10/2026, à partir des enregistrements DNS publics (relevés avec `nslookup` sur 8.8.8.8). À relire avec l'accès au compte LWS avant de toucher à quoi que ce soit.

## Ce qui existe aujourd'hui

| Élément | Valeur relevée | Rôle |
| --- | --- | --- |
| Registrar et DNS | LWS (`ns17` à `ns20.lwsdns.com`) | Le domaine est enregistré chez LWS, qui gère aussi sa zone DNS. |
| Site (`montrucenbois.fr` et `www`) | A `91.216.107.206`, AAAA `2a00:7ee0:1:0:3:2215:0:43d` | Page d'attente LWS « Votre domaine a bien été créé ». Aucun site à préserver. |
| Emails (réception) | MX 10 `mail.montrucenbois.fr` → A `83.229.19.101` | Boîte contact@ hébergée chez LWS. **À ne pas casser.** |
| SPF | `v=spf1 mx:montrucenbois.fr a:mail.montrucenbois.fr a:mailphp.lws-hosting.com -all` | Seuls les serveurs LWS ont le droit d'envoyer au nom du domaine. |
| DMARC | `v=DMARC1; p=quarantine;` | Un email qui échoue SPF et DKIM part en indésirables. |

[À COMPLÉTER : titulaire du compte LWS (la boutique ou l'agence), formule d'hébergement mail, date d'échéance du domaine]

## Le point à régler avant tout envoi d'email par le site

Le site enverra ses emails (confirmations, suivi, devis) par **Brevo**, au nom de `contact@montrucenbois.fr`. Avec le SPF en `-all` et le DMARC en `quarantine` actuels, ces emails seraient classés en indésirables.

Avant la commande test réelle (plan, étape 4) :

1. Dans Brevo : *Expéditeurs, domaines et IP dédiées* → *Domaines* → ajouter `montrucenbois.fr` → Brevo affiche les enregistrements à créer (code de vérification, DKIM, éventuellement DMARC).
2. Dans la zone DNS (LWS ou Cloudflare selon l'option choisie plus bas) :
   - ajouter les enregistrements DKIM et de vérification donnés par Brevo, tels quels ;
   - compléter le SPF existant, **sans en créer un second** : `v=spf1 mx:montrucenbois.fr a:mail.montrucenbois.fr a:mailphp.lws-hosting.com include:spf.brevo.com -all` (vérifier la valeur exacte demandée par Brevo) ;
   - garder le DMARC ; ajouter éventuellement une adresse de rapport (`rua=mailto:…`).
3. Attendre que Brevo affiche le domaine « authentifié », puis s'envoyer un email de test et vérifier qu'il arrive en boîte de réception (Gmail et Outlook).

## Brancher le site : deux options

Le nouveau site est sur Cloudflare Pages (projet `mon-truc-en-bois`). Cloudflare ne sert un domaine nu (`montrucenbois.fr`, sans `www`) que si la zone DNS est chez Cloudflare.

### Option A (recommandée) : la zone DNS passe chez Cloudflare, le domaine reste chez LWS

1. Créer la zone `montrucenbois.fr` dans Cloudflare (offre gratuite). Cloudflare importe les enregistrements existants : **vérifier un par un** qu'il a bien repris le MX, l'A de `mail`, le SPF, le DMARC (et les enregistrements Brevo s'ils sont déjà faits). Les mettre en « DNS only » (nuage gris) pour `mail`.
2. Dans le projet Pages : *Custom domains* → ajouter `montrucenbois.fr` puis `www.montrucenbois.fr` ; Cloudflare crée les enregistrements du site.
3. Chez LWS : remplacer les serveurs de noms par les deux serveurs donnés par Cloudflare. La propagation prend de quelques minutes à 24 h.
4. Contrôler : le site s'ouvre sur `https://montrucenbois.fr`, `www` redirige vers l'adresse sans `www` (règle de redirection Cloudflare), un email envoyé à contact@ arrive, un email envoyé depuis contact@ part.

Avantages : domaine nu servi directement, certificat HTTPS automatique, une seule interface pour le site et les DNS.

### Option B : tout reste chez LWS

1. Chez LWS : `www` en CNAME vers `mon-truc-en-bois.pages.dev` ; ajouter `www.montrucenbois.fr` dans *Custom domains* du projet Pages.
2. Le domaine nu `montrucenbois.fr` est redirigé vers `https://www.montrucenbois.fr` par l'outil de redirection de LWS (si l'offre le permet, en HTTPS).
3. MX, SPF et DMARC ne bougent pas.

Inconvénient : l'adresse officielle devient `www.montrucenbois.fr`, et la redirection du domaine nu dépend de LWS.

## Le jour de la bascule (après la commande test réelle)

1. Fusionner `refonte` dans `site-vitrine-boutique`, mettre la production Cloudflare sur `site-vitrine-boutique` (voir `site/README.md`).
2. Variables d'environnement Cloudflare (production) : `PUBLIC_SITE_URL=https://montrucenbois.fr` et `PUBLIC_INDEXER=oui`, puis relancer le déploiement.
3. Brancher le domaine (option A ou B ci-dessus).
4. Supabase : `SITE_URL` et les origines autorisées sur `https://montrucenbois.fr` ; Stripe : adresse du webhook inchangée (elle pointe vers Supabase), adresses de retour vérifiées par une commande test.
5. Google : Search Console (propriété `montrucenbois.fr`), envoi du plan du site, lien du site sur la fiche Google de la boutique.
6. Couper GitHub Pages sur l'ancien dépôt une fois tout vérifié : les anciennes adresses sont redirigées par `_redirects` du nouveau site uniquement si elles arrivent sur `montrucenbois.fr` ; celles en `noedio.github.io` resteront à traiter (page de redirection ou désactivation).
