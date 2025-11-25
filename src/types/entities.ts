import type { Role } from './enum'

export interface UserEntity {
  name: string
  idNumber: string
  role: Role
  email: string
  username: string
  password: string
}

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface InfoSekolah {
  /** Type of school label e.g SK, SMK, SMKA, etc. */
  jenisLabel?: string | null
  /** Total students (enrolmenPrasekolah + enrolmen + enrolmenKhas) */
  jumlahPelajar?: number
  /** Total number of teachers */
  jumlahGuru?: number
}

export interface InfoKomunikasi {
  /** Primary contact number */
  noTelefon?: string | null
  /** Fax number */
  noFax?: string | null
  /** General contact email */
  email?: string | null
  /** Mailing address */
  alamatSurat?: string | null
  /** Mailing postcode */
  poskodSurat?: string | null
  /** Mailing city */
  bandarSurat?: string | null
}

export interface InfoPentadbiran {
  /** State the school is located in */
  negeri?: string | null
  /** Pejabat Pendidikan Daerah (district office) */
  ppd?: string | null
  /** Parliament constituency */
  parlimen?: string | null
  /** Bantuan classification */
  bantuan?: string | null
  /** Number of school sessions */
  bilSesi?: string | null
  /** School session */
  sesi?: string | null
  /** Has preschool programme */
  prasekolah?: boolean | null
  /** Runs integration programme */
  integrasi?: boolean | null
}

export interface InfoLokasi {
  /** Longitude value */
  koordinatXX?: number | null
  /** Latitude value */
  koordinatYY?: number | null
  /** GeoJSON point for geospatial queries */
  location?: GeoJSONPoint | null
}

export interface EntitiSekolahData {
  infoSekolah: InfoSekolah
  infoKomunikasi: InfoKomunikasi
  infoPentadbiran: InfoPentadbiran
  infoLokasi: InfoLokasi
}

export interface EntitiSekolah {
  /** Name of the school */
  namaSekolah?: string | null
  /** S3 link for Logo */
  logoSekolah?: string
  /** Unique school code identifier */
  kodSekolah: string
  /** Nested school data */
  data: EntitiSekolahData
  /** UTC timestamp when the document was last generated */
  updatedAt: Date
}
