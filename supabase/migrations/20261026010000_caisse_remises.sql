-- ============================================================
--  Caisse : détail des remises et des paiements de chaque vente.
--  En caisse, l'admin peut cumuler plusieurs remises (sur une ligne ou sur le ticket, en % ou en €)
--  et plusieurs codes promo ; le client peut régler en plusieurs fois (carte + espèces…).
--  « remise » reste le montant total remisé (factures, statistiques) ; « code_promo » liste les codes, séparés par des virgules.
--  Installé automatiquement par l'assistant de l'admin ; rejouable sans risque.
-- ============================================================

-- [{ type: 'ligne' | 'ticket' | 'code', libelle, mode: 'pourcent' | 'euros', valeur, montant, ligne?, code? }]
-- dans l'ordre du calcul : remises de ligne, puis remises du ticket, puis codes promo.
alter table public.commandes add column if not exists remises jsonb not null default '[]'::jsonb;
-- [{ moyen, montant, recu? }] : recu = espèces données par le client (le rendu s'en déduit)
alter table public.commandes add column if not exists paiements jsonb not null default '[]'::jsonb;

do $$ begin
  alter table public.commandes add constraint commandes_remises_check check (jsonb_typeof(remises) = 'array');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.commandes add constraint commandes_paiements_check check (jsonb_typeof(paiements) = 'array');
exception when duplicate_object then null; end $$;
