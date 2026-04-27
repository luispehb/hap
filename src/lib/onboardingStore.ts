interface OnboardingStore {
  first_name: string
  last_name: string
  display_name: string
  photo_url: string
  origin_city: string
  current_city: string
  is_local: boolean
  trip_start_date: string | null
  trip_end_date: string | null
  interests: string[]
  bio_question: string
  mindset_answer: string
  travel_style: string
  travel_frequency: string
  linkedin_url: string
  trust_score: number
}

let store: Partial<OnboardingStore> = {}

export const onboardingStore = {
  set: (data: Partial<OnboardingStore>) => { store = { ...store, ...data } },
  get: (): Partial<OnboardingStore> => store,
  clear: () => { store = {} },
}
