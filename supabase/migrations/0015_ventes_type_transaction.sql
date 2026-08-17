-- Type de transaction de la vente (dépôt-vente, achat-vente, export, import,
-- courtage, autre), distinct de l'origine de la vente (comment le client est
-- arrivé). Optionnel : nullable pour ne pas casser les ventes déjà saisies.
alter table public.ventes add column type_transaction text
  check (type_transaction in ('depot_vente', 'achat_vente', 'export', 'import', 'courtage', 'autre'));

-- Réponse libre saisie quand type_transaction = 'autre'.
alter table public.ventes add column type_transaction_autre text;
