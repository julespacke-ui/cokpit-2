-- Un commercial doit voir sa propre rémunération (et son propre taux
-- personnalisé) mais pas ceux de ses collègues — la policy précédente
-- (0018) autorisait la lecture à toute l'agence, ce qui exposait le taux
-- négocié de chacun aux autres commerciaux. Restreint la lecture à
-- l'admin, au gérant de l'agence, ou au commercial concerné lui-même.
drop policy "taux_remuneration_commercial_select_own_agence" on public.taux_remuneration_commercial;

create policy "taux_remuneration_commercial_select_restreint" on public.taux_remuneration_commercial
  for select using (
    public.is_admin()
    or commercial_id = auth.uid()
    or (
      public.is_gerant() and exists (
        select 1 from public.profiles p
        where p.id = taux_remuneration_commercial.commercial_id and p.agence_id = public.current_agence_id()
      )
    )
  );
