-- Ma semaine : retrait du champ "entrainements" (inutile), ajout d'une
-- routine "vidéos prévues publiées cette semaine".
alter table public.saisies_hebdo drop column entrainements;
alter table public.saisies_hebdo add column videos_prevues_publiees boolean not null default false;
