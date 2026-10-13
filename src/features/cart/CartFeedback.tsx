import { useCartStore } from './cart-store'
import { Button } from '../../app/components/ui/button'

export function CartFeedback({ workspace = false }: { workspace?: boolean } = {}) {
  const state = useCartStore()
  const failed = state.status === 'error' || state.status === 'conflict'
  const announcement =
    state.status === 'loading'
      ? 'Loading your bag…'
      : state.status === 'saving'
        ? 'Saving your bag…'
        : state.status === 'merging'
          ? 'Merging your guest bag…'
          : !failed
            ? state.message
            : ''
  if (
    !announcement &&
    !failed &&
    !state.validationMessage &&
    !state.storageWarning &&
    !state.legacyUnreadable &&
    !state.legacyItems.length &&
    !state.notices.length
  )
    return null
  const actionable =
    failed ||
    !!state.validationMessage ||
    !!state.storageWarning ||
    state.legacyUnreadable ||
    state.legacyItems.length > 0 ||
    state.notices.length > 0 ||
    state.status === 'merging'
  if (workspace && !actionable)
    return announcement ? (
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    ) : null
  return (
    <div className="space-y-3 py-4">
      {announcement && (
        <p
          className={workspace && state.status !== 'merging' ? 'sr-only' : undefined}
          role="status"
          aria-live="polite"
        >
          {announcement}
        </p>
      )}
      {failed && (
        <div role="alert">
          <p>{state.message}</p>
          <Button className="mt-3" onClick={() => void state.retry()}>
            {state.retryKind === 'merge'
              ? 'Retry merge'
              : state.retryKind === 'save'
                ? 'Retry save'
                : 'Retry loading bag'}
          </Button>
        </div>
      )}
      {state.validationMessage && <p role="alert">{state.validationMessage}</p>}
      {state.storageWarning && <p role="status">{state.storageWarning}</p>}
      {state.legacyUnreadable && (
        <div role="alert">
          <p>This browser's saved bag could not be read. Recovery is unavailable.</p>
          <Button variant="outline" onClick={state.discardLegacy}>
            Start a fresh guest bag
          </Button>
        </div>
      )}
      {state.legacyItems.length > 0 && (
        <section className="rounded border p-4" aria-label="Saved browser bag">
          <h2 className="font-semibold">Add this browser's saved bag to your account?</h2>
          <p className="mt-2 text-sm">
            The old bag was shared on this browser. Import only selections you want in your account.
          </p>
          <ul className="my-3 text-sm">
            {state.legacyItems.map((item) => (
              <li key={item.id}>
                {item.quantity} × {item.title}
              </li>
            ))}
          </ul>
          {state.owner ? (
            <Button disabled={state.status !== 'ready'} onClick={() => void state.importLegacy()}>
              Add saved bag to my account
            </Button>
          ) : (
            <p>Sign in to choose whether to import this saved bag.</p>
          )}
          <Button variant="ghost" onClick={state.discardLegacy}>
            Discard saved bag
          </Button>
        </section>
      )}
      {state.notices.length > 0 && (
        <ul role="status" aria-live="polite" className="text-sm">
          {state.notices.map((notice, index) => (
            <li key={`${notice.bookId}:${index}`}>
              {notice.reason === 'UNAVAILABLE'
                ? `Book ${notice.bookId} could not be added because it is unavailable.`
                : notice.reason === 'QUANTITY_LIMIT'
                  ? `Book ${notice.bookId} was limited to available stock or ten copies.`
                  : `Book ${notice.bookId} could not be added because your bag has twenty books.`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
