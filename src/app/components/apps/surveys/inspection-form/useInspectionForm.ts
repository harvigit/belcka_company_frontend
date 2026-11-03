"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";

export type InspectionFormField = {
  id: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: string[];
  multipleSelection?: boolean;
  formulaExpression?: string;
  source?: string;
  fields?: InspectionFormField[];
};

export type InspectionFormData = {
  survey_id: number;
  editable: boolean;
  form: { id: number; name: string; fields: InspectionFormField[] } | null;
  answers: Record<string, unknown>;
  prefill: Record<string, unknown>;
  formulas: Record<string, unknown>;
  values: Record<string, unknown>;
  progress: {
    required_total: number;
    required_answered: number;
    missing: { id: string; label: string; section: string }[];
  };
  updated_at: string | null;
};

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;

/** Loads and saves a survey's property detail (GET / PUT surveys/:id/form). */
export default function useInspectionForm(surveyId: number | string | null | undefined) {
  const [data, setData] = useState<InspectionFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!surveyId) return;
    setLoading(true);
    try {
      const res = await api.get(`surveys/${surveyId}/form`, { skipToast: true } as any);
      setData(res.data?.info || null);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (answers: Record<string, unknown>) => {
      if (!surveyId) return false;
      setSaving(true);
      try {
        const res = await api.put(`surveys/${surveyId}/form`, { answers });
        if (res.data?.IsSuccess) {
          setData(res.data.info);
          toast.success(res.data.message || "Property detail saved");
          return true;
        }
        toast.error(res.data?.message || "Failed to save the property detail");
      } catch (error) {
        console.error(error);
        toast.error(errorMessage(error, "Failed to save the property detail"));
      } finally {
        setSaving(false);
      }
      return false;
    },
    [surveyId],
  );

  return { data, loading, saving, reload: load, save };
}
