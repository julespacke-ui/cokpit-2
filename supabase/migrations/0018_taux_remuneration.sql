-- Taux de rémunération pour l'attribution multi-commerciaux (cf.
-- 0017_ventes_attribution_commerciaux.sql). Deux niveaux :
--   - taux_remuneration_agence : taux par défaut, un par agence.
--   - taux_remuneration_commercial : surcharges facultatives par commercial,
--     type par type (une clé absente du config retombe sur le taux agence).
-- Les 2 tables ne couvrent que rdv/mandat/reservation/livraison — la part
-- extension de garantie est calculée directement à partir de
-- extensions_garantie.commission_agence (50%, non paramétrable).

create table public.taux_remuneration_agence (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null unique references public.agences(id) on delete cascade,
  -- { rdv: {mode, valeur}, mandat: {...}, reservation: {...}, livraison: {...} }
  -- mode: 'pourcentage' | 'prime_fixe' ; valeur: % si pourcentage, € si prime_fixe
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger taux_remuneration_agence_set_updated_at
  before update on public.taux_remuneration_agence
  for each row execute function public.set_updated_at();

create table public.taux_remuneration_commercial (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null unique references public.profiles(id) on delete cascade,
  -- sous-ensemble de { rdv, mandat, reservation, livraison } — seules les clés
  -- présentes surchargent le taux agence pour cette personne.
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger taux_remuneration_commercial_set_updated_at
  before update on public.taux_remuneration_commercial
  for each row execute function public.set_updated_at();

alter table public.taux_remuneration_agence enable row level security;
alter table public.taux_remuneration_commercial enable row level security;

create policy "taux_remuneration_agence_select_own_agence" on public.taux_remuneration_agence
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "taux_remuneration_agence_gerant_write" on public.taux_remuneration_agence
  for all using (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  ) with check (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  );

create policy "taux_remuneration_commercial_select_own_agence" on public.taux_remuneration_commercial
  for select using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = taux_remuneration_commercial.commercial_id and p.agence_id = public.current_agence_id()
    )
  );

create policy "taux_remuneration_commercial_gerant_write" on public.taux_remuneration_commercial
  for all using (
    public.is_admin() or (
      public.is_gerant() and exists (
        select 1 from public.profiles p
        where p.id = taux_remuneration_commercial.commercial_id and p.agence_id = public.current_agence_id()
      )
    )
  ) with check (
    public.is_admin() or (
      public.is_gerant() and exists (
        select 1 from public.profiles p
        where p.id = taux_remuneration_commercial.commercial_id and p.agence_id = public.current_agence_id()
      )
    )
  );
