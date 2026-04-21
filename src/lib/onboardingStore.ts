interface OnboardingStore {
  display_name: string
  origin_city: string
  current_city: string
  is_local: boolean
  trip_start_date: string | null
  trip_end_date: string | null
  interests: string[]
  bio_question: string
}

let store: Partial<OnboardingStore> = {}

export const onboardingStore = {
  set: (data: Partial<OnboardingStore>) => { store = { ...store, ...data } },
  get: (): Partial<OnboardingStore> => store,
  clear: () => { store = {} },
}
