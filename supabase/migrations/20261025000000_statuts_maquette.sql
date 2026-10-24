-- Parcours de la refonte (brief §5) : commande à maquetter → maquette envoyée → validée (sinon retouche) → …
-- Deux statuts s'ajoutent entre « nouvelle » et « confirmee » : maquette_envoyee et retouche.
alter table commandes drop constraint if exists commandes_statut_check;
alter table commandes add constraint commandes_statut_check
  check (statut in ('nouvelle', 'maquette_envoyee', 'retouche', 'confirmee', 'en_fabrication', 'prete', 'expediee', 'terminee', 'annulee'));
