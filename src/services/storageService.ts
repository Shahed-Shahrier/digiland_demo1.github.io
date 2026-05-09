import { supabase } from '@/integrations/supabase/client';
import {
  AuditLog,
  Application,
  ApplicationStatus,
  Clarification,
  LandRecord,
  Notification,
  ReviewComment,
  TransferType,
  User,
  UserRole,
  VerificationNote,
} from '@/types';
import { dbRoleToFrontendRole, frontendRoleToDbRole, PUBLIC_REGISTRATION_ROLE } from '@/lib/roles';
import {
  DbApplication,
  DbApplicationNewOwner,
  DbAddress,
  DbAuditLog,
  DbClarification,
  DbDocument,
  DbLandOwner,
  DbLandParcel,
  DbNotification,
  DbReview,
  DbRole,
  DbStatusHistory,
  DbUser,
  DbUserRole,
  DbVerification,
} from '@/integrations/supabase/types';

type Cache = {
  users: User[];
  landRecords: LandRecord[];
  applications: Application[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  clarifications: Clarification[];
};

const cache: Cache = {
  users: [],
  landRecords: [],
  applications: [],
  notifications: [],
  auditLogs: [],
  clarifications: [],
};

let initialized = false;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data as T;
}

function statusFromDb(status?: string | null): ApplicationStatus {
  const value = (status || 'Pending').toLowerCase().replace(/_/g, ' ');
  if (value === 'draft' || value === 'submitted') return 'Pending';
  if (value === 'under review') return 'Under Review';
  if (value === 'clarification requested') return 'Clarification Requested';
  if (value === 'verified') return 'Verified';
  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  return 'Pending';
}

function statusToDb(status: ApplicationStatus) {
  if (status === 'Pending') return 'submitted';
  return status.toLowerCase().replace(/ /g, '_');
}

function transferToDb(type: TransferType) {
  return type.toLowerCase().replace(/ /g, '_');
}

function transferFromDb(type?: string | null): TransferType {
  const value = (type || 'Sale').toLowerCase();
  if (value.includes('inheritance')) return 'Inheritance';
  if (value.includes('gift')) return 'Gift';
  if (value.includes('court')) return 'Court Order';
  if (value.includes('government')) return 'Government Acquisition';
  return 'Sale';
}

function numericId(id: string | number | undefined | null) {
  const parsed = Number(String(id || '').replace(/\D/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseAreaSize(value?: string | number | null) {
  const parsed = Number(String(value || '').match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function textOrFallback(value: string | undefined | null, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function inferDivision(district?: string | null) {
  const value = (district || '').toLowerCase();
  if (['dhaka', 'gazipur', 'narayanganj', 'tangail', 'kishoreganj', 'manikganj', 'munshiganj', 'narsingdi', 'faridpur', 'gopalganj', 'madaripur', 'rajbari', 'shariatpur'].includes(value)) return 'Dhaka';
  if (['chattogram', 'comilla', 'coxsbazar', "cox's bazar", 'feni', 'noakhali', 'brahmanbaria', 'chandpur', 'lakshmipur', 'rangamati', 'bandarban', 'khagrachhari'].includes(value)) return 'Chattogram';
  if (['rajshahi', 'bogura', 'pabna', 'sirajganj', 'natore', 'naogaon', 'chapainawabganj', 'joypurhat'].includes(value)) return 'Rajshahi';
  if (['khulna', 'jashore', 'satkhira', 'bagerhat', 'chuadanga', 'jhenaidah', 'kushtia', 'magura', 'meherpur', 'narail'].includes(value)) return 'Khulna';
  if (['sylhet', 'moulvibazar', 'habiganj', 'sunamganj'].includes(value)) return 'Sylhet';
  if (['barishal', 'barguna', 'bhola', 'jhalokati', 'patuakhali', 'pirojpur'].includes(value)) return 'Barishal';
  if (['rangpur', 'dinajpur', 'gaibandha', 'kurigram', 'lalmonirhat', 'nilphamari', 'panchagarh', 'thakurgaon'].includes(value)) return 'Rangpur';
  if (['mymensingh', 'jamalpur', 'netrokona', 'sherpur'].includes(value)) return 'Mymensingh';
  return 'Dhaka';
}

function documentTypeToDb(type: Application['documents'][number]['documentType']) {
  if (type === 'National ID') return 'nid';
  if (type === 'Tax Receipt') return 'tax_receipt';
  if (type === 'Supporting Document') return 'supporting_document';
  return 'land_deed';
}

function mapAddress(row?: DbAddress) {
  if (!row) return undefined;
  return [row.village, row.union_name, row.upazila, row.district, row.division, row.postal_code]
    .filter(Boolean)
    .join(', ');
}

function mapUser(row: DbUser, role?: string | null, address?: DbAddress): User {
  return {
    id: String(row.user_id),
    name: row.full_name,
    email: row.email,
    role: dbRoleToFrontendRole(role),
    phone: row.phone || undefined,
    nid: row.nid_number || undefined,
    address: mapAddress(address),
    createdAt: row.created_at,
  };
}

function mapLandRecord(row: DbLandParcel, ownerName = 'Unknown owner'): LandRecord {
  return {
    id: String(row.land_id),
    ownerName,
    plotNumber: row.plot_number,
    holdingNumber: row.holding_number || row.khatian_number || '',
    district: row.district || '',
    upazila: row.upazila || '',
    mouza: row.mouza || '',
    landSize: row.area_size == null ? '' : String(row.area_size),
    ownershipStatus: mapOwnership(row.ownership_status || row.current_status),
  };
}

function mapOwnership(status?: string | null): LandRecord['ownershipStatus'] {
  const value = (status || 'Active').toLowerCase();
  if (value.includes('disput')) return 'Disputed';
  if (value.includes('transfer')) return 'Transferred';
  if (value.includes('gov')) return 'Government';
  return 'Active';
}

function ownershipToDb(status: LandRecord['ownershipStatus']) {
  if (status === 'Disputed') return 'disputed';
  if (status === 'Transferred') return 'transferred';
  if (status === 'Government') return 'government';
  return 'unknown';
}

function mapDocument(row: DbDocument) {
  return {
    id: String(row.document_id),
    name: row.file_name,
    type: row.mime_type || 'application/octet-stream',
    size: Number(row.file_size || 0),
    documentType: mapDocumentType(row.document_type),
    uploadedAt: row.uploaded_at,
  };
}

function mapDocumentType(type?: string | null): Application['documents'][number]['documentType'] {
  const value = (type || '').toLowerCase();
  if (value.includes('nid') || value.includes('national')) return 'National ID';
  if (value.includes('tax')) return 'Tax Receipt';
  if (value.includes('support')) return 'Supporting Document';
  return 'Land Deed';
}

function mapReview(row: DbReview, usersById: Map<string, User>): ReviewComment {
  const author = usersById.get(String(row.reviewer_id));
  return {
    id: String(row.review_id),
    applicationId: String(row.application_id),
    authorId: String(row.reviewer_id),
    authorName: author?.name || `User ${row.reviewer_id}`,
    authorRole: author?.role || 'land_officer',
    comment: row.note || '',
    createdAt: row.created_at,
  };
}

function mapVerification(row: DbVerification, usersById: Map<string, User>): VerificationNote {
  const officer = usersById.get(String(row.survey_officer_id));
  return {
    id: String(row.verification_id),
    applicationId: String(row.application_id),
    officerId: String(row.survey_officer_id),
    officerName: officer?.name || `User ${row.survey_officer_id}`,
    findings: row.notes || '',
    isVerified: row.result ? !String(row.result).toLowerCase().includes('reject') : Boolean(row.geo_verified),
    createdAt: row.created_at,
  };
}

function mapNotification(row: DbNotification): Notification {
  const applicationId = row.deep_link?.match(/applications\/([^/?#]+)/)?.[1];
  return {
    id: String(row.notification_id),
    userId: String(row.recipient_user_id),
    title: row.title,
    message: row.message,
    type: mapNotificationType(row.type),
    read: row.is_read,
    applicationId,
    createdAt: row.created_at,
  };
}

function mapNotificationType(type?: string | null): Notification['type'] {
  const value = (type || '').toLowerCase();
  if (value.includes('success')) return 'success';
  if (value.includes('warn')) return 'warning';
  if (value.includes('error') || value.includes('reject')) return 'error';
  return 'info';
}

function mapAuditLog(row: DbAuditLog, usersById: Map<string, User>): AuditLog {
  const actor = row.actor_user_id ? usersById.get(String(row.actor_user_id)) : undefined;
  const newValues = row.new_values && typeof row.new_values === 'object' ? row.new_values : undefined;
  const applicationId = typeof newValues === 'object' && newValues && 'application_number' in newValues
    ? String(newValues.application_number)
    : row.target_table === 'applications' && row.target_id
      ? String(row.target_id)
      : undefined;

  return {
    id: String(row.log_id),
    timestamp: row.created_at,
    actorName: actor?.name || (row.actor_user_id ? `User ${row.actor_user_id}` : 'System'),
    actorRole: actor?.role || 'admin',
    actionType: row.action_type,
    applicationId,
    details: `${row.action_type}${row.target_table ? ` on ${row.target_table}` : ''}${row.target_id ? ` #${row.target_id}` : ''}`,
  };
}

function mapClarification(row: DbClarification): Clarification {
  return {
    id: String(row.clarification_id),
    applicationId: String(row.application_id),
    requestedBy: String(row.requested_by),
    requestMessage: row.request_message,
    respondedBy: row.responded_by ? String(row.responded_by) : undefined,
    responseMessage: row.response_message || undefined,
    status: row.status === 'responded' || row.status === 'closed' ? row.status : 'open',
    requestedAt: row.requested_at,
    respondedAt: row.responded_at || undefined,
  };
}

function mapApplication(
  row: DbApplication,
  usersById: Map<string, User>,
  landById: Map<string, LandRecord>,
  documents: DbDocument[],
  reviews: DbReview[],
  verifications: DbVerification[],
  historyRows: DbStatusHistory[],
  newOwners: DbApplicationNewOwner[],
): Application {
  const applicant = usersById.get(String(row.applicant_user_id));
  const land = landById.get(String(row.land_id));
  const newOwner = newOwners.find(owner => String(owner.application_id) === String(row.application_id));
  const proposedOwner = newOwner ? usersById.get(String(newOwner.user_id)) : undefined;
  const statusHistory = historyRows
    .filter(h => String(h.application_id) === String(row.application_id))
    .map(h => ({
      status: statusFromDb(h.new_status),
      timestamp: h.changed_at,
      actor: h.changed_by ? usersById.get(String(h.changed_by))?.name || `User ${h.changed_by}` : 'System',
    }));

  return {
    id: row.application_number || String(row.application_id),
    applicantId: String(row.applicant_user_id),
    applicantName: applicant?.name || `User ${row.applicant_user_id}`,
    applicantNid: applicant?.nid || '',
    applicantPhone: applicant?.phone || '',
    applicantEmail: applicant?.email || '',
    applicantAddress: '',
    plotNumber: land?.plotNumber || '',
    holdingNumber: land?.holdingNumber || '',
    district: land?.district || '',
    upazila: land?.upazila || '',
    mouza: land?.mouza || '',
    landSize: land?.landSize || '',
    currentOwner: land?.ownerName || '',
    proposedNewOwner: proposedOwner?.name || '',
    proposedNewOwnerId: proposedOwner?.id,
    transferType: transferFromDb(row.transfer_type),
    reason: row.cancellation_reason || row.rejection_reason || '',
    deedReference: '',
    remarks: row.rejection_reason || row.cancellation_reason || '',
    documents: documents.filter(d => String(d.application_id) === String(row.application_id)).map(mapDocument),
    status: statusFromDb(row.current_status),
    assignedSurveyOfficerId: row.assigned_survey_officer_id ? String(row.assigned_survey_officer_id) : undefined,
    comments: reviews.filter(r => String(r.application_id) === String(row.application_id)).map(r => mapReview(r, usersById)),
    verificationNotes: verifications.filter(v => String(v.application_id) === String(row.application_id)).map(v => mapVerification(v, usersById)),
    statusHistory: statusHistory.length > 0 ? statusHistory : [{ status: statusFromDb(row.current_status), timestamp: row.created_at, actor: 'System' }],
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

async function selectAll<T>(table: string, orderColumn?: string) {
  let query = supabase.from(table).select('*');
  if (orderColumn) query = query.order(orderColumn, { ascending: false });
  return unwrap<T[]>(await query, `Load ${table}`);
}

async function loadUsers() {
  const [users, roles, userRoles, addresses] = await Promise.all([
    selectAll<DbUser>('users', 'created_at'),
    selectAll<DbRole>('roles'),
    selectAll<DbUserRole>('user_roles'),
    selectAll<DbAddress>('addresses', 'created_at'),
  ]);

  const rolesById = new Map(roles.map(role => [String(role.role_id), role.role_name]));
  const roleByUserId = new Map(userRoles.map(row => [String(row.user_id), rolesById.get(String(row.role_id))]));
  const addressByUserId = new Map(addresses.map(row => [String(row.user_id), row]));
  cache.users = users.filter(row => !row.deleted_at).map(row => mapUser(row, roleByUserId.get(String(row.user_id)), addressByUserId.get(String(row.user_id))));
  return cache.users;
}

async function loadLandRecords() {
  const [parcels, landOwners] = await Promise.all([
    selectAll<DbLandParcel>('land_parcels', 'created_at'),
    selectAll<DbLandOwner>('land_owners', 'created_at'),
  ]);
  const usersById = new Map(cache.users.map(user => [user.id, user]));
  const currentOwnerByLandId = new Map(
    landOwners
      .filter(owner => owner.is_current_owner && !owner.end_date)
      .map(owner => [String(owner.land_id), usersById.get(String(owner.user_id))?.name || `User ${owner.user_id}`]),
  );
  cache.landRecords = parcels.map(parcel => mapLandRecord(parcel, currentOwnerByLandId.get(String(parcel.land_id))));
  return cache.landRecords;
}

async function loadApplications() {
  const [applications, documents, reviews, verifications, history, newOwners] = await Promise.all([
    selectAll<DbApplication>('applications', 'created_at'),
    selectAll<DbDocument>('documents', 'uploaded_at'),
    selectAll<DbReview>('reviews', 'created_at'),
    selectAll<DbVerification>('verifications', 'created_at'),
    selectAll<DbStatusHistory>('application_status_history', 'changed_at'),
    selectAll<DbApplicationNewOwner>('application_new_owners', 'created_at'),
  ]);
  const usersById = new Map(cache.users.map(user => [user.id, user]));
  const landById = new Map(cache.landRecords.map(land => [land.id, land]));
  cache.applications = applications.map(app => mapApplication(app, usersById, landById, documents, reviews, verifications, history, newOwners));
  return cache.applications;
}

async function loadNotifications() {
  cache.notifications = (await selectAll<DbNotification>('notifications', 'created_at')).map(mapNotification);
  return cache.notifications;
}

async function loadAuditLogs() {
  const usersById = new Map(cache.users.map(user => [user.id, user]));
  cache.auditLogs = (await selectAll<DbAuditLog>('audit_logs', 'created_at')).map(row => mapAuditLog(row, usersById));
  return cache.auditLogs;
}

async function loadClarifications() {
  cache.clarifications = (await selectAll<DbClarification>('clarifications', 'requested_at')).map(mapClarification);
  return cache.clarifications;
}

async function loadAllowed(label: string, loader: () => Promise<unknown>) {
  try {
    await loader();
  } catch (error) {
    console.warn(`${label} not loaded. This is expected if RLS blocks the current role.`, error);
  }
}

export async function initializeAppData() {
  await loadAllowed('Users', loadUsers);
  await loadAllowed('Land records', loadLandRecords);
  await loadAllowed('Applications', loadApplications);
  await loadAllowed('Notifications', loadNotifications);
  await loadAllowed('Audit logs', loadAuditLogs);
  await loadAllowed('Clarifications', loadClarifications);
  initialized = true;
}

export async function refreshAppData() {
  return initializeAppData();
}

export function isAppDataInitialized() {
  return initialized;
}

export async function getUserProfileByEmail(email: string) {
  const result = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle();

  const row = unwrap<DbUser | null>(result, 'Load user profile');
  if (!row) return null;

  const { data: roleRows, error } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', row.user_id);

  if (error) throw new Error(`Load user role: ${error.message}`);

  const roleRecord = Array.isArray(roleRows) ? (roleRows[0] as { roles?: { role_name?: string } | Array<{ role_name?: string }> } | undefined)?.roles : undefined;
  const roleName = roleRecord
    ? (Array.isArray(roleRecord) ? roleRecord[0]?.role_name : roleRecord.role_name)
    : undefined;

  return mapUser(row, roleName);
}

export async function getUserProfileByNid(nid: string) {
  const normalizedNid = nid.trim();
  if (!normalizedNid) return null;

  const result = await supabase
    .from('users')
    .select('*')
    .eq('nid_number', normalizedNid)
    .is('deleted_at', null)
    .maybeSingle();

  const row = unwrap<DbUser | null>(result, 'Search user by NID');
  if (!row) return null;

  const profile = await getUserProfileByEmail(row.email);
  return profile || mapUser(row);
}

export async function getUserProfileByAuthId(authUserId: string, email?: string) {
  const byAuthId = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!byAuthId.error && byAuthId.data) {
    const row = byAuthId.data as DbUser;
    return getUserProfileByEmail(row.email);
  }

  if (byAuthId.error) throw new Error(`Load user profile by auth id: ${byAuthId.error.message}`);

  if (email) {
    const profile = await getUserProfileByEmail(email);
    if (!profile) return null;

    const existingAuthId = unwrap<Pick<DbUser, 'auth_user_id'> | null>(
      await supabase.from('users').select('auth_user_id').eq('email', email).is('deleted_at', null).maybeSingle(),
      'Check demo profile auth link',
    )?.auth_user_id;

    if (!existingAuthId) {
      unwrap(
        await supabase
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('user_id', numericId(profile.id)),
        'Link demo profile to Supabase Auth user',
      );
    }

    return profile;
  }

  return null;
}

export async function createUserProfile(input: {
  name: string;
  email: string;
  authUserId?: string;
  role?: UserRole;
  phone?: string;
  nid?: string;
  address?: string;
  emailVerified?: boolean;
}) {
  if (!input.authUserId) {
    throw new Error('Create user profile: Supabase Auth user id is required');
  }

  const existing = unwrap<DbUser | null>(
    await supabase
      .from('users')
      .select('*')
      .eq('email', input.email)
      .is('deleted_at', null)
      .maybeSingle(),
    'Find existing user profile',
  );

  if (existing) {
    if (!existing.auth_user_id) {
      unwrap(
        await supabase
          .from('users')
          .update({
            auth_user_id: input.authUserId,
            phone: input.phone || existing.phone,
            nid_number: input.nid || existing.nid_number,
          })
          .eq('user_id', existing.user_id),
        'Link existing user profile',
      );
    }

    const profile = await getUserProfileByEmail(existing.email);
    if (profile) return profile;
  }

  const inserted = unwrap<DbUser>(
    await supabase
      .from('users')
      .insert({
        auth_user_id: input.authUserId,
        full_name: input.name,
        email: input.email,
        phone: input.phone || null,
        nid_number: input.nid || null,
        status: 'pending',
        email_verified: Boolean(input.emailVerified),
      })
      .select()
      .single(),
    'Create user profile',
  );

  const safeDbRole = frontendRoleToDbRole(PUBLIC_REGISTRATION_ROLE);
  const roleRow = unwrap<DbRole | null>(
    await supabase
      .from('roles')
      .select('*')
      .eq('role_name', safeDbRole)
      .maybeSingle(),
    'Load role',
  );

  if (roleRow) {
    const assignment = await supabase.from('user_roles').insert({ user_id: inserted.user_id, role_id: roleRow.role_id });
    if (assignment.error) {
      console.warn('Applicant role assignment was not allowed by the backend. Profile will still use citizen UI defaults.', assignment.error);
    }
  }

  const profile = mapUser(inserted, roleRow?.role_name || safeDbRole);
  cache.users = [profile, ...cache.users.filter(user => user.id !== profile.id)];
  return profile;
}

// Users
export const getUsers = () => cache.users;

export const getUserById = (id: string) => getUsers().find(u => u.id === id) || null;

export const getUsersByRole = (role: UserRole) => getUsers().filter(user => user.role === role);

export const addUser = createUserProfile;

export const updateUser = async (id: string, updates: Partial<User>) => {
  const userId = numericId(id);
  if (!userId) throw new Error(`Update user: invalid user id ${id}`);

  const updated = unwrap<DbUser>(
    await supabase
      .from('users')
      .update({
        full_name: updates.name,
        phone: updates.phone,
        nid_number: updates.nid,
      })
      .eq('user_id', userId)
      .select()
      .single(),
    'Update user',
  );

  const role = cache.users.find(user => user.id === id)?.role;
  const mapped = mapUser(updated, role);
  cache.users = cache.users.map(user => user.id === id ? mapped : user);
  return mapped;
};

export const deleteUser = async (id: string) => {
  const userId = numericId(id);
  if (!userId) throw new Error(`Delete user: invalid user id ${id}`);

  unwrap(
    await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId),
    'Soft delete user',
  );
  cache.users = cache.users.filter(user => user.id !== id);
};

// Land Records
export const getLandRecords = () => cache.landRecords;

export const addLandRecord = async (record: LandRecord) => {
  const fallbackKhatian = textOrFallback(record.holdingNumber, `KH-${record.plotNumber || Date.now()}`);
  const district = textOrFallback(record.district, 'Dhaka');
  const upazila = textOrFallback(record.upazila, 'Unknown Upazila');
  const mouza = textOrFallback(record.mouza, 'Unknown Mouza');

  const inserted = unwrap<DbLandParcel>(
    await supabase
      .from('land_parcels')
      .insert({
        plot_number: textOrFallback(record.plotNumber, `PLOT-${Date.now()}`),
        holding_number: record.holdingNumber || null,
        khatian_number: fallbackKhatian,
        mouza,
        division: inferDivision(district),
        district,
        upazila,
        area_size: parseAreaSize(record.landSize),
        land_type: 'other',
        ownership_status: ownershipToDb(record.ownershipStatus),
        current_status: 'active',
      })
      .select()
      .single(),
    'Create land parcel',
  );

  const mapped = mapLandRecord(inserted, record.ownerName);
  cache.landRecords = [mapped, ...cache.landRecords];
  return mapped;
};

export const updateLandRecord = async (id: string, updates: Partial<LandRecord>) => {
  const landId = numericId(id);
  if (!landId) throw new Error(`Update land record: invalid land id ${id}`);

  const updated = unwrap<DbLandParcel>(
    await supabase
      .from('land_parcels')
      .update({
        plot_number: updates.plotNumber,
        holding_number: updates.holdingNumber,
        khatian_number: updates.holdingNumber,
        mouza: updates.mouza,
        division: updates.district ? inferDivision(updates.district) : undefined,
        district: updates.district,
        upazila: updates.upazila,
        area_size: updates.landSize ? parseAreaSize(updates.landSize) : undefined,
        ownership_status: updates.ownershipStatus ? ownershipToDb(updates.ownershipStatus) : undefined,
      })
      .eq('land_id', landId)
      .select()
      .single(),
    'Update land parcel',
  );

  const ownerName = cache.landRecords.find(record => record.id === id)?.ownerName;
  const mapped = mapLandRecord(updated, ownerName);
  cache.landRecords = cache.landRecords.map(record => record.id === id ? mapped : record);
  return mapped;
};

export const deleteLandRecord = async (id: string) => {
  const landId = numericId(id);
  if (!landId) throw new Error(`Delete land record: invalid land id ${id}`);

  unwrap(
    await supabase
      .from('land_parcels')
      .update({ legal_remarks: `Archived from Digi-Land demo at ${new Date().toISOString()}` })
      .eq('land_id', landId),
    'Mark land parcel archived',
  );
  cache.landRecords = cache.landRecords.filter(record => record.id !== id);
};

// Applications
export const getApplications = () => cache.applications;

export const getApplicationById = (id: string) => getApplications().find(a => a.id === id);

export const addApplication = async (app: Application) => {
  const applicantId = numericId(app.applicantId);
  if (!applicantId) throw new Error(`Create application: invalid applicant id ${app.applicantId}`);

  const matchingLand = cache.landRecords.find(record => record.plotNumber === app.plotNumber && record.holdingNumber === app.holdingNumber);
  let landId = numericId(matchingLand?.id);

  if (!landId) {
    const land = await addLandRecord({
      id: '',
      ownerName: app.currentOwner,
      plotNumber: app.plotNumber,
      holdingNumber: app.holdingNumber,
      district: app.district,
      upazila: app.upazila,
      mouza: app.mouza,
      landSize: app.landSize,
      ownershipStatus: 'Active',
    });
    landId = numericId(land.id);
  }

  if (!landId) throw new Error('Create application: could not resolve land parcel id');

  const inserted = unwrap<DbApplication>(
    await supabase
      .from('applications')
      .insert({
        application_number: app.id,
        applicant_user_id: applicantId,
        land_id: landId,
        transfer_type: transferToDb(app.transferType),
        fee_amount: 0,
        payment_status: 'unpaid',
        current_status: statusToDb(app.status),
        submitted_at: app.createdAt,
      })
      .select()
      .single(),
    'Create application',
  );

  const proposedNewOwnerId = numericId(app.proposedNewOwnerId);
  if (proposedNewOwnerId) {
    unwrap(
      await supabase.from('application_new_owners').insert({
        application_id: inserted.application_id,
        user_id: proposedNewOwnerId,
        ownership_percentage: 100,
      }),
      'Create application new owner',
    );
  }

  for (const document of app.documents) {
    unwrap(
      await supabase.from('documents').insert({
        application_id: inserted.application_id,
        user_id: applicantId,
        land_id: landId,
        document_type: documentTypeToDb(document.documentType),
        file_name: document.name,
        file_path: `metadata-only/${inserted.application_id}/${document.name}`,
        mime_type: document.type,
        file_size: document.size,
        version_no: 1,
        verification_status: 'pending',
        uploaded_at: document.uploadedAt,
      }),
      'Create document metadata',
    );
  }

  cache.applications = [app, ...cache.applications.filter(existing => existing.id !== app.id)];
  return app;
};

export const updateApplication = async (id: string, updates: Partial<Application>) => {
  const current = getApplicationById(id);
  if (!current) throw new Error(`Update application: application ${id} is not loaded`);

  const dbId = numericId(id) || numericId(current.id);
  if (!dbId && current.id.startsWith('APP-')) {
    const found = unwrap<DbApplication | null>(
      await supabase.from('applications').select('*').eq('application_number', current.id).maybeSingle(),
      'Find application',
    );
    if (!found) throw new Error(`Update application: could not find ${id}`);
    return updateApplication(String(found.application_id), updates);
  }

  if (!dbId) throw new Error(`Update application: invalid application id ${id}`);

  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  unwrap(
    await supabase
      .from('applications')
      .update({
        current_status: updates.status ? statusToDb(updates.status) : undefined,
        assigned_survey_officer_id: numericId(updates.assignedSurveyOfficerId),
        updated_at: updated.updatedAt,
      })
      .eq('application_id', dbId),
    'Update application',
  );

  cache.applications = cache.applications.map(app => app.id === current.id ? updated : app);
  return updated;
};

export const changeApplicationStatus = async (id: string, status: ApplicationStatus, actor: string) => {
  const app = getApplicationById(id);
  if (!app) throw new Error(`Change status: application ${id} is not loaded`);

  const actorUser = cache.users.find(user => user.name === actor);
  const dbApplication = unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_number', app.id).maybeSingle(),
    'Find application for status change',
  );

  if (!dbApplication) throw new Error(`Change status: could not find application ${app.id}`);

  unwrap(
    await supabase.from('application_status_history').insert({
      application_id: dbApplication.application_id,
      old_status: dbApplication.current_status,
      new_status: statusToDb(status),
      changed_by: numericId(actorUser?.id),
      changed_at: new Date().toISOString(),
    }),
    'Insert application status history',
  );

  const history = [...app.statusHistory, { status, timestamp: new Date().toISOString(), actor }];
  return updateApplication(app.id, { status, statusHistory: history, updatedAt: new Date().toISOString() });
};

export const addComment = async (applicationId: string, comment: ReviewComment) => {
  const dbApplication = unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_number', applicationId).maybeSingle(),
    'Find application for review',
  );
  if (!dbApplication) throw new Error(`Add review: could not find application ${applicationId}`);

  const reviewerId = numericId(comment.authorId);
  if (!reviewerId) throw new Error(`Add review: invalid reviewer id ${comment.authorId}`);

  const inserted = unwrap<DbReview>(
    await supabase
      .from('reviews')
      .insert({
        application_id: dbApplication.application_id,
        reviewer_id: reviewerId,
        note: comment.comment,
        review_type: 'admin',
      })
      .select()
      .single(),
    'Insert review',
  );

  const app = getApplicationById(applicationId);
  if (app) {
    const mapped = mapReview(inserted, new Map(cache.users.map(user => [user.id, user])));
    cache.applications = cache.applications.map(item => item.id === app.id ? { ...item, comments: [...item.comments, mapped] } : item);
  }
};

export const getClarifications = () => cache.clarifications;

export const addClarification = async (applicationId: string, requestedBy: string, requestMessage: string) => {
  const dbApplication = unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_number', applicationId).maybeSingle(),
    'Find application for clarification',
  );
  if (!dbApplication) throw new Error(`Add clarification: could not find application ${applicationId}`);

  const requesterId = numericId(requestedBy);
  if (!requesterId) throw new Error(`Add clarification: invalid requester id ${requestedBy}`);

  const inserted = unwrap<DbClarification>(
    await supabase
      .from('clarifications')
      .insert({
        application_id: dbApplication.application_id,
        requested_by: requesterId,
        request_message: requestMessage,
        status: 'open',
      })
      .select()
      .single(),
    'Create clarification',
  );

  const mapped = mapClarification(inserted);
  cache.clarifications = [mapped, ...cache.clarifications];
  return mapped;
};

export const addVerificationNote = async (applicationId: string, note: VerificationNote) => {
  const dbApplication = unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_number', applicationId).maybeSingle(),
    'Find application for verification',
  );
  if (!dbApplication) throw new Error(`Add verification: could not find application ${applicationId}`);

  const officerId = numericId(note.officerId);
  if (!officerId) throw new Error(`Add verification: invalid officer id ${note.officerId}`);

  const inserted = unwrap<DbVerification>(
    await supabase
      .from('verifications')
      .insert({
        application_id: dbApplication.application_id,
        land_id: dbApplication.land_id,
        survey_officer_id: officerId,
        geo_verified: note.isVerified,
        result: note.isVerified ? 'verified' : 'rejected',
        notes: note.findings,
      })
      .select()
      .single(),
    'Insert verification',
  );

  const app = getApplicationById(applicationId);
  if (app) {
    const mapped = mapVerification(inserted, new Map(cache.users.map(user => [user.id, user])));
    cache.applications = cache.applications.map(item => item.id === app.id ? { ...item, verificationNotes: [...item.verificationNotes, mapped] } : item);
  }
};

// Notifications
export const getNotifications = () => cache.notifications;

export const getNotificationsForUser = (userId: string) => getNotifications().filter(n => n.userId === userId);

export const addNotification = async (notification: Notification) => {
  const recipientId = numericId(notification.userId);
  if (!recipientId) throw new Error(`Create notification: invalid recipient id ${notification.userId}`);

  const inserted = unwrap<DbNotification>(
    await supabase
      .from('notifications')
      .insert({
        recipient_user_id: recipientId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        deep_link: notification.applicationId ? `/applications/${notification.applicationId}` : null,
        is_read: notification.read,
      })
      .select()
      .single(),
    'Create notification',
  );

  const mapped = mapNotification(inserted);
  cache.notifications = [mapped, ...cache.notifications];
  return mapped;
};

export const markNotificationRead = async (id: string) => {
  const notificationId = numericId(id);
  if (!notificationId) throw new Error(`Mark notification read: invalid notification id ${id}`);

  unwrap(
    await supabase.from('notifications').update({ is_read: true }).eq('notification_id', notificationId),
    'Mark notification read',
  );
  cache.notifications = cache.notifications.map(n => n.id === id ? { ...n, read: true } : n);
};

export const markAllNotificationsRead = async (userId: string) => {
  const recipientId = numericId(userId);
  if (!recipientId) throw new Error(`Mark all notifications read: invalid user id ${userId}`);

  unwrap(
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_user_id', recipientId),
    'Mark all notifications read',
  );
  cache.notifications = cache.notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
};

// Audit Logs
export const getAuditLogs = () => cache.auditLogs;

export const addAuditLog = async (log: AuditLog) => {
  // TODO: move audit logging to DB triggers or trusted RPC/server-side code.
  const actorId = cache.users.find(user => user.name === log.actorName)?.id;
  const inserted = unwrap<DbAuditLog>(
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: numericId(actorId),
        action_type: log.actionType,
        target_table: log.applicationId ? 'applications' : 'auth_sessions',
        target_id: numericId(log.applicationId),
        new_values: { details: log.details, application_id: log.applicationId || null },
      })
      .select()
      .single(),
    'Create audit log',
  );

  const mapped = mapAuditLog(inserted, new Map(cache.users.map(user => [user.id, user])));
  cache.auditLogs = [mapped, ...cache.auditLogs];
  return mapped;
};

// Utility
export const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
