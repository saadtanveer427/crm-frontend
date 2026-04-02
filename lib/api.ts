import type {
  AuthState,
  Customer,
  UserModel,
  ActivityLog,
  Paginated,
  Note,
  Organization,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Auth storage ─────────────────────────────────────────────────────────────

export function getStoredAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function storeAuth(data: AuthState): void {
  localStorage.setItem("auth", JSON.stringify(data));
}

export function clearAuth(): void {
  localStorage.removeItem("auth");
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

export interface ApiError {
  message: string | string[];
  statusCode: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = getStoredAuth();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      message: "An unexpected error occurred.",
      statusCode: res.status,
    }));
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  user: AuthState["user"];
}

export async function loginWithEmail(email: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<UserModel[]> {
  return request<UserModel[]>("/users");
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: "admin" | "member";
  organizationId: string;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserModel> {
  return request<UserModel>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Organizations ────────────────────────────────────────────────────────────

export async function fetchOrganizations(): Promise<Organization[]> {
  return request<Organization[]>("/organizations");
}

export async function fetchOrganization(id: string): Promise<Organization> {
  return request<Organization>(`/organizations/${id}`);
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface FetchCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchCustomers(
  params: FetchCustomersParams = {},
): Promise<Paginated<Customer>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<Paginated<Customer>>(`/customers${query}`);
}

export async function fetchCustomer(id: string): Promise<Customer> {
  return request<Customer>(`/customers/${id}`);
}

export interface CreateCustomerPayload {
  name: string;
  email: string;
  phone?: string;
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  return request<Customer>("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string;
  phone?: string;
  userId?: string;
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  return request<Customer>(`/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/customers/${id}`, { method: "DELETE" });
}

export async function restoreCustomer(
  id: string,
): Promise<{ message: string }> {
  return request<{ message: string }>(`/customers/${id}/restore`, {
    method: "POST",
  });
}

export async function fetchDeletedCustomers(
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<Customer>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<Paginated<Customer>>(`/customers/deleted${query}`);
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function createNote(
  customerId: string,
  content: string,
): Promise<Note> {
  return request<Note>(`/customers/${customerId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteNote(
  customerId: string,
  noteId: string,
): Promise<void> {
  return request<void>(`/customers/${customerId}/notes/${noteId}`, {
    method: "DELETE",
  });
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export interface FetchActivityLogsParams {
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}

export async function fetchActivityLogs(
  params: FetchActivityLogsParams = {},
): Promise<Paginated<ActivityLog>> {
  const qs = new URLSearchParams();
  if (params.entityType) qs.set("entityType", params.entityType);
  if (params.entityId) qs.set("entityId", params.entityId);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<Paginated<ActivityLog>>(`/activity-logs${query}`);
}
