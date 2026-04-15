import { User, LandRecord, Application, Notification, AuditLog, ApplicationStatus, ReviewComment, VerificationNote, UserRole } from '@/types';

function getItem<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}
function setItem<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Users
export const getUsers = () => getItem<User>('digiland_users');
export const getUserById = (id: string) => getUsers().find(u => u.id === id);
export const addUser = (user: User) => { const users = getUsers(); users.push(user); setItem('digiland_users', users); };
export const updateUser = (id: string, updates: Partial<User>) => {
  const users = getUsers().map(u => u.id === id ? { ...u, ...updates } : u);
  setItem('digiland_users', users);
};
export const deleteUser = (id: string) => setItem('digiland_users', getUsers().filter(u => u.id !== id));

// Land Records
export const getLandRecords = () => getItem<LandRecord>('digiland_land_records');
export const addLandRecord = (r: LandRecord) => { const recs = getLandRecords(); recs.push(r); setItem('digiland_land_records', recs); };
export const updateLandRecord = (id: string, updates: Partial<LandRecord>) => {
  setItem('digiland_land_records', getLandRecords().map(r => r.id === id ? { ...r, ...updates } : r));
};
export const deleteLandRecord = (id: string) => setItem('digiland_land_records', getLandRecords().filter(r => r.id !== id));

// Applications
export const getApplications = () => getItem<Application>('digiland_applications');
export const getApplicationById = (id: string) => getApplications().find(a => a.id === id);
export const addApplication = (app: Application) => { const apps = getApplications(); apps.push(app); setItem('digiland_applications', apps); };
export const updateApplication = (id: string, updates: Partial<Application>) => {
  setItem('digiland_applications', getApplications().map(a => a.id === id ? { ...a, ...updates } : a));
};

export const changeApplicationStatus = (id: string, status: ApplicationStatus, actor: string) => {
  const app = getApplicationById(id);
  if (!app) return;
  const history = [...app.statusHistory, { status, timestamp: new Date().toISOString(), actor }];
  updateApplication(id, { status, statusHistory: history, updatedAt: new Date().toISOString() });
};

export const addComment = (applicationId: string, comment: ReviewComment) => {
  const app = getApplicationById(applicationId);
  if (!app) return;
  updateApplication(applicationId, { comments: [...app.comments, comment], updatedAt: new Date().toISOString() });
};

export const addVerificationNote = (applicationId: string, note: VerificationNote) => {
  const app = getApplicationById(applicationId);
  if (!app) return;
  updateApplication(applicationId, { verificationNotes: [...app.verificationNotes, note], updatedAt: new Date().toISOString() });
};

// Notifications
export const getNotifications = () => getItem<Notification>('digiland_notifications');
export const getNotificationsForUser = (userId: string) => getNotifications().filter(n => n.userId === userId);
export const addNotification = (n: Notification) => { const notifs = getNotifications(); notifs.push(n); setItem('digiland_notifications', notifs); };
export const markNotificationRead = (id: string) => {
  setItem('digiland_notifications', getNotifications().map(n => n.id === id ? { ...n, read: true } : n));
};
export const markAllNotificationsRead = (userId: string) => {
  setItem('digiland_notifications', getNotifications().map(n => n.userId === userId ? { ...n, read: true } : n));
};

// Audit Logs
export const getAuditLogs = () => getItem<AuditLog>('digiland_audit_logs');
export const addAuditLog = (log: AuditLog) => { const logs = getAuditLogs(); logs.push(log); setItem('digiland_audit_logs', logs); };

// Utility
export const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
