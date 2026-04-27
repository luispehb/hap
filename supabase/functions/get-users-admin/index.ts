import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) return new Response(JSON.stringify({ error }), { status: 500 })
  const emails = Object.fromEntries(users.map(u => [u.id, u.email]))
  return new Response(JSON.stringify({ emails }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
