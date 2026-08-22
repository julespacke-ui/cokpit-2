-- Un gérant peut désormais modifier ou supprimer une vente de n'importe quel
-- commercial de sa propre agence (corriger une date, retirer une fiche saisie
-- par erreur), pas seulement les siennes — même logique que la saisie
-- hebdomadaire (cf. 0009_gerant_modifie_semaine_equipe.sql). L'admin gardait
-- déjà ce droit sur tout le monde ; un commercial ne peut toujours écrire que
-- sur ses propres ventes.
drop policy "ventes_write_own" on public.ventes;

create policy "ventes_write_own" on public.ventes
  for all using (
    public.is_admin()
    or (agence_id = public.current_agence_id() and (commercial_id = auth.uid() or public.is_gerant()))
  ) with check (
    public.is_admin()
    or (agence_id = public.current_agence_id() and (commercial_id = auth.uid() or public.is_gerant()))
  );
