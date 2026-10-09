export function useAdminAuth() {
  const user = useState<{ id: number; username: string; displayName: string | null; role: string; email?: string | null; phone?: string | null; position?: string | null; bio?: string | null; avatarPath?: string | null; createdAt?: string | null } | null>('admin-user', () => null)
  const checked = useState<boolean>('admin-checked', () => false)

  async function fetchSession() {
    try {
      const res = await $fetch<{ authenticated: boolean; user: any }>('/api/admin/session')
      user.value = res.authenticated ? res.user : null
    } catch {
      user.value = null
    } finally {
      checked.value = true
    }
    return user.value
  }

  async function login(username: string, password: string) {
    const res = await $fetch<{ ok: boolean; user: any }>('/api/admin/login', {
      method: 'POST',
      body: { username, password }
    })
    user.value = res.user
    checked.value = true
    return res.user
  }

  async function logout() {
    await $fetch('/api/admin/logout', { method: 'POST' })
    user.value = null
  }

  return { user, checked, fetchSession, login, logout }
}
