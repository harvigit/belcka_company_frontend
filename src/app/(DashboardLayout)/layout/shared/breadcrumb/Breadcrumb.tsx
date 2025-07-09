import React from "react";
import {
  Grid,
  Typography,
  Box,
  Breadcrumbs,
  Theme,
  Avatar,
} from "@mui/material";
import NextLink from "next/link";

import { IconCircle } from "@tabler/icons-react";

interface BreadCrumbItem {
  title: string;
  to?: string;
}

interface BreadCrumbType {
  subtitle?: string;
  items?: BreadCrumbItem[];
  title: string;
  children?: React.ReactNode;
}

const Breadcrumb = ({ subtitle, items, title, children }: BreadCrumbType) => (
  <Grid
    container
    sx={{
      p: "30px 0 20px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <Grid
      mb={1}
      size={{
        xs: 12,
        sm: 6,
        lg: 8
      }}>

      <Typography
        color="textSecondary"
        variant="h4"
        fontWeight={400}
        mt={0.8}
        mb={0}
      >
        {subtitle}
      </Typography>
      <Typography variant="h1" fontWeight={700}>{title}</Typography>
      <Breadcrumbs
        separator={
          <IconCircle
            size="5"
            fill="textSecondary"
            fillOpacity={"0.6"}
            style={{ margin: "0 5px" }}
          />
        }
        sx={{ alignItems: "center", mt: items ? "10px" : "" }}
        aria-label="breadcrumb"
      >
        {items
          ? items.map((item) => (
            <div key={item.title}>
              {item.to ? (
                <NextLink href={item.to} passHref>
                  <Typography color="textSecondary">{item.title}</Typography>
                </NextLink>
              ) : (
                <Typography color="textPrimary">{item.title}</Typography>
              )}
            </div>
          ))
          : ""}
      </Breadcrumbs>
    </Grid>
    <Grid
      display="flex"
      alignItems="flex-end"
      size={{
        xs: 12,
        sm: 6,
        lg: 4
      }}>
      <Box
        sx={{
          display: { xs: "none", md: "block", lg: "flex" },
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        {children ? (
          <Box sx={{ top: "0px", position: "absolute" }}>{children}</Box>
        ) : null}
      </Box>
    </Grid>
  </Grid>
);

export default Breadcrumb;
