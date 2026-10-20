// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { connectNotificationStream } from './notification-stream'
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
function setup() {
  const sources: Array<{
    close: ReturnType<typeof vi.fn>
    onerror: (() => void) | null
    events: Record<string, () => void>
  }> = []
  const refresh = vi.fn()
  const revalidate = vi.fn(async () => true)
  const disconnect = connectNotificationStream({
    scope: 'STOREFRONT',
    refresh,
    revalidate,
    createSource: () => {
      const source = {
        close: vi.fn(),
        onerror: null as (() => void) | null,
        events: {} as Record<string, () => void>,
        addEventListener(name: string, callback: () => void) {
          this.events[name] = callback
        },
      }
      sources.push(source)
      return source as unknown as EventSource
    },
  })
  return { sources, refresh, revalidate, disconnect }
}
it('refreshes on ready/hints, closes while hidden, reconnects on return and cleans up', async () => {
  vi.useFakeTimers()
  let hidden = false
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    hidden ? 'hidden' : 'visible',
  )
  const test = setup()
  expect(test.sources).toHaveLength(1)
  test.sources[0].events.ready()
  test.sources[0].events['notifications-changed']()
  expect(test.refresh).toHaveBeenCalledTimes(2)
  hidden = true
  document.dispatchEvent(new Event('visibilitychange'))
  expect(test.sources[0].close).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(120_000)
  expect(test.refresh).toHaveBeenCalledTimes(2)
  hidden = false
  document.dispatchEvent(new Event('visibilitychange'))
  expect(test.sources).toHaveLength(2)
  expect(test.refresh).toHaveBeenCalledTimes(3)
  test.disconnect()
  await vi.advanceTimersByTimeAsync(120_000)
  expect(test.refresh).toHaveBeenCalledTimes(3)
  expect(test.sources[1].close).toHaveBeenCalledTimes(1)
})
it('bounds stream failures and retries after five minutes while fallback polling continues', async () => {
  vi.useFakeTimers()
  const test = setup()
  for (let i = 0; i < 3; i++) test.sources[0].onerror?.()
  expect(test.revalidate).toHaveBeenCalledTimes(3)
  expect(test.sources[0].close).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(70_000)
  expect(test.refresh).toHaveBeenCalledTimes(1)
  expect(test.sources).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(230_000)
  expect(test.sources).toHaveLength(2)
  test.disconnect()
})
