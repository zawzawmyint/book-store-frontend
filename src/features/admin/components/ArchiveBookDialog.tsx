import { useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { SetBookArchivedDocument, type AdminBookFieldsFragment } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { AdminDialog } from './AdminDialog'
import { useAdminAccess } from '../admin-access'
import { refreshCatalog } from '../admin-data'

export function ArchiveBookDialog({
  book,
  opener,
  close,
  saved,
}: {
  book: AdminBookFieldsFragment
  opener?: HTMLButtonElement | null
  close: () => void
  saved: (message: string) => void
}) {
  const client = useApolloClient()
  const { handleError } = useAdminAccess()
  const [archive, { loading }] = useMutation(SetBookArchivedDocument)
  const [failure, setFailure] = useState('')
  async function archiveBook() {
    setFailure('')
    try {
      await archive({ variables: { id: book.id, archived: !book.archived } })
      saved(book.archived ? 'Book restored.' : 'Book archived.')
      void refreshCatalog(client).catch(() => {})
    } catch (error) {
      handleError(error)
      setFailure(error instanceof Error ? error.message : 'Unable to save')
    }
  }
  return (
    <AdminDialog
      title={`${book.archived ? 'Restore' : 'Archive'} ${book.title}?`}
      close={close}
      busy={loading}
      returnFocusTo={opener}
    >
      <p className="mb-4">
        {book.archived
          ? 'This book will appear in the store and become available for new orders.'
          : 'This book will be hidden from the store and unavailable for new orders. Earlier order requests are preserved.'}
      </p>
      {failure && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      <Button
        disabled={loading}
        onClick={() => {
          void archiveBook()
        }}
      >
        {loading ? 'Saving…' : `Confirm ${book.archived ? 'restore' : 'archive'}`}
      </Button>
    </AdminDialog>
  )
}
