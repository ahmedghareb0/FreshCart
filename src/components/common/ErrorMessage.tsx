type ErrorMessageProps = {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="status-message status-message--error" role="alert">
      {message}
    </div>
  )
}
