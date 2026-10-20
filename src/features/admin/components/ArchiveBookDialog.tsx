import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

  const client = useApolloClient()
  const { handleError } = useAdminAccess()
  const [archive, { loading }] = useMutation(SetBookArchivedDocument)
  const [failure, setFailure] = useState('')
  async function archiveBook() {
    setFailure('')
    try {
      await archive({ variables: { id: book.id, archived: !book.archived } })
      saved(book.archived ? msg('admin:bookRestored2') : msg('admin:bookArchived2'))
      void refreshCatalog(client).catch(() => {})
    } catch (error) {
      handleError(error)
      setFailure(errorMessage(error, 'admin:unableToSave'))
    }
  }
  return (
    <AdminDialog
      title={t('admin:valueValue', {
        value0: t(book.archived ? 'common:labelRestore' : 'common:labelArchive'),
        value1: book.title,
      })}
      close={close}
      busy={loading}
      returnFocusTo={opener}
    >
      <p className="mb-4">
        {localized(
          book.archived
            ? t('admin:thisBookWillAppearInTheStoreAndBecomeAvailableFor')
            : t('admin:thisBookWillBeHiddenFromTheStoreAndUnavailableFor'),
        )}
      </p>
      {failure && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{localized(failure)}</AlertDescription>
        </Alert>
      )}
      <Button
        disabled={loading}
        onClick={() => {
          void archiveBook()
        }}
      >
        {localized(
          loading
            ? t('admin:saving')
            : t(book.archived ? 'admin:confirmRestore' : 'admin:confirmArchive'),
        )}
      </Button>
    </AdminDialog>
  )
}
