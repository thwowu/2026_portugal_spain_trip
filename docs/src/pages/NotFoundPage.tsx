import { Link } from 'react-router-dom'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'

export function NotFoundPage() {
  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="找不到這個頁面"
            subtitle={
              <>
                回到 <Link to="/dashboard">規劃看板</Link>。
              </>
            }
            image={{
              src: ILLUSTRATION.heroNotFound.src,
              fallbackSrc: ILLUSTRATION.cover3d.src,
              alt: ILLUSTRATION.heroNotFound.alt,
            }}
          />
        </div>
      </div>
    </div>
  )
}

