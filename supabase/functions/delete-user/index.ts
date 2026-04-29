import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_USER_ID = 'aeef7b13-4e49-4c3d-a8d8-372dc5566d22'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authorization = req.headers.get('Authorization')
  if (!authorization) {
    return json({ error: 'Missing authorization header' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(
    authorization.replace('Bearer ', ''),
  )
  if (callerError || caller?.id !== ADMIN_USER_ID) {
    return json({ error: 'Unauthorized' }, 403)
  }

  const { userId } = await req.json().catch(() => ({ userId: null }))
  if (!userId || typeof userId !== 'string') {
    return json({ error: 'Missing userId' }, 400)
  }

  if (userId === ADMIN_USER_ID) {
    return json({ error: 'Cannot delete the admin user' }, 400)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) {
    return json({ error: 'Could not load target profile', detail: profileError.message }, 500)
  }

  if (profile?.id) {
    const { data: createdPlans, error: plansError } = await supabase
      .from('plans')
      .select('id')
      .eq('creator_id', profile.id)

    if (plansError) {
      return json({ error: 'Could not load target plans', detail: plansError.message }, 500)
    }

    const cleanupSteps = [
      supabase.from('admissions').update({ invited_by: null }).eq('invited_by', profile.id),
      supabase.from('invitations').update({ used_by: null }).eq('used_by', profile.id),
    ]

    const createdPlanIds = createdPlans?.map((plan) => plan.id) ?? []
    if (createdPlanIds.length > 0) {
      cleanupSteps.push(
        supabase.from('connections').update({ plan_id: null }).in('plan_id', createdPlanIds),
      )
    }

    for (const step of cleanupSteps) {
      const { error } = await step
      if (error) {
        return json({ error: 'Could not clean user references', detail: error.message }, 500)
      }
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error && error.message !== 'User not found') {
    return json({ error: 'Could not delete user', detail: error.message }, 500)
  }

  if (error?.message === 'User not found' && profile?.id) {
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id)

    if (deleteProfileError) {
      return json({ error: 'Could not delete orphan profile', detail: deleteProfileError.message }, 500)
    }
  }

  return json({ ok: true })
})
