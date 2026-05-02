import { httpClient } from '@/api/httpClient'

export type LoginPayload = { email: string; password: string }

export const authApi = {
  login: async (payload: LoginPayload) => {
    const res = await httpClient.post('/login', payload)
    return res.data
  },
  me: async () => {
    const res = await httpClient.get('/me')
    return res.data
  },
  logout: async () => {
    const res = await httpClient.post('/logout')
    return res.data
  },
}
