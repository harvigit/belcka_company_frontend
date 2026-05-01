"use client";
import React, { useEffect, useState } from "react";
import { Typography, Box, Card, Autocomplete } from "@mui/material";
import dynamic from "next/dynamic";
import api from "@/utils/axios";
import { ApexOptions } from "apexcharts";
import dayjs from "dayjs";
import DateRangePickerBox from "../common/DateRangePickerBox";
import CustomTextField from "../forms/theme-elements/CustomTextField";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const InventoryOverview = ({ companyId }: { companyId: number }) => {
  const [weekData, setWeekData] = useState<any[]>([]);
  const [yearData, setYearData] = useState<any[]>([]);
  const [currency, setCurrency] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

  const [startDate, setStartDate] = useState<any>(defaultStart);
  const [endDate, setEndDate] = useState<any>(defaultEnd);

  // ✅ Fetch stores
  const fetchResources = async () => {
    const res = await api.get(
      `get-inventory-resources?company_id=${companyId}`,
    );
    setStores(res.data.stores);
  };

  // fetch data
  const fetchData = async (start: Date, end: Date, store?: number | null) => {
    try {
      let url = `inventory-overview?company_id=${companyId}`;

      if (start && end) {
        url += `&start_date=${dayjs(start).format("DD/MM/YYYY")}`;
        url += `&end_date=${dayjs(end).format("DD/MM/YYYY")}`;
      }

      if (store) {
        url += `&store_id=${store}`;
      }

      const res = await api.get(url);

      if (res.data.IsSuccess) {
        setWeekData(res.data.info || []);
        setYearData(res.data.year_wise_data || []);
        setCurrency(res.data.currency);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate, storeId);
  }, [companyId, startDate, endDate, storeId]);

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
      fetchData(range.from, range.to, storeId);
    }
  };

  const getWeekChart = (days: any[]) => {
    const options: ApexOptions = {
      chart: { type: "bar", toolbar: { show: false } },
      plotOptions: {
        bar: {
          columnWidth: days.length <= 3 ? "25%" : "40%",
          borderRadius: 4,
          dataLabels: { position: "top" },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -15,
        formatter: (val: number) => (val > 0 ? `${currency}${val}` : ""),
        style: {
          fontSize: "11px",
          colors: ["#000"],
          fontWeight: 600,
        },
      },
      stroke: {
        show: true,
        width: 8,
        colors: ["transparent"],
      },
      xaxis: {
        categories: days.map((d) => d.day),
      },
      yaxis: {
        labels: { show: false },
        max: (max) => max * 1.1,
      },
      grid: { show: false },
      legend: { show: false },
      colors: ["#1a97f5", "#1e4db7"],
    };

    const series = [
      { name: "IN", data: days.map((d) => d.in) },
      { name: "OUT", data: days.map((d) => Math.abs(d.out)) },
    ];

    return <Chart options={options} series={series} type="bar" height={200} />;
  };

  const getYearChart = () => {
    const options: ApexOptions = {
      chart: { type: "bar", toolbar: { show: false } },
      plotOptions: {
        bar: {
          columnWidth: yearData.length <= 4 ? "20%" : "35%",
          borderRadius: 4,
          dataLabels: { position: "top" },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -15,
        formatter: (val: number) => (val > 0 ? `${currency}${val}` : ""),
        style: {
          fontSize: "11px",
          colors: ["#000"],
          fontWeight: 600,
        },
      },
      stroke: {
        show: true,
        width: 8,
        colors: ["transparent"],
      },
      xaxis: {
        categories: yearData.map((d) => d.month),
      },
      yaxis: {
        labels: { show: false },
      },
      grid: { show: false },
      legend: { show: false },
      colors: ["#1a97f5", "#1e4db7"],
    };

    const series = [
      { name: "IN", data: yearData.map((d) => d.in) },
      { name: "OUT", data: yearData.map((d) => Math.abs(d.out)) },
    ];

    return <Chart options={options} series={series} type="bar" height={260} />;
  };

  return (
    <Card
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
        display: yearData.length > 0 ? "block" : "none",
      }}
    >
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between">
        <Typography variant="h1" fontSize={21} pl={2}>
          Inventory
        </Typography>
        <Box display={"flex"} gap={2} textAlign={"center"} mr={3}>
          <Typography variant="h6" fontWeight={600} color="#1a97f5">
            IN
          </Typography>
          <Typography variant="h6" fontWeight={600} color="#1e4db7">
            OUT
          </Typography>
        </Box>
        {/* <Box display="flex" gap={2}>
          <DateRangePickerBox
            from={startDate}
            to={endDate}
            onChange={handleDateRangeChange}
          />

          <Autocomplete
            sx={{ width: 200 }}
            options={stores}
            value={stores.find((s) => s.id === storeId) || null}
            onChange={(e, val) => {
              const id = val?.id || null;
              setStoreId(id);
              fetchData(startDate, endDate, id);
            }}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select Store" />
            )}
          />
        </Box> */}
      </Box>

      {/* <Typography fontWeight={600} mb={1}>
        Weekly Data
      </Typography>

      {weekData.map((week: any, i: number) => (
        <Card key={i} sx={{ p: 2, mb: 2 }}>
          <Typography textAlign="center" mb={1}>
            {week.week}
          </Typography>
          {getWeekChart(week.days)}
        </Card>
      ))} */}
      <Box sx={{ p: 2 }}>{getYearChart()}</Box>
    </Card>
  );
};

export default InventoryOverview;
