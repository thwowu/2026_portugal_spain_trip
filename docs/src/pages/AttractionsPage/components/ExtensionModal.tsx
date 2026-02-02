import { CITIES } from '../../../data/core'
import type { CityExtensions } from '../../../data/extensions'
import { RichContent } from '../../../components/RichContent'
import { ZigzagTimeline } from '../../../components/ZigzagTimeline'
import { extractH3CarouselItems, stripCardLinesFromContent } from '../../../utils/extractCarouselItems'
import { titleZhOnly } from '../../../utils/titleZhOnly'
import { ModalSplitCard } from './ModalSplitCard'

export function ExtensionModal({
  cityId,
  tripId,
  data,
  onClose,
  onOpenImage,
}: {
  cityId: string
  tripId: string
  data: CityExtensions | undefined
  onClose: () => void
  onOpenImage?: (src: string, title: string) => void
}) {
  const trip = data?.trips.find((t) => t.id === tripId)
  if (!trip) return null

  return (
    <ModalSplitCard
      ariaLabel={titleZhOnly(trip.title)}
      headerTitle={titleZhOnly(trip.title)}
      headerSub={CITIES[cityId as keyof typeof CITIES]?.label}
      onClose={onClose}
      cardStyle={{ maxWidth: 'min(860px, 100%)' }}
      bodyTestId="extensions-modal-body"
      progressTestId="extensions-modal-progress"
    >
      <div style={{ display: 'grid', gap: 10 }}>
        {trip.sections.map((s) => (
          <section
            key={s.key}
            className="card expStatic"
            style={{ boxShadow: 'none' }}
            aria-label={titleZhOnly(s.title)}
          >
            <div className="expHeader expHeaderRow">
              <span className="expHeaderTitle">
                <span className="attrSectionTitleRow">
                  <span className="attrSectionTitleText">{titleZhOnly(s.title)}</span>
                </span>
              </span>
            </div>
            <div className="expStaticBody">
              {(() => {
                const raw = s.content ?? ''
                const items = extractH3CarouselItems(raw, { snippetMaxLen: 140 })
                if (items.length >= 2) {
                  return (
                    <ZigzagTimeline
                      items={items.map((it) => ({
                        title: it.title,
                        summary: it.summary,
                        content: it.content,
                      }))}
                    />
                  )
                }
                return (
                  <RichContent
                    content={stripCardLinesFromContent(raw)}
                    className="longformGrid prose attrProse attrProseEditorial"
                    onOpenImage={onOpenImage}
                  />
                )
              })()}
            </div>
          </section>
        ))}
      </div>
    </ModalSplitCard>
  )
}

