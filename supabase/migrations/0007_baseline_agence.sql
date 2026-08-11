-- Baseline de CA par agence : valeur de départ fixe, saisie une fois au
-- démarrage de l'accompagnement, jamais recalculée automatiquement.
-- Sert de repère pour mesurer l'évolution du CA (graphique admin) et pour
-- la colonne "Évolution vs baseline" du benchmark inter-agences.
alter table public.agences add column ca_baseline numeric;

-- Le gérant peut corriger la baseline de sa propre agence (erreur de
-- saisie initiale), en plus de l'admin (déjà couvert par
-- "agences_admin_all"). Le trigger ci-dessous l'empêche de modifier le
-- nom / la ville / le logo, réservés à l'admin.
create policy "agences_gerant_update_baseline" on public.agences
  for update using (
    public.is_gerant() and id = public.current_agence_id()
  ) with check (
    public.is_gerant() and id = public.current_agence_id()
  );

create or replace function public.verrouiller_identite_agence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.nom is distinct from old.nom
       or new.ville is distinct from old.ville
       or new.logo_url is distinct from old.logo_url then
      raise exception 'Seul un administrateur peut modifier le nom, la ville ou le logo d''une agence.';
    end if;
  end if;
  return new;
end;
$$;

create trigger agences_verrouiller_identite
  before update on public.agences
  for each row execute function public.verrouiller_identite_agence();
