/**
 * Client Portal API functions
 */
import apiClient from './client';

// ========================
// AUTH
// ========================

export interface ClientSignupData {
    company_name: string;
    email: string;
    password: string;
    plan: string;
    website?: string;
    phone?: string;
}

export interface ClientLoginData {
    email: string;
    password: string;
}

export interface ClientAuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    client: {
        id: number;
        email: string;
        company_name: string;
        plan: string;
        status: string;
        unique_subdomain: string;
        user_type: string;
        role?: string;
        name?: string;
        user_id?: number;
    };
}

export async function clientSignup(data: ClientSignupData): Promise<ClientAuthResponse> {
    const response = await apiClient.post<ClientAuthResponse>('/api/client/auth/signup', data);
    return response.data;
}

export async function clientLogin(data: ClientLoginData): Promise<ClientAuthResponse> {
    const response = await apiClient.post<ClientAuthResponse>('/api/client/auth/login', data);
    return response.data;
}

export async function clientLogout(): Promise<void> {
    try {
        await apiClient.post('/api/client/auth/logout');
    } catch (error) {
        console.error('Client logout error:', error);
    } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('client_user');
    }
}

export async function getClientMe(): Promise<any> {
    const response = await apiClient.get('/api/client/auth/me');
    return response.data;
}

// ========================
// REQUIREMENTS
// ========================

export interface RequirementData {
    job_title: string;
    job_description: string;
    required_skills?: string;
    preferred_skills?: string;
    experience_level?: string;
    location?: string;
    remote_type?: string;
    salary_range?: string;
    priority?: string;
    positions_count?: number;
    deadline?: string;
}

export async function getRequirements(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    assigned_to?: string;
}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) queryParams.append(key, value.toString());
        });
    }
    const response = await apiClient.get(`/api/client/requirements?${queryParams.toString()}`);
    return response.data;
}

export async function createRequirement(data: RequirementData): Promise<any> {
    const response = await apiClient.post('/api/client/requirements', data);
    return response.data;
}

export async function getRequirement(id: number): Promise<any> {
    const response = await apiClient.get(`/api/client/requirements/${id}`);
    return response.data;
}

export async function updateRequirement(id: number, data: Partial<RequirementData>): Promise<any> {
    const response = await apiClient.put(`/api/client/requirements/${id}`, data);
    return response.data;
}

export async function deleteRequirement(id: number): Promise<any> {
    const response = await apiClient.delete(`/api/client/requirements/${id}`);
    return response.data;
}

// ── Requirement Assignments ──

export async function assignRequirementToTeam(requirementId: number, userId: number): Promise<any> {
    const response = await apiClient.put(`/api/client/requirements/${requirementId}/assign-team`, { user_id: userId });
    return response.data;
}

export async function unassignRequirementFromTeam(requirementId: number): Promise<any> {
    const response = await apiClient.put(`/api/client/requirements/${requirementId}/unassign-team`);
    return response.data;
}

export async function assignCandidateToRequirement(requirementId: number, candidateId: number): Promise<any> {
    const response = await apiClient.post(`/api/client/requirements/${requirementId}/assign-candidate`, { candidate_id: candidateId });
    return response.data;
}

export async function unassignCandidateFromRequirement(requirementId: number, candidateId: number): Promise<any> {
    const response = await apiClient.delete(`/api/client/requirements/${requirementId}/unassign-candidate/${candidateId}`);
    return response.data;
}

// ── Pipeline ──

export async function updatePipelineStage(requirementId: number, applicantId: number, stage: string, note?: string): Promise<any> {
    const response = await apiClient.put(`/api/client/requirements/${requirementId}/applicants/${applicantId}/stage`, { stage, note });
    return response.data;
}

export async function getRequirementPipeline(requirementId: number): Promise<any> {
    const response = await apiClient.get(`/api/client/requirements/${requirementId}/pipeline`);
    return response.data;
}

// ========================
// TEAM MANAGEMENT
// ========================

export interface TeamMemberData {
    name: string;
    email: string;
    password: string;
    role: string;
}

export async function getTeamMembers(): Promise<any> {
    const response = await apiClient.get('/api/client/team');
    return response.data;
}

export async function createTeamMember(data: TeamMemberData): Promise<any> {
    const response = await apiClient.post('/api/client/team', data);
    return response.data;
}

export async function updateTeamMember(id: number, data: { name?: string; role?: string; is_active?: boolean }): Promise<any> {
    const response = await apiClient.put(`/api/client/team/${id}`, data);
    return response.data;
}

export async function deleteTeamMember(id: number): Promise<any> {
    const response = await apiClient.delete(`/api/client/team/${id}`);
    return response.data;
}

export async function resetTeamMemberPassword(id: number, password: string): Promise<any> {
    const response = await apiClient.post(`/api/client/team/${id}/reset-password`, { password });
    return response.data;
}

export async function getMemberWorkload(id: number): Promise<any> {
    const response = await apiClient.get(`/api/client/team/${id}/workload`);
    return response.data;
}


// ========================
// DASHBOARD
// ========================

export async function getDashboardOverview(): Promise<any> {
    const response = await apiClient.get('/api/client/dashboard/overview');
    return response.data;
}

export async function getRequirementsStats(): Promise<any> {
    const response = await apiClient.get('/api/client/dashboard/requirements-stats');
    return response.data;
}

export async function getCandidateStats(): Promise<any> {
    const response = await apiClient.get('/api/client/dashboard/candidate-stats');
    return response.data;
}

// ========================
// CANDIDATES
// ========================

export interface CandidateFilterParams {
    search?: string;
    name?: string;
    email?: string;
    status?: string;
    availability?: string;
    experience?: string;
    source?: string;
    remote_preference?: string;
    location?: string[];
    skills?: string[];
    current_title?: string[];
    education?: string[];
    work_authorization?: string[];
    languages?: string[];
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    requirement_id?: number;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
}

export async function getCandidates(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    location?: string;
    requirement_id?: number;
}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) queryParams.append(key, value.toString());
        });
    }
    const response = await apiClient.get(`/api/client/candidates?${queryParams.toString()}`);
    return response.data;
}

export async function filterCandidates(filters: CandidateFilterParams): Promise<any> {
    const response = await apiClient.post('/api/client/candidates/filter', filters);
    return response.data;
}

export async function getFilterOptions(): Promise<any> {
    const response = await apiClient.get('/api/client/candidates/filter-options');
    return response.data;
}

export async function smartSearchCandidates(query: string): Promise<any> {
    const response = await apiClient.post('/api/client/candidates/smart-search', { query });
    return response.data;
}

export async function getCandidateDetail(id: number): Promise<any> {
    const response = await apiClient.get(`/api/client/candidates/${id}`);
    return response.data;
}

