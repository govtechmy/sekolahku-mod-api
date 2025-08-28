import type { Types } from "mongoose";
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

export interface DocumentEntity {
  title: string;
  content?: string;
  tags?: string[];
  type?: string;
  isApproved?: boolean;
  version?: string;
  url?: string;
  createdBy?: Types.ObjectId;
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
export const createDocumentBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().optional(),
});

export type CreateDocumentBody = z.infer<typeof createDocumentBodySchema>;

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
