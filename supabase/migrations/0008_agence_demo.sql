-- Distingue les agences réelles des comptes de démo/test, pour ne pas les
-- mélanger dans le benchmark inter-agences (repliés dans une section à part).
alter table public.agences add column est_demo boolean not null default false;

update public.agences set est_demo = true where nom = 'Agence Démo';

-- Champ réservé à l'admin, au même titre que nom / ville / logo.
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
       or new.logo_url is distinct from old.logo_url
       or new.est_demo is distinct from old.est_demo then
      raise exception 'Seul un administrateur peut modifier le nom, la ville, le logo ou la catégorie démo/test d''une agence.';
    end if;
  end if;
  return new;
end;
$$;
