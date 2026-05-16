const normalizePermissions = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim())
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string' && item.trim())
        : []
    } catch {
      return []
    }
  }

  return []
}

export const hasRoutePermission = (user, permission) => {
  if (!permission) return true

  const requiredPermissions = Array.isArray(permission) ? permission : [permission]
  const permissions = normalizePermissions(user?.permissions)
  return (
    user?.role === 'super_admin' ||
    permissions.includes('all') ||
    requiredPermissions.some((item) => permissions.includes(item))
  )
}

export const canAccessMenuItem = (userType, user, item) => {
  if (!item.roles?.includes(userType || 'admin')) return false
  if (!item.permission) return true
  return hasRoutePermission(user, item.permission)
}
