-- La baseline (agences.ca_baseline) devient réservée à l'admin : le gérant
-- ne doit plus pouvoir la modifier (il ne la voit d'ailleurs plus dans son
-- espace Paramètres). On retire la policy qui lui permettait de la corriger
-- lui-même ; seul "agences_admin_all" (admin) garde un droit d'écriture.
drop policy if exists "agences_gerant_update_baseline" on public.agences;
