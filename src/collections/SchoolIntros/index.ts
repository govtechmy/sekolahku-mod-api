import type { CollectionConfig } from 'payload'

import { superAdminOrTenantAdminAccess } from '@/collections/Pages/access/superAdminOrTenantAdmin'
import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export const SchoolIntros: CollectionConfig = {
  slug: 'school-intros',
  access: {
    create: superAdminOrTenantAdminAccess,
    delete: superAdminOrTenantAdminAccess,
    read: ({ req }) => {
      // Public frontend read allowed
      if (!req?.user) {
        return true
      }

      if (isSuperAdmin(req.user)) {
        return true
      }

      return {
        tenant: {
          in: getUserTenantIDs(req.user),
        },
      }
    },
    update: superAdminOrTenantAdminAccess,
  },
  admin: {
    useAsTitle: 'headline',
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'headline',
      type: 'text',
      required: true,
    },
    {
      name: 'intro',
      type: 'textarea',
    },
  ],
}


