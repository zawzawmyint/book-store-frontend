const covers = [
  ['#254b49', '#d7bd86'],
  ['#a75b48', '#f7e3b2'],
  ['#6f7d56', '#e9d8a4'],
  ['#5a547e', '#d9bed0'],
  ['#bb7e66', '#f8e2bd'],
  ['#314f69', '#d5cfab'],
  ['#523f50', '#e0b4a0'],
  ['#849078', '#f3d7ad'],
  ['#bd9c49', '#f7e9bd'],
  ['#4f2e32', '#d9b9a1'],
  ['#49606d', '#d9bd86'],
  ['#8d7183', '#f5d6ad'],
]

export function BookCover({
  id,
  title,
  author,
  large = false,
  compact = false,
}: {
  id: string
  title: string
  author: string
  large?: boolean
  compact?: boolean
}) {
  const index = Math.max(0, Number(id) - 1) % covers.length
  const [background, accent] = covers[index]
  if (compact)
    return (
      <div
        data-slot="book-cover-thumbnail"
        aria-hidden="true"
        className="relative flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-black/10 shadow-sm"
        style={{ backgroundColor: background, color: accent }}
      >
        <span className="absolute inset-y-0 left-0 w-1 bg-black/15" />
        <span className="border-y border-current/40 py-1 font-cover text-lg">
          {title.charAt(0)}
        </span>
      </div>
    )
  return (
    <div
      className={`book-cover relative flex aspect-[0.72] w-full flex-col overflow-hidden rounded-[3px] px-[12%] py-[12%] text-center shadow-[6px_8px_16px_rgba(43,35,28,.19)] ${large ? 'max-w-[310px]' : ''}`}
      style={{ backgroundColor: background, color: accent }}
      aria-label={`Cover design for ${title}`}
      role="img"
    >
      <span className="absolute inset-y-0 left-0 w-[5%] bg-black/15" />
      <span className="text-[9px] font-semibold uppercase tracking-[.32em] opacity-75 sm:text-[10px]">
        The Library Edit
      </span>
      <div className="my-auto border-y border-current/40 py-6">
        <span
          className="font-cover text-[clamp(1.1rem,2.7vw,2rem)] leading-[1.05] tracking-tight"
          style={{ fontSize: large ? 'clamp(1.5rem, 3vw, 2.7rem)' : undefined }}
        >
          {title}
        </span>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-[.18em] sm:text-[11px]">
        {author}
      </span>
    </div>
  )
}
