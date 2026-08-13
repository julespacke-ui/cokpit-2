-- Ajoute "Réseaux sociaux" aux origines de vente possibles.
alter table public.ventes drop constraint ventes_origine_vente_check;

alter table public.ventes add constraint ventes_origine_vente_check check (
  origine_vente in (
    'recommandation', 'lead_internet', 'reseaux_sociaux', 'prospection', 'passage', 'liste_chaude', 'autre'
  )
);
