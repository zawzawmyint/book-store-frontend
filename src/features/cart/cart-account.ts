import { errorMessage } from '../../lib/i18n/errors'
import { message as msg } from '../../lib/i18n'
import { cartErrorCode } from './cart-error'
import {
  withCartStorageLock,
  markUnconfirmedCartEdit,
  acknowledgeCartEdit,
  type cartPersistence,
} from './cart-persistence'
import type { CartOperation, CartState, CartTransport, ServerCart } from './cart-store'

/** Executes one captured operation; retries keep its request key and absolute quantity. */
export async function runCartOperation({
  owner,
  current,
  transport,
  isActive,
  set,
  apply,
  disk,
  warning,
  clearOperation,
  mergeNext,
  identify,
}: {
  owner: string
  current: CartOperation
  transport: CartTransport
  isActive: () => boolean
  set: (state: Partial<CartState>) => void
  apply: (cart: ServerCart) => void
  disk: ReturnType<typeof cartPersistence>
  warning: () => void
  clearOperation: () => void
  mergeNext: () => Promise<void>
  identify: () => Promise<void>
}): Promise<ServerCart | null> {
  if (current.kind === 'set') markUnconfirmedCartEdit(owner, current.input.requestKey)
  set({
    status: current.kind === 'merge' ? 'merging' : 'saving',
    message: '',
    retryKind: current.kind === 'merge' ? 'merge' : 'save',
    validationMessage: '',
    notices: [],
  })
  try {
    const cart =
      current.kind === 'merge'
        ? await transport.merge({
            items: current.record.items,
            requestKey: current.record.requestKey,
            expectedRevision: current.record.expectedRevision,
          })
        : await transport.set(current.input)
    // A completed merge may retire durable recovery even after the owner leaves,
    // but its response must never populate the next account's visible bag.
    if (current.kind === 'merge')
      await withCartStorageLock(() => disk.completePending(current.record))
    else acknowledgeCartEdit(owner, current.input.requestKey)
    if (!isActive()) return null
    apply(cart)
    clearOperation()
    set({ status: 'ready', message: msg('storefront:bagSaved') })
    warning()
    await mergeNext()
    return isActive() ? cart : null
  } catch (error) {
    if (!isActive()) return null
    if (cartErrorCode(error) === 'UNAUTHENTICATED') {
      await identify()
      return null
    }
    if (current.kind === 'set' && cartErrorCode(error) === 'BAD_USER_INPUT') {
      clearOperation()
      acknowledgeCartEdit(owner, current.input.requestKey)
      set({ status: 'loading' })
      try {
        const cart = await transport.read()
        if (!isActive()) return null
        apply(cart)
        set({
          status: 'ready',
          message: '',
          validationMessage: msg(
            'storefront:valueReviewAvailabilityThenDecreaseOrRemoveUnavailableSelections',
            { value0: errorMessage(error, 'common:invalidInput') },
          ),
        })
      } catch {
        if (isActive())
          set({
            status: 'error',
            retryKind: 'load',
            message: msg(
              'storefront:thisSelectionWasRejectedReloadYourBagToReviewCurrentAvailability',
            ),
          })
      }
      return null
    }
    if (cartErrorCode(error) === 'CART_CONFLICT') {
      set({ status: 'loading' })
      try {
        const cart = await transport.read()
        if (!isActive()) return null
        apply(cart)
        if (current.kind === 'merge') {
          current.record = { ...current.record, expectedRevision: cart.revision }
          await withCartStorageLock(() => disk.savePending(current.record))
          if (!isActive()) return null
        } else current.input = { ...current.input, expectedRevision: cart.revision }
        set({
          status: 'conflict',
          message: msg('storefront:yourBagChangedElsewhereReviewTheLatestSelectionsThenRetryYour'),
        })
      } catch {
        if (isActive())
          set({
            status: 'error',
            message: msg('storefront:yourBagChangedElsewhereButTheLatestSelectionsCouldNotBe'),
          })
      }
    } else
      set({
        status: 'error',
        message: msg('storefront:valueCouldNotBeConfirmedRetryTheSameOperationToRecover', {
          value0: msg(current.kind === 'merge' ? 'storefront:guestMerge' : 'storefront:bagSave'),
        }),
      })
    warning()
    return null
  }
}
