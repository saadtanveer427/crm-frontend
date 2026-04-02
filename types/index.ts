export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserModel {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  organizationId: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  customerId: string;
  createdById: string | null;
  createdBy?: UserModel;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organizationId: string;
  userId: string | null;
  user?: UserModel;
  notes?: Note[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ActivityLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'created' | 'updated' | 'deleted' | 'restored' | 'assigned' | 'note_added';
  userId: string | null;
  performedBy?: UserModel;
  organizationId: string;
  timestamp: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  organizationId: string;
}

export interface AuthState {
  accessToken: string;
  user: AuthUser;
}
