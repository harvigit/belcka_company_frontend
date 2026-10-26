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
  dimensions_data?: any;
  output_unit?: string | null;
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
  address_id: number | null;
  property_name?: string;
  surveyor_id: number | null;
  surveyor_name?: string;
  survey_date: string;
  creation_method: SurveyCreationMethod;
  template_id?: number | null;
  template_name?: string;
  status: SurveyStatus;
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
