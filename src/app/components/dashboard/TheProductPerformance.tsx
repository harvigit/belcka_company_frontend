"use client";
import React from "react";
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Card,
} from "@mui/material";
import Link from "next/link";
import SkeletonLoader from "../SkeletonLoader";

const LowStockProduct = ({
  products,
  loading,
}: {
  products: any;
  loading: boolean;
}) => {
  if (products.length <= 0) return null;

  return (
    <Card sx={{ p: 2 }}>
      <Box
        p={2}
        pt={0}
        pb={0}
        display={"flex"}
        justifyContent={"space-between"}
      >
        <Typography variant="h1" fontSize={21}>
          Low Quantity Stock
        </Typography>

        <Link href={"/apps/products/list"} style={{ color: "#1E4DB7" }}>
          See all
        </Link>
      </Box>

      <Box
        sx={{
          mt: 1,
          overflow: {
            xs: "auto",
            sm: "unset",
          },
        }}
      >
        <Table
          sx={{
            whiteSpace: {
              xs: "nowrap",
              sm: "unset",
            },
          }}
        >
          <TableBody>
            {!loading ? (
              products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell sx={{ pl: 0 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        src={product.image_url}
                        alt={product.short_name}
                        sx={{
                          borderRadius: "10px",
                          height: "70px",
                          width: "90px",
                        }}
                      />

                      <Box>
                        <Typography variant="h5">
                          {product.short_name}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          variant="h6"
                          fontWeight="400"
                        >
                          UUID: {product.uuid}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="h5">
                      {product.currency}
                      {product.price}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <SkeletonLoader
                columns={[
                  { name: "Image" },
                  { name: "Name" },
                  { name: "Price" },
                ]}
                rowCount={3}
              />
            )}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
};

export default LowStockProduct;
