import React from "react";
import { Typography, Box, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import DashboardCard from "../shared/DashboardCard";
import { IconCircleFilled } from "@tabler/icons-react";
import { ApexOptions } from "apexcharts";

const SalesOverview = () => {
  const theme = useTheme();
  const primaryGradientColors = ["#817AF3", "#74B0FA", "#79D0F1"];
  const secondaryGradientColors = ["#46A46C", "#51CC5D", "#57DA65"];

  const optionssalesoverview: ApexOptions = {
    grid: { show: false },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "42%",
        borderRadius: 6,
      },
    },
    colors: [primaryGradientColors[0], secondaryGradientColors[0]],
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
        ],
      },
    },
    chart: {
      toolbar: { show: false },
      height: 290,
      foreColor: "#adb0bb",
      fontFamily: "'DM Sans',sans-serif",
    },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    legend: { show: false },
    xaxis: {
      type: "category",
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: true },
    stroke: {
      show: true,
      width: 20,
      lineCap: "butt",
      colors: ["transparent"],
    },
    tooltip: { theme: "dark" },
  };

  const seriessalesoverview: ApexAxisChartSeries = [
    {
      name: "Ample Admin",
      data: [355, 390, 300, 350, 390, 180],
    },
    {
      name: "Pixel Admin",
      data: [280, 250, 325, 215, 250, 310],
    },
  ];
  return (
    <DashboardCard
      title="Order in Hand & Purchase"
      subtitle=""
      action={
        <Stack direction="row" spacing={2}>
        </Stack>
      }
    >
      <Box height="320px" className="rounded-bars">
        <Chart
          options={optionssalesoverview}
          series={seriessalesoverview}
          type="bar"
          height="290px"
        />
        <Stack direction="row" spacing={2} ml={5}>
          <Typography
            variant="h6"
            display="flex"
            alignItems="center"
            sx={{
              color: () => theme.palette.primary.main,
            }}
          >
            <Typography
              sx={{
                color: "primary.main",
                "& svg": {
                  fill: () => theme.palette.primary.main,
                },
                mr: "5px",
              }}
            >
              <IconCircleFilled width="10" height="10" />
            </Typography>
            Ample
          </Typography>
          <Typography
            variant="h6"
            display="flex"
            alignItems="center"
            sx={{
              color: () => theme.palette.secondary.main,
            }}
          >
            <Typography
              sx={{
                color: "secondary.main",
                "& svg": {
                  fill: () => theme.palette.secondary.main,
                },
                mr: "5px",
              }}
            >
              <IconCircleFilled width="10" height="10" />
            </Typography>
            Pixel Admin
          </Typography>
        </Stack>
      </Box>
    </DashboardCard>
  );
};

export default SalesOverview;
