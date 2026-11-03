type PagePlaceholderProps = {
  title: string
}

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <section className="page-placeholder" aria-labelledby="page-title">
      <p className="eyebrow">FreshCart</p>
      <h1 id="page-title">{title}</h1>
      <p className="page-placeholder__description">
        This page is ready for its feature implementation.
      </p>
    </section>
  )
}
