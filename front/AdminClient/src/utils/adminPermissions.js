export const hasRoutePermission = (user, permission) => {
  if (!permission) return true

  const requiredPermissions = Array.isArray(permission) ? permission : [permission]
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
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
