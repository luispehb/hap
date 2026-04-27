import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, mindsetAnswer } = await req.json()

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Eres un evaluador de perfiles para Hap, una app de viajeros de calidad curada.
Analiza la respuesta del usuario y devuelve SOLO un JSON válido con esta estructura:
{
  "tags": ["tag1", "tag2"],
  "summary": "Una sola oración de máximo 15 palabras",
  "recommendation": "approve" | "review" | "doubt",
  "signals": ["señal observada"]
}
Tags posibles: curioso, reflexivo, viajero real, growth mindset, empático, creativo, superficial, genérico, respuesta corta, copy-paste sospechoso.
recommendation: approve=respuesta genuina y curiosa | review=ambigua, requiere juicio humano | doubt=vacía, genérica o no alineada.
Responde ÚNICAMENTE con el JSON. Sin texto adicional.`,
      messages: [{ role: 'user', content: mindsetAnswer }]
    })
  })

  const data = await anthropicRes.json()
  const text = data.content[0].text.trim()
  const analysis = JSON.parse(text)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  await supabase.from('profiles').update({
    mindset_tags: analysis.tags,
    mindset_summary: analysis.summary,
    mindset_recommendation: analysis.recommendation,
  }).eq('user_id', userId)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
