"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Stack,
  FormControl,
  MenuItem,
  Select,
  Card,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import DashboardCard from "../shared/DashboardCard";
import { IconCircleFilled } from "@tabler/icons-react";
import { ApexOptions } from "apexcharts";
import api from "@/utils/axios";
interface InventoryChartData {
  month: string;
  low_stock: number;
  in_stock: number;
  out_of_stock: number;
}

const SalesOverview = ({ companyId }: { companyId: number }) => {
  const theme = useTheme();
  const [chartData, setChartData] = useState<InventoryChartData[]>([]);

  const primaryGradientColors = ["#817AF3", "#74B0FA", "#79D0F1"];
  const secondaryGradientColors = ["#46A46C", "#51CC5D", "#57DA65"];
  const tertiaryGradientColors = ["#FF9800", "#FFA500", "#FFC107"];
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const fetchInventoryOverview = async (month: string) => {
    try {
      const res = await api.get(
        `/products/inventory-overview?company_id=${companyId}&month=${month}`,
      );

      if (res.data.IsSuccess) {
        setChartData(res.data.inventory_data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory overview", err);
    }
  };

  useEffect(() => {
    if (companyId && selectedMonth) {
      fetchInventoryOverview(selectedMonth);
    }
  }, [companyId, selectedMonth]);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 320,
      toolbar: { show: false },
      fontFamily: "'DM Sans', sans-serif",
      foreColor: "#adb0bb",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "30%",
        borderRadius: 5,
        barHeight: "80%",
      },
    },
    colors: [
      primaryGradientColors[0],
      secondaryGradientColors[0],
      tertiaryGradientColors[0],
    ],
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.5,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 48, 100],
        gradientToColors: [
          primaryGradientColors[2],
          secondaryGradientColors[2],
          tertiaryGradientColors[2],
        ],
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 20, lineCap: "butt", colors: ["transparent"] },
    grid: { show: false },
    xaxis: {
      type: "category",
      categories: chartData.map((d) => d.month),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -15 },
    },
    yaxis: { show: true },
    tooltip: { theme: "dark" },
    legend: { show: false },
  };

  const series = [
    { name: "Low Stock", data: chartData.map((d) => d.low_stock) },
    { name: "In Stock", data: chartData.map((d) => d.in_stock) },
    { name: "Out of Stock", data: chartData.map((d) => d.out_of_stock) },
  ];

  return (
    <Card sx={{ p: 2 }}>
      <Box
        p={2}
        pt={0}
        pb={0}
        display={"flex"}
        justifyItems={"center"}
        justifyContent={"space-between"}
      >
        <Typography variant="h1" fontSize={21}>
          Product Stock Overview
        </Typography>
        <FormControl
          size="small"
          sx={{ minWidth: 160, mb: 2, alignContent: "flex-end" }}
        >
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);

              const value = `${d.getFullYear()}-${String(
                d.getMonth() + 1,
              ).padStart(2, "0")}`;

              return (
                <MenuItem key={value} value={value}>
                  {d.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>
      <Box height="350px" className="rounded-bars">
        <Chart options={options} series={series} type="bar" height={290} />
        <Stack direction="row" spacing={2} mt={2} ml={5}>
          {["Low Stock", "In Stock", "Out of Stock"].map((label, idx) => (
            <Typography
              key={label}
              variant="h6"
              display="flex"
              alignItems="center"
              sx={{ color: options.colors![idx] }}
            >
              <IconCircleFilled
                width={10}
                height={10}
                style={{ marginRight: 5 }}
              />
              {label}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Card>
  );
};

export default SalesOverview;
