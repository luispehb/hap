import { supabase } from '../lib/supabase'

export interface OnboardingData {
  display_name: string
  home_city: string
  current_city: string
  is_local: boolean
  trip_start_date: string | null
  trip_end_date: string | null
  interests: string[]
  bio_question: string
  avatar_url?: string
}

export async function saveProfile(
  userId: string,
  data: OnboardingData
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: data.display_name,
        home_city: data.home_city,
        current_city: data.current_city,
        is_local: data.is_local,
        trip_start_date: data.trip_start_date,
        trip_end_date: data.trip_end_date,
        interests: data.interests,
        bio_question: data.bio_question,
      })
      .eq('user_id', userId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: data.display_name,
        home_city: data.home_city,
        current_city: data.current_city,
        is_local: data.is_local,
        trip_start_date: data.trip_start_date,
        trip_end_date: data.trip_end_date,
        interests: data.interests,
        bio_question: data.bio_question,
        trust_score: 50,
        is_verified: false,
        membership_status: 'trial',
      })
    if (error) return { error: error.message }
  }

  return { error: null }
}

export async function saveAdmission(
  userId: string,
  answer: string,
  invitedBy?: string
): Promise<void> {
  await supabase.from('admissions').insert({
    user_id: userId,
    answer_1: answer,
    invited_by: invitedBy ?? null,
    status: 'pending',
  })
}
