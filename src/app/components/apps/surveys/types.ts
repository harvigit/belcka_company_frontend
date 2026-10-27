export type SurveyStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "qs_review"
  | "completed"
  | "frozen";

export type SurveyCreationMethod = "template" | "blank";

export type ElementCondition =
  | "good"
  | "minor_defects"
  | "damaged"
  | "not_accessible";

export interface SurveyItemPhoto {
  id: number;
  file_path: string;
  file_name?: string;
  file_size?: number;
  caption?: string | null;
  created_at?: string;
}

export interface SurveyElementDetails {
  id: number;
  name: string;
  form_factor?: string | null;
  measurement_mode?: string | null;
  output_name?: string | null;
  output_unit?: string | null;
  dimension_1_name?: string | null;
  dimension_1_unit?: string | null;
  dimension_2_name?: string | null;
  dimension_2_unit?: string | null;
  dimension_3_name?: string | null;
  dimension_3_unit?: string | null;
  dimension_4_name?: string | null;
  dimension_4_unit?: string | null;
  dimensions_data?: any;
  surface_photo_minimum?: number | null;
  damageTypes?: { id: number; name: string }[];
  materials?: { id: number; name: string }[];
}

export interface SurveyItem {
  id: string | number;
  element_id: number;
  name: string;
  output_unit?: string | null;
  dimension_1_name?: string | null;
  dimension_1_unit?: string | null;
  dimension_1_value?: number | null;
  dimension_2_name?: string | null;
  dimension_2_unit?: string | null;
  dimension_2_value?: number | null;
  dimension_3_name?: string | null;
  dimension_3_unit?: string | null;
  dimension_3_value?: number | null;
  dimension_4_name?: string | null;
  dimension_4_unit?: string | null;
  dimension_4_value?: number | null;
  calculated_qty?: number | null;
  condition?: ElementCondition | null;
  condition_score?: number | null;
  damage_type_id?: number | null;
  damage_type_name?: string | null;
  material_id?: number | null;
  material_name?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | string | null;
  repair_action?: string | null;
  notes?: string;
  is_inspected?: boolean;
  inspected_at?: string | null;
  photos?: SurveyItemPhoto[];
  element?: SurveyElementDetails | null;
}

export interface SurveyRoom {
  id: string | number;
  name: string;
  group_id?: number | null;
  sort_order: number;
  notes?: string;
  items: SurveyItem[];
}

export interface Survey {
  id: string | number;
  reference: string;
  title: string;
  project_id: number | null;
  project_name?: string;
  project?: { id: number; name: string } | null;
  address_id: number | null;
  property_name?: string;
  address?: { id: number; name: string } | null;
  surveyor_id: number | null;
  surveyor_name?: string;
  surveyor?: { id: number; first_name: string; last_name: string; email?: string } | null;
  survey_date: string;
  creation_method: SurveyCreationMethod;
  template_id?: number | null;
  template_name?: string;
  status: SurveyStatus;
  qs_status?: string | null;
  rework_notes?: string | null;
  scope_adjust_sign?: number;
  scope_adjust_type?: string;
  scope_adjust_value?: number;
  estimated_duration_days?: number | null;
  baseline_locked_at?: string | null;
  baseline_locked_by?: number | null;
  baseline_total?: number | null;
  scope_items?: SurveyScopeItem[];
  work_orders?: SurveyWorkOrder[];
  work_order?: SurveyWorkOrder | null;
  variation_orders?: SurveyVariationOrder[];
  rooms: SurveyRoom[];
  notes?: string;
  progress?: {
    total: number;
    inspected: number;
    percentage: number;
  };
  total_rooms?: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyProjectOption {
  id: number;
  name: string;
}

export interface SurveyAddressOption {
  id: number;
  project_id: number;
  name: string;
  parentAddress?: {
    short_name?: string;
    name?: string;
  };
}

export interface SurveyorOption {
  id: number;
  name: string;
  email?: string | null;
}

export interface SurveyTemplateOption {
  id: number;
  name: string;
  status: boolean;
  groups: {
    id: number;
    name: string;
  }[];
}

export interface SurveyGroupOption {
  id: number;
  name: string;
  status: boolean;
  elements: {
    id: number;
    name: string;
    output_unit?: string | null;
  }[];
}

export interface SurveyElementOption {
  id: number;
  name: string;
  output_name?: string | null;
  output_unit?: string | null;
  dimension_1_name?: string | null;
  dimension_1_unit?: string | null;
  dimension_2_name?: string | null;
  dimension_2_unit?: string | null;
  dimension_3_name?: string | null;
  dimension_3_unit?: string | null;
  dimension_4_name?: string | null;
  dimension_4_unit?: string | null;
  status?: boolean;
}

export interface SurveyScopeItem {
  id: number;
  survey_id: number;
  survey_item_id?: number | null;
  room_name?: string | null;
  element_name?: string | null;
  item_code?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
  is_reviewed: boolean;
  notes?: string | null;
  sort_order?: number;
}

export interface SurveyScopeTotals {
  base_amount: number;
  adjust_amount: number;
  total_amount: number;
  reviewed_count: number;
  total_count: number;
  pending_count: number;
}

export interface SurveyEvidenceItem {
  id: number;
  room_id: number;
  room_name: string;
  element_id: number;
  element_name: string;
  condition: ElementCondition | null;
  damage_type_name?: string | null;
  material_name?: string | null;
  severity?: string | null;
  repair_action?: string | null;
  notes?: string | null;
  is_inspected: boolean;
  calculated_qty?: number | null;
  output_unit?: string | null;
  dimensions: { name?: string; unit?: string; value?: number }[];
  photos: SurveyItemPhoto[];
}

export interface SurveyScopeData {
  survey: Survey & { is_locked?: boolean };
  evidence_items: SurveyEvidenceItem[];
  scope_items: SurveyScopeItem[];
  totals: SurveyScopeTotals;
}

export interface SurveyWorkOrderItem {
  id: number;
  work_order_id: number;
  survey_scope_item_id?: number | null;
  item_code?: string | null;
  room_name?: string | null;
  element_name?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
  notes?: string | null;
  sort_order?: number;
}

export interface SurveyVariationOrder {
  id: number;
  survey_id: number;
  work_order_id?: number | null;
  reference: string;
  reason: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  notes?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface SurveyWorkOrder {
  id: number;
  survey_id: number;
  reference: string;
  contractor_id?: number | null;
  contractor_name?: string | null;
  trade_id?: number | null;
  trade_name?: string | null;
  status: string;
  baseline_total: number;
  total_amount: number;
  start_date?: string | null;
  target_completion_date?: string | null;
  duration_days?: number | null;
  notes?: string | null;
  issued_at: string;
  items?: SurveyWorkOrderItem[];
  variation_orders?: SurveyVariationOrder[];
}

