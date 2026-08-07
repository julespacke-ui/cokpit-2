-- ============================================================================
-- Audits : un audit est souvent réalisé AVANT que le client signe, donc avant
-- que l'agence existe dans Cockpit. On rend le rattachement à une agence
-- optionnel et on ajoute un nom libre de prospect. Si le prospect signe,
-- il suffit de renseigner agence_id sur l'audit existant.
-- ============================================================================

alter table public.audits alter column agence_id drop not null;
alter table public.audits add column nom_prospect text;

-- Un audit doit toujours désigner quelqu'un : soit une agence cliente,
-- soit un prospect nommé librement.
alter table public.audits add constraint audits_cible_renseignee
  check (agence_id is not null or nom_prospect is not null);

-- La policy "audits_admin_only" (for all using is_admin()) reste valable :
-- les audits restent strictement réservés à l'admin.
