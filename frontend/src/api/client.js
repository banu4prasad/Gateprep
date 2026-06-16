import axios from 'axios'

export const AUTH_UNAUTHORIZED_EVENT = 'gateprep:auth-unauthorized'

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const BASE_URL = import.meta.env.PROD
  ? '/api'
  : rawApiUrl.split(',')[0].trim()

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const isAuthRoute = err.config?.url?.includes('/auth/')
      if (!isAuthRoute) {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
      }
    }
    return Promise.reject(err)
  }
)

export default api
