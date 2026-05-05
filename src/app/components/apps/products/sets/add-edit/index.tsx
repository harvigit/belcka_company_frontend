"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  TextField,
  Chip,
  Stack,
  InputAdornment,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Image from "next/image";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconSearch } from "@tabler/icons-react";

interface AddEditSetProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  setId?: number | null;
}

const AddEditSet: React.FC<AddEditSetProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
  setId,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [setName, setSetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all products/projects
  const fetchProjects = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await api.get(
        `products/get?company_id=${companyId}&is_products=true`,
      );
      if (res.data?.info) {
        setProducts(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  }, [companyId]);

  const fetchSetData = useCallback(async () => {
    if (!companyId || !setId) return;
    try {
      const res = await api.get(
        `products/get-sets?company_id=${companyId}&id=${setId}`,
      );
      const setData = res.data?.info?.[0];
      if (setData) {
        setSetName(setData.name);
        const preSelected = setData.products.map((p: any) => p.product_id);
        setSelectedIds(preSelected);
        setSelectAll(preSelected.length === products.length);
      }
    } catch (err) {
      console.error("Failed to fetch set data", err);
    }
  }, [companyId, setId, products.length]);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open, fetchProjects]);

  useEffect(() => {
    if (open && setId) {
      fetchSetData();
    }
  }, [open, setId]);

  useEffect(() => {
    if (open && !setId) {
      setSelectedIds([]);
      setSetName("");
      setSelectAll(false);
    }
  }, [open, setId]);

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSave = async () => {
    if (!companyId) return;

    if (!setName.trim()) {
      toast.error("Set name is required");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Please select at least one project");
      return;
    }

    setIsSaving(true);

    try {
      const payload: any = {
        company_id: companyId,
        name: setName,
        product_ids: selectedIds.join(","),
      };
      if (setId) payload.id = setId;

      const res = await api.post("products/manage-set", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        onWorkUpdated?.();
        onClose();
        setSelectedIds([]);
        setSetName("");
      } else {
        toast.error(res.data?.message || "Failed to save set");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save set");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return products.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.short_name?.toLowerCase().includes(search) ||
        item.supplier_code?.toLowerCase().includes(search) ||
        item.uuid?.toLowerCase().includes(search);

      return matchesSearch;
    });
  }, [products, searchTerm]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 550,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 550,
          padding: 2,
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            {setId ? "Edit Product Set" : "Create Product Set"}
          </Typography>
        </Box>

        {/* Set Name Input */}
        <Box mb={2}>
          <TextField
            label="Set Name"
            fullWidth
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
          />
        </Box>

        <Box
          display={"flex"}
          alignContent={"space-between"}
          alignItems={"center"}
          gap={2}
        >
          <TextField
            id="search"
            type="text"
            size="small"
            variant="outlined"
            placeholder="Search..."
            value={searchTerm}
            fullWidth
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={"16"} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {/* Select/Deselect All */}
          {products.length > 0 && (
            <Button variant="outlined" size="small" onClick={handleSelectAll} sx={{ width:"20%"}}>
              {selectAll ? "Deselect All" : "Select All"}
            </Button>
          )}
        </Box>

        {/* Projects List */}
        {filteredData.map((product) => (
          <Box
            key={product.id}
            mt={1}
            p={1}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              border: "1px solid #e7e3e3ff",
              borderRadius: "10px",
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <CustomCheckbox
                checked={selectedIds.includes(product.id)}
                onChange={() => handleCheckboxChange(product.id)}
              />
              <Box
                sx={{
                  border: "1px dashed #d1d5db",
                  borderRadius: 2,
                  p: 1,
                  textAlign: "center",
                }}
              >
                <Image
                  src={product.image_url || "/images/products/product.svg"}
                  alt={"product"}
                  width={50}
                  height={50}
                  style={{ objectFit: "contain" }}
                />
              </Box>
              <Stack mt={2} spacing={1}>
                <Typography variant="body2">
                  {product.short_name ?? product.name}{" "}
                  <Chip label={product.uuid} size="small" sx={{ ml: 1 }} />
                </Typography>
                <Typography variant="body2">
                  Supplier Code: {product.supplier_code}
                </Typography>
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Buttons */}
      <Box mt={2} display="flex" gap={2}>
        <Button
          color="primary"
          variant="contained"
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button
          color="inherit"
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 3,
            color: "GrayText",
          }}
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
};

export default AddEditSet;
