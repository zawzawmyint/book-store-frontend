import { afterEach, expect, it, vi } from 'vitest'
import { createRefreshScheduler } from './refresh-scheduler'
afterEach(() => vi.useRealTimers())
it('coalesces event bursts and allows only one trailing refresh during a request', async () => {
  vi.useFakeTimers()
  let release!: () => void
  const refresh = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve
      }),
  )
  const scheduler = createRefreshScheduler(refresh)
  scheduler.schedule()
  scheduler.schedule()
  scheduler.schedule()
  await vi.advanceTimersByTimeAsync(250)
  expect(refresh).toHaveBeenCalledTimes(1)
  scheduler.schedule()
  scheduler.schedule()
  await vi.advanceTimersByTimeAsync(1000)
  expect(refresh).toHaveBeenCalledTimes(1)
  release()
  await vi.advanceTimersByTimeAsync(250)
  expect(refresh).toHaveBeenCalledTimes(2)
  scheduler.dispose()
  release()
  await vi.advanceTimersByTimeAsync(1000)
  expect(refresh).toHaveBeenCalledTimes(2)
})
