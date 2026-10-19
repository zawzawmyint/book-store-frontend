import { useState } from 'react'

export type CoverImage = { url: string; width: number; height: number }

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
  cover,
  decorative = false,
  eager = false,
}: {
  id: string
  title: string
  author: string
  large?: boolean
  compact?: boolean
  cover?: CoverImage | null
  decorative?: boolean
  eager?: boolean
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (cover && failedUrl !== cover.url)
    return (
      <div
        data-slot={compact ? 'book-cover-thumbnail' : 'book-cover-image'}
        className={
          compact
            ? 'flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-cover-panel'
            : `book-cover flex aspect-[0.72] w-full items-center justify-center overflow-hidden rounded-[3px] bg-cover-panel shadow-[6px_8px_16px_rgba(43,35,28,.19)] ${large ? 'max-w-[310px]' : ''}`
        }
      >
        <img
          src={cover.url}
          alt={decorative || compact ? '' : `Cover of ${title}`}
          width={cover.width}
          height={cover.height}
          loading={large || eager ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailedUrl(cover.url)}
        />
      </div>
    )
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
      className={`book-cover @container relative flex aspect-[0.72] w-full flex-col overflow-hidden rounded-[3px] px-[12%] py-[12%] text-center shadow-[6px_8px_16px_rgba(43,35,28,.19)] ${large ? 'max-w-[310px]' : ''}`}
      style={{ backgroundColor: background, color: accent }}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Cover design for ${title}`}
      role={decorative ? undefined : 'img'}
    >
      <span className="absolute inset-y-0 left-0 w-[5%] bg-black/15" />
      <span className="hidden text-[9px] font-semibold uppercase tracking-[.32em] opacity-75 @min-[140px]:block sm:text-[10px]">
        The Library Edit
      </span>
      <div className="my-auto border-y border-current/40 py-3 @min-[180px]:py-6">
        <span
          className="line-clamp-4 break-words font-cover text-[clamp(1.1rem,2.7vw,2rem)] leading-[1.05] tracking-tight"
          style={{ fontSize: large ? 'clamp(1.5rem, 3vw, 2.7rem)' : undefined }}
        >
          {title}
        </span>
      </div>
      <span
        title={author}
        className="line-clamp-3 break-words text-[10px] font-medium uppercase tracking-[.18em] sm:text-[11px]"
      >
        {author}
      </span>
    </div>
  )
}
