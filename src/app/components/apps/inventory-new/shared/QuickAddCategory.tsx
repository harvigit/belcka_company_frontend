"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CategoryForm from "../new-categories/form";

const emptyCategory = (companyId: number | null) => ({
  id: 0,
  company_id: companyId,
  name: "",
  status: true,
});

interface QuickAddCategoryProps {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
  onCreated: (categoryId: number) => void;
}

const QuickAddCategory: React.FC<QuickAddCategoryProps> = ({ open, onClose, companyId, onCreated }) => {
  const [formData, setFormData] = useState<any>(() => emptyCategory(companyId));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await api.post(
        "new-categories/create",
        { ...formData, company_id: companyId },
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setFormData(emptyCategory(companyId));
        onCreated(result.data.info.id);
        onClose();
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CategoryForm
      open={open}
      onClose={onClose}
      formData={formData}
      setFormData={setFormData}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      companyId={companyId}
    />
  );
};

export default QuickAddCategory;
