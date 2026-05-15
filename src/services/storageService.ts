import { supabase } from '@/integrations/supabase/client';
import {
  AuditLog,
  Application,
  ApplicationStatus,
  ClarificationRecord,
  DocumentFile,
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
  DbAuditLog,
  DbClarification,
  DbDocument,
  DbLandParcel,
  DbLandOwner,
  DbNotification,
  DbReview,
  DbRole,
  DbStatusHistory,
  DbUser,
  DbUserSummary,
  DbUserRole,
  DbVerification,
} from '@/integrations/supabase/types';

type Cache = {
  users: User[];
  landRecords: LandRecord[];
  applications: Application[];
  notifications: Notification[];
  auditLogs: AuditLog[];
};

const cache: Cache = {
  users: [],
  landRecords: [],
  applications: [],
  notifications: [],
  auditLogs: [],
};

let initialized = false;

const DOCUMENT_BUCKET = 'digiland';
export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const REQUIRED_APPLICATION_DOCUMENT_TYPES: DocumentFile['documentType'][] = ['Land Deed', 'National ID', 'Tax Receipt'];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data as T;
}

function statusFromDb(status?: string | null): ApplicationStatus {
  const value = (status || 'Pending').toLowerCase().replace(/_/g, ' ');
  if (value === 'draft' || value === 'submitted') return 'Pending';
  if (value === 'under review' || value === 'verification pending') return 'Under Review';
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
  const value = type.toLowerCase().replace(/ /g, '_');
  if (['sale', 'inheritance', 'gift'].includes(value)) return value;
  return 'other';
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
  if (type === 'Supporting Document') return 'other';
  return 'deed';
}

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .toLowerCase() || `document-${Date.now()}.pdf`;
}

function missingRequiredDocumentTypes(documents: DocumentFile[]) {
  return REQUIRED_APPLICATION_DOCUMENT_TYPES.filter(type => !documents.some(document => document.documentType === type));
}

function isPdfMimeType(type?: string | null) {
  return (type || '').toLowerCase() === 'application/pdf';
}

function isPdfFilename(name?: string | null) {
  return (name || '').toLowerCase().endsWith('.pdf');
}

function assertValidPdfDocument(document: DocumentFile) {
  if (!document.localFile) {
    throw new Error(`${document.documentType}: choose a PDF file before submitting.`);
  }

  if (!isPdfMimeType(document.type) && !isPdfFilename(document.name)) {
    throw new Error(`${document.documentType}: only PDF files are allowed.`);
  }

  if (document.size <= 0) {
    throw new Error(`${document.documentType}: uploaded file is empty.`);
  }

  if (document.size > DOCUMENT_MAX_SIZE_BYTES) {
    throw new Error(`${document.documentType}: file size must be 10 MB or less.`);
  }
}

function hasStoredDocumentPath(filePath?: string | null) {
  return Boolean(filePath && !filePath.startsWith('metadata-only/'));
}

function buildDocumentStoragePath(authUserId: string, applicationNumber: string, document: DocumentFile) {
  const safeFileName = sanitizeFilename(isPdfFilename(document.name) ? document.name : `${document.name}.pdf`);
  return `${authUserId}/${applicationNumber}/${documentTypeToDb(document.documentType)}-${Date.now()}-${safeFileName}`;
}

function mapUser(row: DbUser, role?: string | null): User {
  return {
    id: String(row.user_id),
    name: row.full_name,
    email: row.email,
    role: dbRoleToFrontendRole(role),
    phone: row.phone || undefined,
    nid: row.nid_number || undefined,
    createdAt: row.created_at,
  };
}

function mapLandRecord(row: DbLandParcel, ownerName = 'Unknown owner', owners: DbUserSummary[] = []): LandRecord {
  return {
    id: String(row.land_id),
    ownerName,
    ownerIds: owners.map(owner => String(owner.user_id)),
    ownerNids: owners.map(owner => owner.nid_number).filter((nid): nid is string => Boolean(nid)),
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
  if (status === 'Government') return 'government';
  if (status === 'Transferred') return 'unknown';
  return 'single_owner';
}

function notificationTypeToDb(notification: Pick<Notification, 'type' | 'title' | 'message' | 'applicationId'>) {
  const title = notification.title.toLowerCase();
  const message = notification.message.toLowerCase();
  const text = `${title} ${message}`;

  if (text.includes('clarification')) return 'clarification';
  if (text.includes('approved') || text.includes('rejected') || text.includes('decision')) return 'decision';
  if (text.includes('document') || text.includes('pdf') || text.includes('upload')) return 'document';
  if (text.includes('payment') || text.includes('fee')) return 'payment';
  if (text.includes('status') || text.includes('verification') || text.includes('assigned') || text.includes('review')) return 'status';
  if (notification.applicationId) return 'application';
  return 'system';
}

async function findDbApplicationByPublicId(id: string) {
  const byApplicationNumber = unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_number', id).maybeSingle(),
    'Find application by number',
  );
  if (byApplicationNumber) return byApplicationNumber;

  const parsedId = numericId(id);
  if (!parsedId) return null;

  return unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_id', parsedId).maybeSingle(),
    'Find application by id',
  );
}

function buildApplicationUpdatePayload(updates: Partial<Application>, currentDbApplication: DbApplication) {
  const payload: Record<string, string | number | null | undefined> = {
    updated_at: updates.updatedAt || new Date().toISOString(),
  };

  if ('status' in updates && updates.status) {
    const nextStatus = statusToDb(updates.status);
    payload.current_status = nextStatus;

    if (nextStatus === 'approved') {
      payload.approved_at = currentDbApplication.approved_at || payload.updated_at;
      payload.rejected_at = null;
    } else if (nextStatus === 'rejected') {
      payload.rejected_at = currentDbApplication.rejected_at || payload.updated_at;
      payload.approved_at = null;
    } else {
      payload.approved_at = null;
      payload.rejected_at = null;
    }
  }

  if ('assignedOfficerId' in updates) {
    payload.assigned_admin_id = updates.assignedOfficerId ? numericId(updates.assignedOfficerId) : null;
  }

  if ('assignedSurveyOfficerId' in updates) {
    payload.assigned_survey_officer_id = updates.assignedSurveyOfficerId ? numericId(updates.assignedSurveyOfficerId) : null;
  }

  return payload;
}

function embeddedUser(row?: DbUserSummary | DbUserSummary[] | null) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] || null : row;
}

function formatRelatedUserNames(rows: Array<{ user_id: number; users?: DbUserSummary | DbUserSummary[] | null }>, usersById?: Map<string, User>) {
  const names = rows
    .map(row => embeddedUser(row.users)?.full_name || usersById?.get(String(row.user_id))?.name || '')
    .filter(Boolean);

  return Array.from(new Set(names)).join(', ');
}

function sameText(left?: string | null, right?: string | null) {
  return (left || '').trim().toLowerCase() === (right || '').trim().toLowerCase();
}

function isDuplicateLocationError(error: unknown) {
  return error instanceof Error && error.message.includes('land_parcel_unique_location');
}

function isRlsPolicyError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('row-level security policy');
}

function findCachedLandRecordByLocation(record: Pick<LandRecord, 'district' | 'upazila' | 'mouza'>) {
  return cache.landRecords.find(item =>
    sameText(item.district, record.district) &&
    sameText(item.upazila, record.upazila) &&
    sameText(item.mouza, record.mouza),
  ) || null;
}

async function findExistingLandParcelByLocation(record: Pick<LandRecord, 'district' | 'upazila' | 'mouza'>) {
  const cached = findCachedLandRecordByLocation(record);
  if (cached) return cached;

  const rows = unwrap<DbLandParcel[]>(
    await supabase
      .from('land_parcels')
      .select('*')
      .eq('district', textOrFallback(record.district, 'Dhaka'))
      .eq('upazila', textOrFallback(record.upazila, 'Unknown Upazila'))
      .eq('mouza', textOrFallback(record.mouza, 'Unknown Mouza'))
      .limit(1),
    'Find existing land parcel by location',
  );

  return rows[0] ? mapLandRecord(rows[0]) : null;
}

async function loadRoleNameForUserId(userId: number) {
  const { data: roleRows, error } = await supabase
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', userId);

  if (error) throw new Error(`Load user role: ${error.message}`);

  const roleRecord = Array.isArray(roleRows) ? (roleRows[0] as { roles?: { role_name?: string } | Array<{ role_name?: string }> } | undefined)?.roles : undefined;
  return roleRecord
    ? (Array.isArray(roleRecord) ? roleRecord[0]?.role_name : roleRecord.role_name)
    : undefined;
}

async function syncLandOwnership(
  landId: number,
  ownerUserId: number | null,
  ownerName: string,
  source: string,
  verifiedByUserId?: number | null,
) {
  if (!ownerUserId) return;

  const now = new Date().toISOString();
  const existingOwnerRows = unwrap<Array<{ id: number }>>(
    await supabase
      .from('land_owners')
      .select('id')
      .eq('land_id', landId)
      .eq('user_id', ownerUserId)
      .limit(1),
    `Check land owner for ${ownerName}`,
  );

  if (existingOwnerRows.length === 0) {
    try {
      unwrap(
        await supabase.from('land_owners').insert({
          land_id: landId,
          user_id: ownerUserId,
          ownership_percentage: 100,
          ownership_source: source,
          start_date: now.slice(0, 10),
          is_current_owner: true,
        }),
        `Create land owner for ${ownerName}`,
      );
    } catch (error) {
      if (isRlsPolicyError(error)) {
        throw new Error('Backend policy blocks owner linking in land_owners. Apply the Supabase RLS fix for land owner management first.');
      }
      throw error;
    }
  } else {
    unwrap(
      await supabase
        .from('land_owners')
        .update({
          ownership_percentage: 100,
          ownership_source: source,
          end_date: null,
          is_current_owner: true,
        })
        .eq('id', existingOwnerRows[0].id),
      `Restore land owner for ${ownerName}`,
    );
  }

  const existingUserLandRows = unwrap<Array<{ user_land_record_id: number }>>(
    await supabase
      .from('user_land_records')
      .select('user_land_record_id')
      .eq('land_id', landId)
      .eq('user_id', ownerUserId)
      .limit(1),
    `Check user land record for ${ownerName}`,
  );

  if (existingUserLandRows.length === 0) {
    try {
      unwrap(
        await supabase.from('user_land_records').insert({
          user_id: ownerUserId,
          land_id: landId,
          verified_by: verifiedByUserId || null,
          record_source: 'manual_entry',
          record_status: 'verified',
          ownership_claim_note: ownerName ? `Ownership registered for ${ownerName}` : 'Ownership registered from Digi-Land.',
          verification_note: source,
          registered_at: now,
          verified_at: now,
        }),
        `Create user land record for ${ownerName}`,
      );
    } catch (error) {
      if (isRlsPolicyError(error)) {
        throw new Error('Backend policy blocks owner linking in user_land_records. Apply the Supabase RLS fix for owner record management first.');
      }
      throw error;
    }
  }
}

async function transferApprovedLandOwnership(app: Application, dbApplication: DbApplication) {
  const landId = numericId(dbApplication.land_id);
  const proposedNewOwnerId = numericId(app.proposedNewOwnerIds?.[0]);
  if (!landId || !proposedNewOwnerId) return app;

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const proposedOwnerProfile = cache.users.find(user => user.id === String(proposedNewOwnerId));
  const ownerName = proposedOwnerProfile?.name || app.proposedNewOwner || 'New owner';

  unwrap(
    await supabase
      .from('land_owners')
      .update({
        is_current_owner: false,
        end_date: today,
      })
      .eq('land_id', landId)
      .eq('is_current_owner', true)
      .neq('user_id', proposedNewOwnerId),
    'End previous land ownership',
  );

  await syncLandOwnership(
    landId,
    proposedNewOwnerId,
    ownerName,
    `Ownership transferred by approved application ${app.id}.`,
    numericId(app.assignedOfficerId),
  );

  unwrap(
    await supabase
      .from('land_parcels')
      .update({
        ownership_status: 'single_owner',
        current_status: 'active',
        updated_at: now,
      })
      .eq('land_id', landId),
    'Mark transferred land parcel active',
  );

  cache.landRecords = cache.landRecords.map(record => {
    if (record.id !== String(landId)) return record;
    return {
      ...record,
      ownerName,
      ownerIds: [String(proposedNewOwnerId)],
      ownerNids: proposedOwnerProfile?.nid ? [proposedOwnerProfile.nid] : [],
      ownershipStatus: 'Active',
    };
  });

  return {
    ...app,
    currentOwner: ownerName,
    currentOwnerIds: [String(proposedNewOwnerId)],
    currentOwnerNids: proposedOwnerProfile?.nid ? [proposedOwnerProfile.nid] : [],
  };
}

function mapDocument(row: DbDocument) {
  return {
    id: String(row.document_id),
    name: row.file_name,
    type: row.mime_type || 'application/octet-stream',
    size: Number(row.file_size || 0),
    documentType: mapDocumentType(row.document_type),
    uploadedAt: row.uploaded_at,
    filePath: row.file_path || undefined,
  };
}

function mapDocumentType(type?: string | null): Application['documents'][number]['documentType'] {
  const value = (type || '').toLowerCase();
  if (value.includes('nid') || value.includes('national')) return 'National ID';
  if (value.includes('deed')) return 'Land Deed';
  if (value.includes('tax')) return 'Tax Receipt';
  if (value.includes('support') || value === 'other' || value.includes('khatian') || value.includes('mutation') || value.includes('survey') || value.includes('photo')) return 'Supporting Document';
  return 'Land Deed';
}

async function uploadApplicationDocument(applicationNumber: string, document: DocumentFile) {
  assertValidPdfDocument(document);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Load authenticated user for document upload: ${authError.message}`);

  const authUserId = authData.user?.id;
  if (!authUserId) throw new Error('Document upload requires an authenticated user.');

  const filePath = buildDocumentStoragePath(authUserId, applicationNumber, document);
  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, document.localFile as File, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error(`Upload ${document.documentType}: ${error.message}`);
  return filePath;
}

async function removeUploadedDocuments(filePaths: string[]) {
  const removablePaths = filePaths.filter(hasStoredDocumentPath);
  if (removablePaths.length === 0) return;

  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove(removablePaths);
  if (error) {
    console.warn('Document cleanup failed after application error.', error);
  }
}

export async function downloadApplicationDocument(document: Pick<DocumentFile, 'filePath' | 'name'>) {
  if (!hasStoredDocumentPath(document.filePath)) {
    throw new Error('This document does not have a stored PDF file yet.');
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .download(document.filePath as string);

  if (error) throw new Error(`Open document ${document.name}: ${error.message}`);
  return data;
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
    isVerified: row.result ? String(row.result).toLowerCase().includes('pass') : Boolean(row.geo_verified),
    createdAt: row.created_at,
  };
}

function mapClarification(row: DbClarification, usersById: Map<string, User>): ClarificationRecord {
  return {
    id: String(row.clarification_id),
    applicationId: String(row.application_id),
    requestedById: String(row.requested_by),
    requestedByName: usersById.get(String(row.requested_by))?.name || `User ${row.requested_by}`,
    requestMessage: row.request_message || '',
    respondedById: row.responded_by ? String(row.responded_by) : undefined,
    respondedByName: row.responded_by ? usersById.get(String(row.responded_by))?.name || `User ${row.responded_by}` : undefined,
    responseMessage: row.response_message || undefined,
    status: (row.status || 'open') as ClarificationRecord['status'],
    requestedAt: row.requested_at,
    respondedAt: row.responded_at || undefined,
  };
}

function mapNotification(row: DbNotification): Notification {
  const applicationId = row.deep_link?.match(/applications\/([^/?#]+)/)?.[1];
  return {
    id: String(row.notification_id),
    userId: String(row.recipient_user_id),
    title: row.title,
    message: row.message,
    type: mapNotificationType(row.type, row.title, row.message),
    read: row.is_read,
    applicationId,
    createdAt: row.created_at,
  };
}

function mapNotificationType(type?: string | null, title?: string | null, message?: string | null): Notification['type'] {
  const value = (type || '').toLowerCase();
  const text = `${title || ''} ${message || ''}`.toLowerCase();
  if (value === 'clarification') return 'warning';
  if (value === 'decision') return text.includes('reject') ? 'error' : 'success';
  if (text.includes('failed') || text.includes('reject') || text.includes('error')) return 'error';
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

function mapApplication(
  row: DbApplication,
  usersById: Map<string, User>,
  landById: Map<string, LandRecord>,
  documents: DbDocument[],
  reviews: DbReview[],
  verifications: DbVerification[],
  clarifications: DbClarification[],
  historyRows: DbStatusHistory[],
  newOwners: DbApplicationNewOwner[],
): Application {
  const applicant = usersById.get(String(row.applicant_user_id));
  const land = landById.get(String(row.land_id));
  const assignedOfficer = row.assigned_admin_id ? usersById.get(String(row.assigned_admin_id)) : undefined;
  const assignedSurveyOfficer = row.assigned_survey_officer_id ? usersById.get(String(row.assigned_survey_officer_id)) : undefined;
  const proposedNewOwner = formatRelatedUserNames(
    newOwners.filter(owner => String(owner.application_id) === String(row.application_id)),
    usersById,
  );
  const applicationNewOwners = newOwners.filter(owner => String(owner.application_id) === String(row.application_id));
  const proposedNewOwnerIds = applicationNewOwners.map(owner => String(owner.user_id));
  const proposedNewOwnerNids = applicationNewOwners
    .map(owner => embeddedUser(owner.users)?.nid_number || usersById.get(String(owner.user_id))?.nid)
    .filter((nid): nid is string => Boolean(nid));
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
    currentOwnerIds: land?.ownerIds || [],
    currentOwnerNids: land?.ownerNids || [],
    proposedNewOwnerIds,
    proposedNewOwnerNids,
    plotNumber: land?.plotNumber || '',
    holdingNumber: land?.holdingNumber || '',
    district: land?.district || '',
    upazila: land?.upazila || '',
    mouza: land?.mouza || '',
    landSize: land?.landSize || '',
    currentOwner: land?.ownerName || '',
    proposedNewOwner,
    transferType: transferFromDb(row.transfer_type),
    reason: row.cancellation_reason || row.rejection_reason || '',
    deedReference: '',
    remarks: row.rejection_reason || row.cancellation_reason || '',
    documents: documents.filter(d => String(d.application_id) === String(row.application_id)).map(mapDocument),
    status: statusFromDb(row.current_status),
    assignedOfficerId: row.assigned_admin_id ? String(row.assigned_admin_id) : undefined,
    assignedOfficerName: assignedOfficer?.name,
    assignedSurveyOfficerId: row.assigned_survey_officer_id ? String(row.assigned_survey_officer_id) : undefined,
    assignedSurveyOfficerName: assignedSurveyOfficer?.name,
    comments: reviews.filter(r => String(r.application_id) === String(row.application_id)).map(r => mapReview(r, usersById)),
    clarifications: clarifications.filter(c => String(c.application_id) === String(row.application_id)).map(c => mapClarification(c, usersById)),
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
  const [users, roles, userRoles] = await Promise.all([
    selectAll<DbUser>('users', 'created_at'),
    selectAll<DbRole>('roles'),
    selectAll<DbUserRole>('user_roles'),
  ]);

  const rolesById = new Map(roles.map(role => [String(role.role_id), role.role_name]));
  const roleByUserId = new Map(userRoles.map(row => [String(row.user_id), rolesById.get(String(row.role_id))]));
  cache.users = users.filter(row => !row.deleted_at).map(row => mapUser(row, roleByUserId.get(String(row.user_id))));
  return cache.users;
}

async function loadLandRecords() {
  const result = await supabase
    .from('land_parcels')
    .select(`
      *,
      land_owners (
        land_id,
        user_id,
        is_current_owner,
        ownership_percentage,
        users (
          user_id,
          full_name,
          email,
          nid_number
        )
      )
    `)
    .order('created_at', { ascending: false });

  const parcels = unwrap<Array<DbLandParcel & { land_owners?: DbLandOwner[] | null }>>(
    result as { data: Array<DbLandParcel & { land_owners?: DbLandOwner[] | null }> | null; error: { message: string } | null },
    'Load land_parcels',
  );

  const usersById = new Map(cache.users.map(user => [user.id, user]));
  cache.landRecords = parcels.map(parcel => {
    const currentOwners = (parcel.land_owners || []).filter(owner => owner.is_current_owner !== false);
    const ownerName = formatRelatedUserNames(currentOwners, usersById) || 'Unknown owner';
    const ownerSummaries = currentOwners
      .map(owner => embeddedUser(owner.users))
      .filter((owner): owner is DbUserSummary => Boolean(owner));
    return mapLandRecord(parcel, ownerName, ownerSummaries);
  });
  return cache.landRecords;
}

async function loadApplications() {
  const [applications, documents, reviews, verifications, clarifications, history] = await Promise.all([
    selectAll<DbApplication>('applications', 'created_at'),
    selectAll<DbDocument>('documents', 'uploaded_at'),
    selectAll<DbReview>('reviews', 'created_at'),
    selectAll<DbVerification>('verifications', 'created_at'),
    selectAll<DbClarification>('clarifications', 'requested_at'),
    selectAll<DbStatusHistory>('application_status_history', 'changed_at'),
  ]);
  const newOwners = unwrap<DbApplicationNewOwner[]>(
    await supabase
      .from('application_new_owners')
      .select(`
        id,
        application_id,
        user_id,
        ownership_percentage,
        created_at,
        users (
          user_id,
          full_name,
          email,
          nid_number
        )
      `),
    'Load application_new_owners',
  );
  const usersById = new Map(cache.users.map(user => [user.id, user]));
  const landById = new Map(cache.landRecords.map(land => [land.id, land]));
  cache.applications = applications.map(app => mapApplication(app, usersById, landById, documents, reviews, verifications, clarifications, history, newOwners));
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

  const roleName = await loadRoleNameForUserId(row.user_id);
  return mapUser(row, roleName);
}

export async function getUserProfileByNid(nid: string) {
  const normalizedNid = nid.trim();
  if (!normalizedNid) return null;

  const { data, error } = await supabase.rpc('find_citizen_by_nid', {
    p_nid: normalizedNid,
  });

  if (error) {
    throw new Error(`Search user by NID: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: String(row.user_id),
    name: row.full_name,
    email: row.email || '',
    role: 'citizen' as UserRole,
    nid: row.nid_number || undefined,
    createdAt: new Date().toISOString(),
  };
}

type LandOwnerSearchRow = DbLandOwner & {
  users?: DbUserSummary | DbUserSummary[] | null;
  land_parcels?: DbLandParcel | DbLandParcel[] | null;
};

export async function getLandRecordsByCurrentOwnerNid(nid: string) {
  const normalizedNid = nid.trim();
  if (!normalizedNid) return [];

  const result = await supabase
    .from('land_owners')
    .select(`
      *,
      users!inner (
        user_id,
        full_name,
        email,
        nid_number
      ),
      land_parcels!inner (
        *
      )
    `)
    .eq('users.nid_number', normalizedNid)
    .eq('is_current_owner', true)
    .order('created_at', { ascending: false });

  const rows = unwrap<LandOwnerSearchRow[]>(
    result as { data: LandOwnerSearchRow[] | null; error: { message: string } | null },
    'Search land records by current owner NID',
  );

  return rows
    .map(row => {
      const parcel = Array.isArray(row.land_parcels) ? row.land_parcels[0] : row.land_parcels;
      const owner = embeddedUser(row.users);
      if (!parcel) return null;
      return mapLandRecord(parcel, owner?.full_name || 'Unknown owner', owner ? [owner] : []);
    })
    .filter((record): record is LandRecord => Boolean(record));
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

export const getSurveyOfficers = () => getUsers().filter(user => user.role === 'survey_officer');

export const addUser = createUserProfile;

export const updateUserRole = async (id: string, role: UserRole) => {
  const userId = numericId(id);
  if (!userId) throw new Error(`Update user role: invalid user id ${id}`);

  const safeDbRole = frontendRoleToDbRole(role);
  const roleRow = unwrap<DbRole | null>(
    await supabase
      .from('roles')
      .select('*')
      .eq('role_name', safeDbRole)
      .maybeSingle(),
    'Load role for update',
  );

  if (!roleRow) throw new Error(`Update user role: database role ${safeDbRole} not found`);

  const existing = unwrap<DbUserRole | null>(
    await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    'Load current user role',
  );

  if (existing) {
    unwrap(
      await supabase
        .from('user_roles')
        .update({ role_id: roleRow.role_id })
        .eq('user_id', userId),
      'Update user role',
    );
  } else {
    unwrap(
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role_id: roleRow.role_id }),
      'Create user role',
    );
  }

  cache.users = cache.users.map(user => user.id === id ? { ...user, role } : user);
  return cache.users.find(user => user.id === id) || null;
};

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

export const addLandRecord = async (
  record: LandRecord,
  options?: { ownerUserId?: string; verifiedByUserId?: string },
) => {
  const fallbackKhatian = textOrFallback(record.holdingNumber, `KH-${record.plotNumber || Date.now()}`);
  const district = textOrFallback(record.district, 'Dhaka');
  const upazila = textOrFallback(record.upazila, 'Unknown Upazila');
  const mouza = textOrFallback(record.mouza, 'Unknown Mouza');
  const ownerUserId = numericId(options?.ownerUserId);
  const verifiedByUserId = numericId(options?.verifiedByUserId);
  const existingLand = await findExistingLandParcelByLocation({ district, upazila, mouza });
  if (existingLand) {
    await syncLandOwnership(Number(existingLand.id), ownerUserId, record.ownerName, 'Linked existing Digi-Land land parcel to owner from admin form.', verifiedByUserId);
    const mapped = { ...existingLand, ownerName: record.ownerName || existingLand.ownerName };
    cache.landRecords = [mapped, ...cache.landRecords.filter(item => item.id !== mapped.id)];
    return mapped;
  }

  try {
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

    await syncLandOwnership(inserted.land_id, ownerUserId, record.ownerName, 'Added from Digi-Land admin land record form.', verifiedByUserId);

    const mapped = mapLandRecord(inserted, record.ownerName);
    cache.landRecords = [mapped, ...cache.landRecords];
    return mapped;
  } catch (error) {
    if (!isDuplicateLocationError(error)) throw error;

    const duplicateLand = await findExistingLandParcelByLocation({ district, upazila, mouza });
    if (!duplicateLand) throw error;

    await syncLandOwnership(Number(duplicateLand.id), ownerUserId, record.ownerName, 'Linked duplicate-location parcel to owner from admin form.', verifiedByUserId);
    const mapped = { ...duplicateLand, ownerName: record.ownerName || duplicateLand.ownerName };
    cache.landRecords = [mapped, ...cache.landRecords.filter(item => item.id !== mapped.id)];
    return mapped;
  }
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

export const applicationMatchesUser = (app: Application, user?: Pick<User, 'id' | 'nid'> | null) => {
  if (!user) return false;
  return app.applicantId === user.id ||
    app.currentOwnerIds?.includes(user.id) ||
    app.proposedNewOwnerIds?.includes(user.id) ||
    Boolean(user.nid && (
      app.applicantNid === user.nid ||
      app.currentOwnerNids?.includes(user.nid) ||
      app.proposedNewOwnerNids?.includes(user.nid)
    ));
};

export const getApplicationsForUser = (user?: Pick<User, 'id' | 'nid'> | null) =>
  getApplications().filter(app => applicationMatchesUser(app, user));

export const getApplicationById = (id: string) => getApplications().find(a => a.id === id);

export const addApplication = async (
  app: Application,
  options?: { currentOwnerId?: string; proposedNewOwnerId?: string },
) => {
  const applicantId = numericId(app.applicantId);
  if (!applicantId) throw new Error(`Create application: invalid applicant id ${app.applicantId}`);

  const missingDocuments = missingRequiredDocumentTypes(app.documents);
  if (missingDocuments.length > 0) {
    throw new Error(`Create application: missing required PDF files for ${missingDocuments.join(', ')}.`);
  }

  const matchingLand = cache.landRecords.find(record => record.plotNumber === app.plotNumber && record.holdingNumber === app.holdingNumber);
  let landId = numericId(matchingLand?.id);
  const currentOwnerId = numericId(options?.currentOwnerId);
  const proposedNewOwnerId = numericId(options?.proposedNewOwnerId);

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
    }, {
      ownerUserId: options?.currentOwnerId,
    });
    landId = numericId(land.id);
  }

  if (!landId) throw new Error('Create application: could not resolve land parcel id');

  const uploadedDocuments: DocumentFile[] = [];
  try {
    for (const document of app.documents) {
      uploadedDocuments.push({
        ...document,
        filePath: await uploadApplicationDocument(app.id, document),
        localFile: undefined,
        type: 'application/pdf',
      });
    }
  } catch (error) {
    await removeUploadedDocuments(uploadedDocuments.map(document => document.filePath || ''));
    throw error;
  }

  try {
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

    if (uploadedDocuments.length > 0) {
      unwrap(
        await supabase.from('documents').insert(uploadedDocuments.map(document => ({
          application_id: inserted.application_id,
          user_id: applicantId,
          land_id: landId,
          document_type: documentTypeToDb(document.documentType),
          file_name: document.name,
          file_path: document.filePath,
          mime_type: 'application/pdf',
          file_size: document.size,
          version_no: 1,
          verification_status: 'pending',
          uploaded_at: document.uploadedAt,
        }))),
        'Create document metadata',
      );
    }
  } catch (error) {
    await removeUploadedDocuments(uploadedDocuments.map(document => document.filePath || ''));
    throw error;
  }

  const proposedOwnerProfile = proposedNewOwnerId ? cache.users.find(user => user.id === String(proposedNewOwnerId)) : null;
  const currentOwnerProfile = currentOwnerId ? cache.users.find(user => user.id === String(currentOwnerId)) : null;
  const hydratedApp = {
    ...app,
    currentOwner: app.currentOwner,
    proposedNewOwner: proposedOwnerProfile?.name || app.proposedNewOwner,
    currentOwnerIds: currentOwnerId ? [String(currentOwnerId)] : app.currentOwnerIds || [],
    currentOwnerNids: currentOwnerProfile?.nid ? [currentOwnerProfile.nid] : app.currentOwnerNids || [],
    proposedNewOwnerIds: proposedNewOwnerId ? [String(proposedNewOwnerId)] : app.proposedNewOwnerIds || [],
    proposedNewOwnerNids: proposedOwnerProfile?.nid ? [proposedOwnerProfile.nid] : app.proposedNewOwnerNids || [],
    documents: uploadedDocuments,
  };
  cache.applications = [hydratedApp, ...cache.applications.filter(existing => existing.id !== app.id)];
  return hydratedApp;
};

export const updateApplication = async (id: string, updates: Partial<Application>) => {
  const current = getApplicationById(id);
  if (!current) throw new Error(`Update application: application ${id} is not loaded`);
  const dbApplication = await findDbApplicationByPublicId(current.id) || await findDbApplicationByPublicId(id);
  if (!dbApplication) throw new Error(`Update application: could not find ${id}`);

  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  unwrap(
    await supabase
      .from('applications')
      .update(buildApplicationUpdatePayload(updated, dbApplication))
      .eq('application_id', dbApplication.application_id),
    'Update application',
  );

  cache.applications = cache.applications.map(app => app.id === current.id ? updated : app);
  return updated;
};

export const assignSurveyOfficer = async (applicationId: string, surveyOfficerId: string, actingOfficerId: string) => {
  const assignedOfficer = getUserById(actingOfficerId);
  const surveyOfficer = getUserById(surveyOfficerId);
  if (!assignedOfficer) throw new Error(`Assign survey officer: acting officer ${actingOfficerId} not found`);
  if (!surveyOfficer || surveyOfficer.role !== 'survey_officer') throw new Error(`Assign survey officer: invalid survey officer ${surveyOfficerId}`);

  return updateApplication(applicationId, {
    assignedOfficerId: actingOfficerId,
    assignedOfficerName: assignedOfficer.name,
    assignedSurveyOfficerId: surveyOfficerId,
    assignedSurveyOfficerName: surveyOfficer.name,
    updatedAt: new Date().toISOString(),
  });
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
  let updated = await updateApplication(app.id, { status, statusHistory: history, updatedAt: new Date().toISOString() });

  if (status === 'Approved') {
    updated = await transferApprovedLandOwnership(updated, dbApplication);
    cache.applications = cache.applications.map(item => item.id === updated.id ? updated : item);
  }

  return updated;
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
        result: note.isVerified ? 'passed' : 'failed',
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

export const requestClarification = async (applicationId: string, requestedById: string, requestMessage: string) => {
  const trimmedMessage = requestMessage.trim();
  if (!trimmedMessage) throw new Error('Clarification message is required.');

  const requesterId = numericId(requestedById);
  if (!requesterId) throw new Error(`Request clarification: invalid requester id ${requestedById}`);

  const dbApplication = unwrap<DbApplication | null>(
    await supabase.from('applications').select('*').eq('application_number', applicationId).maybeSingle(),
    'Find application for clarification',
  );
  if (!dbApplication) throw new Error(`Request clarification: could not find application ${applicationId}`);

  const inserted = unwrap<DbClarification>(
    await supabase
      .from('clarifications')
      .insert({
        application_id: dbApplication.application_id,
        requested_by: requesterId,
        request_message: trimmedMessage,
        status: 'open',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single(),
    'Create clarification request',
  );

  const usersById = new Map(cache.users.map(user => [user.id, user]));
  const mapped = mapClarification(inserted, usersById);
  cache.applications = cache.applications.map(item => item.id === applicationId ? { ...item, clarifications: [...item.clarifications, mapped], updatedAt: new Date().toISOString() } : item);
  return mapped;
};

export const respondToClarification = async (applicationId: string, clarificationId: string, respondedById: string, responseMessage: string) => {
  const trimmedMessage = responseMessage.trim();
  if (!trimmedMessage) throw new Error('Clarification response is required.');

  const dbClarificationId = numericId(clarificationId);
  const responderId = numericId(respondedById);
  if (!dbClarificationId) throw new Error(`Respond clarification: invalid clarification id ${clarificationId}`);
  if (!responderId) throw new Error(`Respond clarification: invalid responder id ${respondedById}`);

  const updated = unwrap<DbClarification>(
    await supabase
      .from('clarifications')
      .update({
        responded_by: responderId,
        response_message: trimmedMessage,
        status: 'answered',
        responded_at: new Date().toISOString(),
      })
      .eq('clarification_id', dbClarificationId)
      .select()
      .single(),
    'Respond to clarification',
  );

  const usersById = new Map(cache.users.map(user => [user.id, user]));
  const mapped = mapClarification(updated, usersById);
  cache.applications = cache.applications.map(item => item.id === applicationId ? {
    ...item,
    clarifications: item.clarifications.map(clarification => clarification.id === clarificationId ? mapped : clarification),
    updatedAt: new Date().toISOString(),
  } : item);
  return mapped;
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
        type: notificationTypeToDb(notification),
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
