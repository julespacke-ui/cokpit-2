-- Même correctif que 0016_ventes_gerant_write.sql, mais oublié sur la table
-- vente_services : un gérant qui modifie une vente de son équipe (services
-- additionnels ajoutés/retirés lors d'une édition complète) se heurtait à
-- "new row violates row-level security policy for table vente_services"
-- car seul le commercial propriétaire (ou l'admin) pouvait écrire dessus.
drop policy "vente_services_write_own" on public.vente_services;

create policy "vente_services_write_own" on public.vente_services
  for all using (
    public.is_admin() or exists (
      select 1 from public.ventes v
      where v.id = vente_services.vente_id
        and v.agence_id = public.current_agence_id()
        and (v.commercial_id = auth.uid() or public.is_gerant())
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.ventes v
      where v.id = vente_services.vente_id
        and v.agence_id = public.current_agence_id()
        and (v.commercial_id = auth.uid() or public.is_gerant())
    )
  );
