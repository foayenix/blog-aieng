import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Custom components for MDX rendering
const mdxComponents = {
  // Headings
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        'mt-8 mb-4 text-4xl font-bold tracking-tight scroll-mt-20',
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        'mt-8 mb-4 text-3xl font-semibold tracking-tight scroll-mt-20 border-b pb-2',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        'mt-6 mb-3 text-2xl font-semibold tracking-tight scroll-mt-20',
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className={cn(
        'mt-6 mb-3 text-xl font-semibold tracking-tight scroll-mt-20',
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5
      className={cn(
        'mt-4 mb-2 text-lg font-semibold tracking-tight scroll-mt-20',
        className
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6
      className={cn(
        'mt-4 mb-2 text-base font-semibold tracking-tight scroll-mt-20',
        className
      )}
      {...props}
    />
  ),

  // Paragraphs and text
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('leading-7 [&:not(:first-child)]:mt-4', className)}
      {...props}
    />
  ),
  strong: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className={cn('font-semibold', className)} {...props} />
  ),
  em: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className={cn('italic', className)} {...props} />
  ),

  // Links
  a: ({
    className,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isInternal = href?.startsWith('/') || href?.startsWith('#')

    if (isInternal) {
      return (
        <Link
          href={href || '#'}
          className={cn(
            'text-primary underline underline-offset-4 hover:text-primary/80',
            className
          )}
          {...props}
        />
      )
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'text-primary underline underline-offset-4 hover:text-primary/80',
          className
        )}
        {...props}
      />
    )
  },

  // Lists
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className={cn('my-4 ml-6 list-disc [&>li]:mt-2', className)} {...props} />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className={cn('my-4 ml-6 list-decimal [&>li]:mt-2', className)} {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className={cn('leading-7', className)} {...props} />
  ),

  // Blockquote
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn(
        'mt-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground',
        className
      )}
      {...props}
    />
  ),

  // Code blocks
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className={cn(
        'mt-4 mb-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm',
        className
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    // Check if this is an inline code block (no className from syntax highlighting)
    const isInline = !className?.includes('language-')

    if (isInline) {
      return (
        <code
          className={cn(
            'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
            className
          )}
          {...props}
        />
      )
    }

    return <code className={cn('font-mono', className)} {...props} />
  },

  // Tables
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={cn('bg-muted/50', className)} {...props} />
  ),
  tbody: ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={cn('[&>tr:last-child]:border-0', className)} {...props} />
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className={cn('border-b transition-colors hover:bg-muted/50', className)}
      {...props}
    />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        'border px-4 py-2 text-left font-semibold [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn(
        'border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),

  // Horizontal rule
  hr: ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className={cn('my-8 border-t', className)} {...props} />
  ),

  // Images
  img: ({
    className,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn('my-4 rounded-lg border', className)}
      alt={alt || ''}
      {...props}
    />
  ),
}

interface MDXRendererProps {
  content: string
  className?: string
}

export async function MDXRenderer({ content, className }: MDXRendererProps) {
  return (
    <div className={cn('prose prose-neutral max-w-none dark:prose-invert', className)}>
      <MDXRemote source={content} components={mdxComponents} />
    </div>
  )
}
