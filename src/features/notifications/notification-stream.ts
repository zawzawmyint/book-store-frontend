/** A hint transport only. All private data is fetched through authenticated GraphQL. */
export function connectNotificationStream(options: {
  scope: string
  refresh: () => void
  revalidate: () => Promise<boolean>
  createSource?: (url: string) => EventSource
}) {
  let source: EventSource | undefined
  let stopped = false
  let errors = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  const close = () => {
    source?.close()
    source = undefined
  }
  const start = () => {
    if (stopped || document.visibilityState === 'hidden' || source) return
    const create =
      options.createSource ??
      (typeof EventSource === 'undefined' ? undefined : (url: string) => new EventSource(url))
    if (!create) return
    const connection = create(`/api/notifications/stream?scope=${options.scope}`)
    source = connection
    connection.addEventListener('ready', () => {
      if (source !== connection) return
      errors = 0
      options.refresh()
    })
    connection.addEventListener('notifications-changed', () => {
      if (source === connection) options.refresh()
    })
    connection.onerror = () => {
      if (source !== connection) return
      errors += 1
      void options
        .revalidate()
        .then((valid) => {
          if (!valid && source === connection) close()
        })
        .catch(() => {})
      if (errors >= 3) {
        close()
        retryTimer = setTimeout(() => {
          retryTimer = undefined
          errors = 0
          start()
        }, 300_000)
      }
    }
  }
  const poll = () => {
    if (stopped || document.visibilityState === 'hidden') return
    options.refresh()
    pollTimer = setTimeout(poll, 60_000)
  }
  const visibility = () => {
    close()
    if (pollTimer) clearTimeout(pollTimer)
    if (retryTimer) clearTimeout(retryTimer)
    if (document.visibilityState !== 'hidden') {
      errors = 0
      options.refresh()
      start()
      pollTimer = setTimeout(poll, 60_000 + Math.random() * 5000)
    }
  }
  document.addEventListener('visibilitychange', visibility)
  start()
  if (document.visibilityState !== 'hidden')
    pollTimer = setTimeout(poll, 60_000 + Math.random() * 5000)
  return () => {
    stopped = true
    close()
    if (pollTimer) clearTimeout(pollTimer)
    if (retryTimer) clearTimeout(retryTimer)
    document.removeEventListener('visibilitychange', visibility)
  }
}
