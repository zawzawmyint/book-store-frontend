import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { catalogUrl, parseCatalog } from './catalog'

type CatalogReturn = { url: string; y: number }
const positions = new Map<string, number>()

export function readCatalogReturn(state: unknown): CatalogReturn | null {
  if (!state || typeof state !== 'object' || !('catalogReturn' in state)) return null
  const value = state.catalogReturn
  if (!value || typeof value !== 'object' || !('url' in value) || !('y' in value)) return null
  if (
    typeof value.url !== 'string' ||
    typeof value.y !== 'number' ||
    !Number.isFinite(value.y) ||
    value.y < 0
  )
    return null
  if (!/^\/books(?:\?|$)/.test(value.url) || value.url.includes('\\')) return null
  const url = new URL(value.url, 'https://catalog.local')
  if (url.pathname !== '/books' || url.origin !== 'https://catalog.local') return null
  return { url: catalogUrl(parseCatalog(url.searchParams)), y: value.y }
}

export function catalogLinkState() {
  if (window.location.pathname !== '/books') return undefined
  return {
    catalogReturn: {
      url: catalogUrl(parseCatalog(new URLSearchParams(window.location.search))),
      y: window.scrollY,
    },
  }
}

export function useCatalogScroll(ready: boolean) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const restored = useRef<string | null>(null)
  const target = useRef<{ key: string; y: number | undefined } | null>(null)
  // Capture before a shorter loading layout can clamp scroll and overwrite history.
  useLayoutEffect(() => {
    if (target.current?.key !== location.key) {
      target.current = {
        key: location.key,
        y:
          readCatalogReturn(location.state)?.y ??
          (navigationType === 'POP' ? positions.get(location.key) : undefined),
      }
    }
  }, [location.key, location.state, navigationType])
  useEffect(() => {
    const record = () => {
      if (restored.current !== location.key) return
      positions.set(location.key, window.scrollY)
      if (positions.size > 100) positions.delete(positions.keys().next().value!)
    }
    window.addEventListener('scroll', record, { passive: true })
    return () => window.removeEventListener('scroll', record)
  }, [location.key])
  useEffect(() => {
    if (!ready || restored.current === location.key) return
    const y = target.current?.y
    const frame = requestAnimationFrame(() => {
      restored.current = location.key
      if (y !== undefined)
        window.scrollTo({
          top: Math.min(y, Math.max(0, document.documentElement.scrollHeight - window.innerHeight)),
          behavior: 'instant',
        })
      else if (location.state?.catalogChanged)
        document
          .getElementById('catalog-results')
          ?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [ready, location.key, location.state, navigationType])
}
