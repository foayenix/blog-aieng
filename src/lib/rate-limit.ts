// In-memory rate limiter for comment creation
const commentTimestamps = new Map<string, number[]>()

/**
 * Check if a user has exceeded the comment rate limit
 * @param userId - The user's ID
 * @param limit - Maximum number of comments allowed in the time window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 60000ms = 1 minute)
 * @returns true if the user is allowed to comment, false if rate limited
 */
export function checkCommentRateLimit(
  userId: string,
  limit: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const timestamps = commentTimestamps.get(userId) || []

  // Filter out timestamps outside the current window
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < windowMs
  )

  // Check if user has exceeded the limit
  if (recentTimestamps.length >= limit) {
    // Update the stored timestamps (clean up old ones)
    commentTimestamps.set(userId, recentTimestamps)
    return false
  }

  // Add current timestamp and update storage
  recentTimestamps.push(now)
  commentTimestamps.set(userId, recentTimestamps)

  return true
}

/**
 * Get the remaining time until the user can comment again
 * @param userId - The user's ID
 * @param limit - Maximum number of comments allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns Remaining time in milliseconds, or 0 if not rate limited
 */
export function getRateLimitRemainingTime(
  userId: string,
  limit: number = 5,
  windowMs: number = 60000
): number {
  const now = Date.now()
  const timestamps = commentTimestamps.get(userId) || []

  // Filter to recent timestamps
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < windowMs
  )

  if (recentTimestamps.length < limit) {
    return 0
  }

  // Find the oldest timestamp that needs to expire
  const sortedTimestamps = recentTimestamps.sort((a, b) => a - b)
  const oldestRelevant = sortedTimestamps[sortedTimestamps.length - limit]

  return windowMs - (now - oldestRelevant)
}

/**
 * Clear rate limit data for a user (useful for testing or admin actions)
 * @param userId - The user's ID
 */
export function clearRateLimit(userId: string): void {
  commentTimestamps.delete(userId)
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearAllRateLimits(): void {
  commentTimestamps.clear()
}
