"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  FormControlLabel,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

interface ProductTradesProps {
  companyId: number | null;
  productId?: number | null;
}

const ProductTrades: React.FC<ProductTradesProps> = ({
  companyId,
  productId,
}) => {
  const [trades, setTrades] = useState<any[]>([]);
  const [product, setProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all trades for the company
  const fetchTrades = async () => {
    try {
      const res = await api.get(
        `get-company-resources?flag=tradeList&company_id=${companyId}`,
      );
      if (res.data?.info) setTrades(res.data.info);
    } catch (err) {
      console.error("Failed to fetch trades", err);
    }
  };

  // Fetch already selected trades for the product
  const fetchProductTrades = async () => {
    try {
      if (!productId) return;
      const res = await api.get(
        `product-tools/get?company_id=${companyId}&product_id=${productId}`,
      );
      if (res.data?.info?.length) {
        setProducts(res.data.info);
        const existingTradeIds =
          res.data.info[0]?.trades?.map((t: any) => t.trade_id) || [];
        setSelectedIds(existingTradeIds);
      } else {
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Failed to fetch product trades", err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTrades();
      fetchProductTrades();
    }
  }, [companyId, productId]);

  // Handle checkbox toggle
  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Save trades
  const handleSave = async () => {
    if (!productId || !companyId) return;
    if (!selectedIds.length) {
      toast.error("Please select at least one trade!");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id: product.length > 0 ? Number(product[0].id) : null,
        company_id: Number(companyId),
        product_id: Number(productId),
        trade_ids: selectedIds.join(","),
      };

      const res = await api.post("product-tools/manage-tools", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
      } else {
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2} p={2}>
      {/* Save Button */}
      <Box textAlign="left">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </Box>

      {/* Trades Grid */}
      {trades.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
              lg: "1fr 1fr 1fr 1fr",
            },
            gap: 2,
          }}
        >
          {trades.map((trade) => (
            <Box
              key={trade.id}
              display="flex"
              alignItems="center"
              gap={1}
              sx={{
                padding: 1.5,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                backgroundColor: "#fff",
                minHeight: 60,
              }}
            >
              <FormControlLabel
                label={
                  <Typography
                    variant="body2"
                    sx={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.3,
                      wordBreak: "break-word",
                    }}
                  >
                    {trade.name}
                  </Typography>
                }
                control={
                  <CustomCheckbox
                    checked={selectedIds.includes(trade.id)}
                    onChange={() => handleCheckboxChange(trade.id)}
                  />
                }
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Typography textAlign="center" color="text.secondary">
          No trades found.
        </Typography>
      )}
    </Stack>
  );
};

export default ProductTrades;
