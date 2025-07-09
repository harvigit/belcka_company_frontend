import React from "react";
import { Typography, Box, Stack, Avatar } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import DashboardCard from "../shared/DashboardCard";
import { IconCircleFilled } from '@tabler/icons-react';
import { ApexOptions } from "apexcharts";

const SalesOverview = () => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;

  const optionssalesoverview: ApexOptions = {
    grid: {
      show: false,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '42%',
        borderRadius: 6,
      },
    },

    colors: [primary, secondary],
    fill: {
      type: 'solid',
      opacity: 1,
    },
    chart: {
      toolbar: {
        show: false,
      },
      height: 290,
      foreColor: '#adb0bb',
      fontFamily: "'DM Sans',sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
    },
    legend: {
      show: false,
    },
    xaxis: {
      type: 'category',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: true,
    },
    stroke: {
      show: true,
      width: 5,
      lineCap: 'butt',
      colors: ['transparent'],
    },
    tooltip: {
      theme: 'dark',
    },
  };
  const seriessalesoverview: ApexAxisChartSeries = [
    {
      name: 'Ample Admin',
      data: [355, 390, 300, 350, 390, 180],
    },
    {
      name: 'Pixel Admin',
      data: [280, 250, 325, 215, 250, 310],
    },
  ];
  return (
    <DashboardCard
      title="Sales Overview"
      subtitle="Ample Admin Vs Pixel Admin"
      action={
        <Stack direction="row" spacing={2}>
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
                color: 'primary.main',
                '& svg': {
                  fill: () => theme.palette.primary.main,
                },
                mr: '5px',
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
                color: 'secondary.main',
                '& svg': {
                  fill: () => theme.palette.secondary.main,
                },
                mr: '5px',
              }}
            >
              <IconCircleFilled width="10" height="10" />
            </Typography>
            Pixel Admin
          </Typography>
        </Stack>
      }
    >
      <Box height='290px' className="rounded-bars">
        <Chart
          options={optionssalesoverview}
          series={seriessalesoverview}
          type="bar"
          height="290px"
        />
      </Box>
    </DashboardCard>
  );
};

export default SalesOverview;
