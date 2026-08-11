// ============================================================================
// COCKPIT — Edge Function : reset du mot de passe d'un compte existant
// Détient la clé service_role (jamais exposée au frontend). Vérifie les
// droits de l'appelant avant toute modification, mêmes règles que
// create-compte :
//   - admin : peut réinitialiser un gérant ou un commercial, sur n'importe
//     quelle agence
//   - gerant : peut uniquement réinitialiser un commercial de sa propre
//     agence
// À déployer via Dashboard Supabase → Edge Functions → New function → coller
// ce fichier (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// sont injectées automatiquement par Supabase, aucune config manuelle).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function reponseJson(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return reponseJson({ error: 'Non authentifié.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client "appelant" : identifie qui fait la requête via son propre JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser()

    if (userError || !user) {
      return reponseJson({ error: 'Non authentifié.' }, 401)
    }

    const { data: profilAppelant, error: profilError } = await callerClient
      .from('profiles')
      .select('role, agence_id')
      .eq('id', user.id)
      .single()

    if (profilError || !profilAppelant) {
      return reponseJson({ error: 'Profil introuvable.' }, 403)
    }

    if (profilAppelant.role !== 'admin' && profilAppelant.role !== 'gerant') {
      return reponseJson({ error: 'Droits insuffisants.' }, 403)
    }

    const body = await req.json()
    const { user_id, password } = body as { user_id?: string; password?: string }

    if (!user_id || !password) {
      return reponseJson({ error: 'Champs manquants.' }, 400)
    }

    if (password.length < 8) {
      return reponseJson({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: profilCible, error: profilCibleError } = await adminClient
      .from('profiles')
      .select('role, agence_id')
      .eq('id', user_id)
      .single()

    if (profilCibleError || !profilCible) {
      return reponseJson({ error: 'Compte introuvable.' }, 404)
    }

    // Un gérant ne peut réinitialiser qu'un commercial de sa propre agence
    if (
      profilAppelant.role === 'gerant' &&
      (profilCible.role !== 'commercial' || profilCible.agence_id !== profilAppelant.agence_id)
    ) {
      return reponseJson({ error: 'Droits insuffisants pour cette opération.' }, 403)
    }

    // Ni l'admin ni le gérant ne réinitialisent un compte admin depuis cet écran
    if (profilCible.role === 'admin') {
      return reponseJson({ error: 'Droits insuffisants pour cette opération.' }, 403)
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, { password })

    if (updateError) {
      return reponseJson({ error: updateError.message }, 400)
    }

    return reponseJson({ ok: true }, 200)
  } catch (e) {
    return reponseJson({ error: e instanceof Error ? e.message : 'Erreur inconnue.' }, 500)
  }
})
