"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Autocomplete,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { DateTime } from "luxon";

interface AssignUserToolProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  setId?: number | null;
}

const AssignUserTool: React.FC<AssignUserToolProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
  setId,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [userId, setUserId] = useState<number[]>([]);
  const [productId, setProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const convertToDDMMYYYY = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // trades
  const fetchTrades = async () => {
    try {
      const res = await api.get(
        `get-company-resources?flag=tradeList&company_id=${companyId}`,
      );
      if (res.data?.info) setTrades(res.data.info);
    } catch (err) {}
  };

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
  const fetchResources = async () => {
    try {
      let url = `get-inventory-resources?company_id=${companyId}`;
      const res = await api.get(url);
      if (res.data) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resources", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchTrades();
      fetchResources();
      setUserId([]);
    }
  }, [open, fetchProjects]);

  useEffect(() => {
    if (open && !setId) {
      setSelectedIds([]);
      setProductId("");
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
      setSelectedIds(products.map((t) => t.id));
    }
    setSelectAll(!selectAll);
  };
  const handleSave = async () => {
    if (!companyId) return;

    if (selectedIds.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    setIsSaving(true);

    try {
      const payload: any = {
        company_id: companyId,
        product_ids: selectedIds.join(","),
        user_Id: Number(userId),
        from_date: convertToDDMMYYYY(fromDate),
        to_date: convertToDDMMYYYY(toDate),
      };

      const res = await api.post("hire-orders/create", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        onWorkUpdated?.();
        onClose();
        setSelectedIds([]);
        setProductId("");
      }
    } catch (err: any) {
    } finally {
      setIsSaving(false);
    }
  };

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
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            {setId ? "Edit Assign tool" : "Assign tool"}
          </Typography>
        </Box>

        {/* Select/Deselect All */}
        {products.length > 0 && (
          <Box textAlign={"end"}>
            <Button variant="outlined" size="small" onClick={handleSelectAll}>
              {selectAll ? "Deselect All" : "Select All"}
            </Button>
          </Box>
        )}
        {/* Set Name Input */}
        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Hire From
          </Typography>
          <CustomTextField
            type="date"
            name="from_date"
            fullWidth
            value={fromDate}
            onChange={(e: any) => setFromDate(e.target.value)}
            onFocus={(e: any) => e.target.showPicker()}
            onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
          />
        </Box>

        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Hire To
          </Typography>
          <CustomTextField
            type="date"
            name="to_date"
            fullWidth
            value={toDate}
            onChange={(e: any) => setToDate(e.target.value)}
            onFocus={(e: any) => e.target.showPicker()}
            onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
          />
        </Box>

        <Box mb={2}>
          <Typography variant="body2" mb={1}>
            Select User
          </Typography>
          <Autocomplete
            fullWidth
            size="small"
            options={users}
            value={users.find((t: any) => t.id === userId) ?? null}
            onChange={(e, val) => setUserId(val?.id || "")}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select User" />
            )}
          />
        </Box>
        {/* Products List */}
        <Typography variant="body2" mb={1}>
          Select Products
        </Typography>
        {products.map((product) => (
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
              <Typography variant="body2">
                {product.short_name ?? product.name}{" "}
              </Typography>
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

export default AssignUserTool;
