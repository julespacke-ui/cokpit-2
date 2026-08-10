-- Une ressource peut être commune à tous les points de vente (agence_id
-- null) au lieu d'être rattachée à une seule agence.

alter table public.ressources alter column agence_id drop not null;

drop policy "ressources_select_own_agence" on public.ressources;
create policy "ressources_select_own_agence" on public.ressources
  for select using (
    public.is_admin() or agence_id is null or agence_id = public.current_agence_id()
  );

-- Stockage : les fichiers communs vivent dans le dossier "commun/" plutôt
-- que "{agence_id}/", lisible par tout utilisateur authentifié.
drop policy "ressources_storage_select" on storage.objects;
create policy "ressources_storage_select" on storage.objects
  for select using (
    bucket_id = 'ressources' and (
      public.is_admin()
      or (storage.foldername(name))[1] = 'commun'
      or (storage.foldername(name))[1] = public.current_agence_id()::text
    )
  );
