// API Client for Local Backend (SQL Server)
// Switch between Supabase and Local API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Use local API if VITE_USE_LOCAL_API is set to 'true'
export const USE_LOCAL_API = import.meta.env.VITE_USE_LOCAL_API === 'true';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    // If no token and running against local API in dev, attempt auto dev-login
    const devAuto = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';
    if (!this.getToken() && USE_LOCAL_API && devAuto) {
      try {
        const devEmail = import.meta.env.VITE_DEV_EMAIL || 'admin@radiance.test';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const resp = await fetch(`${this.baseUrl}/auth/dev-token`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: devEmail })
        });
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const j = await resp.json();
          if (j.token) this.setToken(j.token);
        }
      } catch (e) {
        // ignore
      }
    }

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const token = this.getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    if (body) {
      config.body = JSON.stringify(body);
    }

    // Add timeout for requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    config.signal = controller.signal;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server may be unavailable');
      }
      throw error;
    }
  }

  // Auth
  async signUp(email: string, password: string, fullName: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: { email, password, fullName },
    });
    this.setToken(result.token);
    return result;
  }

  async signIn(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/signin', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(result.token);
    return result;
  }

  async signOut() {
    this.setToken(null);
    return { message: 'Signed out' };
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Patients
  async getPatients(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<any[]>(`/patients${query}`);
  }

  async getPatient(id: string) {
    return this.request<any>(`/patients/${id}`);
  }

  async createPatient(data: any) {
    return this.request<any>('/patients', { method: 'POST', body: data });
  }

  async updatePatient(id: string, data: any) {
    return this.request<any>(`/patients/${id}`, { method: 'PUT', body: data });
  }

  async generateMRN() {
    return this.request<{ mrn: string }>('/patients/generate/mrn');
  }

  // Exam Orders
  async getExamOrders(filters?: { status?: string; patient_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/exam-orders${query}`);
  }

  async createExamOrder(data: any) {
    return this.request<any>('/exam-orders', { method: 'POST', body: data });
  }

  async updateExamOrderStatus(id: string, status: string) {
    return this.request<any>(`/exam-orders/${id}/status`, { method: 'PATCH', body: { status } });
  }

  // Appointments
  async getAppointments(filters?: { date?: string; device_id?: string; exam_order_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.device_id) params.append('device_id', filters.device_id);
    if (filters?.exam_order_id) params.append('exam_order_id', filters.exam_order_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/appointments${query}`);
  }

  async getAppointmentTicket(id: string) {
    return this.request<any>(`/appointments/${id}/ticket`);
  }

  async createAppointment(data: any) {
    return this.request<any>('/appointments', { method: 'POST', body: data });
  }

  async updateAppointment(id: string, data: any) {
    return this.request<any>(`/appointments/${id}`, { method: 'PUT', body: data });
  }

  async updateAppointmentStatus(id: string, status: string) {
    return this.request<any>(`/appointments/${id}/status`, { method: 'PUT', body: { status } });
  }

  async cancelAppointment(id: string) {
    return this.request<any>(`/appointments/${id}/cancel`, { method: 'PATCH' });
  }

  // Reports
  async getReports(filters?: { status?: string; patient_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/reports${query}`);
  }

  async createReport(data: any) {
    return this.request<any>('/reports', { method: 'POST', body: data });
  }

  async updateReport(id: string, data: any) {
    return this.request<any>(`/reports/${id}`, { method: 'PUT', body: data });
  }

  // Billing
  async getBillingRecords(filters?: { status?: string; patient_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/billing${query}`);
  }

  async createBilling(data: any) {
    return this.request<any>('/billing', { method: 'POST', body: data });
  }

  async updateBilling(id: string, data: any) {
    return this.request<any>(`/billing/${id}`, { method: 'PUT', body: data });
  }

  async getBillingStats() {
    return this.request<any>('/billing/stats/summary');
  }

  async getBillingLast30DaysStats() {
    return this.request<any[]>('/billing/stats/last30days');
  }

  // Devices
  async getDevices(filters?: { type?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/devices${query}`);
  }

  async createDevice(data: any) {
    return this.request<any>('/devices', { method: 'POST', body: data });
  }

  async updateDevice(id: string, data: any) {
    return this.request<any>(`/devices/${id}`, { method: 'PUT', body: data });
  }

  async deleteDevice(id: string) {
    return this.request<any>(`/devices/${id}`, { method: 'DELETE' });
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async createUser(data: any) {
    return this.request<any>('/users', { method: 'POST', body: data });
  }

  async updateUserRole(id: string, role: string) {
    return this.request<any>(`/users/${id}/role`, { method: 'PATCH', body: { role } });
  }

  async updateUserStatus(id: string, is_active: boolean) {
    return this.request<any>(`/users/${id}/status`, { method: 'PATCH', body: { is_active } });
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread/count');
  }

  async markNotificationAsRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsAsRead() {
    return this.request<any>('/notifications/read/all', { method: 'PATCH' });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<any>('/dashboard/stats');
  }

  async getExamStats() {
    return this.request<any[]>('/dashboard/exam-stats');
  }

  async getPatientQueue() {
    return this.request<any[]>('/dashboard/queue');
  }

  async getUpcomingAppointments() {
    return this.request<any[]>('/dashboard/upcoming-appointments');
  }

  async getDeviceStatus() {
    return this.request<any[]>('/dashboard/device-status');
  }

  // Exam Types
  async getExamTypes(filters?: { category?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/exam-types${query}`);
  }

  async createExamType(data: any) {
    return this.request<any>('/exam-types', { method: 'POST', body: data });
  }

  async updateExamType(id: string, data: any) {
    return this.request<any>(`/exam-types/${id}`, { method: 'PUT', body: data });
  }

  async toggleExamTypeActive(id: string) {
    return this.request<any>(`/exam-types/${id}/toggle`, { method: 'PATCH' });
  }

  // Profiles
  async getProfile(userId: string) {
    return this.request<any>(`/users/${userId}/profile`);
  }

  async updateProfile(userId: string, data: any) {
    return this.request<any>(`/users/${userId}/profile`, { method: 'PUT', body: data });
  }

  async changePassword(newPassword: string) {
    return this.request<any>('/auth/change-password', { method: 'POST', body: { newPassword } });
  }

  // User Permissions
  async getUserPermissions(userId: string) {
    return this.request<any[]>(`/users/${userId}/permissions`);
  }

  async updateUserPermissions(userId: string, permissions: any[], defaultHomepage: string) {
    return this.request<any>(`/users/${userId}/permissions`, { 
      method: 'PUT', 
      body: { permissions, default_homepage: defaultHomepage } 
    });
  }

  async getUserPreferences(userId: string) {
    return this.request<any>(`/users/${userId}/preferences`);
  }

  // Change user password (admin only)
  async changeUserPassword(userId: string, newPassword: string) {
    return this.request<any>(`/users/${userId}/password`, {
      method: 'PUT',
      body: { newPassword }
    });
  }

  // Reset user password to temporary password (admin only)
  async resetUserPassword(userId: string) {
    return this.request<any>(`/users/${userId}/reset-password`, {
      method: 'POST'
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
