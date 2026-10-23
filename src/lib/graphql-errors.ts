function entries(error: unknown): unknown[] {
  if (!error || typeof error !== 'object' || !('errors' in error)) return []
  return Array.isArray(error.errors) ? error.errors : []
}

function code(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object' || !('extensions' in entry)) return undefined
  const extensions = entry.extensions
  if (!extensions || typeof extensions !== 'object' || !('code' in extensions)) return undefined
  return typeof extensions.code === 'string' ? extensions.code : undefined
}

/** Shape reading only; each feature chooses its own recovery-code precedence. */
export function graphqlErrorCodes(error: unknown): string[] {
  return entries(error).flatMap((entry) => {
    const value = code(entry)
    return value === undefined ? [] : [value]
  })
}

/** Preserve the first issue's position even when its code is missing or malformed. */
export function firstGraphqlErrorCode(error: unknown): string | undefined {
  return code(entries(error)[0])
}
