import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('glimpse_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (r: unknown) => void }> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
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
        localStorage.setItem('glimpse_token', token)
        failedQueue.forEach((p) => p.resolve(token))
        failedQueue = []
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch (err) {
        failedQueue.forEach((p) => p.reject(err))
        failedQueue = []
        localStorage.removeItem('glimpse_token')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

export type FeedType = 'for_you' | 'latest' | 'following' | 'trending'

export const feedApi = {
  get: (type: FeedType, page = 0) => api.get(`/feed?type=${type}&page=${page}`),
}

export const postApi = {
  get: (id: string) => api.get(`/posts/${id}`),
  create: (data: unknown) => api.post('/posts', data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  vote: (id: string, value: 1 | -1) => api.post(`/posts/${id}/vote`, { value }),
  getComments: (id: string, page = 0) => api.get(`/posts/${id}/comments?page=${page}`),
}

export const communityApi = {
  list: (page = 0, q?: string) => api.get(`/communities?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  get: (slug: string) => api.get(`/communities/${slug}`),
  create: (data: unknown) => api.post('/communities', data),
  join: (slug: string) => api.post(`/communities/${slug}/join`),
  leave: (slug: string) => api.delete(`/communities/${slug}/leave`),
  getPosts: (slug: string, page = 0, sort = 'hot') =>
    api.get(`/communities/${slug}/posts?page=${page}&sort=${sort}`),
}

export const userApi = {
  get: (handle: string) => api.get(`/users/${handle}`),
  updateMe: (data: unknown) => api.put('/users/me', data),
  follow: (handle: string) => api.post(`/users/${handle}/follow`),
  unfollow: (handle: string) => api.delete(`/users/${handle}/follow`),
  getPosts: (handle: string, page = 0) => api.get(`/users/${handle}/posts?page=${page}`),
  getFollowers: (handle: string) => api.get(`/users/${handle}/followers`),
  getFollowing: (handle: string) => api.get(`/users/${handle}/following`),
}

export const newsApi = {
  list: (page = 0, tag?: string) => api.get(`/news?page=${page}${tag ? `&tag=${tag}` : ''}`),
  trending: () => api.get('/news/trending'),
}

export const searchApi = {
  search: (q: string, type = 'all', page = 0) =>
    api.get(`/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}`),
}

export const notificationApi = {
  list: (page = 0) => api.get(`/notifications?page=${page}`),
  read: (ids?: string[]) => api.post('/notifications/read', ids ? { ids } : {}),
  unreadCount: () => api.get('/notifications/unread-count'),
}

export const authApi = {
  register: (data: unknown) => api.post('/auth/register', data),
  login: (data: unknown) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}
