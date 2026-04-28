import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, mindsetAnswer, travelStyle, travelFrequency, interests, hasInvite, linkedinUrl } = await req.json()

    if (!userId || !mindsetAnswer) {
      return jsonResponse({ error: 'Missing userId or mindsetAnswer' }, 400)
    }

    const apiKey =
      Deno.env.get('ANTHROPIC_API_KEY') ??
      Deno.env.get('ANTHROPIC_SECRET_KEY') ??
      Deno.env.get('CLAUDE_API_KEY')

    if (!apiKey) {
      console.error('Anthropic API key secret not set')
      return jsonResponse({
        error: 'Anthropic API key not configured',
        detail: 'Set ANTHROPIC_API_KEY in Supabase Edge Function secrets.',
      }, 500)
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: `Eres el evaluador de admisión de Hap — una comunidad curada de viajeros con growth mindset.
Tu trabajo es analizar el perfil completo de un nuevo usuario y generar un análisis rico que ayude tanto al admin como al propio usuario a entender su fit con Hap.
Recibirás un JSON con:

mindsetAnswer: su respuesta a "¿Cuándo fue la última vez que algo te cambió la forma de ver algo?"
travelStyle: su estilo de viaje declarado
travelFrequency: con qué viaja
interests: sus intereses seleccionados
hasInvite: si llegó con código de invitación
linkedinUrl: si proporcionó LinkedIn

Devuelve SOLO un JSON válido con esta estructura exacta:
{
"tags": ["tag1", "tag2", "tag3"],
"summary": "Oración de máximo 20 palabras describiendo su perfil en tono positivo",
"welcome_note": "Mensaje personalizado de bienvenida de 2-3 oraciones. Menciona algo específico de su respuesta. Tono cálido, curioso, como si lo escribiera un miembro del equipo Hap. No genérico.",
"compatibility_score": 0-100,
"compatibility_reason": "Una oración explicando el score",
"recommendation": "approve" | "review" | "doubt"
}
Tags posibles (elige 2-4 que apliquen):
curioso, reflexivo, viajero real, growth mindset, empático, creativo, lector, nómada, explorador local, conector, pensador, aventurero, superficial, genérico, respuesta corta, copy-paste sospechoso
Criterios para recommendation:

approve: respuesta genuina, específica, refleja crecimiento real (>60 chars con contenido sustancial)
review: ambigua, interesante pero corta, o requiere contexto humano
doubt: respuesta vacía, genérica ("un viaje a X"), o claramente no alineada con Hap

compatibility_score:

85-100: respuesta profunda + intereses variados + viaja frecuente
65-84: respuesta buena + perfil coherente
40-64: respuesta ok pero perfil básico
<40: respuesta débil o señales de alerta

Responde ÚNICAMENTE con el JSON puro. Sin markdown, sin texto adicional.`,
        messages: [{ role: 'user', content: JSON.stringify({ mindsetAnswer, travelStyle, travelFrequency, interests, hasInvite, linkedinUrl }) }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('Anthropic API error:', anthropicRes.status, errBody)
      return jsonResponse({ error: 'Anthropic API error', status: anthropicRes.status, body: errBody }, 500)
    }

    const data = await anthropicRes.json()
    const rawText = data.content?.[0]?.text?.trim() ?? ''

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let analysis: { tags: string[]; summary: string; welcome_note: string; compatibility_score: number; compatibility_reason: string; recommendation: string }
    try {
      analysis = JSON.parse(jsonText)
    } catch (parseErr) {
      console.error('JSON parse failed. Raw text:', rawText, 'Error:', parseErr)
      return jsonResponse({ error: 'Failed to parse Claude response', raw: rawText }, 500)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        mindset_tags: analysis.tags,
        mindset_summary: analysis.summary,
        mindset_welcome_note: analysis.welcome_note,
        mindset_compatibility_score: analysis.compatibility_score,
        mindset_recommendation: analysis.recommendation,
      })
      .eq('user_id', userId)

    if (dbError) {
      console.error('DB update error:', dbError)
      return jsonResponse({ error: 'DB update failed', detail: dbError.message }, 500)
    }

    return jsonResponse({ ok: true, recommendation: analysis.recommendation, welcome_note: analysis.welcome_note, compatibility_score: analysis.compatibility_score })
  } catch (err) {
    console.error('Unhandled error in analyze-mindset:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
