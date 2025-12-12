/* eslint-disable no-unused-vars */
export const ROLES = ['admin', 'editor', 'viewer'] as const

export type Role = (typeof ROLES)[number]

export enum RESPONSE_STATUS {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum SEKOLAH_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const NEGERI = [
  'JOHOR',
  'KEDAH',
  'KELANTAN',
  'MELAKA',
  'NEGERI SEMBILAN',
  'PAHANG',
  'PERAK',
  'PERLIS',
  'PULAU PINANG',
  'SABAH',
  'SARAWAK',
  'SELANGOR',
  'TERENGGANU',
  'WILAYAH PERSEKUTUAN KUALA LUMPUR',
  'WILAYAH PERSEKUTUAN LABUAN',
  'WILAYAH PERSEKUTUAN PUTRAJAYA',
] as const

export type Negeri = (typeof NEGERI)[number]

export enum MARKER_GROUP {
  GROUP = 'GROUP',
  INDIVIDUAL = 'INDIVIDUAL',
  NEGERI = 'NEGERI',
  PARLIMENT = 'PARLIMENT',
  WEST_MALAYSIA = 'WEST_MALAYSIA',
  EAST_MALAYSIA = 'EAST_MALAYSIA',
  MALAYSIA = 'MALAYSIA',
}
