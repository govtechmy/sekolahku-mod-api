import { Config } from 'payload'

export const seed: NonNullable<Config['onInit']> = async (payload): Promise<void> => {
  const payloadAny = payload as any
  const tenant1 = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Sekolah Emas',
      slug: 'gold',
      domain: 'gold.localhost',
      allowPublicRead: true,
    },
  })

  const tenant2 = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Sekolah Perak',
      slug: 'silver',
      domain: 'silver.localhost',
      allowPublicRead: true,
    },
  })

  const tenant3 = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Sekolah Gangsa',
      slug: 'bronze',
      domain: 'bronze.localhost',
      allowPublicRead: true,
    },
  })

  await payload.create({
    collection: 'users',
    data: {
      email: 'demo@payloadcms.com',
      password: 'demo',
      roles: ['super-admin'],
    },
  })

  await payload.create({
    collection: 'users',
    data: {
      email: 'tenant1@payloadcms.com',
      password: 'demo',
      tenants: [
        {
          roles: ['tenant-admin'],
          tenant: tenant1.id,
        },
      ],
      username: 'tenant1',
    },
  })

  await payload.create({
    collection: 'users',
    data: {
      email: 'tenant2@payloadcms.com',
      password: 'demo',
      tenants: [
        {
          roles: ['tenant-admin'],
          tenant: tenant2.id,
        },
      ],
      username: 'tenant2',
    },
  })

  await payload.create({
    collection: 'users',
    data: {
      email: 'tenant3@payloadcms.com',
      password: 'demo',
      tenants: [
        {
          roles: ['tenant-admin'],
          tenant: tenant3.id,
        },
      ],
      username: 'tenant3',
    },
  })

  await payload.create({
    collection: 'users',
    data: {
      email: 'multi-admin@payloadcms.com',
      password: 'demo',
      tenants: [
        {
          roles: ['tenant-admin'],
          tenant: tenant1.id,
        },
        {
          roles: ['tenant-admin'],
          tenant: tenant2.id,
        },
        {
          roles: ['tenant-admin'],
          tenant: tenant3.id,
        },
      ],
      username: 'multi-admin',
    },
  })

  await payload.create({
    collection: 'pages',
    data: {
      slug: 'home',
      tenant: tenant1.id,
      title: 'Page for Tenant 1',
    },
  })

  await payload.create({
    collection: 'pages',
    data: {
      slug: 'home',
      tenant: tenant2.id,
      title: 'Page for Tenant 2',
    },
  })

  await payload.create({
    collection: 'pages',
    data: {
      slug: 'home',
      tenant: tenant3.id,
      title: 'Page for Tenant 3',
    },
  })

  // School intros (one per tenant)
  await payloadAny.create({
    collection: 'school-intros',
    data: {
      tenant: tenant1.id,
      headline: 'Selamat datang ke Sekolah Emas',
      intro: 'Sekolah Emas memberi tumpuan kepada kecemerlangan akademik dan sahsiah.',
    },
  })

  await payloadAny.create({
    collection: 'school-intros',
    data: {
      tenant: tenant2.id,
      headline: 'Selamat datang ke Sekolah Perak',
      intro: 'Sekolah Perak menekankan pembelajaran seumur hidup dan komuniti.',
    },
  })

  await payloadAny.create({
    collection: 'school-intros',
    data: {
      tenant: tenant3.id,
      headline: 'Selamat datang ke Sekolah Gangsa',
      intro: 'Sekolah Gangsa membina asas kukuh untuk masa depan.',
    },
  })

  // Articles per tenant
  const createArticle = async (
    tenantId: string | number,
    index: number,
    prefix: string,
  ) => {
    await payloadAny.create({
      collection: 'articles',
      data: {
        tenant: tenantId,
        title: `${prefix} Artikel ${index}`,
        slug: `${prefix.toLowerCase()}-artikel-${index}`,
        excerpt: 'Ringkasan artikel untuk pratonton.',
        content: 'Kandungan artikel ringkas untuk versi alpha.',
        publishedAt: new Date().toISOString(),
      },
    })
  }

  await Promise.all([
    createArticle(tenant1.id, 1, 'Emas'),
    createArticle(tenant1.id, 2, 'Emas'),
    createArticle(tenant2.id, 1, 'Perak'),
    createArticle(tenant2.id, 2, 'Perak'),
    createArticle(tenant3.id, 1, 'Gangsa'),
    createArticle(tenant3.id, 2, 'Gangsa'),
  ])
}
