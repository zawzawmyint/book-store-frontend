import { localized, message as msg, t, useI18n } from '../../lib/i18n'
import { useCartStore } from './cart-store'
import { Button } from '../../app/components/ui/button'

export function CartFeedback() {
  useI18n()

  const state = useCartStore()
  const failed = state.status === 'error' || state.status === 'conflict'
  const announcement =
    state.status === 'loading'
      ? msg('storefront:loadingYourBag')
      : state.status === 'saving'
        ? msg('storefront:savingYourBag')
        : state.status === 'merging'
          ? msg('storefront:mergingYourGuestBag')
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
    announcement === msg('storefront:bagSaved') ||
    announcement === msg('storefront:yourBagIsUpToDate')
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
        {localized(announcement)}
      </p>
    ) : null
  return (
    <div className="space-y-3 py-4">
      {announcement && (
        <p className={routine ? 'sr-only' : undefined} role="status" aria-live="polite">
          {localized(announcement)}
        </p>
      )}
      {failed && (
        <div role="alert">
          <p>{localized(state.message)}</p>
          <Button className="mt-3" onClick={() => void state.retry()}>
            {localized(
              state.retryKind === 'merge'
                ? t('storefront:retryMerge')
                : state.retryKind === 'save'
                  ? t('storefront:retrySave')
                  : t('storefront:retryLoadingBag'),
            )}
          </Button>
        </div>
      )}
      {state.validationMessage && <p role="alert">{localized(state.validationMessage)}</p>}
      {state.storageWarning && <p role="status">{localized(state.storageWarning)}</p>}
      {state.legacyUnreadable && (
        <div role="alert">
          <p>{t('storefront:thisBrowserSSavedBagCouldNotBeReadRecoveryIs')}</p>
          <Button variant="outline" onClick={state.discardLegacy}>
            {t('storefront:startAFreshGuestBag')}
          </Button>
        </div>
      )}
      {state.legacyItems.length > 0 && (
        <section
          className="border border-border bg-muted/40 p-4 text-sm"
          aria-label={t('storefront:savedBrowserBag')}
        >
          <h2 className="font-semibold">{t('storefront:anOlderBagWasFoundOnThisBrowser')}</h2>
          <p className="mt-1 text-muted-foreground">
            {t('storefront:itMayBelongToSomeoneElseAddOnlyBooksYouRecognize')}
          </p>
          <details className="mt-2">
            <summary className="w-fit cursor-pointer py-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
              {t('storefront:viewSavedBooks')}
            </summary>
            <ul className="my-2 space-y-1">
              {state.legacyItems.map((item) => (
                <li key={item.id}>
                  {localized(item.quantity)} × <bdi dir="auto">{localized(item.title)}</bdi>
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
                {t('storefront:addSavedBagToMyAccount')}
              </Button>
            ) : (
              <p>{t('storefront:signInToChooseWhetherToImportThisSavedBag')}</p>
            )}
            <Button variant="ghost" className="min-h-11 px-3 py-2" onClick={state.discardLegacy}>
              {t('storefront:discardSavedBag')}
            </Button>
          </div>
        </section>
      )}
      {state.notices.length > 0 && (
        <ul role="status" aria-live="polite" className="text-sm">
          {state.notices.map((notice, index) => (
            <li key={`${notice.bookId}:${index}`}>
              {localized(
                notice.reason === 'UNAVAILABLE'
                  ? t('storefront:bookValueCouldNotBeAddedBecauseItIsUnavailable', {
                      value0: notice.bookId,
                    })
                  : notice.reason === 'QUANTITY_LIMIT'
                    ? t('storefront:bookValueWasLimitedToAvailableStockOrTenCopies', {
                        value0: notice.bookId,
                      })
                    : t('storefront:bookValueCouldNotBeAddedBecauseYourBagHasTwenty', {
                        value0: notice.bookId,
                      }),
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
