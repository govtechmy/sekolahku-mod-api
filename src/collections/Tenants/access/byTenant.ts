import type { Access, Where } from 'payload'

import { isSuperAdmin } from '../../../access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export const filterByTenantRead: Access = (args) => {
  // Public frontend read: allow all tenants to be read without auth
  if (!args.req.user) {
    return true
  }

  if (isSuperAdmin(args.req.user)) {
    return true
  }

  return {
    id: {
      in: getUserTenantIDs(args.req.user),
    },
  } as Where
}

export const canMutateTenant: Access = ({ req }) => {
  if (!req.user) {
    return false
  }

  if (isSuperAdmin(req.user)) {
    return true
  }

  return {
    id: {
      in:
        req.user?.tenants
          ?.map(({ roles, tenant }) =>
            roles?.includes('tenant-admin')
              ? tenant && (typeof tenant === 'string' ? tenant : tenant.id)
              : null,
          )
          .filter(Boolean) || [],
    },
  }
}
