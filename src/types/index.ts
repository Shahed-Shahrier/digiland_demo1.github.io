export type UserRole = 'citizen' | 'land_officer' | 'survey_officer' | 'admin';

export type ApplicationStatus = 
  | 'Pending' 
  | 'Under Review' 
  | 'Clarification Requested' 
  | 'Verified' 
  | 'Approved' 
  | 'Rejected';

export type TransferType = 'Sale' | 'Inheritance' | 'Gift' | 'Court Order' | 'Government Acquisition';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  nid?: string;
  address?: string;
  createdAt: string;
}

export interface LandRecord {
  id: string;
  ownerName: string;
  plotNumber: string;
  holdingNumber: string;
  district: string;
  upazila: string;
  mouza: string;
  landSize: string;
  ownershipStatus: 'Active' | 'Disputed' | 'Transferred' | 'Government';
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  documentType: 'Land Deed' | 'National ID' | 'Tax Receipt' | 'Supporting Document';
  uploadedAt: string;
}

export interface ReviewComment {
  id: string;
  applicationId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  comment: string;
  createdAt: string;
}

export interface VerificationNote {
  id: string;
  applicationId: string;
  officerId: string;
  officerName: string;
  findings: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Application {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantNid: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  plotNumber: string;
  holdingNumber: string;
  district: string;
  upazila: string;
  mouza: string;
  landSize: string;
  currentOwner: string;
  proposedNewOwner: string;
  transferType: TransferType;
  reason: string;
  deedReference: string;
  remarks: string;
  documents: DocumentFile[];
  status: ApplicationStatus;
  assignedSurveyOfficerId?: string;
  comments: ReviewComment[];
  verificationNotes: VerificationNote[];
  statusHistory: { status: ApplicationStatus; timestamp: string; actor: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  applicationId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  actionType: string;
  applicationId?: string;
  details: string;
}
