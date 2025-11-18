'use client'

import { useState, useCallback } from 'react'
import type { ArticleCategory } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { X, Plus, Eye, Code } from 'lucide-react'

export interface ArticleEditorData {
  title: string
  summary: string
  category: ArticleCategory | ''
  tags: string[]
  bodyMdx: string
  changelog?: string
}

interface ArticleEditorProps {
  initialData?: Partial<ArticleEditorData>
  onChange?: (data: ArticleEditorData) => void
  onSubmit?: (data: ArticleEditorData) => void
  isSubmitting?: boolean
  submitLabel?: string
  showChangelog?: boolean
  className?: string
}

// Category options
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

export function ArticleEditor({
  initialData,
  onChange,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
  showChangelog = false,
  className,
}: ArticleEditorProps) {
  const [data, setData] = useState<ArticleEditorData>({
    title: initialData?.title || '',
    summary: initialData?.summary || '',
    category: initialData?.category || '',
    tags: initialData?.tags || [],
    bodyMdx: initialData?.bodyMdx || '',
    changelog: initialData?.changelog || '',
  })

  const [tagInput, setTagInput] = useState('')
  const [activeTab, setActiveTab] = useState<string>('edit')

  const updateData = useCallback((updates: Partial<ArticleEditorData>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates }
      onChange?.(newData)
      return newData
    })
  }, [onChange])

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !data.tags.includes(tag)) {
      updateData({ tags: [...data.tags, tag] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    updateData({ tags: data.tags.filter((tag) => tag !== tagToRemove) })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(data)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => updateData({ title: e.target.value })}
          placeholder="Article title"
          required
        />
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={data.summary}
          onChange={(e) => updateData({ summary: e.target.value })}
          placeholder="Brief summary of the article"
          rows={3}
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={data.category}
          onValueChange={(value) => updateData({ category: value as ArticleCategory })}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Changelog (for updates) */}
      {showChangelog && (
        <div className="space-y-2">
          <Label htmlFor="changelog">Changelog</Label>
          <Textarea
            id="changelog"
            value={data.changelog}
            onChange={(e) => updateData({ changelog: e.target.value })}
            placeholder="Describe the changes made in this version"
            rows={2}
          />
        </div>
      )}

      {/* Content Editor with Preview */}
      <div className="space-y-2">
        <Label>Content (MDX)</Label>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="edit" className="gap-1.5">
              <Code className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-2">
            <Textarea
              value={data.bodyMdx}
              onChange={(e) => updateData({ bodyMdx: e.target.value })}
              placeholder="Write your article content in MDX format..."
              className="min-h-[400px] font-mono text-sm"
              required
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-2">
            <div className="min-h-[400px] rounded-md border bg-background p-4 prose prose-sm max-w-none dark:prose-invert">
              {data.bodyMdx ? (
                <div className="whitespace-pre-wrap">{data.bodyMdx}</div>
              ) : (
                <p className="text-muted-foreground italic">
                  Nothing to preview yet. Start writing in the Edit tab.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Submit Button */}
      {onSubmit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
