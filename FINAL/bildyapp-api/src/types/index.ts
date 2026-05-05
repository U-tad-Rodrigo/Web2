import type { Types } from 'mongoose';

export interface IAddress {
  street?: string;
  number?: string;
  postal?: string;
  city?: string;
  province?: string;
}

export interface IUser {
  email: string;
  password: string;
  name: string;
  lastName: string;
  nif: string;
  role: 'admin' | 'guest';
  status: 'pending' | 'verified';
  verificationCode?: string;
  verificationAttempts?: number;
  refreshToken?: string;
  company: Types.ObjectId | null;
  address: IAddress;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompany {
  owner: Types.ObjectId;
  name: string;
  cif: string;
  address: IAddress;
  logo: string | null;
  isFreelance: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  user: Types.ObjectId;
  company: Types.ObjectId;
  name: string;
  cif: string;
  email?: string;
  phone?: string;
  address: IAddress;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorker {
  name?: string;
  hours?: number;
}

export interface IProject {
  user: Types.ObjectId;
  company: Types.ObjectId;
  client: Types.ObjectId;
  name: string;
  projectCode: string;
  address: IAddress;
  email?: string;
  notes?: string;
  active: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryNoteFormat = 'material' | 'hours';

export interface IDeliveryNote {
  user: Types.ObjectId;
  company: Types.ObjectId;
  client: Types.ObjectId;
  project: Types.ObjectId;
  format: DeliveryNoteFormat;
  description?: string;
  workDate: Date;
  material?: string;
  quantity?: number;
  unit?: string;
  hours?: number;
  workers: IWorker[];
  signed: boolean;
  signedAt: Date | null;
  signatureUrl: string | null;
  pdfUrl: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
