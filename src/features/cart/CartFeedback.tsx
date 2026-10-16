import { useCartStore } from './cart-store'
import { Button } from '../../app/components/ui/button'

export function CartFeedback() {
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
  const routine =
    state.status === 'loading' ||
    state.status === 'saving' ||
    announcement === 'Bag saved.' ||
    announcement === 'Your bag is up to date.'
  const actionable =
    failed ||
    !!state.validationMessage ||
    !!state.storageWarning ||
    state.legacyUnreadable ||
    state.legacyItems.length > 0 ||
    state.notices.length > 0 ||
    (!!announcement && !routine)
  if (!actionable)
    return announcement ? (
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    ) : null
  return (
    <div className="space-y-3 py-4">
      {announcement && (
        <p className={routine ? 'sr-only' : undefined} role="status" aria-live="polite">
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
        <section
          className="border border-border bg-muted/40 p-4 text-sm"
          aria-label="Saved browser bag"
        >
          <h2 className="font-semibold">An older bag was found on this browser</h2>
          <p className="mt-1 text-muted-foreground">
            It may belong to someone else. Add only books you recognize to your account.
          </p>
          <details className="mt-2">
            <summary className="w-fit cursor-pointer py-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
              View saved books
            </summary>
            <ul className="my-2 space-y-1">
              {state.legacyItems.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.title}
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            {state.owner ? (
              <Button
                variant="outline"
                className="min-h-11 whitespace-normal px-3 py-2"
                disabled={state.status !== 'ready'}
                onClick={() => void state.importLegacy()}
              >
                Add saved bag to my account
              </Button>
            ) : (
              <p>Sign in to choose whether to import this saved bag.</p>
            )}
            <Button variant="ghost" className="min-h-11 px-3 py-2" onClick={state.discardLegacy}>
              Discard saved bag
            </Button>
          </div>
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
