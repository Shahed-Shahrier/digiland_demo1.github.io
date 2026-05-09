export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface DbUser {
  user_id: number;
  auth_user_id?: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  nid_number: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface DbRole {
  role_id: number;
  role_name: string;
}

export interface DbUserRole {
  user_id: number;
  role_id: number;
}

export interface DbLandParcel {
  land_id: number;
  plot_number: string;
  holding_number: string | null;
  khatian_number: string | null;
  mouza: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  union_name: string | null;
  village: string | null;
  area_size: number | string | null;
  land_type?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  ownership_status: string | null;
  current_status: string | null;
  legal_remarks: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DbApplication {
  application_id: number;
  application_number: string;
  applicant_user_id: number;
  land_id: number;
  transfer_type: string;
  fee_amount: number | string | null;
  payment_status: string | null;
  current_status: string;
  assigned_admin_id: number | null;
  assigned_survey_officer_id: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DbDocument {
  document_id: number;
  application_id: number;
  user_id: number;
  land_id: number;
  document_type: string;
  file_name: string;
  file_path: string | null;
  mime_type: string | null;
  file_size: number | string | null;
  version_no: number | null;
  verification_status: string | null;
  reviewed_by: number | null;
  uploaded_at: string;
}

export interface DbReview {
  review_id: number;
  application_id: number;
  reviewer_id: number;
  note: string | null;
  review_type: string | null;
  created_at: string;
}

export interface DbVerification {
  verification_id: number;
  application_id: number;
  land_id: number;
  survey_officer_id: number;
  visit_date: string | null;
  geo_verified: boolean | null;
  result: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbStatusHistory {
  history_id?: number;
  application_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number | null;
  changed_at: string;
}

export interface DbNotification {
  notification_id: number;
  recipient_user_id: number;
  title: string;
  message: string;
  type: string | null;
  deep_link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbAuditLog {
  log_id: number;
  actor_user_id: number | null;
  action_type: string;
  target_table: string;
  target_id: number | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
