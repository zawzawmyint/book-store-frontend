import { message as msg } from '../../lib/i18n'
import type { HomepageBookFragment, StorefrontHomeQuery } from '../../generated/graphql'

// Editorial choices for the current catalog. Product metadata comes from the API.
// Update notes when changing the selected product in the catalog.
export const homepageSelections: {
  search: string
  title: string
  author: string
  editorialNote?: string
}[] = [
  {
    search: 'Gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    editorialNote: msg('storefront:editorialNote'),
  },
  { search: 'Prejudice', title: 'Pride and Prejudice', author: 'Jane Austen' },
  { search: 'Eyre', title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { search: 'Forster', title: 'A Room with a View', author: 'E. M. Forster' },
]
export type HomepageBook = HomepageBookFragment
export const homepageVariables = {
  firstSearch: homepageSelections[0]?.search ?? '',
  secondSearch: homepageSelections[1]?.search ?? '',
  thirdSearch: homepageSelections[2]?.search ?? '',
  fourthSearch: homepageSelections[3]?.search ?? '',
}

function bookIdentity(book: { title: string; author: string }) {
  const normalize = (value: string) =>
    value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
  return JSON.stringify([normalize(book.title), normalize(book.author)])
}

export function resolveHomepageBooks(data: StorefrontHomeQuery) {
  const candidates = [data.first, data.second, data.third, data.fourth]
  const books: HomepageBook[] = []
  const ids = new Set<string>()
  const identities = new Set<string>()
  const add = (book: HomepageBook | undefined) => {
    if (!book || books.length === 4 || ids.has(book.id) || identities.has(bookIdentity(book)))
      return
    books.push(book)
    ids.add(book.id)
    identities.add(bookIdentity(book))
  }
  homepageSelections.forEach((selection, index) => {
    add(candidates[index]?.items.find((book) => bookIdentity(book) === bookIdentity(selection)))
  })
  data.fallback.items.forEach(add)
  const recommendation = books.find((book) =>
    homepageSelections.some(
      (entry) => entry.editorialNote && bookIdentity(entry) === bookIdentity(book),
    ),
  )
  const note = homepageSelections.find(
    (entry) => recommendation && bookIdentity(entry) === bookIdentity(recommendation),
  )?.editorialNote
  return { books, recommendation, note }
}
