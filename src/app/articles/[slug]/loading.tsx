export default function ArticleLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex gap-2 mb-3">
            <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="h-10 w-3/4 bg-muted rounded animate-pulse mb-4" />
          <div className="h-6 w-full bg-muted rounded animate-pulse mb-4" />

          {/* Meta skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>

          {/* Tags skeleton */}
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-16 bg-muted rounded-full animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-muted rounded animate-pulse"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
