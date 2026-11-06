"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import SupplierForm from "../new-suppliers/form";

const emptySupplier = (companyId: number | null) => ({
  id: 0,
  company_id: companyId ?? "",
  name: "",
  status: true,
  phone: "",
  contact_person_phone: "",
  contact_person_email: "",
  contact_person_name: "",
  email: "",
  postcode: "",
  street: "",
  location: "",
});

interface QuickAddSupplierProps {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
  onCreated: (supplierId: number) => void;
}

const QuickAddSupplier: React.FC<QuickAddSupplierProps> = ({ open, onClose, companyId, onCreated }) => {
  const [formData, setFormData] = useState<any>(() => emptySupplier(companyId));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await api.post(
        "new-suppliers/create",
        { ...formData, company_id: companyId },
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setFormData(emptySupplier(companyId));
        onCreated(result.data.info.id);
        onClose();
      }
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SupplierForm
      open={open}
      onClose={() => {
        setFormData(emptySupplier(companyId));
        onClose();
      }}
      formData={formData}
      setFormData={setFormData}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      companyId={companyId}
    />
  );
};

export default QuickAddSupplier;
