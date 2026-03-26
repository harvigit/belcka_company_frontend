"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, Grid, Stack, Chip } from "@mui/material";
import api from "@/utils/axios";
import Image from "next/image";

interface ProductSetsProps {
  companyId: number | null;
  productId?: number | null;
}

const ProductSets: React.FC<ProductSetsProps> = ({ companyId, productId }) => {
  const [sets, setSets] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchProductSets = async (searchValue = "") => {
    try {
      const res = await api.get(
        `products/get-sets?company_id=${companyId}&product_id=${productId}&search=${searchValue}`,
      );

      if (res.data.info) {
        setSets(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch product sets", err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchProductSets();
    }
  }, [companyId, productId]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProductSets(search);
    }, 400);

    return () => clearTimeout(delay);
  }, [search]);

  return (
    <Stack spacing={3} p={2}>
      <TextField
        label="Search by project name or code.."
        value={search}
        sx={{ width: "30%" }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {sets.map((set: any) => (
        <Box
          key={set.id}
          sx={{
            border: "1px solid #e5e7eb",
            borderRadius: 2,
            p: 2,
            backgroundColor: "#fff",
          }}
        >
          <Typography variant="h4" mb={2} fontWeight={600}>
            {set.name}
          </Typography>

          <Grid container spacing={2}>
            {set.products?.map((p: any) => (
              <Grid key={p.id} size={{ xs: 4, sm: 3, md: 2 }}>
                <Box
                  sx={{
                    border: "1px dashed #d1d5db",
                    borderRadius: 2,
                    p: 1,
                    textAlign: "center",
                  }}
                >
                  <Image
                    src={p.thumb_url || p.image_url}
                    alt={"Product"}
                    width={80}
                    height={80}
                    style={{ objectFit: "contain" }}
                  />
                </Box>
                <Stack mt={2} spacing={1}>
                  <Typography key={p.id} variant="body2">
                    {p.short_name ?? p.name}{" "}
                    <Chip label={p.uuid} size="small" sx={{ ml: 1 }} />
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {sets.length === 0 && (
        <Typography textAlign="center" color="text.secondary">
          No sets are found..
        </Typography>
      )}
    </Stack>
  );
};

export default ProductSets;
