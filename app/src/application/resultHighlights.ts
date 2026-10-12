export interface ResultMetric {
  readonly id: string
  readonly value: number
}

// Presentation only: a tie never produces a unique winner.
export function findUniqueLowestMetricId(
  metrics: readonly ResultMetric[],
  tolerance = 0.005,
): string | null {
  if (metrics.length < 2 || metrics.some((metric) => !Number.isFinite(metric.value))) {
    return null
  }
  const minimum = Math.min(...metrics.map((metric) => metric.value))
  const tied = metrics.filter((metric) => Math.abs(metric.value - minimum) <= tolerance)
  return tied.length === 1 ? tied[0].id : null
}
