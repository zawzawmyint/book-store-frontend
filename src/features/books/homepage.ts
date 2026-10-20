import { message as msg } from '../../lib/i18n'
import type { HomepageBookFragment } from '../../generated/graphql'

// Editorial choices for the current catalog. Product metadata comes from the API.
// Update notes when changing the selected product in the catalog.
export const homepageSelections: { bookId: string; editorialNote?: string }[] = [
  {
    bookId: '1',
    editorialNote: msg('storefront:editorialNote'),
  },
  { bookId: '2' },
  { bookId: '4' },
  { bookId: '8' },
]
export type HomepageBook = HomepageBookFragment
export const homepageVariables = {
  firstId: homepageSelections[0]?.bookId ?? '',
  secondId: homepageSelections[1]?.bookId ?? '',
  thirdId: homepageSelections[2]?.bookId ?? '',
  fourthId: homepageSelections[3]?.bookId ?? '',
}
