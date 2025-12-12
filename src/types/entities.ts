import type { Negeri, RESPONSE_STATUS, Role, SEKOLAH_STATUS } from './enum'

export interface UserEntity {
  name: string
  idNumber: string
  role: Role
  email: string
  username: string
  password: string
}

export interface GeoJSONPoint {
  type: number
  coordinates: [number, number]
}

export interface PolygonCentroid {
  /** GeoJSON point representing centroid location */
  location?: GeoJSONPoint | null
  /** Longitude component of centroid */
  koordinatXX?: number | null
  /** Latitude component of centroid */
  koordinatYY?: number | null
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
  /** School status */
  status: SEKOLAH_STATUS
  /** UTC timestamp when the document was last updated */
  updatedAt: Date
  /** UTC timestamp when the document is First Time Created */
  createdAt: Date
}
export interface AnalitikItem {
  /** Category or type */
  jenis: string
  /** Percentage of total */
  peratus: number
  /** Total count for this category */
  total: number
}

export interface AnalitikSekolahData {
  /** Analytics by school type/label */
  jenisLabel: AnalitikItem[]
  /** Analytics by assistance type */
  bantuan: AnalitikItem[]
}

export interface EntitiAnalitikSekolah {
  /** Fixed document ID */
  _id: number
  /** Total number of schools processed */
  jumlahSekolah: number
  /** Total number of teachers */
  jumlahGuru: number
  /** Total number of students */
  jumlahPelajar: number
  /** Analytics data container */
  data: AnalitikSekolahData
  /** UTC timestamp when the document was last updated */
  updatedAt: Date
  /** UTC timestamp when the document was first created */
  createdAt: Date
}

export interface Sekolah {
  /** State the school is located in */
  negeri?: string | null
  /** Pejabat Pendidikan Daerah (district office) */
  ppd?: string | null
  /** Parliament constituency */
  parlimen?: string | null
  /** State assembly constituency */
  dun?: string | null
  /** School level (e.g., "Rendah", "Menengah") */
  peringkat?: string | null
  /** Type of school label (e.g., "SK", "SMK", "SMKA") */
  jenisLabel?: string | null
  /** Unique school code identifier */
  kodSekolah: string
  /** Name of the school */
  namaSekolah?: string | null
  /** Mailing address */
  alamatSurat?: string | null
  /** Mailing postcode */
  poskodSurat?: number | null
  /** Mailing city */
  bandarSurat?: string | null
  /** Primary contact number */
  noTelefon?: string | null
  /** Fax number */
  noFax?: string | null
  /** General contact email */
  email?: string | null
  /** Location type (e.g., "Bandar", "Luar Bandar") */
  lokasi?: string | null
  /** School grade (e.g., "A", "B", "C") */
  gred?: string | null
  /** Bantuan classification */
  bantuan?: string | null
  /** Number of school sessions */
  bilSesi?: string | null
  /** School session */
  sesi?: string | null
  /** Preschool enrollment count */
  enrolmenPrasekolah?: number | null
  /** General enrollment count */
  enrolmen?: number | null
  /** Special needs enrollment count */
  enrolmenKhas?: number | null
  /** Total number of teachers */
  guru?: number | null
  /** Has preschool programme */
  prasekolah?: boolean | null
  /** Runs integration programme */
  integrasi?: boolean | null
  /** Longitude coordinate */
  koordinatXX?: number | null
  /** Latitude coordinate */
  koordinatYY?: number | null
  /** SKM LEQ 150 status */
  skmLEQ150?: boolean | null
  /** GeoJSON point for geospatial queries */
  location?: GeoJSONPoint | null
  /** Sekolah Status */
  status?: SEKOLAH_STATUS | null
  /** checksum */
  checksum?: string | null
  /** UTC timestamp when the document was last updated */
  updatedAt?: Date
}

export interface NegeriPolygon {
  /** State name */
  negeri: Negeri
  /** GeoJSON MultiPolygon for the state */
  geometry: Record<string, unknown>
  /** Optional centroid details */
  centroid?: PolygonCentroid | null
  /** UTC timestamp when the polygon was last updated */
  updatedAt: Date
}

export interface ParlimenPolygon {
  /** State name */
  negeri: Negeri
  /** Parliament constituency name */
  parlimen: string
  /** GeoJSON MultiPolygon for the parliament area */
  geometry: Record<string, unknown>
  /** Optional centroid details */
  centroid?: PolygonCentroid | null
  /** UTC timestamp when the polygon was last updated */
  updatedAt: Date
}
export interface ResponseModel {
  status: RESPONSE_STATUS
  statusCode: number
  data: unknown | ResponseListModel
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface ResponseListModel {
  items: unknown[]
  pageNumber: number
  pageSize: number
}
