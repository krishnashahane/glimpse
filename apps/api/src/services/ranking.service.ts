export function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes
  if (n === 0) return 0
  const z = 1.96
  const p = upvotes / n
  const sq = Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)
  const numerator = p + (z * z) / (2 * n) - z * sq
  const denominator = 1 + (z * z) / n
  return numerator / denominator
}

export function timeDecay(createdAt: Date, halfLifeHours = 18): number {
  const ageHours = (Date.now() - createdAt.getTime()) / 3_600_000
  return Math.pow(0.5, ageHours / halfLifeHours)
}

export function rankScore(
  upvotes: number,
  downvotes: number,
  createdAt: Date,
  commentCount = 0,
): number {
  const quality = wilsonScore(upvotes, downvotes)
  const freshness = timeDecay(createdAt)
  const engagement = Math.log10(commentCount + 1) * 0.05
  return quality * 0.6 + freshness * 0.3 + engagement + Math.random() * 0.001
}
