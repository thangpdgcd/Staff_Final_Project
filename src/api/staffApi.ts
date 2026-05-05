import { httpClient } from '@/api/httpClient'

export const staffApi = {
  /** Danh sách user (staff/admin) — dùng để tìm khách theo tên/email khi tạo voucher */
  listUsers: async () => {
    const res = await httpClient.get('/users', { params: { lite: 'true', role: '1', onlyNew: 'true', limit: 500 } })
    return res.data
  },

  /** Tất cả khách (customer) có email trong DB — dùng trang gửi email staff (không giới hạn "user mới") */
  listCustomersWithEmail: async (limit = 2000) => {
    const res = await httpClient.get('/users', {
      params: { lite: 'true', role: '1', limit: String(limit) },
    })
    return res.data
  },

  getUserById: async (id: string | number) => {
    const res = await httpClient.get(`/users/${id}`)
    return res.data
  },
  listNotifications: async () => {
    const res = await httpClient.get('/notifications')
    return res.data
  },
  markNotificationRead: async (id: string | number) => {
    const res = await httpClient.patch(`/notifications/${id}/read`)
    return res.data
  },
  markAllNotificationsRead: async () => {
    const res = await httpClient.patch('/notifications/read-all')
    return res.data
  },
  listVouchers: async ({
    q = '',
    userId = '',
    page = 1,
    pageSize = 20,
  }: { q?: string; userId?: string; page?: number; pageSize?: number } = {}) => {
    const res = await httpClient.get('/staff/vouchers', { params: { q, userId, page, pageSize, lite: 'true', includePromo: 'true' } })
    return res.data
  },
  listPromoVouchers: async ({ q = '', page = 1, pageSize = 20 }: { q?: string; page?: number; pageSize?: number } = {}) => {
    const res = await httpClient.get('/admin/vouchers', { params: { q, page, pageSize } })
    return res.data
  },
  createPrivateVoucher: async ({ userId, type, value }: { userId: unknown; type: unknown; value: unknown }) => {
    const res = await httpClient.post('/staff/voucher/create', { userId, type, value })
    return res.data
  },
  updateVoucher: async ({ id, patch }: { id: string | number; patch: Record<string, unknown> }) => {
    const res = await httpClient.put(`/staff/vouchers/${id}`, patch)
    return res.data
  },
  deleteVoucher: async ({ id }: { id: string | number }) => {
    const res = await httpClient.delete(`/staff/vouchers/${id}`)
    return res.data
  },
  sendEmail: async ({ toUserId, subject, content }: { toUserId: number; subject: string; content: string }) => {
    const res = await httpClient.post('/staff/email/send', { toUserId, subject, content })
    return res.data
  },
  getProfile: async () => {
    const res = await httpClient.get('/staff/profile')
    return res.data
  },
  updateProfile: async (patch: Record<string, unknown>) => {
    const res = await httpClient.put('/staff/profile', patch)
    return res.data
  },
  changePassword: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    const res = await httpClient.put('/staff/profile/password', { currentPassword, newPassword })
    return res.data
  },
  getAnalytics: async ({ range = 'week' }: { range?: string } = {}) => {
    const res = await httpClient.get('/staff/analytics', { params: { range } })
    return res.data
  },
  listChatConversations: async ({
    mineOnly = false,
    limit = 50,
    offset = 0,
  }: { mineOnly?: boolean; limit?: number; offset?: number } = {}) => {
    const res = await httpClient.get('/conversations', {
      params: { mineOnly: mineOnly ? 'true' : 'false', limit, offset },
    })
    return res.data
  },
  getChatMessages: async (conversationId: string | number, { limit = 80, offset = 0 }: { limit?: number; offset?: number } = {}) => {
    const res = await httpClient.get(`/messages/${conversationId}`, { params: { limit, offset } })
    return res.data
  },
  listAllOrders: async () => {
    const res = await httpClient.get('/orders')
    return res.data
  },
  listStaffOrders: async (params: Record<string, unknown> = {}) => {
    // Use lite mode for the staff list UI (faster; avoids heavy includes).
    const res = await httpClient.get('/staff/orders', { params: { lite: 'true', ...(params || {}) } })
    return res.data
  },
  patchOrderStatus: async (orderId: string | number, status: string) => {
    const res = await httpClient.patch(`/orders/${orderId}/status`, { status })
    return res.data
  },
  resolveRefund: async (orderId: string | number, approved: boolean, note = '') => {
    const res = await httpClient.patch(`/orders/${orderId}/refund`, { approved, note })
    return res.data
  },
  listTeamMembers: async ({ role = 2 }: { role?: number } = {}) => {
    const res = await httpClient.get('/staff/team', { params: { role } })
    return res.data
  },
}
