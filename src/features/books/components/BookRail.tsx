import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nextRailPage, railEdges } from '../book-rail'
import { Button } from '../../../app/components/ui/button'
import { cn } from '../../../lib/utils'

function reducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function BookRail({
  label,
  title,
  actions,
  headerClassName,
  children,
}: {
  label: string
  title: ReactNode
  actions?: ReactNode
  headerClassName?: string
  children: ReactNode
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const hovered = useRef(false)
  const focused = useRef(false)
  const visible = useRef(true)
  const [edges, setEdges] = useState({ start: true, end: true })
  const itemCount = Children.count(children)
  const overflow = !(edges.start && edges.end)

  function publish(scrollLeft?: number) {
    const el = railRef.current
    if (!el) return
    const next = railEdges(scrollLeft ?? el.scrollLeft, el.clientWidth, el.scrollWidth)
    setEdges((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    )
  }

  function move(direction: -1 | 1, wrap = false) {
    const el = railRef.current
    if (!el) return
    const left = nextRailPage(el.scrollLeft, el.clientWidth, el.scrollWidth, direction, wrap)
    el.scrollTo({ left, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return
    publish()
    const onScroll = () => publish()
    el.addEventListener('scroll', onScroll, { passive: true })
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => publish()) : null
    observer?.observe(el)
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      observer?.disconnect()
      window.removeEventListener('resize', onScroll)
    }
  }, [itemCount])

  useEffect(() => {
    const el = railRef.current
    if (!el || !overflow) return
    let timer = 0
    const tick = () => {
      if (!paused.current && visible.current && !document.hidden && !reducedMotion()) move(1, true)
      timer = window.setTimeout(tick, 6000)
    }
    timer = window.setTimeout(tick, 6000)
    const shelf = el.closest('[data-book-rail]')
    const onVisibility = (entries: IntersectionObserverEntry[]) => {
      visible.current = entries.some((entry) => entry.isIntersecting)
    }
    const observer =
      shelf && typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(onVisibility, { threshold: 0.4 })
        : null
    if (shelf) observer?.observe(shelf)
    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
    }
  }, [overflow, itemCount])

  return (
    <div
      data-book-rail=""
      role="region"
      aria-label={label}
      aria-roledescription="carousel"
      onPointerEnter={() => {
        hovered.current = true
        paused.current = true
      }}
      onPointerLeave={() => {
        hovered.current = false
        paused.current = focused.current
      }}
      onFocusCapture={() => {
        focused.current = true
        paused.current = true
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          focused.current = false
          paused.current = hovered.current
        }
      }}
    >
      <div
        className={cn('page-shell flex flex-wrap items-end justify-between gap-5', headerClassName)}
      >
        {title}
        <div className="ml-auto flex items-center gap-3">
          {overflow && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="size-11 rounded-full"
                aria-label={`Show previous ${label}`}
                disabled={edges.start}
                onClick={() => move(-1)}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="size-11 rounded-full"
                aria-label={`Show next ${label}`}
                disabled={edges.end}
                onClick={() => move(1)}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </Button>
            </div>
          )}
          {actions}
        </div>
      </div>
      <div className="relative">
        <div ref={railRef} className="book-rail">
          {Children.map(children, (child) => (
            <div className="book-rail-card">{child}</div>
          ))}
        </div>
        {overflow && !edges.end && <div className="book-rail-fade" aria-hidden="true" />}
      </div>
    </div>
  )
}
