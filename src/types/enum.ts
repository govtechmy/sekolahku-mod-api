export const ROLES = ['admin', 'editor', 'viewer'] as const

export type Role = (typeof ROLES)[number]

export enum RESPONSE_STATUS {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
