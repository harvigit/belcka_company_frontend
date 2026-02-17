import React, { useState } from "react";
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  Avatar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DashboardCard from "../shared/DashboardCard";
import Link from "next/link";

const items = [
  {
    id: 1,
    imgsrc: "/images/products/1.jpg",
    name: "Is it good butterscotch ice-cream?",
    tags: "Ice-Cream, Milk, Powder",
    review: "good",
    percent: 65,
    earnings: "546,000",
  },
  {
    id: 2,
    imgsrc: "/images/products/2.jpg",
    name: "Supreme fresh tomato available",
    tags: "Market, Mall",
    review: "excellent",
    percent: 98,
    earnings: "780,000",
  },
  {
    id: 3,
    imgsrc: "/images/products/3.jpg",
    name: "Red color candy from Gucci",
    tags: "Chocolate, Yummy",
    review: "average",
    percent: 46,
    earnings: "457,000",
  },
];

const PerformanceTable = () => {
  const [products, setProducts] = useState(items);

  const Capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  const deleteHandler = (id: number) => {
    const updateProducts = products.filter((ind) => ind.id !== id);
    setProducts(updateProducts);
  };

  const theme = useTheme();
  return (
    <DashboardCard title="Products Performance" subtitle="">
      <Box textAlign={"end"}>
        <Link
          href={"/apps/suppliers/list"}
          style={{ color: "#1E4DB7", paddingTop: 16 }}
        >
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
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell
                  sx={{
                    pl: 0,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      src={product.imgsrc}
                      alt={product.imgsrc}
                      sx={{
                        borderRadius: "10px",
                        height: "70px",
                        width: "90px",
                      }}
                    />

                    <Box>
                      <Typography variant="h5">{product.name}</Typography>
                      <Typography
                        color="textSecondary"
                        variant="h6"
                        fontWeight="400"
                      >
                        {product.tags}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    pl: 0,
                  }}
                >
                  <Typography variant="h6" mb={1}>
                    {Capitalize(product.review)}
                  </Typography>
                  <LinearProgress
                    value={product.percent}
                    variant="determinate"
                    sx={{
                      "& span": {
                        backgroundColor:
                          product.review === "good"
                            ? (theme) => theme.palette.primary.main
                            : product.review === "excellent"
                              ? (theme) => theme.palette.success.main
                              : product.review === "average"
                                ? (theme) => theme.palette.warning.main
                                : product.review === "poor"
                                  ? (theme) => theme.palette.error.main
                                  : (theme) => theme.palette.primary.main,
                      },
                    }}
                  />
                  <Typography
                    color="textSecondary"
                    variant="h6"
                    fontWeight="400"
                    mt={1}
                    whiteSpace="nowrap"
                  >
                    {product.percent}% sold
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    color="textSecondary"
                    variant="h6"
                    fontWeight="400"
                  >
                    Earnings
                  </Typography>
                  <Typography variant="h5">${product.earnings}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </DashboardCard>
  );
};

export default PerformanceTable;
