-- Un gérant peut désormais modifier la saisie hebdomadaire (Ma semaine) de
-- n'importe quel commercial de sa propre agence, pas seulement la sienne —
-- remonté comme besoin réel par un responsable d'agence. L'admin gardait déjà
-- ce droit sur tout le monde ; un commercial ne peut toujours écrire que sur
-- sa propre ligne.
drop policy "saisies_hebdo_write_own" on public.saisies_hebdo;

create policy "saisies_hebdo_write_own" on public.saisies_hebdo
  for all using (
    public.is_admin()
    or (agence_id = public.current_agence_id() and (commercial_id = auth.uid() or public.is_gerant()))
  ) with check (
    public.is_admin()
    or (agence_id = public.current_agence_id() and (commercial_id = auth.uid() or public.is_gerant()))
  );
