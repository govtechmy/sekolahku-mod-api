import type { Role } from './enum'

export interface UserEntity {
  name: string
  idNumber: string
  role: Role
  email: string
  username: string
  password: string
}

export interface SchoolAdminInfo {
  state?: string
  ppd?: string
  parliament?: string
  dun?: string
}

export interface MailingAddress {
  line?: string
  postcode?: string
  city?: string
  state?: string
}

export interface SchoolContacts {
  phones?: string[]
  fax?: string[]
  emails?: string[]
}

export interface SchoolSessions {
  count?: number
  labels?: string[]
}

export interface SchoolEnrolment {
  preschool?: number
  total?: number
  specialNeeds?: number
}

export interface SchoolStaffing {
  teachers?: number
}

export interface SchoolFacilities {
  hasPreschool?: boolean
  integration?: boolean
}

export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface SchoolMetaRaw {
  [key: string]: unknown
}

export interface SchoolMeta {
  raw?: SchoolMetaRaw
  sourceRowId?: string
  ingestedAt?: Date
}

export interface SchoolEntity {
  code: string
  name: string
  level?: string
  typeLabel?: string
  admin?: SchoolAdminInfo
  mailingAddress?: MailingAddress
  contacts?: SchoolContacts
  grade?: string
  assistance?: string
  sessions?: SchoolSessions
  enrolment?: SchoolEnrolment
  staffing?: SchoolStaffing
  facilities?: SchoolFacilities
  geo?: GeoPoint
  skmLe150?: boolean
  meta?: SchoolMeta
}
