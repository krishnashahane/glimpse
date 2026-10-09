import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let accessToken: string | null = null
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (reason: unknown) => void }> = []

export function setAccessToken(token: string | null) {
  accessToken = token
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error || new Error('Authentication refresh failed'))
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshUrl = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
        : '/api/auth/refresh'
      const { data } = await axios.post(refreshUrl, {}, { withCredentials: true })
      const token = data.token as string

      accessToken = token
      processQueue(null, token)
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      accessToken = null
      window.dispatchEvent(new Event('glimpse:auth-expired'))
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export type FeedType = 'for_you' | 'latest' | 'following' | 'trending'

export const feedApi = {
  get: (type: FeedType, page = 0) => api.get('/feed', { params: { type, page } }),
}

export const postApi = {
  get: (id: string) => api.get(`/posts/${encodeURIComponent(id)}`),
  create: (data: unknown) => api.post('/posts', data),
  delete: (id: string) => api.delete(`/posts/${encodeURIComponent(id)}`),
  vote: (id: string, value: 1 | -1) => api.post(`/posts/${encodeURIComponent(id)}/vote`, { value }),
  getComments: (id: string, page = 0) =>
    api.get(`/posts/${encodeURIComponent(id)}/comments`, { params: { page } }),
}

export const communityApi = {
  list: (page = 0, q?: string) => api.get('/communities', { params: { page, q } }),
  get: (slug: string) => api.get(`/communities/${encodeURIComponent(slug)}`),
  create: (data: unknown) => api.post('/communities', data),
  join: (slug: string) => api.post(`/communities/${encodeURIComponent(slug)}/join`),
  leave: (slug: string) => api.delete(`/communities/${encodeURIComponent(slug)}/leave`),
  getPosts: (slug: string, page = 0, sort = 'hot') =>
    api.get(`/communities/${encodeURIComponent(slug)}/posts`, { params: { page, sort } }),
}

export const userApi = {
  get: (handle: string) => api.get(`/users/${encodeURIComponent(handle)}`),
  updateMe: (data: unknown) => api.put('/users/me', data),
  follow: (handle: string) => api.post(`/users/${encodeURIComponent(handle)}/follow`),
  unfollow: (handle: string) => api.delete(`/users/${encodeURIComponent(handle)}/follow`),
  getPosts: (handle: string, page = 0) =>
    api.get(`/users/${encodeURIComponent(handle)}/posts`, { params: { page } }),
  getFollowers: (handle: string) =>
    api.get(`/users/${encodeURIComponent(handle)}/followers`),
  getFollowing: (handle: string) =>
    api.get(`/users/${encodeURIComponent(handle)}/following`),
}

export const newsApi = {
  list: (page = 0, tag?: string) => api.get('/news', { params: { page, tag } }),
  trending: () => api.get('/news/trending'),
}

export const searchApi = {
  search: (q: string, type = 'all', page = 0) =>
    api.get('/search', { params: { q, type, page } }),
}

export const notificationApi = {
  list: (page = 0) => api.get('/notifications', { params: { page } }),
  read: (ids?: string[]) => api.post('/notifications/read', ids ? { ids } : {}),
  unreadCount: () => api.get('/notifications/unread-count'),
}

export const authApi = {
  register: (data: unknown) => api.post('/auth/register', data),
  login: (data: unknown) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => {
    const refreshUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
      : '/api/auth/refresh'
    return axios.post(refreshUrl, {}, { withCredentials: true })
  },
}
