export function nextRailPage(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  direction: -1 | 1,
  wrap = false,
) {
  const max = Math.max(0, scrollWidth - clientWidth)
  if (clientWidth < 1 || max < 1) return scrollLeft
  const next = scrollLeft + direction * clientWidth
  if (next > max) {
    if (wrap && scrollLeft >= max - 1) return 0
    return max
  }
  if (next < 0) {
    if (wrap && scrollLeft <= 1) return max
    return 0
  }
  return next
}

export function railEdges(scrollLeft: number, clientWidth: number, scrollWidth: number) {
  const max = scrollWidth - clientWidth
  return {
    start: scrollLeft <= 1,
    end: max <= 1 || scrollLeft >= max - 1,
  }
}
