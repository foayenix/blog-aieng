import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLE_WEIGHTS } from '@/lib/governance'
import { Role } from '@prisma/client'

/**
 * Calculate the weighted score for a version's votes
 */
function calculateVersionScore(votes: Array<{ value: number; user: { role: Role } }>) {
  const breakdownByRole: Record<Role, { count: number; score: number }> = {
    READER: { count: 0, score: 0 },
    CONTRIBUTOR: { count: 0, score: 0 },
    REVIEWER: { count: 0, score: 0 },
    JUDGE: { count: 0, score: 0 },
    MAINTAINER: { count: 0, score: 0 },
  }

  let totalScore = 0
  const approvalCounts = {
    reviewer: 0,
    judge: 0,
  }

  for (const vote of votes) {
    const role = vote.user.role
    const weight = ROLE_WEIGHTS[role]
    const weightedValue = vote.value * weight

    breakdownByRole[role].count++
    breakdownByRole[role].score += weightedValue
    totalScore += weightedValue

    // Count positive votes from reviewers and judges
    if (vote.value > 0) {
      if (role === 'REVIEWER') {
        approvalCounts.reviewer++
      } else if (role === 'JUDGE' || role === 'MAINTAINER') {
        approvalCounts.judge++
      }
    }
  }

  return {
    totalScore,
    breakdownByRole,
    approvalCounts,
  }
}

/**
 * GET /api/votes/[articleVersionId]
 * Get votes for a specific article version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleVersionId: string }> }
) {
  try {
    const { articleVersionId } = await params
    const session = await getServerSession()

    // Verify article version exists
    const articleVersion = await prisma.articleVersion.findUnique({
      where: { id: articleVersionId },
    })

    if (!articleVersion) {
      return NextResponse.json(
        { error: 'Article version not found' },
        { status: 404 }
      )
    }

    // Get all votes for this version
    const votes = await prisma.vote.findMany({
      where: { articleVersionId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    })

    // Calculate weighted score
    const { totalScore, breakdownByRole, approvalCounts } = calculateVersionScore(votes)

    // Get user's vote if authenticated
    let userVote = null
    if (session?.user) {
      const vote = votes.find((v) => v.user.id === session.user.id)
      if (vote) {
        userVote = {
          id: vote.id,
          value: vote.value,
        }
      }
    }

    return NextResponse.json({
      totalScore,
      breakdownByRole,
      approvalCounts,
      voteCount: votes.length,
      userVote,
    })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}

export { calculateVersionScore }
