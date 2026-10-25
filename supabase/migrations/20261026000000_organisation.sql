-- ============================================================
--  Organisation de l'atelier : date « prête le » fixée à la main, dernier rappel envoyé au client.
--  Installé automatiquement par l'assistant de l'admin ; rejouable sans risque.
-- ============================================================

-- Date à laquelle la commande doit être prête. Vide : l'admin la calcule
-- (validation de la maquette + délai des produits, en jours ouvrés).
alter table public.commandes add column if not exists echeance date;

-- Dernier rappel au client (maquette à valider, paiement, commande prête) : la relance suivante se cale dessus.
-- Rempli par la fonction admin quand elle envoie l'email, ou par l'admin quand le client a été prévenu par téléphone.
alter table public.commandes add column if not exists relance_le timestamptz;

-- Les administrateurs peuvent modifier ces deux champs (les droits par colonne s'ajoutent aux précédents).
grant update (echeance, relance_le) on public.commandes to authenticated;
