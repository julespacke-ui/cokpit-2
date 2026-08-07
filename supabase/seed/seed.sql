-- ============================================================================
-- COCKPIT — Seed de démo
-- Pré-requis : créer au préalable les 3 comptes suivants dans
-- Dashboard Supabase → Authentication → Users → Add user (Auto Confirm User) :
--   gerant.demo@cockpit-demo.fr
--   julien.demo@cockpit-demo.fr
--   camille.demo@cockpit-demo.fr
-- Puis exécuter ce script dans le SQL Editor.
-- ============================================================================

do $$
declare
  v_agence_id uuid;
  v_gerant_id uuid;
  v_julien_id uuid;
  v_camille_id uuid;
  v_pack_id uuid;
  v_ext_12_id uuid;
  v_ext_24_id uuid;
  v_vente_id uuid;
begin
  select id into v_gerant_id from auth.users where email = 'gerant.demo@cockpit-demo.fr';
  select id into v_julien_id from auth.users where email = 'julien.demo@cockpit-demo.fr';
  select id into v_camille_id from auth.users where email = 'camille.demo@cockpit-demo.fr';

  if v_gerant_id is null or v_julien_id is null or v_camille_id is null then
    raise exception 'Les 3 comptes de démo doivent d''abord être créés dans Authentication > Users';
  end if;

  -- Agence
  insert into public.agences (nom, ville)
  values ('Agence Démo', 'Lyon')
  returning id into v_agence_id;

  -- Profils
  insert into public.profiles (id, agence_id, role, prenom, nom, actif) values
    (v_gerant_id, v_agence_id, 'gerant', 'Sophie', 'Martin', true),
    (v_julien_id, v_agence_id, 'commercial', 'Julien', 'Faure', true),
    (v_camille_id, v_agence_id, 'commercial', 'Camille', 'Perrot', true);

  -- Barème honoraires (tranches)
  insert into public.baremes_honoraires (agence_id, type, config) values (
    v_agence_id, 'tranches',
    '{"tranches": [
      {"min": 0, "max": 8000, "honoraires": 990},
      {"min": 8000, "max": 15000, "honoraires": 1490},
      {"min": 15000, "max": 999999, "honoraires": 1990}
    ]}'::jsonb
  );

  -- Pack MER
  insert into public.packs_mer (agence_id, nom, prix, actif)
  values (v_agence_id, 'Pack Sérénité', 149.00, true)
  returning id into v_pack_id;

  -- Extensions de garantie
  insert into public.extensions_garantie (agence_id, nom, prix_client, commission_agence, actif)
  values (v_agence_id, 'Garantie 12 mois', 590.00, 180.00, true)
  returning id into v_ext_12_id;

  insert into public.extensions_garantie (agence_id, nom, prix_client, commission_agence, actif)
  values (v_agence_id, 'Garantie 24 mois', 890.00, 260.00, true)
  returning id into v_ext_24_id;

  -- Objectifs agence (juillet + août)
  insert into public.objectifs (agence_id, commercial_id, periode, cibles) values
    (v_agence_id, null, '2026-07-01', '{"ventes": 8, "ca_honoraires": 9000, "rdv_semaine": 10, "mandats": 6, "videos": 4}'::jsonb),
    (v_agence_id, null, '2026-08-01', '{"ventes": 8, "ca_honoraires": 9000, "rdv_semaine": 10, "mandats": 6, "videos": 4}'::jsonb),
    (v_agence_id, v_julien_id, '2026-08-01', '{"ventes": 5, "ca_honoraires": 5500, "mandats": 4}'::jsonb);

  -- ==========================================================================
  -- Saisies hebdo — Julien (performeur régulier, remplit tout)
  -- ==========================================================================
  insert into public.saisies_hebdo (
    commercial_id, agence_id, semaine,
    appels_passes, leads_traites, rdv_pris, rdv_venus, mandats_rentres,
    leads_acheteurs, propositions_commerciales, visites,
    videos_postees, prospections_exterieures,
    liste_chaude_levee, sortie_prospection_faite, videos_prevues_publiees,
    stock_entrees, stock_sorties, stock_total, nb_avis_recus
  ) values
    (v_julien_id, v_agence_id, '2026-07-06', 48, 32, 13, 11, 6, 22, 9, 6, 2, 1, true, true, true, 3, 2, 16, 2),
    (v_julien_id, v_agence_id, '2026-07-13', 51, 34, 14, 12, 7, 24, 10, 7, 1, 1, true, true, true, 2, 3, 15, 1),
    (v_julien_id, v_agence_id, '2026-07-20', 40, 28, 11, 9, 5, 18, 7, 5, 2, 0, true, false, false, 1, 2, 14, 1),
    (v_julien_id, v_agence_id, '2026-07-27', 55, 36, 15, 13, 8, 26, 11, 8, 3, 1, true, true, true, 4, 3, 15, 3),
    (v_julien_id, v_agence_id, '2026-08-03', 22, 15, 6, 5, 3, 10, 4, 3, 1, 1, true, true, true, 1, 1, 15, 1);

  -- Saisies hebdo — Camille (ne remplit que la semaine en cours, aucune saisie
  -- en juillet : sert de cas de test pour l'alerte de non-remplissage)
  insert into public.saisies_hebdo (
    commercial_id, agence_id, semaine,
    appels_passes, leads_traites, rdv_pris, rdv_venus, mandats_rentres,
    leads_acheteurs, propositions_commerciales, visites,
    videos_postees, prospections_exterieures,
    liste_chaude_levee, sortie_prospection_faite, videos_prevues_publiees,
    stock_entrees, stock_sorties, stock_total, nb_avis_recus
  ) values
    (v_camille_id, v_agence_id, '2026-08-03', 18, 10, 4, 3, 1, 6, 2, 1, 0, 0, false, false, false, 0, 1, 15, 0);

  -- Saisie hebdo — Sophie (gérante, vend occasionnellement)
  insert into public.saisies_hebdo (
    commercial_id, agence_id, semaine,
    appels_passes, leads_traites, rdv_pris, rdv_venus, mandats_rentres,
    leads_acheteurs, propositions_commerciales, visites,
    videos_postees, prospections_exterieures,
    liste_chaude_levee, sortie_prospection_faite, videos_prevues_publiees,
    stock_entrees, stock_sorties, stock_total, nb_avis_recus
  ) values
    (v_gerant_id, v_agence_id, '2026-08-03', 8, 5, 2, 2, 1, 4, 2, 1, 0, 0, false, false, false, 0, 0, 15, 0);

  -- ==========================================================================
  -- Ventes
  -- ==========================================================================

  -- Julien : 3 ventes en juillet, 1 en août
  insert into public.ventes (
    commercial_id, agence_id, date_vente, vehicule, prix_vente,
    honoraires_preconises, honoraires_reels, pack_mer_id, carte_grise_montant,
    extension_garantie_id, origine_vente, avis_laisse
  ) values (
    v_julien_id, v_agence_id, '2026-07-08', 'Peugeot 3008', 18500,
    1990, 1990, v_pack_id, 62.50, v_ext_12_id, 'recommandation', true
  ) returning id into v_vente_id;
  insert into public.vente_services (vente_id, libelle, prix) values (v_vente_id, 'Rédaction certificat de cession express', 39.00);

  insert into public.ventes (
    commercial_id, agence_id, date_vente, vehicule, prix_vente,
    honoraires_preconises, honoraires_reels, pack_mer_id, carte_grise_montant,
    extension_garantie_id, origine_vente, avis_laisse
  ) values (
    v_julien_id, v_agence_id, '2026-07-16', 'Renault Clio', 9800,
    1490, 1290, v_pack_id, 45.30, null, 'prospection', false
  );

  insert into public.ventes (
    commercial_id, agence_id, date_vente, vehicule, prix_vente,
    honoraires_preconises, honoraires_reels, pack_mer_id, carte_grise_montant,
    extension_garantie_id, origine_vente, avis_laisse
  ) values (
    v_julien_id, v_agence_id, '2026-07-29', 'Citroën C3', 7200,
    990, 990, v_pack_id, 38.00, v_ext_12_id, 'liste_chaude', true
  );

  insert into public.ventes (
    commercial_id, agence_id, date_vente, vehicule, prix_vente,
    honoraires_preconises, honoraires_reels, pack_mer_id, carte_grise_montant,
    extension_garantie_id, origine_vente, avis_laisse
  ) values (
    v_julien_id, v_agence_id, '2026-08-04', 'Volkswagen Golf', 16400,
    1490, 1490, v_pack_id, 58.90, v_ext_24_id, 'lead_internet', false
  ) returning id into v_vente_id;
  insert into public.vente_services (vente_id, libelle, prix) values (v_vente_id, 'Livraison à domicile', 79.00);

  -- Camille : 1 vente en août
  insert into public.ventes (
    commercial_id, agence_id, date_vente, vehicule, prix_vente,
    honoraires_preconises, honoraires_reels, pack_mer_id, carte_grise_montant,
    extension_garantie_id, origine_vente, avis_laisse
  ) values (
    v_camille_id, v_agence_id, '2026-08-05', 'Toyota Yaris', 11200,
    1490, 1090, v_pack_id, 41.20, null, 'passage', false
  );

  -- Sophie (gérante) : 1 vente en août
  insert into public.ventes (
    commercial_id, agence_id, date_vente, vehicule, prix_vente,
    honoraires_preconises, honoraires_reels, pack_mer_id, carte_grise_montant,
    extension_garantie_id, origine_vente, avis_laisse
  ) values (
    v_gerant_id, v_agence_id, '2026-08-02', 'BMW Série 1', 21000,
    1990, 1990, v_pack_id, 68.00, v_ext_24_id, 'recommandation', true
  );

end $$;
