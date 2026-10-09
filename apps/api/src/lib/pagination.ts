import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const paginatedTake = (page: number, limit: number) => ({
  take: limit + 1,
  skip: page * limit,
})
