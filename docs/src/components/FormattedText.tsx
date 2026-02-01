import React from 'react'
import { IconGoogleMaps } from './NavIcons'
import { parseBasicBlocks } from '../markdownLite/blocks'
import { tokenizeInline } from '../markdownLite/inline'

function isGoogleMapsHref(href: string) {
  try {
    const u = new URL(href)
    const host = (u.hostname || '').replace(/^www\./, '').toLowerCase()
    const path = (u.pathname || '').toLowerCase()

    // Google redirect wrapper (occasionally appears when copying links)
    if ((host === 'google.com' || host.startsWith('google.')) && path === '/url') {
      const wrapped = u.searchParams.get('q') || u.searchParams.get('url')
      if (wrapped && (wrapped.startsWith('http://') || wrapped.startsWith('https://'))) {
        return isGoogleMapsHref(wrapped)
      }
    }

    // Short links
    if (host === 'maps.app.goo.gl') return true
    if (host === 'goo.gl') return path.startsWith('/maps')

    // google.{tld}/maps... or maps.google.{tld}/...
    const isGoogleHost =
      host === 'google.com' ||
      host.startsWith('google.') ||
      host === 'maps.google.com' ||
      host.startsWith('maps.google.')
    if (isGoogleHost) return path.startsWith('/maps') || path.includes('/maps/')
  } catch {
    // ignore
  }
  return false
}

function renderMapsIconLink({ key, href }: { key: React.Key; href: string }) {
  return (
    <a
      key={key}
      className="mapsIconLink"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="在 Google Maps 開啟"
      title={href}
    >
      <IconGoogleMaps size={18} />
    </a>
  )
}

function renderMapsTextPlusIcon({ key, label, href }: { key: React.Key; label: string; href: string }) {
  return (
    <span key={key} className="mapsTextWithIcon">
      <a className="mapsTextLink" href={href} target="_blank" rel="noreferrer noopener" title={href}>
        {label}
      </a>
      {renderMapsIconLink({ key: `${String(key)}-icon`, href })}
    </span>
  )
}

function formatUrlLabel(href: string) {
  try {
    const u = new URL(href)
    const host = (u.hostname || '').replace(/^www\./, '')
    // Friendly labels for common travel references
    if (host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'google.com' || host === 'www.google.com') {
      if (u.pathname.includes('/maps') || host.includes('goo.gl') || host.includes('maps')) return 'Google Maps'
    }
    if (host.endsWith('klook.com')) return 'Klook'
    if (host.endsWith('getyourguide.com')) return 'GetYourGuide'
    if (host.endsWith('booking.com')) return 'Booking.com'
    if (host.endsWith('airbnb.com')) return 'Airbnb'
    if (host.endsWith('rome2rio.com')) return 'Rome2Rio'
    if (host) return host
  } catch {
    // ignore
  }
  return '連結'
}

export function FormattedInline({ text }: { text: string }) {
  const tokens = tokenizeInline(text)
  if (tokens.length === 0) return null

  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === 'text') return <React.Fragment key={i}>{t.value}</React.Fragment>
        if (t.kind === 'code') return <code key={i}>{t.value}</code>
        if (t.kind === 'bold') return <strong key={i}>{t.value}</strong>
        if (t.kind === 'italic') return <em key={i}>{t.value}</em>
        if (t.kind === 'mark') return <mark key={i}>{t.value}</mark>
        if (t.kind === 'link') {
          if (isGoogleMapsHref(t.href)) return renderMapsTextPlusIcon({ key: i, label: t.label, href: t.href })
          return (
            <a key={i} href={t.href} target="_blank" rel="noreferrer noopener">
              {t.label}
            </a>
          )
        }
        if (t.kind === 'url') {
          const label = formatUrlLabel(t.href)
          if (isGoogleMapsHref(t.href)) return renderMapsTextPlusIcon({ key: i, label, href: t.href })
          return (
            <a key={i} href={t.href} target="_blank" rel="noreferrer noopener" title={t.href}>
              {label}
            </a>
          )
        }
        return null
      })}
    </>
  )
}

export function FormattedText({
  text,
  className = 'prose',
}: {
  text: string
  className?: string
}) {
  const blocks = parseBasicBlocks(text)

  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        if (b.kind === 'ul') {
          return (
            <ul key={idx}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}`}>
                  <FormattedInline text={it} />
                </li>
              ))}
            </ul>
          )
        }
        if (b.kind === 'ol') {
          return (
            <ol key={idx}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}`}>
                  <FormattedInline text={it} />
                </li>
              ))}
            </ol>
          )
        }
        if (b.kind === 'checklist') {
          return (
            <ul key={idx} style={{ listStyle: 'none', paddingLeft: 0 }}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 8 }}>
                  <span aria-hidden="true" style={{ width: 18, textAlign: 'center' }}>
                    {it.checked ? '☑' : '☐'}
                  </span>
                  <span>
                    <FormattedInline text={it.text} />
                  </span>
                </li>
              ))}
            </ul>
          )
        }
        if (b.kind === 'quote') {
          return (
            <blockquote
              key={idx}
              style={{
                margin: 0,
                padding: '10px 12px',
                borderLeft: '4px solid color-mix(in oklab, var(--accent) 25%, var(--hairline))',
                background: 'color-mix(in oklab, var(--surface-2) 55%, white)',
                borderRadius: 12,
              }}
            >
              <FormattedText text={b.text} className={className} />
            </blockquote>
          )
        }
        if (b.kind === 'h') {
          const Tag = b.level === 4 ? 'h4' : b.level === 3 ? 'h3' : 'h2'
          return (
            <Tag key={idx} style={{ margin: idx === 0 ? 0 : '12px 0 0 0', fontWeight: 900, lineHeight: 1.2 }}>
              <FormattedInline text={b.text} />
            </Tag>
          )
        }
        return (
          <p key={idx} style={{ whiteSpace: 'pre-wrap' }}>
            <FormattedInline text={b.text} />
          </p>
        )
      })}
    </div>
  )
}

