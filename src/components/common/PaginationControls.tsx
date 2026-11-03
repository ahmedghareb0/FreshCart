type PaginationControlsProps = {
  currentPage: number
  numberOfPages: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  currentPage,
  numberOfPages,
  onPageChange,
}: PaginationControlsProps) {
  if (numberOfPages <= 1) {
    return null
  }

  return (
    <nav className="pagination" aria-label="Pages">
      <button
        className="pagination__button"
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {numberOfPages}
      </span>
      <button
        className="pagination__button"
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= numberOfPages}
      >
        Next
      </button>
    </nav>
  )
}
