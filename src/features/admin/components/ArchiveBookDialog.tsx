import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { useRef, useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { SetBookArchivedDocument, type AdminBookFieldsFragment } from '../../../generated/graphql'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { LanguageSwitcher } from '../../../app/components/LanguageSwitcher'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../app/components/ui/alert-dialog'
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
  const pending = useRef(false)
  async function archiveBook() {
    if (pending.current) return
    pending.current = true
    setFailure('')
    try {
      const result = await archive({ variables: { id: book.id, archived: !book.archived } })
      const updated = result.data?.setBookArchived
      if (!updated || updated.id !== book.id || updated.archived !== !book.archived) {
        throw new Error(msg('admin:theResultIsUnknown'))
      }
      saved(book.archived ? msg('admin:bookRestored2') : msg('admin:bookArchived2'))
      void refreshCatalog(client).catch(() => {})
    } catch (error) {
      handleError(error)
      setFailure(errorMessage(error, 'admin:unableToSave'))
    } finally {
      pending.current = false
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending.current) close()
      }}
    >
      <AlertDialogContent
        className="admin-workspace admin-dialog"
        onEscapeKeyDown={(event) => {
          if (pending.current) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus()
          if (document.activeElement !== opener) document.getElementById('admin-main')?.focus()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <bdi dir="auto">
              {t('admin:valueValue', {
                value0: t(book.archived ? 'common:labelRestore' : 'common:labelArchive'),
                value1: book.title,
              })}
            </bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {localized(
              book.archived
                ? t('admin:thisBookWillAppearInTheStoreAndBecomeAvailableFor')
                : t('admin:thisBookWillBeHiddenFromTheStoreAndUnavailableFor'),
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failure && (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{localized(failure)}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            onClick={(event) => {
              if (pending.current) event.preventDefault()
            }}
          >
            {t('admin:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(event) => {
              event.preventDefault()
              void archiveBook()
            }}
          >
            {localized(
              loading
                ? t('admin:saving')
                : t(book.archived ? 'admin:confirmRestore' : 'admin:confirmArchive'),
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
        <div className="mt-4 flex justify-end">
          <LanguageSwitcher />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
