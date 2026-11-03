export function Loading() {
  return (
    <div className="status-message" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>Loading...</span>
    </div>
  )
}
