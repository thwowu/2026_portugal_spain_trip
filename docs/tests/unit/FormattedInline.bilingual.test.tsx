import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormattedInline } from '../../src/components/FormattedText'

describe('FormattedInline bilingual', () => {
  it('shows zh, and toggles en by clicking the hint button', () => {
    const { getByText, getByRole, queryByText } = render(
      <div>
        <FormattedInline text="A{{bi:中文|English}}B" />
      </div>,
    )

    expect(getByText('中文')).toBeTruthy()
    // Tooltip exists in DOM; the inline expansion should not.
    expect(queryByText('English', { selector: '.biEnInline' })).toBeNull()

    const btn = getByRole('button', { name: '顯示英文：中文' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(btn)
    expect(getByText('English', { selector: '.biEnInline' })).toBeTruthy()
    expect(btn).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(btn)
    expect(queryByText('English', { selector: '.biEnInline' })).toBeNull()
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders {{bilink:...}} as a clickable link and keeps the same toggle behavior', () => {
    const { getByRole, getByText, queryByText } = render(
      <div>
        <FormattedInline text="A{{bilink:中文|English|https://example.com/x}}B" />
      </div>,
    )

    const link = getByRole('link', { name: '中文' }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('https://example.com/x')

    expect(queryByText('English', { selector: '.biEnInline' })).toBeNull()

    const btn = getByRole('button', { name: '顯示英文：中文' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(btn)
    expect(getByText('English', { selector: '.biEnInline' })).toBeTruthy()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not render unsafe bilink hrefs as anchors', () => {
    const { getByText, queryByRole } = render(
      <div>
        <FormattedInline text="A{{bilink:中文|English|javascript:alert(1)}}B" />
      </div>,
    )

    expect(getByText('A{{bilink:中文|English|javascript:alert(1)}}B')).toBeTruthy()
    expect(queryByRole('link', { name: '中文' })).toBeNull()
  })
})

