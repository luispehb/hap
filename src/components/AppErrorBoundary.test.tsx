import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function Crasher(): null {
  throw new Error('boom')
}

describe('AppErrorBoundary', () => {
  it('renders a recovery UI when a child crashes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <Crasher />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument()

    spy.mockRestore()
  })
})
