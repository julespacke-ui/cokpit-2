-- Distingue les agences qui sont de vrais clients de l'accompagnement de
-- Jules (visibles dans son benchmark inter-agences perso) des agences qui
-- utilisent Cockpit comme simple client SaaS une fois le produit
-- commercialisé : leurs chiffres ne doivent pas apparaître dans le benchmark
-- ni dans la courbe d'évolution de CA, Jules n'étant pas censé les regarder.
alter table public.agences add column est_client boolean not null default true;

-- Champ réservé à l'admin, au même titre que nom / ville / logo / est_demo.
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
       or new.est_demo is distinct from old.est_demo
       or new.est_client is distinct from old.est_client then
      raise exception 'Seul un administrateur peut modifier le nom, la ville, le logo ou la catégorie démo/client d''une agence.';
    end if;
  end if;
  return new;
end;
$$;
