import type { NEGERI, RESPONSE_STATUS, Role, SEKOLAH_STATUS } from './enum'

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
  /** Unique school code identifier */
  kodSekolah: string
  /** Nested school data */
  data: EntitiSekolahData
  /** School status */
  status?: SEKOLAH_STATUS | null
  /** UTC timestamp when the document was created */
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

export interface AnalitikSekolah {
  /** Total number of schools processed */
  jumlahSekolah: number
  /** Total number of teachers */
  jumlahGuru: number
  /** Total number of students */
  jumlahPelajar: number
  /** Analytics data container */
  data: AnalitikSekolahData
  /** UTC timestamp when the document was created */
  createdAt: Date
  /** UTC timestamp when the document was last updated */
  updatedAt?: Date
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
  /** Sekolah Status */
  status?: SEKOLAH_STATUS | null
  /** checksum */
  checksum?: string | null
  /** UTC timestamp when the document was created */
  createdAt?: Date
}

export interface NegeriPolygon {
  /** State name */
  negeri: NEGERI
  /** GeoJSON MultiPolygon for the state */
  geometry: Record<string, unknown>
  /** Optional centroid details */
  centroid?: PolygonCentroid | null
  /** UTC timestamp when the polygon was last updated */
  updatedAt: Date
}

export interface ParlimenPolygon {
  /** State name */
  negeri: NEGERI
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

// Lexical Editor Types for Siaran Content
export interface LexicalTextNode {
  detail: number
  format: number
  mode: string
  style: string
  text: string
  type: 'text'
  version: number
}

export interface LexicalElementNode {
  children: Array<LexicalTextNode | LexicalElementNode>
  direction: string | null
  format: string
  indent: number
  type: string
  version: number
  textFormat?: number
  textStyle?: string
}

export interface LexicalRootNode {
  children: LexicalElementNode[]
  direction: string | null
  format: string
  indent: number
  type: 'root'
  version: number
}

export interface SiaranContent {
  root: LexicalRootNode
}

export interface SiaranAttachment {
  /** Reference to articles-media document ID */
  image?: string | null
  id?: string
}

export interface Siaran {
  /** Article title */
  title: string
  /** Reference to articles-media document ID */
  image: string
  /** Estimated read time in minutes */
  readTime: number
  /** Publication date of the article */
  articleDate: Date
  /** Array of attachment objects with image references */
  attachments?: SiaranAttachment[]
  /** Lexical editor rich text content */
  content: SiaranContent
  /** Reference to category document ID */
  category: string
  /** UTC timestamp when the document was created */
  createdAt: Date
  /** UTC timestamp when the document was last updated */
  updatedAt: Date
}

// Acara types (same structure as Siaran)
export interface AcaraContent {
  root: LexicalRootNode
}

export interface AcaraAttachment {
  /** Reference to articles-media document ID */
  image?: string | null
  id?: string
}

export interface Acara {
  /** Event title */
  title: string
  /** Reference to articles-media document ID */
  image: string
  /** Estimated read time in minutes */
  readTime: number
  /** Event date */
  articleDate: Date
  /** Array of attachment objects with image references */
  attachments?: AcaraAttachment[]
  /** Lexical editor rich text content */
  content: AcaraContent
  /** Reference to category document ID */
  category: string
  /** UTC timestamp when the document was created */
  createdAt: Date
  /** UTC timestamp when the document was last updated */
  updatedAt: Date
}

export interface SystemConfig {
  key: string
  value: unknown
  description?: string
  updatedAt: Date
}
