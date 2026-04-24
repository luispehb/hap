import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfiles } from './useProfiles'

vi.mock('../lib/supabase', () => ({
  supabaseReady: true,
  supabaseRestUrl: 'https://example.supabase.co/rest/v1',
  supabaseRestHeaders: {
    apikey: 'test-key',
    Authorization: 'Bearer test-key',
  },
}))

describe('useProfiles', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('stops loading immediately when city is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const interests = ['music']

    const { result } = renderHook(() => useProfiles('', interests, 'user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profiles).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loads and sorts profiles by affinity', async () => {
    const interests = ['art', 'music']

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ([
        { id: '1', interests: ['music'], current_city: 'CDMX' },
        { id: '2', interests: ['art', 'music'], current_city: 'CDMX' },
        { id: '3', interests: ['tech'], current_city: 'CDMX' },
      ]),
    } as Response)

    const { result } = renderHook(() => useProfiles('Ciudad de México', interests, 'user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.profiles.map(profile => profile.id)).toEqual(['2', '1', '3'])
    expect(globalThis.fetch).toHaveBeenCalledOnce()
  })

  it('captures request failures without hanging', async () => {
    const interests = ['music']

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => useProfiles('Ciudad de México', interests))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profiles).toEqual([])
    expect(result.current.error).toContain('500')
  })
})
