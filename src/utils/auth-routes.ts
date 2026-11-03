export function getRequestedPath(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return null
  }
  const from = state.from
  if (typeof from !== 'object' || from === null || !('pathname' in from)) {
    return null
  }
  const pathname = from.pathname
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return null
  }
  const search = 'search' in from && typeof from.search === 'string' ? from.search : ''
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : ''
  return `${pathname}${search}${hash}`
}
