/**
 * Admin API functions
 */
import apiClient from './client';

// Dashboard Stats
export interface DashboardStats {
  total_clients: number;
  active_clients: number;
  inactive_clients: number;
  suspended_clients: number;
  clients_by_plan: {
    free: number;
    professional: number;
    enterprise: number;
  };
  total_candidates: number;
  total_requirements: number;
  total_applications: number;
  total_cv_uploads: number;
  new_clients_this_month: number;
  new_clients_this_week: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>('/api/admin/dashboard/stats');
  return response.data;
}

// Recent Activity
export interface ActivityItem {
  id: number;
  user_type: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: number;
  description: string;
  created_at: string;
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
  total: number;
}

export async function getRecentActivity(limit = 20): Promise<RecentActivityResponse> {
  const response = await apiClient.get<RecentActivityResponse>(
    `/api/admin/dashboard/recent-activity?limit=${limit}`
  );
  return response.data;
}

// Client Growth
export interface GrowthDataPoint {
  date: string;
  total_clients: number;
  new_clients: number;
  active_clients: number;
}

export interface ClientGrowthResponse {
  period: string;
  data_points: GrowthDataPoint[];
}

export async function getClientGrowth(period = '30days'): Promise<ClientGrowthResponse> {
  const response = await apiClient.get<ClientGrowthResponse>(
    `/api/admin/dashboard/client-growth?period=${period}`
  );
  return response.data;
}

// Client Management
export interface Client {
  id: number;
  email: string;
  company_name: string;
  unique_subdomain?: string;
  logo_url?: string;
  website?: string;
  phone?: string;
  plan: string;
  status: string;
  api_key?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  gdpr_consent: boolean;
  created_at: string;
  last_login?: string;
}

export interface ClientListItem {
  id: number;
  email: string;
  company_name: string;
  plan: string;
  status: string;
  created_at: string;
  last_login?: string;
}

export interface ClientListResponse {
  clients: ClientListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getClients(params: {
  page?: number;
  page_size?: number;
  search?: string;
  plan?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<ClientListResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, value.toString());
    }
  });

  const response = await apiClient.get<ClientListResponse>(
    `/api/admin/clients?${queryParams.toString()}`
  );
  return response.data;
}

export async function getClient(id: number): Promise<Client> {
  const response = await apiClient.get<Client>(`/api/admin/clients/${id}`);
  return response.data;
}

export interface CreateClientData {
  email: string;
  password: string;
  company_name: string;
  website?: string;
  phone?: string;
  plan?: string;
}

export async function createClient(data: CreateClientData): Promise<Client> {
  const response = await apiClient.post<Client>('/api/admin/clients', data);
  return response.data;
}

export async function updateClient(id: number, data: Partial<Client>): Promise<Client> {
  const response = await apiClient.put<Client>(`/api/admin/clients/${id}`, data);
  return response.data;
}

export async function deleteClient(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/clients/${id}`);
}

export async function updateClientStatus(
  id: number,
  status: string
): Promise<Client> {
  const response = await apiClient.put<Client>(`/api/admin/clients/${id}/status`, { status });
  return response.data;
}

export async function resetClientPassword(
  id: number,
  newPassword: string
): Promise<{ message: string }> {
  const response = await apiClient.post(`/api/admin/clients/${id}/reset-password`, { new_password: newPassword });
  return response.data;
}

export async function changeAdminPassword(data: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  const response = await apiClient.post('/api/admin/auth/change-password', data);
  return response.data;
}

export async function getActivityLog(params: {
  limit?: number;
  offset?: number;
  action?: string;
  search?: string;
}): Promise<RecentActivityResponse> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.action) queryParams.append('action', params.action);
  const response = await apiClient.get<RecentActivityResponse>(
    `/api/admin/dashboard/recent-activity?${queryParams.toString()}`
  );
  return response.data;
}
