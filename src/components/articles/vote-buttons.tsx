"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoteButtonsProps {
  articleVersionId: string
  initialScore: number
  initialUserVote?: number | null
  orientation?: "vertical" | "horizontal"
  size?: "sm" | "default"
}

export function VoteButtons({
  articleVersionId,
  initialScore,
  initialUserVote,
  orientation = "vertical",
  size = "default",
}: VoteButtonsProps) {
  const { data: session } = useSession()
  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState<number | null>(initialUserVote ?? null)
  const [isLoading, setIsLoading] = useState(false)

  const handleVote = async (value: number) => {
    if (!session) {
      return
    }

    setIsLoading(true)
    try {
      // If clicking the same vote, remove it
      const newValue = userVote === value ? 0 : value

      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleVersionId,
          value: newValue,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to vote")
      }

      const data = await response.json()
      setScore(data.score)
      setUserVote(newValue === 0 ? null : newValue)
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonSize = size === "sm" ? "h-7 w-7" : "h-9 w-9"
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5"

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          userVote === 1 && "text-green-600 bg-green-100 dark:bg-green-900/30"
        )}
        onClick={() => handleVote(1)}
        disabled={isLoading || !session}
        title={session ? "Upvote" : "Sign in to vote"}
      >
        <ChevronUp className={iconSize} />
      </Button>
      <span
        className={cn(
          "font-semibold tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
          score > 0 && "text-green-600",
          score < 0 && "text-red-600"
        )}
      >
        {score}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          userVote === -1 && "text-red-600 bg-red-100 dark:bg-red-900/30"
        )}
        onClick={() => handleVote(-1)}
        disabled={isLoading || !session}
        title={session ? "Downvote" : "Sign in to vote"}
      >
        <ChevronDown className={iconSize} />
      </Button>
    </div>
  )
}
