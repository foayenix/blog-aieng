'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArticleCategory } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ModerationFiltersProps {
  currentCategory?: ArticleCategory
  currentMinScore?: number
  currentMaxScore?: number
  currentMaxAge?: number
}

const categories: { value: ArticleCategory; label: string }[] = [
  { value: 'FOUNDATIONS', label: 'Foundations' },
  { value: 'SYSTEMS', label: 'Systems' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'MLOPS', label: 'MLOps' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'BENCHMARKS', label: 'Benchmarks' },
  { value: 'CASE_STUDIES', label: 'Case Studies' },
  { value: 'CAREER', label: 'Career' },
]

export function ModerationFilters({
  currentCategory,
  currentMinScore,
  currentMaxScore,
  currentMaxAge,
}: ModerationFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    router.push(`/moderation?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/moderation')
  }

  const hasFilters = currentCategory || currentMinScore !== undefined || currentMaxScore !== undefined || currentMaxAge !== undefined

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <Select
          value={currentCategory || ''}
          onValueChange={(value) => updateFilters({ category: value || undefined })}
        >
          <SelectTrigger id="category" className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="minScore">Min Score</Label>
        <Input
          id="minScore"
          type="number"
          placeholder="Min"
          className="w-[100px]"
          value={currentMinScore ?? ''}
          onChange={(e) => updateFilters({ minScore: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="maxScore">Max Score</Label>
        <Input
          id="maxScore"
          type="number"
          placeholder="Max"
          className="w-[100px]"
          value={currentMaxScore ?? ''}
          onChange={(e) => updateFilters({ maxScore: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="maxAge">Max Age (days)</Label>
        <Input
          id="maxAge"
          type="number"
          placeholder="Days"
          className="w-[100px]"
          value={currentMaxAge ?? ''}
          onChange={(e) => updateFilters({ maxAge: e.target.value || undefined })}
        />
      </div>

      {hasFilters && (
        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
