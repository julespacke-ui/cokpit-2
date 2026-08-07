-- L'admin (unique, toi) n'est rattaché à aucune agence en particulier :
-- il voit toutes les agences. Les policies RLS le laissent déjà passer via
-- is_admin() en priorité, donc agence_id peut être NULL pour ce rôle sans
-- rien casser côté permissions.
alter table public.profiles alter column agence_id drop not null;

alter table public.profiles add constraint profiles_agence_id_requise_sauf_admin
  check (role = 'admin' or agence_id is not null);
