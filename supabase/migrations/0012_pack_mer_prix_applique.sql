-- Montant réellement appliqué du pack de mise à la route sur une vente
-- (peut être négocié à la baisse par le client), distinct du prix catalogue
-- du pack (packs_mer.prix). Nul si aucun pack n'est appliqué sur la vente.
alter table public.ventes
  add column pack_mer_prix_applique numeric(10, 2);

-- Backfill : pour les ventes déjà enregistrées avec un pack, on reprend le
-- prix catalogue du pack comme montant appliqué.
update public.ventes v
set pack_mer_prix_applique = pm.prix
from public.packs_mer pm
where v.pack_mer_id = pm.id
  and v.pack_mer_prix_applique is null;
