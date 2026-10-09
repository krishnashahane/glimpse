import { z } from 'zod'

export const httpUrl = z.string().url().refine((value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}, 'Only HTTP(S) URLs are allowed')
