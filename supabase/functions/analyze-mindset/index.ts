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
    const { userId, mindsetAnswer } = await req.json()

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
        max_tokens: 400,
        system: `Eres un evaluador de perfiles para Hap, una app de viajeros de calidad curada.
Analiza la respuesta del usuario y devuelve SOLO un JSON válido con esta estructura:
{
  "tags": ["tag1", "tag2"],
  "summary": "Una sola oración de máximo 15 palabras",
  "recommendation": "approve" | "review" | "doubt"
}
Tags posibles: curioso, reflexivo, viajero real, growth mindset, empático, creativo, superficial, genérico, respuesta corta, copy-paste sospechoso.
recommendation: approve=respuesta genuina y curiosa | review=ambigua, requiere juicio humano | doubt=vacía, genérica o no alineada.
Responde ÚNICAMENTE con el JSON puro. Sin markdown, sin texto adicional.`,
        messages: [{ role: 'user', content: mindsetAnswer }],
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

    let analysis: { tags: string[]; summary: string; recommendation: string }
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
        mindset_recommendation: analysis.recommendation,
      })
      .eq('user_id', userId)

    if (dbError) {
      console.error('DB update error:', dbError)
      return jsonResponse({ error: 'DB update failed', detail: dbError.message }, 500)
    }

    return jsonResponse({ ok: true, recommendation: analysis.recommendation })
  } catch (err) {
    console.error('Unhandled error in analyze-mindset:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
