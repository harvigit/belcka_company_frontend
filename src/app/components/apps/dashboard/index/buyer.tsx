import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  DialogActions,
  Button,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { Grid } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import {
  IconBox,
  IconChartLine,
  IconCoins,
  IconHomeDollar,
  IconMapPinCheck,
  IconNotes,
  IconReportAnalytics,
  IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { IconChartBar } from "@tabler/icons-react";
import SalesOverview from "@/app/components/dashboard/TheSalesOverview";
import LowStockProduct from "@/app/components/dashboard/TheProductPerformance";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

const BuyerDashboard = () => {
  const session = useSession();
  const user = session.data?.user as User & { first_name?: string | null } & {
    last_name?: string | null;
  } & { company_id: number };
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [suppliersData, setSuppliersData] = useState<any[]>([
    {
      btnText: "primary.main",
      title: "suppliers",
      digits: 0,
      subtext: "",
      text: "",
      text2: "Number of Suppliers",
    },
    {
      btnText: "warning.main",
      title: "categories",
      digits: 0,
      subtext: "",
      text: "",
      text2: "Number of Categories",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const borderColor = theme.palette.divider;
  const [currency, setCurrency] = useState("");
  const [buyerOverview, setBuyerOverview] = useState<any>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);

  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

  // Load from localStorage or use defaults
  const getInitialDates = () => {
    return {
      startDate: defaultStart,
      endDate: defaultEnd,
    };
  };

  const initialDates = getInitialDates();
  ("");
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  const [projects, setProjects] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedReportType, setSelectedReportType] = useState("");

  const REPORT_DATA_MAP: Record<string, any[]> = {
    project: projects,
    address: addresses,
    store: stores,
    supplier: suppliers,
    user: users,
    trade: trades,
    team: teams,
    item: items,
  };

  const REPORT_TYPES = [
    { label: "Project Report", value: "project" },
    { label: "Address Report", value: "address" },
    { label: "Store Report", value: "store" },
    { label: "Supplier Report", value: "supplier" },
    { label: "User Report", value: "user" },
    { label: "Trade Report", value: "trade" },
    { label: "Team Report", value: "team" },
    { label: "Item Report", value: "item" },
  ];

  const ALL_OPTION = { id: "all", name: "All" };

  const optionsWithAll = [
    ALL_OPTION,
    ...(REPORT_DATA_MAP[selectedReportType] || []),
  ];

  const handleChange = (event: any, newValue: any) => {
    if (newValue.some((item: any) => item.id === "all")) {
      setSelectedItems([ALL_OPTION]);
    } else {
      setSelectedItems(newValue);
    }
  };

  const handleMenuClick = (report: any) => {
    setDialogTitle(report.label);
    setSelectedReportType(report.value);

    setSelectedItems([ALL_OPTION]);

    setOpenDialog(true);
    handleClose();
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get(
        `get-modules?company_id=${user.company_id}&is_web=true`,
      );
      if (res.data) {
        setProjects(res.data.projects);
        setAddresses(res.data.addresses);
        setStores(res.data.stores);
        setSuppliers(res.data.suppliers);
        setUsers(res.data.users);
        setTrades(res.data.trades);
        setTeams(res.data.teams);
        setItems(res.data.items);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };
  useEffect(() => {
    if (user.company_id) {
      fetchProjects();
    }
  }, [user.company_id, user.id]);

  const handleExport = async () => {
    const idsArray = selectedItems
      .filter((item) => item.id !== "all")
      .map((item) => Number(item.id));

    const isAllSelected = selectedItems.some((item) => item.id === "all");

    const payload = {
      company_id: user.company_id,
      start_date: startDate ? `${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()}` : null,
      end_date: endDate ? `${String(endDate.getDate()).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}` : null,
      report_type: selectedReportType,
      module_ids: isAllSelected ? "all" : idsArray,
    };

    const response = await api.post("export-reports", payload, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "report_export.xlsx";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `products/inventory-overview?company_id=${user.company_id}`,
      );

      if (res.data.IsSuccess) {
        setProducts(res.data.low_stock_product);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
    setLoading(false);
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `products/inventory-summary?company_id=${user.company_id}`,
      );

      if (res.data.IsSuccess) {
        const data = res.data.info;
        setCurrency(res.data.currency);

        setInventory([
          {
            btnText: "primary.main",
            title: "order_in_hands",
            digits: data.order_in_hands.count,
            subtext: "",
            text: "",
            text2: "Order in Hand",
          },
          {
            btnText: "warning.main",
            title: "received_orders",
            digits: data.received_orders.count,
            subtext: "",
            text: "",
            text2: "To be received",
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
    setLoading(false);
  };

  const fetchResorces = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user.company_id}`,
      );
      if (res.data.IsSuccess) {
        const data = res.data;

        setSuppliersData([
          {
            btnText: "primary.main",
            title: "suppliers",
            digits: data.suppliers?.length,
            subtext: "",
            text: "",
            text2: "Number of Suppliers",
          },
          {
            btnText: "warning.main",
            title: "categories",
            digits: data.categories?.length,
            subtext: "",
            text: "",
            text2: "Number of Categories",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
    setLoading(false);
  };

  const fetchBuyerOverview = async () => {
    if (!user.company_id) return;
    try {
      let url = `buyer-overview?company_id=${user.company_id}`;
      if (startDate && endDate) {
        const start = `${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()}`;
        const end = `${String(endDate.getDate()).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}`;
        url += `&start_date=${start}&end_date=${end}`;
      }
      const res = await api.get(url);
      if (res.data.IsSuccess) {
        setBuyerOverview(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user.company_id) {
      fetchBuyerOverview();
    }
  }, [user.company_id, startDate, endDate]);

  useEffect(() => {
    fetchOverview();
    fetchInventory();
    fetchResorces();
  }, [user.company_id]);
  return (
    <Box
      mt={0}
      display={"flex"}
      flexDirection={"column"}
      alignContent={"flex-end"}
      alignItems={"flex-end"}
    >
      <Box display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" mb={2}>
        <Box width="250px" mr={2}>
          <DateRangePickerBox
            from={startDate}
            to={endDate}
            onChange={handleDateRangeChange}
            payrollCycle={"2_week"}
          />
        </Box>
        <IconButton
          id="basic-button"
          aria-controls={openMenu ? "basic-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={openMenu ? "true" : undefined}
          onClick={handleClick}
        >
          <IconReportAnalytics size={30} stroke={1.5} color="#629FF4" />
        </IconButton>
      </Box>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleClose}
        slotProps={{
          list: {
            "aria-labelledby": "basic-button",
          },
        }}
      >
        {REPORT_TYPES.map((report) => (
          <MenuItem key={report.value} onClick={() => handleMenuClick(report)}>
            <Link
              href="#"
              style={{
                width: "100%",
                color: "#11142D",
                display: "flex",
                alignItems: "center",
              }}
            >
              {report.label}
            </Link>
          </MenuItem>
        ))}
      </Menu>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { position: "fixed", top: "20%", m: 0 } }}
      >
        <DialogTitle>{dialogTitle}</DialogTitle>

        <DialogContent
          sx={{
            display: "block",
            justifyContent: "space-between",
            alignContent: "center",
            alignItems: "flex-end",
          }}
        >
          <Box className="report_range">
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
              payrollCycle={"2_week"}
            />
          </Box>

          <Autocomplete
            fullWidth
            multiple
            className="report_selection"
            options={optionsWithAll}
            value={selectedItems}
            onChange={handleChange}
            sx={{ mt: 2 }}
            getOptionLabel={(option) => option?.name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder={
                  selectedItems.length > 0 ? "" : `Select ${selectedReportType}`
                }
              />
            )}
          />
        </DialogContent>

        <DialogActions>
          <Button color="error" onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              handleExport();
              setOpenDialog(false);
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2}>
        <Grid size={{ xs: 8 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: (theme) => theme.shadows[9],
            }}
          >
            <Typography pl={4} pt={2} variant="h3">
              Delivery details
            </Typography>

            <Grid container>
              {/* 1 */}
              <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
                <CardContent
                  sx={{
                    borderRight: {
                      xs: "0",
                      sm: `1px solid ${borderColor}`,
                    },
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <IconCoins
                    stroke={1.5}
                    size={40}
                    color="#629FF4"
                    style={{
                      backgroundColor: "#E8F1FD",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  />

                  <Box
                    display="block"
                    alignItems="center"
                    mt={0.5}
                    color="text.secondary"
                  >
                    <Typography variant="h3" fontWeight="400">{buyerOverview?.will_be_delivered ?? 0}</Typography>
                    <Typography variant="h6" fontWeight="400" color="textSecondary">Will be delivered</Typography>
                  </Box>
                </CardContent>
              </Grid>

              {/* 2 */}
              <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
                <CardContent
                  sx={{
                    borderRight: {
                      xs: "0",
                      sm: `1px solid ${borderColor}`,
                    },
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <IconChartLine
                    size={40}
                    color="#817AF3"
                    style={{
                      backgroundColor: "#ECEAFF",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  />

                  <Box
                    display="block"
                    alignItems="center"
                    mt={0.5}
                    color="text.secondary"
                  >
                    <Typography variant="h3" fontWeight="400">{buyerOverview?.transit ?? 0}</Typography>
                    <Typography variant="h6" fontWeight="400" color="textSecondary">In Transit</Typography>
                  </Box>
                </CardContent>
              </Grid>

              {/* 3 */}
              <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
                <CardContent
                  sx={{
                    borderRight: {
                      xs: "0",
                      sm: `1px solid ${borderColor}`,
                    },
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <IconChartBar
                    size={40}
                    color="#DBA362"
                    style={{
                      backgroundColor: "#FFEEDB",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  />

                  <Box
                    display="block"
                    alignItems="center"
                    mt={0.5}
                    color="text.secondary"
                  >
                    <Typography variant="h3" fontWeight="400">{buyerOverview?.delivered ?? 0}</Typography>
                    <Typography variant="h6" fontWeight="400" color="textSecondary">Delivered</Typography>
                  </Box>
                </CardContent>
              </Grid>

              {/* 4 */}
              <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
                <CardContent
                  sx={{
                    borderRight: {
                      xs: "0",
                      sm: `1px solid ${borderColor}`,
                    },
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <IconHomeDollar
                    size={40}
                    color="#58D365"
                    style={{
                      backgroundColor: "#EBFFED",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  />

                  <Box
                    display="block"
                    alignItems="center"
                    mt={0.5}
                    color="text.secondary"
                  >
                    <Typography variant="h3" fontWeight="400">
                      {buyerOverview?.currency ?? currency ?? "£"}{buyerOverview?.cost ?? "0.00"}
                    </Typography>
                    <Typography variant="h6" fontWeight="400" color="textSecondary">Cost</Typography>
                  </Box>
                </CardContent>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        <Grid size={{ xs: 4 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: (theme) => theme.shadows[9],
            }}
          >
            <Box>
              <Typography variant="h3" pl={4} pt={2}>
                Inventory Summary
              </Typography>
            </Box>

            <Grid container>
              {inventory.map((topcard) => (
                <Grid
                  key={topcard.digits}
                  size={{
                    xs: 6,
                    lg: 6,
                    sm: 6,
                  }}
                >
                  {/* {!loading ? ( */}
                  <CardContent
                    sx={{
                      borderRight: {
                        xs: "0",
                        sm: `1px solid ${borderColor}`,
                      },
                      p: 4,
                      textAlign: "center",
                    }}
                  >
                    {topcard.title == "order_in_hands" ? (
                      <IconBox
                        size={40}
                        color="#DBA362"
                        style={{
                          backgroundColor: "#FFEEDB",
                          padding: 6,
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      <IconMapPinCheck
                        size={40}
                        color="#817AF399"
                        style={{
                          backgroundColor: "#ECEAFF",
                          padding: 6,
                          borderRadius: 6,
                        }}
                      />
                    )}
                    <Box
                      display="block"
                      alignItems="center"
                      color="text.secondary"
                      mt={0.5}
                    >
                      <Typography variant="h3" fontWeight="400">
                        {topcard.digits}
                      </Typography>

                      <Typography
                        color="textSecondary"
                        variant="h6"
                        fontWeight="400"
                      >
                        {topcard.text2}
                      </Typography>
                    </Box>
                  </CardContent>
                  {/* ) : (
                    <>
                      {" "}
                      <CircularProgress
                        size={30}
                        color="primary"
                        sx={{ ml: 5 }}
                      />
                    </>
                  )} */}
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
        {/* <Grid size={{ xs: 8 }}>
        <Card
          sx={{
            borderRadius: "15px",
            boxShadow: (theme) => theme.shadows[9],
          }}
        >
          <Typography className="f-18" pl={4} pt={2}>
            Overall Inventory
          </Typography>

          <Grid container>
            {sales.map((topcard) => (
              <Grid
                key={topcard.digits}
                size={{
                  xs: 6,
                  lg: 3,
                  sm: 3,
                }}
              >
                {!loading ? (
                  <CardContent
                    sx={{
                      borderRight: {
                        xs: "0",
                        sm: `1px solid ${borderColor}`,
                      },
                      padding: "30px",
                      "& :last-child": {
                        borderRight: "0",
                      },
                    }}
                  >
                    <Typography
                      fontWeight={500}
                      sx={{
                        color: topcard.btnText,
                        boxShadow: "none",
                      }}
                    >
                      {topcard.title}
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent={"space-between"}
                      alignItems="center"
                      mt={3}
                      color="text.secondary"
                    >
                      <Typography variant="h3">{topcard.digits}</Typography>
                      <Typography color="textSecondary" variant="h3">
                        {topcard.subtext}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      justifyContent={"space-between"}
                      alignItems="end"
                      mt={1}
                      color="text.secondary"
                    >
                      <Typography variant="h6" fontWeight="400">
                        {topcard.text2}
                      </Typography>

                      <Typography
                        color="textSecondary"
                        variant="h6"
                        fontWeight="400"
                      >
                        {topcard.text}
                      </Typography>
                    </Box>
                  </CardContent>
                ) : (
                  <>
                    {" "}
                    <CircularProgress
                      size={30}
                      color="primary"
                      sx={{ ml: 5 }}
                    />
                  </>
                )}
              </Grid>
            ))}
          </Grid>
        </Card>
      </Grid> */}

        <Grid size={{ xs: 8 }}>
          <SalesOverview companyId={user.company_id} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Grid size={{ xs: 12 }}>
            <Card
              sx={{
                mb: 2,
                borderRadius: "15px",
                boxShadow: (theme) => theme.shadows[9],
              }}
            >
              <Box
                display={"flex"}
                justifyContent={"space-between"}
                alignItems={"center"}
                width={"95%"}
              >
                <Typography variant="h3" pl={4} pt={2}>
                  Suppliers
                </Typography>
                <Link
                  href={"/apps/suppliers/list"}
                  style={{ color: "#1E4DB7", paddingTop: 16 }}
                >
                  See all
                </Link>
              </Box>
              <Grid container>
                {suppliersData.map((topcard, index) => (
                  <Grid
                    key={index}
                    size={{
                      xs: 6,
                      lg: 6,
                      sm: 6,
                    }}
                  >
                    <CardContent
                      sx={{
                        borderRight: {
                          xs: "0",
                          sm: `1px solid ${borderColor}`,
                        },
                        p: 4,
                        textAlign: "center",
                      }}
                    >
                      {topcard.title == "suppliers" ? (
                        <IconUserCircle
                          size={40}
                          color="#24B8F1"
                          style={{
                            backgroundColor: "#E5F7FD",
                            padding: 6,
                            borderRadius: 6,
                          }}
                        />
                      ) : (
                        <IconNotes
                          size={40}
                          color="#817AF399"
                          style={{
                            backgroundColor: "#ECEAFF",
                            padding: 6,
                            borderRadius: 6,
                          }}
                        />
                      )}
                      <Box
                        display="block"
                        alignItems="center"
                        mt={1}
                        color="text.secondary"
                      >
                        <Typography variant="h3" fontWeight="400">
                          {topcard.digits}
                        </Typography>

                        <Typography
                          color="textSecondary"
                          variant="h6"
                          fontWeight="400"
                        >
                          {topcard.text2}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <LowStockProduct products={products} loading={loading} />
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BuyerDashboard;
