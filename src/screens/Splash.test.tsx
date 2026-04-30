import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Splash } from './Splash'
import { supabase } from '../lib/supabase'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    error: null,
    retryAuth: vi.fn(),
  }),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

describe('Splash', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows send errors on the email step', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email rate limit exceeded' },
    } as Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>)

    render(
      <MemoryRouter>
        <Splash />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'new@hap.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByText('Email rate limit exceeded')).toBeInTheDocument()
  })

  it('trims and lowercases email before requesting a code', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>)

    render(
      <MemoryRouter>
        <Splash />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: '  New@Hap.Test  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'new@hap.test',
        options: { shouldCreateUser: true },
      })
    })
  })
})
