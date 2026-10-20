export function paginationPages(
  page: number,
  totalPages: number,
): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  const last = Math.max(1, totalPages)
  if (last <= 5) return Array.from({ length: last }, (_, index) => index + 1)
  const start = Math.max(2, Math.min(page - 1, last - 3))
  const end = Math.min(last - 1, Math.max(page + 1, 4))
  return [
    1,
    ...(start > 2 ? ['ellipsis-start' as const] : []),
    ...Array.from({ length: end - start + 1 }, (_, index) => start + index),
    ...(end < last - 1 ? ['ellipsis-end' as const] : []),
    last,
  ]
}
