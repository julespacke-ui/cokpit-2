-- ============================================================================
-- COCKPIT — Schéma initial
-- Tables + policies RLS. À exécuter dans l'éditeur SQL Supabase (une seule fois).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Agences (une agence = un client ; un indépendant solo = une agence avec un
-- seul utilisateur au rôle gerant, aucun cas particulier dans le code)
create table public.agences (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ville text,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Profils utilisateurs, un par utilisateur auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  agence_id uuid not null references public.agences(id) on delete restrict,
  role text not null check (role in ('admin', 'gerant', 'commercial')),
  prenom text not null,
  nom text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_agence_id_idx on public.profiles(agence_id);

-- Barème honoraires : un par agence (tranches ou pourcentage)
create table public.baremes_honoraires (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null unique references public.agences(id) on delete cascade,
  type text not null check (type in ('tranches', 'pourcentage')),
  -- tranches: [{min, max, honoraires}, ...]
  -- pourcentage: {taux, minimum}
  config jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger baremes_honoraires_set_updated_at
  before update on public.baremes_honoraires
  for each row execute function public.set_updated_at();

-- Packs de mise à la route (MER)
create table public.packs_mer (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  nom text not null,
  prix numeric(10, 2) not null,
  actif boolean not null default true
);

create index packs_mer_agence_id_idx on public.packs_mer(agence_id);

-- Extensions de garantie
create table public.extensions_garantie (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  nom text not null,
  prix_client numeric(10, 2) not null,
  commission_agence numeric(10, 2) not null,
  actif boolean not null default true
);

create index extensions_garantie_agence_id_idx on public.extensions_garantie(agence_id);

-- Saisies hebdomadaires — une ligne par commercial et par semaine, modifiable librement
create table public.saisies_hebdo (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.profiles(id) on delete cascade,
  agence_id uuid not null references public.agences(id) on delete cascade,
  semaine date not null, -- toujours un lundi

  -- Funnel vendeurs (rentrée de mandats)
  appels_passes integer not null default 0,
  leads_traites integer not null default 0,
  rdv_pris integer not null default 0,
  rdv_venus integer not null default 0,
  mandats_rentres integer not null default 0,

  -- Funnel acheteurs
  leads_acheteurs integer not null default 0,
  propositions_commerciales integer not null default 0,
  visites integer not null default 0,

  -- Activité
  entrainements integer not null default 0,
  videos_postees integer not null default 0,
  prospections_exterieures integer not null default 0,

  -- Routines
  liste_chaude_levee boolean not null default false,
  sortie_prospection_faite boolean not null default false,

  -- Stock
  stock_entrees integer not null default 0,
  stock_sorties integer not null default 0,
  stock_total integer not null default 0,

  -- Avis
  nb_avis_recus integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saisies_hebdo_semaine_lundi check (extract(dow from semaine) = 1),
  constraint saisies_hebdo_commercial_semaine_uniq unique (commercial_id, semaine)
);

create index saisies_hebdo_agence_semaine_idx on public.saisies_hebdo(agence_id, semaine);
create index saisies_hebdo_commercial_semaine_idx on public.saisies_hebdo(commercial_id, semaine);

create trigger saisies_hebdo_set_updated_at
  before update on public.saisies_hebdo
  for each row execute function public.set_updated_at();

-- Fiches ventes — créées au fil de l'eau par le commercial
create table public.ventes (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.profiles(id) on delete cascade,
  agence_id uuid not null references public.agences(id) on delete cascade,

  date_vente date not null,
  vehicule text not null, -- "marque modèle", champ texte simple en V1
  -- V2 : remplacé/complété par une référence à une table `vehicules` (cycle de vie complet)

  prix_vente numeric(10, 2) not null,
  honoraires_preconises numeric(10, 2) not null,
  honoraires_reels numeric(10, 2) not null,

  pack_mer_id uuid references public.packs_mer(id) on delete set null,
  carte_grise_montant numeric(10, 2) not null default 0, -- collecté puis reversé à l'ANTS, hors CA

  extension_garantie_id uuid references public.extensions_garantie(id) on delete set null,

  origine_vente text not null check (
    origine_vente in ('recommandation', 'lead_internet', 'prospection', 'passage', 'liste_chaude', 'autre')
  ),
  avis_laisse boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ventes_agence_date_idx on public.ventes(agence_id, date_vente);
create index ventes_commercial_date_idx on public.ventes(commercial_id, date_vente);

create trigger ventes_set_updated_at
  before update on public.ventes
  for each row execute function public.set_updated_at();

-- Services additionnels libres, rattachés à une vente
create table public.vente_services (
  id uuid primary key default gen_random_uuid(),
  vente_id uuid not null references public.ventes(id) on delete cascade,
  libelle text not null,
  prix numeric(10, 2) not null
);

create index vente_services_vente_id_idx on public.vente_services(vente_id);

-- Objectifs — portée agence (commercial_id null) ou un commercial précis
create table public.objectifs (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  commercial_id uuid references public.profiles(id) on delete cascade,
  periode date not null, -- premier jour du mois concerné
  -- ex: {"ventes": 8, "ca_honoraires": 9000, "rdv_semaine": 10, "mandats": 6, "videos": 4}
  cibles jsonb not null,
  created_at timestamptz not null default now(),

  constraint objectifs_periode_debut_mois check (extract(day from periode) = 1)
);

create unique index objectifs_agence_periode_uniq
  on public.objectifs(agence_id, periode) where commercial_id is null;
create unique index objectifs_commercial_periode_uniq
  on public.objectifs(commercial_id, periode) where commercial_id is not null;

-- Plans d'action — fichier HTML uploadé par l'admin (Supabase Storage, bucket `plans-action`)
create table public.plans_action (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  titre text not null,
  storage_path text not null,
  date_upload timestamptz not null default now(),
  actif boolean not null default true
);

create index plans_action_agence_id_idx on public.plans_action(agence_id);

-- Ressources — liens ou fichiers (Supabase Storage, bucket `ressources`)
create table public.ressources (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  type text not null check (type in ('lien', 'fichier')),
  libelle text not null,
  url text,
  storage_path text,
  categorie text not null check (
    categorie in ('calendrier_editorial', 'trames', 'positionnement', 'strategie_com', 'post_livraison', 'autre')
  ),
  created_at timestamptz not null default now(),

  constraint ressources_url_ou_storage check (
    (type = 'lien' and url is not null and storage_path is null) or
    (type = 'fichier' and storage_path is not null and url is null)
  )
);

create index ressources_agence_id_idx on public.ressources(agence_id);

-- Audits — placeholder, structure prête, questionnaire à venir (admin uniquement)
create table public.audits (
  id uuid primary key default gen_random_uuid(),
  agence_id uuid not null references public.agences(id) on delete cascade,
  date date not null,
  reponses jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audits_agence_id_idx on public.audits(agence_id);

-- ============================================================================
-- FONCTIONS D'AIDE POUR LES POLICIES (security definer : bypass RLS sur
-- `profiles` pour éviter la récursion infinie des policies qui la référencent)
-- ============================================================================

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_agence_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agence_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_gerant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'gerant', false)
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.agences enable row level security;
alter table public.profiles enable row level security;
alter table public.baremes_honoraires enable row level security;
alter table public.packs_mer enable row level security;
alter table public.extensions_garantie enable row level security;
alter table public.saisies_hebdo enable row level security;
alter table public.ventes enable row level security;
alter table public.vente_services enable row level security;
alter table public.objectifs enable row level security;
alter table public.plans_action enable row level security;
alter table public.ressources enable row level security;
alter table public.audits enable row level security;

-- ---------------------------------------------------------------------------
-- agences : admin voit tout, gerant/commercial voient uniquement la leur.
-- Seul l'admin crée/modifie une agence.
-- ---------------------------------------------------------------------------
create policy "agences_select" on public.agences
  for select using (public.is_admin() or id = public.current_agence_id());

create policy "agences_admin_all" on public.agences
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles : admin voit/gère tout. gerant voit son agence et gère les
-- commerciaux de son agence. commercial voit les profils de son agence
-- (classement) mais ne gère personne.
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_agence" on public.profiles
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "profiles_gerant_insert_commercial" on public.profiles
  for insert with check (
    public.is_gerant()
    and agence_id = public.current_agence_id()
    and role = 'commercial'
  );

create policy "profiles_gerant_update_commercial" on public.profiles
  for update using (
    public.is_gerant() and agence_id = public.current_agence_id() and role = 'commercial'
  ) with check (
    public.is_gerant() and agence_id = public.current_agence_id() and role = 'commercial'
  );

-- ---------------------------------------------------------------------------
-- baremes_honoraires / packs_mer / extensions_garantie :
-- admin + gerant configurent leur agence, commercial consulte seulement.
-- ---------------------------------------------------------------------------
create policy "baremes_select_own_agence" on public.baremes_honoraires
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "baremes_gerant_write" on public.baremes_honoraires
  for all using (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  ) with check (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  );

create policy "packs_mer_select_own_agence" on public.packs_mer
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "packs_mer_gerant_write" on public.packs_mer
  for all using (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  ) with check (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  );

create policy "extensions_garantie_select_own_agence" on public.extensions_garantie
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "extensions_garantie_gerant_write" on public.extensions_garantie
  for all using (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  ) with check (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  );

-- ---------------------------------------------------------------------------
-- saisies_hebdo : toute l'agence peut lire (classement, supervision).
-- Chacun (gerant compris s'il vend) n'écrit que sur ses propres lignes.
-- ---------------------------------------------------------------------------
create policy "saisies_hebdo_select_own_agence" on public.saisies_hebdo
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "saisies_hebdo_write_own" on public.saisies_hebdo
  for all using (
    public.is_admin() or (agence_id = public.current_agence_id() and commercial_id = auth.uid())
  ) with check (
    public.is_admin() or (agence_id = public.current_agence_id() and commercial_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- ventes / vente_services : lecture agence entière, écriture sur ses
-- propres ventes uniquement.
-- ---------------------------------------------------------------------------
create policy "ventes_select_own_agence" on public.ventes
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "ventes_write_own" on public.ventes
  for all using (
    public.is_admin() or (agence_id = public.current_agence_id() and commercial_id = auth.uid())
  ) with check (
    public.is_admin() or (agence_id = public.current_agence_id() and commercial_id = auth.uid())
  );

create policy "vente_services_select_own_agence" on public.vente_services
  for select using (
    public.is_admin() or exists (
      select 1 from public.ventes v
      where v.id = vente_services.vente_id and v.agence_id = public.current_agence_id()
    )
  );

create policy "vente_services_write_own" on public.vente_services
  for all using (
    public.is_admin() or exists (
      select 1 from public.ventes v
      where v.id = vente_services.vente_id
        and v.agence_id = public.current_agence_id()
        and v.commercial_id = auth.uid()
    )
  ) with check (
    public.is_admin() or exists (
      select 1 from public.ventes v
      where v.id = vente_services.vente_id
        and v.agence_id = public.current_agence_id()
        and v.commercial_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- objectifs : lecture par toute l'agence, écriture réservée à gerant/admin.
-- ---------------------------------------------------------------------------
create policy "objectifs_select_own_agence" on public.objectifs
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "objectifs_gerant_write" on public.objectifs
  for all using (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  ) with check (
    public.is_admin() or (public.is_gerant() and agence_id = public.current_agence_id())
  );

-- ---------------------------------------------------------------------------
-- plans_action / ressources : lecture par toute l'agence, écriture admin only.
-- ---------------------------------------------------------------------------
create policy "plans_action_select_own_agence" on public.plans_action
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "plans_action_admin_write" on public.plans_action
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ressources_select_own_agence" on public.ressources
  for select using (public.is_admin() or agence_id = public.current_agence_id());

create policy "ressources_admin_write" on public.ressources
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- audits : admin uniquement (placeholder V1).
-- ---------------------------------------------------------------------------
create policy "audits_admin_only" on public.audits
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- STORAGE : buckets privés + policies
-- Convention de chemin : {agence_id}/{nom_fichier}
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('plans-action', 'plans-action', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ressources', 'ressources', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "plans_action_storage_select" on storage.objects
  for select using (
    bucket_id = 'plans-action' and (
      public.is_admin() or (storage.foldername(name))[1] = public.current_agence_id()::text
    )
  );

create policy "plans_action_storage_admin_write" on storage.objects
  for all using (bucket_id = 'plans-action' and public.is_admin())
  with check (bucket_id = 'plans-action' and public.is_admin());

create policy "ressources_storage_select" on storage.objects
  for select using (
    bucket_id = 'ressources' and (
      public.is_admin() or (storage.foldername(name))[1] = public.current_agence_id()::text
    )
  );

create policy "ressources_storage_admin_write" on storage.objects
  for all using (bucket_id = 'ressources' and public.is_admin())
  with check (bucket_id = 'ressources' and public.is_admin());

create policy "logos_storage_public_select" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_storage_admin_write" on storage.objects
  for all using (bucket_id = 'logos' and public.is_admin())
  with check (bucket_id = 'logos' and public.is_admin());
