import { access, canView, canEdit, roleLabel, type Area } from '~~/shared/permissions'

// Rechte des angemeldeten Benutzers (Rollen-Tabelle: shared/permissions.ts)
export function usePermissions() {
  const { user } = useAdminAuth()
  const role = computed(() => user.value?.role || '')
  return {
    role,
    roleName: computed(() => roleLabel(role.value)),
    isAdmin: computed(() => role.value === 'superadmin'),
    access: (area: Area) => access(role.value, area),
    can: (area: Area) => canView(role.value, area),
    canEdit: (area: Area) => canEdit(role.value, area)
  }
}
