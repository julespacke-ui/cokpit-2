-- Attribution multi-commerciaux sur une vente : chaque étape du processus
-- (RDV, mandat, réservation, livraison, extension de garantie) peut être
-- réalisée par une personne différente de celle qui saisit la fiche — sert
-- de base au calcul de rémunération (cf. 0018_taux_remuneration.sql).
-- Toutes optionnelles, "on delete set null" pour ne pas perdre l'historique
-- de la vente si le profil attribué est un jour désactivé/supprimé.
alter table public.ventes
  add column rdv_commercial_id uuid references public.profiles(id) on delete set null,
  add column mandat_commercial_id uuid references public.profiles(id) on delete set null,
  add column reservation_commercial_id uuid references public.profiles(id) on delete set null,
  add column livraison_commercial_id uuid references public.profiles(id) on delete set null,
  add column extension_commercial_id uuid references public.profiles(id) on delete set null;
