import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '') + '/api';

const TOKEN_KEY = 'gallops_admin_token';

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail))
        detail = body.detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ');
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Public
export const api = {
  bootstrap: () => request<{ plazas: any[]; outlets: any[]; offers: any[] }>('/bootstrap'),
  listPlazas: (status?: string) =>
    request<any[]>(`/plazas${status ? `?status=${status}` : ''}`),
  getPlaza: (id: string) => request<any>(`/plazas/${id}`),
  listOutlets: (plazaId?: string, opts?: { lite?: boolean }) => {
    const params = new URLSearchParams();
    if (plazaId) params.set('plaza_id', plazaId);
    if (opts?.lite) params.set('lite', 'true');
    const qs = params.toString();
    return request<any[]>(`/outlets${qs ? `?${qs}` : ''}`);
  },
  getOutlet: (id: string) => request<any>(`/outlets/${id}`),
  listMenu: (outletId: string) =>
    request<any[]>(`/menu?outlet_id=${encodeURIComponent(outletId)}`),
  listOffers: (outletId?: string) =>
    request<any[]>(
      outletId ? `/offers?outlet_id=${encodeURIComponent(outletId)}` : '/offers'
    ),
  createReservation: (data: any) =>
    request<any>('/reservations', { method: 'POST', body: JSON.stringify(data) }),

  trackClick: (outlet_id: string, type: 'call' | 'whatsapp') =>
    request<any>('/track/click', {
      method: 'POST',
      body: JSON.stringify({ outlet_id, type }),
    }).catch(() => {}),

  createNotifyRequest: (plaza_id: string, name: string, mobile: string) =>
    request<any>('/notify-requests', {
      method: 'POST',
      body: JSON.stringify({ plaza_id, name, mobile }),
    }),

  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<any>('/auth/me', {}, true),

  changePassword: (current_password: string, new_password: string) =>
    request<any>(
      '/auth/change-password',
      { method: 'POST', body: JSON.stringify({ current_password, new_password }) },
      true
    ),

  // Admin outlets
  adminCreateOutlet: (data: any) =>
    request<any>('/outlets', { method: 'POST', body: JSON.stringify(data) }, true),
  adminUpdateOutlet: (id: string, data: any) =>
    request<any>(`/outlets/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true),
  adminDeleteOutlet: (id: string) =>
    request<any>(`/outlets/${id}`, { method: 'DELETE' }, true),

  // Admin menu
  adminListMenu: () => request<any[]>('/menu'),
  adminCreateMenu: (data: any) =>
    request<any>('/menu', { method: 'POST', body: JSON.stringify(data) }, true),
  adminUpdateMenu: (id: string, data: any) =>
    request<any>(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true),
  adminDeleteMenu: (id: string) =>
    request<any>(`/menu/${id}`, { method: 'DELETE' }, true),

  // Admin offers
  adminCreateOffer: (data: any) =>
    request<any>('/offers', { method: 'POST', body: JSON.stringify(data) }, true),
  adminUpdateOffer: (id: string, data: any) =>
    request<any>(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true),
  adminDeleteOffer: (id: string) =>
    request<any>(`/offers/${id}`, { method: 'DELETE' }, true),

  // Admin reservations
  adminListReservations: (params: { outlet_id?: string; date?: string; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.outlet_id) q.set('outlet_id', params.outlet_id);
    if (params.date) q.set('date', params.date);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return request<any[]>(`/reservations${qs ? `?${qs}` : ''}`, {}, true);
  },
  adminUpdateReservationStatus: (id: string, status: string) =>
    request<any>(
      `/reservations/${id}/status`,
      { method: 'PUT', body: JSON.stringify({ status }) },
      true
    ),
  adminDeleteReservation: (id: string) =>
    request<any>(`/reservations/${id}`, { method: 'DELETE' }, true),

  adminAnalytics: () => request<any>('/admin/analytics', {}, true),

  adminBulkMenu: (items: any[], replace_existing = false) =>
    request<any>(
      '/menu/bulk',
      { method: 'POST', body: JSON.stringify({ items, replace_existing }) },
      true
    ),

  createFeedback: (data: any) =>
    request<any>('/feedback', { method: 'POST', body: JSON.stringify(data) }),

  adminListFeedback: (params: { outlet_id?: string; min_rating?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.outlet_id) q.set('outlet_id', params.outlet_id);
    if (params.min_rating) q.set('min_rating', String(params.min_rating));
    const qs = q.toString();
    return request<any[]>(`/admin/feedback${qs ? `?${qs}` : ''}`, {}, true);
  },
  adminDeleteFeedback: (id: string) =>
    request<any>(`/admin/feedback/${id}`, { method: 'DELETE' }, true),

  // Admin plazas
  adminCreatePlaza: (data: any) =>
    request<any>('/plazas', { method: 'POST', body: JSON.stringify(data) }, true),
  adminUpdatePlaza: (id: string, data: any) =>
    request<any>(`/plazas/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true),
  adminDeletePlaza: (id: string) =>
    request<any>(`/plazas/${id}`, { method: 'DELETE' }, true),

  adminListNotifyRequests: (plaza_id?: string) => {
    const q = plaza_id ? `?plaza_id=${encodeURIComponent(plaza_id)}` : '';
    return request<any[]>(`/admin/notify-requests${q}`, {}, true);
  },
  adminDeleteNotifyRequest: (id: string) =>
    request<any>(`/admin/notify-requests/${id}`, { method: 'DELETE' }, true),

  // Categories master (admin)
  adminListCategories: (outlet_id?: string) =>
    request<any[]>(
      `/admin/categories${outlet_id ? `?outlet_id=${outlet_id}` : ''}`,
      {},
      true,
    ),
  adminSetCategoryVisibility: (outlet_id: string, category: string, is_hidden: boolean) =>
    request<any>(
      '/admin/categories/visibility',
      { method: 'PATCH', body: JSON.stringify({ outlet_id, category, is_hidden }) },
      true,
    ),
  adminRenameCategory: (outlet_id: string, old_category: string, new_category: string) =>
    request<any>(
      '/admin/categories/rename',
      { method: 'PATCH', body: JSON.stringify({ outlet_id, old_category, new_category }) },
      true,
    ),
  adminDeleteCategory: (outlet_id: string, category: string) =>
    request<any>(
      `/admin/categories?outlet_id=${encodeURIComponent(outlet_id)}&category=${encodeURIComponent(category)}`,
      { method: 'DELETE' },
      true,
    ),

  // About / Franchise content
  getAbout: () => request<any>('/about'),
  adminUpdateAbout: (data: any) =>
    request<any>('/admin/about', { method: 'PUT', body: JSON.stringify(data) }, true),

  // Offer Claims (customer)
  createOfferClaim: (data: {
    name: string;
    mobile: string;
    dob?: string;
    anniversary?: string;
    plaza_id?: string | null;
    outlet_id?: string | null;
    offer_id?: string | null;
  }) =>
    request<any>('/offer-claims', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Offer Claims (admin)
  adminListOfferClaims: (params: {
    date_from?: string;
    date_to?: string;
    plaza_id?: string;
    outlet_id?: string;
    mobile?: string;
    availed?: 'yes' | 'no';
  } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
    const qs = q.toString();
    return request<any[]>(`/admin/offer-claims${qs ? `?${qs}` : ''}`, {}, true);
  },
  adminUpdateOfferClaimAvailed: (id: string, offer_availed: boolean) =>
    request<any>(
      `/admin/offer-claims/${id}`,
      { method: 'PATCH', body: JSON.stringify({ offer_availed }) },
      true
    ),
  adminDeleteOfferClaim: (id: string) =>
    request<any>(`/admin/offer-claims/${id}`, { method: 'DELETE' }, true),
  adminOfferClaimsExportUrl: async (params: Record<string, string | undefined> = {}) => {
    const token = await getToken();
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
    if (token) q.set('token', token);
    return `${API_BASE}/admin/offer-claims/export?${q.toString()}`;
  },
};

export function getOutletSlots(
  outlet: { time_slots?: { open: string; close: string }[] | null; opening_time: string; closing_time: string }
): { open: string; close: string }[] {
  if (outlet.time_slots && outlet.time_slots.length > 0) return outlet.time_slots;
  return [{ open: outlet.opening_time, close: outlet.closing_time }];
}

export function formatSlots(outlet: any): string {
  return getOutletSlots(outlet)
    .map((s) => `${s.open} – ${s.close}`)
    .join('  ·  ');
}

// Display an ISO date (YYYY-MM-DD) as DD.MM.YYYY for humans
export function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function slotContains(open: string, close: string, nowMin: number): boolean {
  // Accept both "HH:MM" and "HH.MM" separators
  const parse = (t: string) => t.replace('.', ':').split(':').map(Number);
  const [oh, om] = parse(open);
  const [ch, cm] = parse(close);
  if ([oh, om, ch, cm].some((n) => isNaN(n))) return false;
  const openMin = oh * 60 + om;
  let closeMin = ch * 60 + cm;
  // Treat "00:00" closing as end-of-day midnight (24:00) when opening isn't also 00:00
  if (closeMin === 0 && openMin !== 0) closeMin = 1440;
  if (closeMin > openMin) return nowMin >= openMin && nowMin <= closeMin;
  // overnight wrap (e.g. open 20:00, close 02:00)
  return nowMin >= openMin || nowMin <= closeMin;
}

export function isOutletOpen(outlet: any, now = new Date()): boolean {
  const slots = getOutletSlots(outlet);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return slots.some((s) => slotContains(s.open, s.close, nowMin));
}
