/** Collapse event bursts, never overlap fetches, and preserve one trailing refresh. */
export function createRefreshScheduler(refresh: () => Promise<unknown>, delay = 250) {
  let disposed = false
  let running = false
  let trailing = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const execute = async () => {
    timer = undefined
    if (disposed) return
    if (running) {
      trailing = true
      return
    }
    running = true
    try {
      await refresh()
    } catch {
      /* The provider owns visible error handling. */
    } finally {
      running = false
      if (!disposed && trailing) {
        trailing = false
        schedule()
      }
    }
  }
  function schedule() {
    if (disposed) return
    if (running) {
      trailing = true
      return
    }
    timer ??= setTimeout(() => {
      void execute()
    }, delay)
  }
  return {
    schedule,
    dispose() {
      disposed = true
      if (timer) clearTimeout(timer)
    },
  }
}
