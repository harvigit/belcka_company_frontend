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

interface AddEditToolProps {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  companyId?: number | null;
  setId?: number | null;
}

const AddEditTool: React.FC<AddEditToolProps> = ({
  open,
  onClose,
  onWorkUpdated,
  companyId,
  setId,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [productId, setProductId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);

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
        `get-inventory-resources?company_id=${companyId}&is_web=true`,
      );
      if (res.data) {
        setProducts(res.data.products);
        setStores(res.data.stores);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  }, [companyId]);

  const fetchSetData = useCallback(async () => {
    if (!companyId || !setId) return;

    try {
      const res = await api.get(
        `product-tools/detail?company_id=${companyId}&id=${setId}`,
      );

      const setData = res.data?.info;

      if (setData) {
        setProductId(setData.product_id);
        setStoreId(setData.store_id);
        const preSelected = setData.trades.map((t: any) => t.trade_id);

        setSelectedIds(preSelected);
        setSelectAll(preSelected.length === trades.length);
      }
    } catch (err) {
      console.error("Failed to fetch set data", err);
    }
  }, [companyId, setId, trades.length]);

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchTrades();
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
      setSelectedIds(trades.map((t) => t.id));
    }
    setSelectAll(!selectAll);
  };
  const handleSave = async () => {
    if (!companyId) return;

    if (!productId) {
      toast.error("Please select product!");
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
        product_id: productId,
        store_id: storeId,
        trade_ids: selectedIds.join(","),
      };
      if (setId) payload.id = setId;

      const res = await api.post("product-tools/manage-tools", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        onWorkUpdated?.();
        onClose();
        setSelectedIds([]);
        setProductId("");
        setStoreId("");
      } else {
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
            {setId ? "Edit Tools" : "Add Tools"}
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

        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Store
          </Typography>
          <Autocomplete
            fullWidth
            options={stores}
            disabled={setId ? true : false}
            value={stores.find((p) => p.id === storeId) || null}
            onChange={(e, val) => setStoreId(val?.id || "")}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select Store" />
            )}
          />
        </Box>

        <Box mb={2}>
          <Typography variant="body2" mb={1}>
            Select Product
          </Typography>
          <Autocomplete
            fullWidth
            size="small"
            options={products.filter((item) => item.status !== 4)}
            disabled={setId ? true : false}
            value={
              products.find((t: any) => t.id === Number(productId)) ?? null
            }
            onChange={(e, val) => setProductId(val?.id || "")}
            getOptionLabel={(option) => option.short_name ?? option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select Product" />
            )}
          />
        </Box>

        {/* Trades List */}
        <Typography variant="body2" gutterBottom>
          Select Trades
        </Typography>
        {trades.map((trade) => (
          <Box
            key={trade.id}
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
                checked={selectedIds.includes(trade.id)}
                onChange={() => handleCheckboxChange(trade.id)}
              />
              <Typography variant="body2">{trade.name} </Typography>
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

export default AddEditTool;
