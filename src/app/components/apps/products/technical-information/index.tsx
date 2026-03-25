"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, Grid, Stack, Chip } from "@mui/material";
import api from "@/utils/axios";
import Image from "next/image";

interface ProductTechnicalInformationProps {
  companyId: number | null;
  productId?: number | null;
}

const ProductTechnicalInformation: React.FC<
  ProductTechnicalInformationProps
> = ({ companyId, productId }) => {
  return (
    <Stack spacing={3} p={2}>
      <Typography textAlign="center" color="text.secondary">
        No information are found..
      </Typography>
    </Stack>
  );
};

export default ProductTechnicalInformation;
