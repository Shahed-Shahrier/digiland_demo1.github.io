import { User, LandRecord, Application, Notification, AuditLog, ApplicationStatus, ReviewComment, VerificationNote } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoUsers, mockApplications, mockAuditLogs, mockLandRecords, mockNotifications } from '@/data/seedData';

type Entity = User | LandRecord | Application | Notification | AuditLog;

type StoreConfig<T extends Entity> = {
  key: string;
  table: string;
  seed: T[];
};

type SupabaseRow<T> = {
  id: string;
  data: T;
};

const stores = {
  users: { key: 'digiland_users', table: 'digiland_users', seed: demoUsers },
  landRecords: { key: 'digiland_land_records', table: 'digiland_land_records', seed: mockLandRecords },
  applications: { key: 'digiland_applications', table: 'digiland_applications', seed: mockApplications },
  notifications: { key: 'digiland_notifications', table: 'digiland_notifications', seed: mockNotifications },
  auditLogs: { key: 'digiland_audit_logs', table: 'digiland_audit_logs', seed: mockAuditLogs },
} satisfies Record<string, StoreConfig<Entity>>;

function readLocal<T>(key: string): T[] {
  return JSON.parse(localStorage.getItem(key) || '[]') as T[];
}

function writeLocal<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function seedLocalIfEmpty<T extends Entity>(config: StoreConfig<T>) {
  if (!localStorage.getItem(config.key)) {
    writeLocal(config.key, config.seed);
  }
}

async function loadRemote<T extends Entity>(config: StoreConfig<T>) {
  if (!supabase) return;

  const { data, error } = await supabase
    .from(config.table)
    .select('id,data')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const rows = ((data || []) as SupabaseRow<T>[]).map(row => row.data);
  if (rows.length === 0 && config.seed.length > 0) {
    await upsertMany(config, config.seed);
    writeLocal(config.key, config.seed);
    return;
  }

  writeLocal(config.key, rows);
}

async function upsertMany<T extends Entity>(config: StoreConfig<T>, rows: T[]) {
  if (!supabase || rows.length === 0) return;

  const { error } = await supabase
    .from(config.table)
    .upsert(rows.map(row => ({ id: row.id, data: row })));

  if (error) throw error;
}

function persist<T extends Entity>(config: StoreConfig<T>, rows: T[]) {
  writeLocal(config.key, rows);
  if (isSupabaseConfigured) {
    void upsertMany(config, rows).catch(error => console.error(`Supabase sync failed for ${config.table}`, error));
  }
}

function removeRemote(config: StoreConfig<Entity>, id: string) {
  if (!supabase) return;
  void supabase.from(config.table).delete().eq('id', id).then(({ error }) => {
    if (error) console.error(`Supabase delete failed for ${config.table}`, error);
  });
}

export async function initializeAppData() {
  if (!isSupabaseConfigured) {
    Object.values(stores).forEach(seedLocalIfEmpty);
    localStorage.setItem('digiland_initialized', 'true');
    return;
  }

  try {
    await Promise.all(Object.values(stores).map(loadRemote));
    localStorage.setItem('digiland_initialized', 'true');
  } catch (error) {
    console.error('Could not load Supabase data. Using cached browser data until the next refresh.', error);
    Object.values(stores).forEach(seedLocalIfEmpty);
  }
}

// Users
export const getUsers = () => readLocal<User>(stores.users.key);

export const getUserById = (id: string) => getUsers().find(u => u.id === id) || null;

export const addUser = (user: User) => {
  const users = [...getUsers(), user];
  persist(stores.users, users);
  return user;
};

export const deleteUser = (id: string) => {
  persist(stores.users, getUsers().filter(u => u.id !== id));
  removeRemote(stores.users, id);
};

// Land Records
export const getLandRecords = () => readLocal<LandRecord>(stores.landRecords.key);

export const addLandRecord = (record: LandRecord) => {
  persist(stores.landRecords, [...getLandRecords(), record]);
  return record;
};

export const updateLandRecord = (id: string, updates: Partial<LandRecord>) => {
  const records = getLandRecords().map(r => r.id === id ? { ...r, ...updates } : r);
  persist(stores.landRecords, records);
  return records.find(r => r.id === id);
};

export const deleteLandRecord = (id: string) => {
  persist(stores.landRecords, getLandRecords().filter(r => r.id !== id));
  removeRemote(stores.landRecords, id);
};

// Applications
export const getApplications = () => readLocal<Application>(stores.applications.key);

export const getApplicationById = (id: string) => getApplications().find(a => a.id === id);

export const addApplication = (app: Application) => {
  persist(stores.applications, [...getApplications(), app]);
  return app;
};

export const updateApplication = (id: string, updates: Partial<Application>) => {
  const apps = getApplications().map(a => a.id === id ? { ...a, ...updates } : a);
  persist(stores.applications, apps);
  return apps.find(a => a.id === id);
};

export const changeApplicationStatus = (id: string, status: ApplicationStatus, actor: string) => {
  const app = getApplicationById(id);
  if (!app) return;

  const history = [...app.statusHistory, { status, timestamp: new Date().toISOString(), actor }];
  return updateApplication(id, { status, statusHistory: history, updatedAt: new Date().toISOString() });
};

export const addComment = (applicationId: string, comment: ReviewComment) => {
  const app = getApplicationById(applicationId);
  if (!app) return;

  return updateApplication(applicationId, {
    comments: [...app.comments, comment],
    updatedAt: new Date().toISOString(),
  });
};

export const addVerificationNote = (applicationId: string, note: VerificationNote) => {
  const app = getApplicationById(applicationId);
  if (!app) return;

  return updateApplication(applicationId, {
    verificationNotes: [...app.verificationNotes, note],
    updatedAt: new Date().toISOString(),
  });
};

// Notifications
export const getNotifications = () => readLocal<Notification>(stores.notifications.key);

export const getNotificationsForUser = (userId: string) => getNotifications().filter(n => n.userId === userId);

export const addNotification = (notification: Notification) => {
  persist(stores.notifications, [...getNotifications(), notification]);
  return notification;
};

export const markNotificationRead = (id: string) => {
  const notifications = getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
  persist(stores.notifications, notifications);
};

export const markAllNotificationsRead = (userId: string) => {
  const notifications = getNotifications().map(n => n.userId === userId ? { ...n, read: true } : n);
  persist(stores.notifications, notifications);
};

// Audit Logs
export const getAuditLogs = () => readLocal<AuditLog>(stores.auditLogs.key);

export const addAuditLog = (log: AuditLog) => {
  persist(stores.auditLogs, [...getAuditLogs(), log]);
  return log;
};

// Utility
export const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
