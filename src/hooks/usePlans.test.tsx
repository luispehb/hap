import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlans } from './usePlans'

vi.mock('../lib/supabase', () => ({
  supabaseReady: true,
  supabaseRestUrl: 'https://example.supabase.co/rest/v1',
  supabaseRestHeaders: {
    apikey: 'test-key',
    Authorization: 'Bearer test-key',
  },
}))

describe('usePlans', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('stops loading immediately when city is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { result } = renderHook(() => usePlans(''))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.plans).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loads plans successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ([{ id: 'plan-1', title: 'Lunch', city: 'CDMX' }]),
    } as Response)

    const { result } = renderHook(() => usePlans('Ciudad de México'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.plans).toHaveLength(1)
  })

  it('falls back to an empty list on request failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => usePlans('Ciudad de México'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.plans).toEqual([])
  })
})
