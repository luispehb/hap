import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('ProtectedRoute', () => {
  it('renders children while auth is loading if a cached profile exists', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: { id: 'profile-1', current_city: 'Ciudad de México' },
      loading: true,
      error: null,
      retryAuth: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Feed content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText('Feed content')).toBeInTheDocument()
  })

  it('shows loading UI when there is no profile yet', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: null,
      loading: true,
      error: 'Loading your profile is taking longer than usual.',
      retryAuth: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Feed content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText(/hap/i)).toBeInTheDocument()
  })
})
