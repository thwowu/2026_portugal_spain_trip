import { withBaseUrl } from '../utils/asset'
import { Modal } from './Modal'

export function Lightbox({
  open,
  src,
  alt,
  title,
  onClose,
}: {
  open: boolean
  src: string
  alt: string
  title?: string
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      ariaLabel={title ?? '圖片預覽'}
      onClose={onClose}
      overlayClassName="modalOverlay modalOverlayHigh modalOverlayDark modalOverlayCenter"
      cardClassName="card modalCard"
      cardStyle={{ maxWidth: 'min(var(--layout-max), 100%)', overflow: 'hidden' }}
    >
      <div
        style={{
          display: 'grid',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderBottom: '1px solid var(--hairline)',
          }}
        >
          <div style={{ fontWeight: 850 }}>{title ?? '圖片'}</div>
        </div>
        <div style={{ background: 'black' }}>
          <img
            src={withBaseUrl(src)}
            alt={alt}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      </div>
    </Modal>
  )
}

