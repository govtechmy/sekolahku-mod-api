"use client"

import React from 'react'

type TenantItem = {
  id: string
  name: string
  slug: string
}

export function SchoolSelectorModal({
  isOpen,
  onClose,
  tenants,
  onSelect,
}: {
  isOpen: boolean
  onClose: () => void
  tenants: TenantItem[]
  onSelect: (tenant: TenantItem) => void
}) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        width: '90%',
        maxWidth: 520,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Select School</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }} aria-label="Close">×</button>
        </div>
        <div style={{ padding: 20 }}>
          {tenants.length === 0 ? (
            <p>No schools available.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tenants.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => onSelect(t)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      marginBottom: 8,
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      background: '#fafafa',
                      cursor: 'pointer',
                    }}
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
  )
}






