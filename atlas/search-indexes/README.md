# Atlas Search Indexes

Definisi Atlas Search index untuk projek Sekolahku. Fail ini disimpan dalam repo supaya
persekitaran lain (dev/prod) boleh diselaraskan.

## `sekolah_search.json`

Search index untuk endpoint `GET /schools/search` (fuzzy search sekolah).

- **Database:** `Sekolahku` (rujuk `MONGODB_URI`)
- **Collection:** `EntitiSekolah`
- **Index name:** `sekolah_search`

### Field mappings

| Path | Type | Tujuan |
| --- | --- | --- |
| `namaSekolah` | `string` | Fuzzy text search |
| `data.infoKomunikasi.alamatSurat` | `string` | Fuzzy text search |
| `data.infoKomunikasi.bandarSurat` | `string` | Fuzzy text search |
| `data.infoPentadbiran.parlimen` | `string` | Fuzzy text search |
| `data.infoPentadbiran.negeri` | `string` + `token` | Fuzzy text search + penapis `equals` |
| `data.infoPentadbiran.peringkat` | `token` | Penapis `equals` |
| `data.infoSekolah.jenisLabel` | `token` | Penapis `equals` |
| `data.infoLokasi.location` | `geo` | Klausa `geoWithin` / `near` |

Nota:
- `type: string` — dianalisis sebagai teks penuh untuk padanan fuzzy (`text` + `fuzzy`).
- `type: token` — nilai tepat, diperlukan oleh operator `equals` Atlas Search.
- `negeri` diberi kedua-dua `string` + `token` supaya boleh dicari secara teks DAN
  ditapis tepat.
- `type: geo` — diperlukan untuk klausa `geoWithin.circle` / `near`.

## Cara mencipta index

### Pilihan A — Atlas UI (JSON Editor)

1. Atlas > Database > **Search** > **Create Search Index**.
2. Pilih **JSON Editor**.
3. Database `Sekolahku`, Collection `EntitiSekolah`.
4. Index Name: `sekolah_search`.
5. Tampal kandungan `sekolah_search.json`.
6. **Create** dan tunggu status menjadi **Active**.

### Pilihan B — `mongosh` / driver (`createSearchIndex`)

```js
use Sekolahku

db.EntitiSekolah.createSearchIndex({
  name: "sekolah_search",
  // Kandungan sekolah_search.json:
  definition: {
    mappings: {
      dynamic: false,
      fields: {
        namaSekolah: [{ type: "string" }],
        data: {
          type: "document",
          fields: {
            infoKomunikasi: {
              type: "document",
              fields: {
                alamatSurat: { type: "string" },
                bandarSurat: { type: "string" }
              }
            },
            infoPentadbiran: {
              type: "document",
              fields: {
                parlimen: { type: "string" },
                negeri: [{ type: "string" }, { type: "token" }],
                peringkat: { type: "token" }
              }
            },
            infoSekolah: {
              type: "document",
              fields: { jenisLabel: { type: "token" } }
            },
            infoLokasi: {
              type: "document",
              fields: { location: { type: "geo" } }
            }
          }
        }
      }
    }
  }
})
```

Sahkan:

```js
db.EntitiSekolah.getSearchIndexes()
```

> Nota: Atlas Search hanya tersedia pada MongoDB Atlas (bukan `localhost` biasa). Untuk
> pembangunan tempatan, gunakan `mongodb-atlas-local`.
