export const ROLE_IDS = {
  CUSTOMER: '1',
  ADMIN: '2',
  STAFF: '3',
} as const

export const normalizeRoleId = (roleID: unknown): string | null => {
  if (roleID == null) return null
  const raw = String(roleID).trim()
  return raw
}

export const isStaffRole = (roleID: unknown): boolean => {
  const r = normalizeRoleId(roleID)
  if (!r) return false
  const low = String(r).toLowerCase()
  return r === ROLE_IDS.STAFF || low === 'staff'
}
