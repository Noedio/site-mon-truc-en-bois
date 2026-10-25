-- Fichiers joints aux demandes de devis (photos, logo, plan en PDF).
-- Le navigateur les dépose dans le seau privé photos-clients, sous devis/<id de la demande>/,
-- avec les adresses d'envoi signées que renvoie la fonction contact.
-- Rejouable sans risque.

-- Tableau de { chemin, nom, type, taille } : chemin dans le seau, nom d'origine, type MIME, taille en octets.
alter table public.demandes add column if not exists fichiers jsonb not null default '[]'::jsonb;

-- Le seau n'acceptait que des images : on y ajoute le PDF.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'photos-clients';
