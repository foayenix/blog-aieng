export default function ArticlesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="h-96 rounded-lg bg-muted animate-pulse" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>

          {/* Search skeleton */}
          <div className="h-10 w-full bg-muted rounded animate-pulse mb-6" />

          {/* Grid skeleton */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-lg border bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
