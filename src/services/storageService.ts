import { User, LandRecord, Application, Notification, AuditLog, ApplicationStatus, ReviewComment, VerificationNote, UserRole } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchOrLocal<T>(path: string, fallback: () => T): Promise<T> {
  if (!API_BASE) return Promise.resolve(fallback());
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// Users
export const getUsers = () => {
  return fetchOrLocal<User[]>('/api/users', () => JSON.parse(localStorage.getItem('digiland_users') || '[]'));
};
export const getUserById = async (id: string) => {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
};
export const addUser = async (user: User) => {
  if (!API_BASE) {
    const users: User[] = JSON.parse(localStorage.getItem('digiland_users') || '[]');
    users.push(user);
    localStorage.setItem('digiland_users', JSON.stringify(users));
    return user;
  }
  const res = await fetch(`${API_BASE}/api/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
  return res.json();
};

// Land Records (read-only via API or local)
export const getLandRecords = () => fetchOrLocal<LandRecord[]>('/api/land-records', () => JSON.parse(localStorage.getItem('digiland_land_records') || '[]'));
export const addLandRecord = (r: LandRecord) => {
  const recs: LandRecord[] = JSON.parse(localStorage.getItem('digiland_land_records') || '[]');
  recs.push(r);
  localStorage.setItem('digiland_land_records', JSON.stringify(recs));
};
export const updateLandRecord = (id: string, updates: Partial<LandRecord>) => {
  const recs: LandRecord[] = JSON.parse(localStorage.getItem('digiland_land_records') || '[]');
  localStorage.setItem('digiland_land_records', JSON.stringify(recs.map(r => r.id === id ? { ...r, ...updates } : r)));
};
export const deleteLandRecord = (id: string) => {
  const recs: LandRecord[] = JSON.parse(localStorage.getItem('digiland_land_records') || '[]');
  localStorage.setItem('digiland_land_records', JSON.stringify(recs.filter(r => r.id !== id)));
};

// Applications
export const getApplications = () => fetchOrLocal<Application[]>('/api/applications', () => JSON.parse(localStorage.getItem('digiland_applications') || '[]'));
export const getApplicationById = async (id: string) => {
  if (!API_BASE) {
    const apps: Application[] = JSON.parse(localStorage.getItem('digiland_applications') || '[]');
    return apps.find(a => a.id === id);
  }
  const res = await fetch(`${API_BASE}/api/applications/${id}`);
  if (!res.ok) return null;
  return res.json();
};
export const addApplication = (app: Application) => {
  const apps: Application[] = JSON.parse(localStorage.getItem('digiland_applications') || '[]');
  apps.push(app);
  localStorage.setItem('digiland_applications', JSON.stringify(apps));
};
export const updateApplication = (id: string, updates: Partial<Application>) => {
  const apps: Application[] = JSON.parse(localStorage.getItem('digiland_applications') || '[]');
  localStorage.setItem('digiland_applications', JSON.stringify(apps.map(a => a.id === id ? { ...a, ...updates } : a)));
};

export const changeApplicationStatus = (id: string, status: ApplicationStatus, actor: string) => {
  const apps: Application[] = JSON.parse(localStorage.getItem('digiland_applications') || '[]');
  const app = apps.find(a => a.id === id);
  if (!app) return;
  const history = [...app.statusHistory, { status, timestamp: new Date().toISOString(), actor }];
  updateApplication(id, { status, statusHistory: history, updatedAt: new Date().toISOString() });
};

export const addComment = (applicationId: string, comment: ReviewComment) => {
  const apps: Application[] = JSON.parse(localStorage.getItem('digiland_applications') || '[]');
  const app = apps.find(a => a.id === applicationId);
  if (!app) return;
  app.comments = [...app.comments, comment];
  app.updatedAt = new Date().toISOString();
  localStorage.setItem('digiland_applications', JSON.stringify(apps));
};

export const addVerificationNote = (applicationId: string, note: VerificationNote) => {
  const apps: Application[] = JSON.parse(localStorage.getItem('digiland_applications') || '[]');
  const app = apps.find(a => a.id === applicationId);
  if (!app) return;
  app.verificationNotes = [...app.verificationNotes, note];
  app.updatedAt = new Date().toISOString();
  localStorage.setItem('digiland_applications', JSON.stringify(apps));
};

// Notifications
export const getNotifications = () => JSON.parse(localStorage.getItem('digiland_notifications') || '[]') as Notification[];
export const getNotificationsForUser = (userId: string) => getNotifications().filter(n => n.userId === userId);
export const addNotification = (n: Notification) => {
  const notifs: Notification[] = JSON.parse(localStorage.getItem('digiland_notifications') || '[]');
  notifs.push(n);
  localStorage.setItem('digiland_notifications', JSON.stringify(notifs));
};
export const markNotificationRead = (id: string) => {
  const notifs: Notification[] = JSON.parse(localStorage.getItem('digiland_notifications') || '[]');
  localStorage.setItem('digiland_notifications', JSON.stringify(notifs.map(n => n.id === id ? { ...n, read: true } : n)));
};
export const markAllNotificationsRead = (userId: string) => {
  const notifs: Notification[] = JSON.parse(localStorage.getItem('digiland_notifications') || '[]');
  localStorage.setItem('digiland_notifications', JSON.stringify(notifs.map(n => n.userId === userId ? { ...n, read: true } : n)));
};

// Audit Logs
export const getAuditLogs = () => JSON.parse(localStorage.getItem('digiland_audit_logs') || '[]') as AuditLog[];
export const addAuditLog = (log: AuditLog) => { const logs = getAuditLogs(); logs.push(log); localStorage.setItem('digiland_audit_logs', JSON.stringify(logs)); };

// Utility
export const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
