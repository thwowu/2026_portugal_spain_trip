import React, { useId, useMemo, useState } from 'react'
import { IconGoogleMaps } from './NavIcons'
import { parseBasicBlocks } from '../markdownLite/blocks'
import { tokenizeInline } from '../markdownLite/inline'
import { sanitizeHref } from '../utils/sanitizeHref'

function toSafeDomId(raw: string) {
  const s = (raw ?? '').toString()
  const cleaned = s.replace(/[^a-zA-Z0-9_-]/g, '')
  return cleaned || 'id'
}

function BilingualInline({ zh, en }: { zh: string; en: string }) {
  const [open, setOpen] = useState(false)
  const rid = useId()
  const safe = useMemo(() => toSafeDomId(rid), [rid])
  const inlineId = `bi-en-${safe}`
  const bubbleId = `bi-tip-${safe}`

  return (
    <span className="bi" data-open={open ? '1' : '0'}>
      <span className="biZh">{zh}</span>

      <button
        type="button"
        className="biHintBtn"
        aria-expanded={open}
        aria-controls={inlineId}
        aria-describedby={bubbleId}
        aria-label={open ? `隱藏英文：${zh}` : `顯示英文：${zh}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" className="biHintGlyph">
          {open ? '◃' : '►'}
        </span>
      </button>

      {/* Desktop hover/focus tooltip (CSS-controlled). */}
      <span id={bubbleId} role="tooltip" className="biBubble" aria-hidden="true">
        {en}
      </span>

      {/* Mobile expand: push layout (rendered when open so tests can assert easily). */}
      {open ? (
        <span id={inlineId} className="biEnInline">
          {en}
        </span>
      ) : null}
    </span>
  )
}

function BilingualLinkInline({ zh, en, href }: { zh: string; en: string; href: string }) {
  const [open, setOpen] = useState(false)
  const rid = useId()
  const safe = useMemo(() => toSafeDomId(rid), [rid])
  const inlineId = `bi-en-${safe}`
  const bubbleId = `bi-tip-${safe}`

  const safeHref = useMemo(() => sanitizeHref(href), [href])
  const isMaps = safeHref ? isGoogleMapsHref(safeHref) : false

  return (
    <span className="bi" data-open={open ? '1' : '0'}>
      <span className="biZh">
        {safeHref ? (
          <a href={safeHref} target="_blank" rel="noreferrer noopener" title={safeHref}>
            {zh}
          </a>
        ) : (
          zh
        )}
      </span>

      {/* Keep existing Maps icon UX. */}
      {isMaps && safeHref ? renderMapsIconLink({ key: `${safe}-maps`, href: safeHref }) : null}

      <button
        type="button"
        className="biHintBtn"
        aria-expanded={open}
        aria-controls={inlineId}
        aria-describedby={bubbleId}
        aria-label={open ? `隱藏英文：${zh}` : `顯示英文：${zh}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" className="biHintGlyph">
          {open ? '◃' : '►'}
        </span>
      </button>

      <span id={bubbleId} role="tooltip" className="biBubble" aria-hidden="true">
        {en}
      </span>

      {open ? (
        <span id={inlineId} className="biEnInline">
          {en}
        </span>
      ) : null}
    </span>
  )
}

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

export function FormattedInline({
  text,
  allowInteractiveBilingual = true,
}: {
  text: string
  allowInteractiveBilingual?: boolean
}) {
  const tokens = tokenizeInline(text)
  if (tokens.length === 0) return null

  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === 'text') return <React.Fragment key={i}>{t.value}</React.Fragment>
        if (t.kind === 'code') return <code key={i}>{t.value}</code>
        if (t.kind === 'bilingual') {
          if (!allowInteractiveBilingual) return <span key={i} title={t.en}>{t.zh}</span>
          return <BilingualInline key={i} zh={t.zh} en={t.en} />
        }
        if (t.kind === 'bilingual_link') {
          if (!allowInteractiveBilingual) return <span key={i} title={`${t.en} (${t.href})`}>{t.zh}</span>
          return <BilingualLinkInline key={i} zh={t.zh} en={t.en} href={t.href} />
        }
        if (t.kind === 'bold') return <strong key={i}>{t.value}</strong>
        if (t.kind === 'italic') return <em key={i}>{t.value}</em>
        if (t.kind === 'mark') return <mark key={i}>{t.value}</mark>
        if (t.kind === 'link') {
          const safeHref = sanitizeHref(t.href)
          if (!safeHref) return <React.Fragment key={i}>{t.label}</React.Fragment>
          if (isGoogleMapsHref(safeHref)) return renderMapsTextPlusIcon({ key: i, label: t.label, href: safeHref })
          return (
            <a key={i} href={safeHref} target="_blank" rel="noreferrer noopener">
              {t.label}
            </a>
          )
        }
        if (t.kind === 'url') {
          const safeHref = sanitizeHref(t.href)
          const label = formatUrlLabel(t.href)
          if (!safeHref) return <React.Fragment key={i}>{t.href}</React.Fragment>
          if (isGoogleMapsHref(safeHref)) return renderMapsTextPlusIcon({ key: i, label, href: safeHref })
          return (
            <a key={i} href={safeHref} target="_blank" rel="noreferrer noopener" title={safeHref}>
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

