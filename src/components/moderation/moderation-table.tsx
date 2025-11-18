'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Role, ArticleCategory } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ModerationVersion {
  id: string
  versionNumber: number
  createdAt: Date
  article: {
    id: string
    slug: string
    title: string
    category: ArticleCategory
  }
  createdBy: {
    id: string
    name: string | null
    email: string | null
  }
  weightedScore: number
  voteCount: number
}

interface ModerationTableProps {
  versions: ModerationVersion[]
  emptyMessage?: string
}

const categoryColors: Record<ArticleCategory, string> = {
  FOUNDATIONS: 'bg-blue-100 text-blue-800',
  SYSTEMS: 'bg-purple-100 text-purple-800',
  APPLIED: 'bg-green-100 text-green-800',
  MLOPS: 'bg-orange-100 text-orange-800',
  SAFETY: 'bg-red-100 text-red-800',
  BENCHMARKS: 'bg-yellow-100 text-yellow-800',
  CASE_STUDIES: 'bg-cyan-100 text-cyan-800',
  CAREER: 'bg-pink-100 text-pink-800',
}

export function ModerationTable({ versions, emptyMessage = 'No versions found' }: ModerationTableProps) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((version) => (
          <TableRow key={version.id}>
            <TableCell className="font-medium">
              {version.article.title}
            </TableCell>
            <TableCell>
              <Badge variant="outline">v{version.versionNumber}</Badge>
            </TableCell>
            <TableCell>
              {version.createdBy.name || version.createdBy.email || 'Unknown'}
            </TableCell>
            <TableCell>
              <Badge className={categoryColors[version.article.category]}>
                {version.article.category.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell>
              <span className={version.weightedScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                {version.weightedScore > 0 ? '+' : ''}{version.weightedScore}
              </span>
              <span className="text-muted-foreground text-xs ml-1">
                ({version.voteCount} votes)
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/moderation/${version.id}`}>
                    View
                  </Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
