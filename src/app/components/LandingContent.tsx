"use client"

import React, { useEffect, useMemo, useState } from 'react'

type TenantItem = {
  id: string
  name: string
  slug: string
}

type Intro = {
  headline: string
  intro?: string
}

type Article = {
  id: string
  title: string
  slug: string
  excerpt?: string
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function LandingContent() {
  const [tenants, setTenants] = useState<TenantItem[]>([])
  const [selected, setSelected] = useState<TenantItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [intro, setIntro] = useState<Intro | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const data = await fetchJSON<{ docs: any[] }>(
        `/api/tenants?where[allowPublicRead][equals]=true&limit=100`,
      )
      const mapped = (data.docs || []).map((d) => ({ id: d.id, name: d.name, slug: d.slug }))
      setTenants(mapped)
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('sekolahku:tenant') : null
      const initial = stored ? mapped.find((t) => t.slug === stored) : mapped[0]
      if (initial) setSelected(initial)
    })()
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    ;(async () => {
      try {
        const [introRes, articlesRes] = await Promise.all([
          fetchJSON<{ docs: any[] }>(`/api/school-intros?where[tenant.slug][equals]=${selected.slug}&limit=1`),
          fetchJSON<{ docs: any[] }>(`/api/articles?where[tenant.slug][equals]=${selected.slug}&sort=-publishedAt&limit=12`),
        ])
        const doc = introRes.docs?.[0]
        setIntro(doc ? { headline: doc.headline, intro: doc.intro } : null)
        setArticles((articlesRes.docs || []).map((d) => ({ id: d.id, title: d.title, slug: d.slug, excerpt: d.excerpt })))
        if (typeof window !== 'undefined') window.localStorage.setItem('sekolahku:tenant', selected.slug)
      } finally {
        setLoading(false)
      }
    })()
  }, [selected])

  const headerTitle = useMemo(() => selected?.name || 'Sekolahku', [selected])

  return (
    <div>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontWeight: 700 }}>{headerTitle}</div>
        <button onClick={() => setIsModalOpen(true)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Select School</button>
      </nav>

      <main style={{ padding: 16 }}>
        {!selected ? (
          <p>Loading schools…</p>
        ) : (
          <>
            <section style={{ margin: '16px 0 24px' }}>
              {loading ? (
                <p>Loading content…</p>
              ) : intro ? (
                <>
                  <h1 style={{ marginBottom: 8 }}>{intro.headline}</h1>
                  {intro.intro && <p style={{ color: '#444' }}>{intro.intro}</p>}
                </>
              ) : (
                <p>No introduction available.</p>
              )}
            </section>

            <section>
              <h2 style={{ margin: '8px 0 12px' }}>Articles</h2>
              {articles.length === 0 ? (
                <p>No articles found.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {articles.map((a) => (
                    <article key={a.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{a.title}</div>
                      {a.excerpt && <p style={{ color: '#555', fontSize: 14, margin: 0 }}>{a.excerpt}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Lazy import to avoid circular. Inline modal for simplicity */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, width: '90%', maxWidth: 520, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Select School</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }} aria-label="Close">×</button>
            </div>
            <div style={{ padding: 20 }}>
              {tenants.length === 0 ? (
                <p>No schools available.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {tenants.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => {
                          setSelected(t)
                          setIsModalOpen(false)
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, borderRadius: 6, border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div style={{ color: '#666', fontSize: 12 }}>/{t.slug}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






