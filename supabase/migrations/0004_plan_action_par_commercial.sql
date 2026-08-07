-- ============================================================================
-- Plan d'action : bascule d'un fichier par agence à un fichier par commercial.
-- L'admin construit en amont un unique fichier HTML par commercial, qui
-- contient déjà les deux sections empilées (plan individuel + plan collectif
-- agence). Un commercial ne doit voir que son propre fichier ; le gérant voit
-- tous les fichiers de son agence.
-- ============================================================================

alter table public.plans_action add column commercial_id uuid not null references public.profiles(id) on delete cascade;
alter table public.plans_action add constraint plans_action_commercial_id_unique unique (commercial_id);
alter table public.plans_action drop column actif;

drop policy "plans_action_select_own_agence" on public.plans_action;

create policy "plans_action_select" on public.plans_action
  for select using (
    public.is_admin()
    or (public.is_gerant() and agence_id = public.current_agence_id())
    or commercial_id = auth.uid()
  );

-- Storage : chemin {commercial_id}/{fichier}, lisible par le commercial
-- concerné, son gérant, et l'admin.
drop policy "plans_action_storage_select" on storage.objects;

create policy "plans_action_storage_select" on storage.objects
  for select using (
    bucket_id = 'plans-action' and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id::text = (storage.foldername(name))[1]
          and (p.id = auth.uid() or (public.is_gerant() and p.agence_id = public.current_agence_id()))
      )
    )
  );
