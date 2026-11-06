"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import InternalItemDrawer, {
  emptyInternalItem,
  InternalItemForm,
} from "../internal-items/form";
import { InventoryOptions } from "./useInventoryOptions";

interface QuickAddInternalItemProps {
  open: boolean;
  onClose: () => void;
  companyId: number | null;
  options: InventoryOptions;
  onOptionsChanged?: () => Promise<void> | void;
  defaultName?: string;
  onCreated: (internalItemId: number) => void;
}

const QuickAddInternalItem: React.FC<QuickAddInternalItemProps> = ({
  open,
  onClose,
  companyId,
  options,
  onOptionsChanged,
  defaultName,
  onCreated,
}) => {
  const [formData, setFormData] = useState<InternalItemForm>(emptyInternalItem);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setFormData({ ...emptyInternalItem, name: defaultName ?? "" });
  }, [open, defaultName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { image_file, image_url, remove_image, base_price, ...fields } = formData;
      const payload = new FormData();
      Object.entries({ ...fields, company_id: companyId }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) payload.append(key, String(value));
      });
      if (image_file) payload.append("image", image_file);
      const result = await api.post("inventory-new/internal-items/create", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        onClose();
        onCreated(result.data.info.id);
      }
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <InternalItemDrawer
      open={open}
      onClose={onClose}
      formData={formData}
      setFormData={setFormData}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      options={options}
      companyId={companyId}
      onOptionsChanged={onOptionsChanged}
    />
  );
};

export default QuickAddInternalItem;
