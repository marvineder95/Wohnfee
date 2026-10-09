import { currentAdminUser } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const user = await currentAdminUser(event)
  return { authenticated: !!user, user }
})
