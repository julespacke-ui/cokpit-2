// ============================================================================
// COCKPIT — Edge Function : création d'un compte (gérant ou commercial)
// Détient la clé service_role (jamais exposée au frontend). Vérifie les
// droits de l'appelant avant toute création :
//   - admin : peut créer un gérant ou un commercial, sur n'importe quelle agence
//   - gerant : peut uniquement créer un commercial, sur sa propre agence
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
    const { email, password, prenom, nom, role, agence_id } = body as {
      email?: string
      password?: string
      prenom?: string
      nom?: string
      role?: string
      agence_id?: string
    }

    if (!email || !password || !prenom || !nom || !role || !agence_id) {
      return reponseJson({ error: 'Champs manquants.' }, 400)
    }

    if (role !== 'gerant' && role !== 'commercial') {
      return reponseJson({ error: 'Rôle invalide.' }, 400)
    }

    if (password.length < 8) {
      return reponseJson({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400)
    }

    // Un gérant ne peut créer qu'un commercial, sur sa propre agence
    if (profilAppelant.role === 'gerant' && (role !== 'commercial' || agence_id !== profilAppelant.agence_id)) {
      return reponseJson({ error: 'Droits insuffisants pour cette opération.' }, 403)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !created.user) {
      return reponseJson({ error: createError?.message ?? 'Création du compte impossible.' }, 400)
    }

    const { error: insertError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      agence_id,
      role,
      prenom,
      nom,
      actif: true,
    })

    if (insertError) {
      // Rollback : le compte auth ne doit pas exister sans profil correspondant
      await adminClient.auth.admin.deleteUser(created.user.id)
      return reponseJson({ error: insertError.message }, 400)
    }

    return reponseJson({ id: created.user.id }, 200)
  } catch (e) {
    return reponseJson({ error: e instanceof Error ? e.message : 'Erreur inconnue.' }, 500)
  }
})
