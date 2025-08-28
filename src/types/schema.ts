import { z } from "zod";

export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = typeof ROLES[number];

export interface UserEntity {
  name: string;
  idNumber: string;
  role: Role;
  email: string;
  username: string;
  password: string;
}

 


// School types
export interface SchoolAdminInfo {
  state?: string;
  ppd?: string;
  parliament?: string;
  dun?: string;
}

export interface MailingAddress {
  line?: string;
  postcode?: string;
  city?: string;
  state?: string;
}

export interface SchoolContacts {
  phones?: string[];
  fax?: string[];
  emails?: string[];
}

export interface SchoolSessions {
  count?: number;
  labels?: string[];
}

export interface SchoolEnrolment {
  preschool?: number;
  total?: number;
  specialNeeds?: number;
}

export interface SchoolStaffing {
  teachers?: number;
}

export interface SchoolFacilities {
  hasPreschool?: boolean;
  integration?: boolean;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface SchoolMetaRaw {
  [key: string]: unknown;
}

export interface SchoolMeta {
  raw?: SchoolMetaRaw;
  sourceRowId?: string;
  ingestedAt?: Date;
}

export interface SchoolEntity {
  code: string;
  name: string;
  level?: string;
  typeLabel?: string;
  admin?: SchoolAdminInfo;
  mailingAddress?: MailingAddress;
  contacts?: SchoolContacts;
  grade?: string;
  assistance?: string;
  sessions?: SchoolSessions;
  enrolment?: SchoolEnrolment;
  staffing?: SchoolStaffing;
  facilities?: SchoolFacilities;
  geo?: GeoPoint;
  skmLe150?: boolean;
  meta?: SchoolMeta;
}

// Zod schemas for request validation

export const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginBodyValidated = z.infer<typeof loginBodySchema>;

// Headers and other bodies
export const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+.+$/),
});
export type AuthHeader = z.infer<typeof authHeaderSchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshBodyValidated = z.infer<typeof refreshBodySchema>;

// School bodies
export const createSchoolBodySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  level: z.string().optional(),
  typeLabel: z.string().optional(),
  admin: z
    .object({
      state: z.string().optional(),
      ppd: z.string().optional(),
      parliament: z.string().optional(),
      dun: z.string().optional(),
    })
    .optional(),
  mailingAddress: z
    .object({
      line: z.string().optional(),
      postcode: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
  contacts: z
    .object({
      phones: z.array(z.string()).optional(),
      fax: z.array(z.string()).optional(),
      emails: z.array(z.string()).optional(),
    })
    .optional(),
  grade: z.string().optional(),
  assistance: z.string().optional(),
  sessions: z
    .object({
      count: z.number().int().optional(),
      labels: z.array(z.string()).optional(),
    })
    .optional(),
  enrolment: z
    .object({
      preschool: z.number().int().optional(),
      total: z.number().int().optional(),
      specialNeeds: z.number().int().optional(),
    })
    .optional(),
  staffing: z
    .object({
      teachers: z.number().int().optional(),
    })
    .optional(),
  facilities: z
    .object({
      hasPreschool: z.boolean().optional(),
      integration: z.boolean().optional(),
    })
    .optional(),
  geo: z
    .object({
      type: z.literal("Point"),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  skmLe150: z.boolean().optional(),
  meta: z
    .object({
      raw: z.record(z.string(), z.unknown()).optional(),
      sourceRowId: z.string().optional(),
      ingestedAt: z.coerce.date().optional(),
    })
    .optional(),
});
export type CreateSchoolBody = z.infer<typeof createSchoolBodySchema>;
