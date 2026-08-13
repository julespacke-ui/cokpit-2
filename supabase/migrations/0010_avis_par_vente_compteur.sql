-- Remplace la case à cocher "avis laissé" (0 ou 1) par un compteur (0, 1 ou
-- 2) sur chaque vente : une transaction peut générer jusqu'à deux avis
-- (acheteur + vendeur). Le ratio "Avis / ventes" se calcule maintenant sur
-- (somme des avis) / (ventes × 2) plutôt que sur une simple présence/absence.
alter table public.ventes add column nb_avis smallint not null default 0 check (nb_avis between 0 and 2);

update public.ventes set nb_avis = case when avis_laisse then 1 else 0 end;

alter table public.ventes drop column avis_laisse;
