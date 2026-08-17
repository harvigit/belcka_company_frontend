import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  DialogActions,
  Button,
  Tooltip,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { Grid, useTheme } from "@mui/system";
import {
  IconReportAnalytics,
  IconFileInvoice,
  IconFileDescription,
  IconRefresh,
  IconCurrencyPound,
  IconClock,
  IconCheck,
  IconTruckDelivery,
  IconCircleCheck,
  IconX,
  IconAlertTriangle,
  IconFileDelta,
  IconChevronRight,
} from "@tabler/icons-react";
import Link from "next/link";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { IconDotsVertical } from "@tabler/icons-react";
import Image from "next/image";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import PurchaseProductList from "../../purchase-orders/products";

const BuyerDashboard = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id: number };
  const [loading, setLoading] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_id: Number(user?.company_id),
    order_id: "",
    checked_product: false,
    supplier_id: "",
    id: 0,
  });
  const selectedProductsWithQty: any[] = [];

  const handleSubmit = async (e: React.FormEvent, is_draft = false) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const submissionData = { ...formData, is_draft };
      const result = await api.post("purchase-orders/create", submissionData);
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setProductDrawerOpen(false);
        fetchOrders();
      } else {
        toast.error(result.data.message || "Failed to create order");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

  const [startDate, setStartDate] = useState<Date | null>(defaultStart);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);

  const [data, setData] = useState<any>(null);
  const [poOrder, setPoOrder] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [invoices, setInvoices] = useState<any>(null);

  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const openMenu2 = Boolean(anchorEl2);

  const theme = useTheme();
  const borderColor = theme.palette.divider;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClick2 = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

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

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.company_id) return;
    try {
      setLoading(true);
      let url = `buyer-dashboard-detailed?company_id=${user.company_id}`;
      if (startDate && endDate) {
        const start = `${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()}`;
        const end = `${String(endDate.getDate()).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}`;
        url += `&start_date=${start}&end_date=${end}`;
      }
      const res = await api.get(url);
      if (res.data.IsSuccess) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // fetch purchase order
  const fetchOrders = async () => {
    try {
      const queryParams = new URLSearchParams({
        company_id: String(user?.company_id || ""),
        page: "1",
        limit: "5",
      });

      if (startDate && endDate) {
        const start = `${String(startDate.getDate()).padStart(2, "0")}/${String(
          startDate.getMonth() + 1,
        ).padStart(2, "0")}/${startDate.getFullYear()}`;

        const end = `${String(endDate.getDate()).padStart(2, "0")}/${String(
          endDate.getMonth() + 1,
        ).padStart(2, "0")}/${endDate.getFullYear()}`;

        queryParams.set("start_date", start);
        queryParams.set("end_date", end);
      }

      const res = await api.get(
        `purchase-orders/get?${queryParams.toString()}`,
      );
      if (res.data) {
        setPoOrder(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
  };

  // fetch Invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(user?.company_id || ""),
        page: String(1),
        limit: String(5),
      });

      if (startDate && endDate) {
        const start = `${String(startDate.getDate()).padStart(2, "0")}/${String(
          startDate.getMonth() + 1,
        ).padStart(2, "0")}/${startDate.getFullYear()}`;

        const end = `${String(endDate.getDate()).padStart(2, "0")}/${String(
          endDate.getMonth() + 1,
        ).padStart(2, "0")}/${endDate.getFullYear()}`;

        params.set("start_date", start);
        params.set("end_date", end);
      }

      const res = await api.get(`po-invoices/list?${params.toString()}`);
      if (res.data?.IsSuccess) {
        const rows = res.data.info || [];
        setInvoices(rows);
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  // fetch purchase order
  const fetchInternalOrders = async () => {
    try {
      const queryParams = new URLSearchParams({
        company_id: String(user?.company_id || ""),
      });
      if (startDate && endDate) {
        const start = `${String(startDate.getDate()).padStart(2, "0")}/${String(
          startDate.getMonth() + 1,
        ).padStart(2, "0")}/${startDate.getFullYear()}`;

        const end = `${String(endDate.getDate()).padStart(2, "0")}/${String(
          endDate.getMonth() + 1,
        ).padStart(2, "0")}/${endDate.getFullYear()}`;

        queryParams.set("start_date", start);
        queryParams.set("end_date", end);
      }

      const res = await api.get(
        `employee-orders/get?${queryParams.toString()}`,
      );
      if (res.data) {
        setOrder(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
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
    if (user?.company_id) {
      fetchDashboardData();
      fetchOrders();
      fetchInvoices();
      fetchInternalOrders();
      fetchProjects();
    }
  }, [user?.company_id, startDate, endDate]);

  const handleExport = async () => {
    const idsArray = selectedItems
      .filter((item) => item.id !== "all")
      .map((item) => Number(item.id));

    const isAllSelected = selectedItems.some((item) => item.id === "all");

    const payload = {
      company_id: user.company_id,
      start_date: startDate
        ? `${String(startDate.getDate()).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${startDate.getFullYear()}`
        : null,
      end_date: endDate
        ? `${String(endDate.getDate()).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}`
        : null,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
      case "Paid":
      case "Completed":
        return { bg: "#E8F5E9", color: "#4CAF50" };
      case "Active":
        return { bg: "#E8F5E9", color: "#4CAF50" };
      case "active":
        return { bg: "#E8F5E9", color: "#4CAF50" };
      case "Pending Approval":
      case "Pending":
      case "Partially Paid":
        return { bg: "#FFF8E1", color: "#FFC107" };
      case "Ordered":
      case "Draft":
        return { bg: "#E3F2FD", color: "#2196F3" };
      case "Cancelled":
      case "Damaged":
        return { bg: "#FFEBEE", color: "#F44336" };
      default:
        return { bg: "#F5F5F5", color: "#9E9E9E" };
    }
  };

  if (!data && loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box mt={0}>
      <Box display="flex" justifyContent="end" alignItems="center" mb={2}>
        {/* <Typography variant="h3" color="textSecondary">Buyer Dashboard</Typography> */}
        <Box display="flex" alignItems="center">
          <Box width="250px">
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
              payrollCycle={"2_week"}
            />
          </Box>
          {/* <IconButton onClick={handleClick}>
            <IconReportAnalytics size={30} stroke={1.5} color="#629FF4" />
          </IconButton> */}
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
              <MenuItem
                key={report.value}
                onClick={() => handleMenuClick(report)}
              >
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
                      selectedItems.length > 0
                        ? ""
                        : `Select ${selectedReportType}`
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

          <IconButton
            sx={{ margin: "0px" }}
            id="basic-button"
            aria-controls={openMenu2 ? "basic-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu2 ? "true" : undefined}
            onClick={(e) => {
              handleClick2(e);
            }}
          >
            <IconDotsVertical width={18} />
          </IconButton>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl2}
            open={openMenu2}
            onClose={handleClose2}
            slotProps={{
              list: {
                "aria-labelledby": "basic-button",
              },
            }}
          >
            <MenuItem onClick={handleClose2}>
              <Link
                color="body1"
                href="/apps/invoices/list"
                style={{
                  width: "100%",
                  color: "#11142D",
                  textTransform: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyItems: "center",
                }}
              >
                <ListItemIcon>
                  <IconFileInvoice width={18} />
                </ListItemIcon>
                Invoices
              </Link>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box mb={4}>
        {/* <Typography variant="h3" fontWeight={700} mb={3} color="#11142D">
          Here's What's Happening With your purchasing today.
        </Typography> */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              onClick={() => setProductDrawerOpen(true)}
              sx={{
                borderRadius: "15px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                border: "1px solid #F0F0F0",
                p: 2.5,
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                cursor: "pointer",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
              }}
            >
              <Box
                bgcolor="#F4F7FE"
                p={1.5}
                borderRadius={2}
                mr={2}
                display="flex"
              >
                <IconFileInvoice color="#4A8BFA" size={24} />
              </Box>
              <Box flex={1}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="#11142D"
                >
                  Create Purchase Order
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Order from supplier
                </Typography>
              </Box>
              <IconChevronRight color="#9E9E9E" size={20} />
            </Card>

            <PurchaseProductList
              open={productDrawerOpen}
              onClose={() => setProductDrawerOpen(false)}
              ids={selectedProductsWithQty}
              formData={formData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              isSaving={isSaving}
              companyId={user.company_id ?? null}
              mode="create"
              onDraftSaved={fetchOrders}
            />
          </Grid>

          {/* <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              component={Link}
              href="/apps/employee-orders/create"
              sx={{
                borderRadius: "15px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                border: "1px solid #F0F0F0",
                p: 2.5,
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
              }}
            >
              <Box
                bgcolor="#F4E8FD"
                p={1.5}
                borderRadius={2}
                mr={2}
                display="flex"
              >
                <IconFileDescription color="#9C27B0" size={24} />
              </Box>
              <Box flex={1}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="#11142D"
                >
                  Create Internal Order
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  One-time / special order for project
                </Typography>
              </Box>
              <IconChevronRight color="#9E9E9E" size={20} />
            </Card>
          </Grid> */}

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              component={Link}
              href="/apps/invoices/list"
              sx={{
                borderRadius: "15px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                border: "1px solid #F0F0F0",
                p: 2.5,
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
              }}
            >
              <Box
                bgcolor="#E8F5E9"
                p={1.5}
                borderRadius={2}
                mr={2}
                display="flex"
              >
                <IconFileInvoice color="#4CAF50" size={24} />
              </Box>
              <Box
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                pr={1}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="#11142D"
                  >
                    Invoices
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    View & manage invoices
                  </Typography>
                </Box>
                <Chip
                  label="New"
                  size="small"
                  sx={{
                    bgcolor: "#673AB7",
                    color: "white",
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                />
              </Box>
              <IconChevronRight color="#9E9E9E" size={20} />
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              color="inherit"
              sx={{
                borderRadius: "15px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                border: "1px solid #F0F0F0",
                p: 2.5,
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
              }}
            >
              <Box
                bgcolor="#F4E8FD"
                p={1.5}
                borderRadius={2}
                mr={2}
                display="flex"
              >
                <IconReportAnalytics color="#9C27B0" size={24} />
              </Box>
              <Box flex={1}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="#11142D"
                >
                  Reports
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  View detailed reports
                </Typography>
              </Box>
              <IconButton onClick={handleClick}>
                <IconChevronRight color="#9E9E9E" size={20} />
              </IconButton>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Top Row: Summary & Status Overview */}
      <Grid container spacing={3} mb={3}>
        {/* Orders Summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              height: "100%",
            }}
          >
            <Box p={3}>
              <Typography variant="h4" fontWeight={700} mb={3}>
                Orders Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    textAlign="center"
                  >
                    <Box bgcolor="#E8F1FD" p={1} borderRadius={1} mb={1}>
                      <IconFileInvoice color="#4A8BFA" size={20} />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Purchase Orders
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {data?.summary?.purchase_orders?.count || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    textAlign="center"
                  >
                    <Box bgcolor="#F4E8FD" p={1} borderRadius={1} mb={1}>
                      <IconFileDescription color="#9C27B0" size={20} />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Internal Orders
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {data?.summary?.internal_orders?.count || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    textAlign="center"
                  >
                    <Box bgcolor="#E5F9E6" p={1} borderRadius={1} mb={1}>
                      <IconRefresh color="#2E7D32" size={20} />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Total Orders
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {data?.summary?.total_orders?.count || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    textAlign="center"
                  >
                    <Box bgcolor="#FFF4E5" p={1} borderRadius={1} mb={1}>
                      <IconCurrencyPound color="#E65100" size={20} />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Total Order Value
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {data?.currency}
                      {data?.summary?.total_orders?.value?.toLocaleString() ||
                        "0.00"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      This Period
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Grid>

        {/* Order Status Overview */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              height: "100%",
            }}
          >
            <Box p={3} display="flex" flexDirection="column" height="100%">
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Typography variant="h4" fontWeight={600}>
                  Order Status Overview
                </Typography>
                {/* <Link
                  href="#"
                  style={{
                    color: "#4A8BFA",
                    fontSize: "0.875rem",
                    textDecoration: "none",
                  }}
                >
                  View report
                </Link> */}
              </Box>

              <Box
                display="flex"
                justifyContent="space-between"
                flexWrap="nowrap"
                gap={1}
                overflow="auto"
              >
                {/* <StatusItem
                  icon={<IconFileDelta />}
                  color="#607D8B"
                  label="Draft"
                  count={data?.status_overview?.preparing || 0}
                /> */}
                <StatusItem
                  icon={<IconClock />}
                  color="#FFC107"
                  label="Pending Approval"
                  count={data?.status_overview?.placed || 0}
                />
                <StatusItem
                  icon={<IconCheck />}
                  color="#4CAF50"
                  label="Approved"
                  count={data?.status_overview?.collected || 0}
                />
                <StatusItem
                  icon={<IconTruckDelivery />}
                  color="#2196F3"
                  label="Ordered"
                  count={data?.status_overview?.new || 0}
                />
                <StatusItem
                  icon={<IconCircleCheck />}
                  color="#388E3C"
                  label="Completed"
                  count={data?.status_overview?.delivered || 0}
                />
                <StatusItem
                  icon={<IconX />}
                  color="#F44336"
                  label="Cancelled"
                  count={data?.status_overview?.canceled || 0}
                />
                <StatusItem
                  icon={<IconAlertTriangle />}
                  color="#9C27B0"
                  label="Damaged"
                  count={data?.status_overview?.returned || 0}
                />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Middle Row: Purchase Orders & Invoices */}
      <Grid container spacing={3} mb={3}>
        {/* Purchase Orders */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              height: "100%",
            }}
          >
            <Box p={3}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h4" fontWeight={600}>
                  Purchase Orders
                </Typography>
                <Link
                  href="/apps/purchase-orders/list"
                  style={{
                    color: "#4A8BFA",
                    fontSize: "0.875rem",
                    textDecoration: "none",
                  }}
                >
                  View all orders
                </Link>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PO Number</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Total</TableCell>
                      {/* <TableCell>Actions</TableCell> */}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poOrder?.map((row: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Tooltip title={row.order_id ?? ""}>
                            <Typography
                              color="textSecondary"
                              variant="caption"
                              className="f-14"
                              sx={{
                                maxWidth: "120px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {row.order_id ?? "-"}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: "120px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Tooltip title={row.supplier_name ?? ""}>
                            {row.supplier_name ?? "-"}
                          </Tooltip>
                        </TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            sx={{
                              bgcolor: row.status_color
                                ? `${row.status_color}20`
                                : "#F5F5F5",
                              color: row.status_color || "#9E9E9E",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                            label={row.status_text}
                          />
                        </TableCell>
                        <TableCell>
                          {data?.currency}
                          {Number(row.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        {/* <TableCell>
                            <Box display="flex" gap={1}>
                              <IconEye
                                size={18}
                                color="#9E9E9E"
                                style={{ cursor: "pointer" }}
                              />
                              <IconDownload
                                size={18}
                                color="#9E9E9E"
                                style={{ cursor: "pointer" }}
                              />
                              <IconDots
                                size={18}
                                color="#9E9E9E"
                                style={{ cursor: "pointer" }}
                              />
                            </Box>
                          </TableCell> */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
        </Grid>

        {/* Invoices */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              height: "100%",
            }}
          >
            <Box p={3}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h4" fontWeight={600}>
                  Invoices
                </Typography>
                <Link
                  href="/apps/invoices/list"
                  style={{
                    color: "#4A8BFA",
                    fontSize: "0.875rem",
                    textDecoration: "none",
                  }}
                >
                  View all invoices
                </Link>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice No.</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Invoice Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices?.map((row: any, index: number) => {
                      const colors = getStatusColor(row.status);
                      return (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Typography
                              color="textSecondary"
                              variant="caption"
                              className="f-14"
                            >
                              <Tooltip title={row.invoice_id ?? ""}>
                                {row.invoice_id ?? "-"}
                              </Tooltip>
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={{
                              maxWidth: "120px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <Tooltip title={row.ordered_by_name ?? ""}>
                              {row.ordered_by_name ?? "-"}
                            </Tooltip>
                          </TableCell>
                          <TableCell
                            sx={{
                              maxWidth: "120px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <Tooltip title={row.supplier ?? ""}>
                              {row.supplier ?? "-"}
                            </Tooltip>
                          </TableCell>
                          <TableCell>{row.expected_delivery_date}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              size="small"
                              sx={{
                                bgcolor: colors.bg,
                                color: colors.color,
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                height: "24px",
                                textTransform: "capitalize"
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {data?.currency}
                            {Number(row.total_incl_vat).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                              },
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Row: Recent Internal Orders & Top Suppliers */}
      <Grid container spacing={3}>
        {/* Recent Internal Orders */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              height: "100%",
            }}
          >
            <Box p={3}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h4" fontWeight={600}>
                  Recent Internal Orders
                </Typography>
                {/* <Link
                  href="#"
                  style={{
                    color: "#4A8BFA",
                    fontSize: "0.875rem",
                    textDecoration: "none",
                  }}
                >
                  View all
                </Link> */}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order No.</TableCell>
                      <TableCell>Project</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order?.slice(0, 5).map((row: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography
                            color="textSecondary"
                            variant="caption"
                            className="f-14"
                          >
                            {row.order_id}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: "120px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Tooltip title={row.project_name ?? ""}>
                            {row.project_name ?? "-"}
                          </Tooltip>
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: "150px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Tooltip title={row.address_name ?? ""}>
                            {row.address_name ?? "-"}
                          </Tooltip>
                        </TableCell>
                        <TableCell>{row.created_at}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            sx={{
                              bgcolor: row.status_color
                                ? `${row.status_color}20`
                                : "#F5F5F5",
                              color: row.status_color || "#9E9E9E",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                            label={row.status_text}
                          />
                        </TableCell>
                        <TableCell>
                          {data?.currency}
                          {Number(row.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
        </Grid>

        {/* Top Suppliers */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: "15px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              height: "100%",
            }}
          >
            <Box p={3}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h4" fontWeight={600}>
                  Top Suppliers
                </Typography>
                {/* <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ cursor: "pointer" }}
                >
                  This Period ▾
                </Typography> */}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Supplier</TableCell>
                      <TableCell sx={{ textAlign: "center" }}>Orders</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        Total Value
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        % of Spend
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.top_suppliers?.map((row: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              borderRadius: "50%",
                            }}
                          >
                            <Image
                              src={
                                row.image_url || "/images/products/product.svg"
                              }
                              alt="Supplier"
                              width={15}
                              height={15}
                            />
                          </Box>
                          <Typography
                            color="textSecondary"
                            variant="caption"
                            className="f-14"
                          >
                            {row.supplier_name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {row.orders_count}
                        </TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          {data?.currency}
                          {Number(row.total_value).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box width="100%" mr={1}>
                              <LinearProgress
                                variant="determinate"
                                value={Number(row.percent_of_spend)}
                                sx={{
                                  height: 6,
                                  borderRadius: 5,
                                  bgcolor: "#E3F2FD",
                                  "& .MuiLinearProgress-bar": {
                                    borderRadius: 5,
                                    bgcolor: "#4A8BFA",
                                  },
                                }}
                              />
                            </Box>
                            <Typography variant="caption" minWidth="35px">
                              {row.percent_of_spend}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const StatusItem = ({ icon, color, label, count }: any) => {
  const isSelected = false; // Add logic if selectable
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={1}
      sx={{
        minWidth: "75px",
        borderRadius: "12px",
        border: `1px solid ${isSelected ? color : "transparent"}`,
        bgcolor: isSelected ? `${color}10` : "transparent",
        cursor: "pointer",
        "&:hover": { bgcolor: "#F5F5F5" },
      }}
    >
      <Box
        color={color}
        mb={1}
        sx={{
          bgcolor: `${color}15`,
          p: 1.5,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {React.cloneElement(icon, { size: 20, stroke: 1.5 })}
      </Box>
      <Typography
        variant="caption"
        color="textSecondary"
        align="center"
        sx={{ lineHeight: 1.1, mb: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={600} color="textPrimary">
        {count}
      </Typography>
    </Box>
  );
};

export default BuyerDashboard;
