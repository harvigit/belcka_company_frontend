"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Fab,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconArrowLeft, IconFileTypePdf, IconX } from "@tabler/icons-react";
import Image from "next/image";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { styled } from "@mui/system";
import { DayPicker } from "react-day-picker";
import { useDropzone } from "react-dropzone";
import { IconMinus } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

interface TableRow {
  id: number;
  date?: string;
  order_id: number;
}

const StyledDayPicker = styled(Box)(({ theme }) => ({
  "& .rdp": {
    "--rdp-cell-size": "36px",
    "--rdp-accent-color": "#50ABFF",
    "--rdp-background-color": "#e6f3ff",
    "--rdp-selected-color": "#fff",
    "--rdp-selected-background": "#50ABFF",
    "--rdp-today-background": "#f0f0f0",
    fontSize: "14px",
    padding: theme.spacing(1),
    backgroundColor: "#fff",
  },
  "& .rdp-day": {
    borderRadius: "4px",
  },
  "& .rdp-day_selected": {
    backgroundColor: "#50ABFF",
    color: "#fff",
  },
  "& .rdp-day:hover": {
    backgroundColor: "#e6f3ff",
  },
}));

const ReceivePurchaseOrder = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params ? Number(params.id) : "";
  const [isSaving, setIsSaving] = useState(false);
  const [fetchOrders, setFetchOrders] = useState<boolean>(true);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [receiveId, setReceiveId] = useState<number>(0);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [selectedRow, setSelectedRow] = React.useState<TableRow | null>(null);
  const [singleDate, setSingleDate] = React.useState<Date | undefined>(
    undefined,
  );

  const [modalOpen, setModalOpen] = React.useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveDate, setReceiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const DropzoneComponent = ({ item, setProducts }: any) => {
    const onDrop = useCallback((acceptedFiles: any) => {
      const filesWithPreview = acceptedFiles.map((file: any) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      );

      setProducts((prev: any) =>
        prev.map((p: any) =>
          p.product_id === item.product_id
            ? {
                ...p,
                images: [...(p.images || []), ...filesWithPreview],
              }
            : p,
        ),
      );
    }, []);

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      accept: { "image/*": [] },
    });

    return (
      <Box
        {...getRootProps()}
        sx={{
          width: 120,
          height: 80,
          mt: 1,
          backgroundColor: "primary.light",
          color: "primary.main",
          padding: "25px",
          textAlign: "center",
          border: `1px dashed`,
          borderColor: "primary.main",
          borderRadius: 1,
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <Typography fontSize={10}>Attachments</Typography>
      </Box>
    );
  };

  const fetchOrder = async () => {
    try {
      setFetchOrders(true);

      const res = await api.get(
        `purchase-orders/detail?company_id=${user.company_id}&id=${orderId}`,
      );
      const data = res.data.info;

      setOrder(data);

      const mapped: any[] = data.purchase_orders.map((p: any) => {
        const ordered = Number(p.qty);
        const received = Number(p.delivered_qty || 0);
        return {
          ...p,
          id: p.product_id,
          order_id: p.id,
          product_id: p.product_id,
          short_name: p.short_name,
          supplier_code: p.supplier_code,
          ordered_qty: ordered,
          received_qty: received,
          remaining_qty: p.remaining_qty,
          receive_now: ordered - received - p.cancelled_qty,
          image_url: p.image_url,
          uuid: p.uuid,
          description: p.description,
          date: p.date,
          status: data.status,
          delivered_qty: p.delivered_qty,
          cancelled_qty: p.cancelled_qty,
          note: "",
          images: [],
        };
      });
      setProducts(mapped);
    } catch (error: any) {
      if (error.response?.status === 404) {
        router.replace("/apps/purchase-orders/list");
        return;
      }
    } finally {
      setFetchOrders(false);
    }
  };
  useEffect(() => {
    if (!orderId) return;
    setOpen(true);
    if (open == true) {
      fetchOrder();
    }
  }, [open, orderId]);

  const supplierIdsFromPO = [
    ...new Set(order?.purchase_orders.map((po: any) => po.supplier_name)),
  ];
  const onClose = () => {
    setOpen(false);
    router.push("/apps/purchase-orders/list");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setReceiveDate(value);
  };

  const parseDDMMYYYY = (dateString: string | null) => {
    if (!dateString) return undefined;

    const [day, month, year] = dateString.split("/");
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const handleOpenModal = (row: TableRow) => {
    setSelectedRow(row);
    setSingleDate(row.date ? parseDDMMYYYY(row.date) : undefined);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRow(null);
  };

  function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const updateExpectedDate = async (rowId: number, date: any) => {
    try {
      const res = await api.post(
        "purchase-orders/change-product-delivery-date",
        {
          id: rowId,
          date: date,
        },
      );
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchOrder();
      }
    } catch (error) {
      console.error("Date update failed", error);
    }
  };

  const handleCancel = async () => {
    try {
      setIsSaving(true);

      const formData = new FormData();
      formData.append("company_id", String(order.company_id));
      formData.append("id", String(order.id));
      formData.append("status", "4");

      let index = 0;

      products.forEach((p) => {
        if (selectedRowIds.has(p.product_id) && p.receive_now > 0) {
          formData.append(`product_data[${index}][id]`, String(p.product_id));
          formData.append(`product_data[${index}][qty]`, String(p.receive_now));

          if (p.note) {
            formData.append(`product_data[${index}][note]`, p.note);
          }

          if (p.images?.length) {
            p.images.forEach((file: File) => {
              formData.append(`product_data[${index}][images][]`, file);
            });
          }

          index++;
        }
      });

      if (index === 0) {
        toast.error("Select at least one product!");
        return;
      }

      const response = await api.post(
        "purchase-orders/update-status",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        router.replace("/apps/purchase-orders/list");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      products.forEach((p) => {
        (p.images || []).forEach((file: any) =>
          URL.revokeObjectURL(file.preview),
        );
      });
    };
  }, [products]);

  const columnHelper = createColumnHelper<any>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("item", {
        id: "item",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Item & Description
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const placeholder = "/images/products/product.svg";

          return (
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                display={"flex"}
                alignContent={"center"}
                sx={{ pl: 0.3, ml: 1 }}
              >
                <Image
                  src={item.image_url || placeholder}
                  alt={"product"}
                  width={50}
                  height={50}
                />
                <Box display={"block"}>
                  <Typography>{item.short_name}</Typography>
                  <Typography color="text.secondary" variant="caption">
                    {item.description ? item.description : ""}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          );
        },
      }),

      columnHelper.accessor((row) => row?.date, {
        id: "expect_delivery_date",
        header: () => "Expect Delivery Date",

        cell: ({ row }) => {
          const item = row.original;
          const isShow = item.status !== 4 && item.status !== 5;

          return (
            <Stack direction="row" alignItems="center" spacing={2} ml={1}>
              <Box
                onClick={(e) => {
                  if (!isShow) return;
                  e.stopPropagation();
                  handleOpenModal(item);
                }}
                sx={{
                  minWidth: 50,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                  "&:hover": isShow ? { border: "1px solid #1976d2" } : {},
                  opacity: isShow ? 1 : 0.5,
                  pointerEvents: isShow ? "" : "none",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: 14,
                    textAlign: "center",
                    color: item.date ? "inherit" : "text.secondary",
                  }}
                >
                  {item.date || "Select Date"}
                </Typography>
              </Box>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("product_id", {
        id: "id",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              ID
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={4}
              sx={{ pl: 0.3, ml: 1 }}
            >
              <Typography textTransform="capitalize" className="f-14">
                {item.product_id ? item.product_id : "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor((row) => row?.supplier_code, {
        id: "code",
        header: () => "Code",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" alignItems="center" ml={1}>
              <Typography textTransform="capitalize" className="f-14">
                {item.supplier_code ? item.supplier_code : "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor((row) => row?.ordered_qty, {
        id: "orderQty",
        header: () => "Ordered",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" alignItems="center" ml={1}>
              <Typography textTransform="capitalize" className="f-14">
                {item.ordered_qty ? item.ordered_qty : "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor((row) => row?.received_qty, {
        id: "receiveQty",
        header: () => "Received",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" alignItems="center" ml={1}>
              <Typography textTransform="capitalize" className="f-14">
                {item.received_qty ? item.received_qty : "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor((row) => row?.receive_now, {
        id: "qty_to_receive",
        header: () => "Qty to Receive",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" alignItems="center" ml={1}>
              <Typography textTransform="capitalize" className="f-14">
                {item.receive_now ? item.receive_now : "-"}
              </Typography>
            </Stack>
          );
        },
      }),
    ],
    [hoveredRow, selectedRowIds],
  );

  const table = useReactTable({
    data: products,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Reset to first page when search term changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [table]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: "99vh",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
      }}
    >
      {/* HEADER */}
      <Box p={2} display="flex" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Receive Purchase Order
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      {/* BODY */}
      <Box px={10} py={2} flex={1} overflow="auto">
        {/* ORDER INFO */}
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={3}>
          <TextField label="Order ID" value={order?.order_id || ""} disabled />
          <TextField
            label="Supplier"
            value={supplierIdsFromPO.join(", ")}
            disabled
          />
          <TextField label="Store" value={order?.store_name || ""} disabled />
          <TextField label="Received By" value={user.name || ""} disabled />
          <Box className="form_inputs">
            <Typography variant="body2" gutterBottom>
              Purchase Receive
            </Typography>
            <TextField
              fullWidth
              value={receiveId || ""}
              onChange={(e: any) => setReceiveId(e.target.value)}
            />
          </Box>
          <Box className="form_inputs">
            <Typography variant="body2" gutterBottom>
              Receive Date
            </Typography>
            <CustomTextField
              type="date"
              name="receive_date"
              fullWidth
              value={receiveDate}
              onChange={handleChange}
              onFocus={(e: any) => e.target.showPicker()}
              onClick={(e: any) => (e.target as HTMLInputElement).showPicker()}
            />
          </Box>
        </Box>

        <Box
          display={"flex"}
          justifyContent={"space-between"}
          mb={2}
          alignItems={"baseline"}
        >
          <Typography color="text.secondary" mb={2}>
            Note: Please check products before mark as receive.
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
            }}
          >
            {order?.status !== 5 && (
              <Button
                color="error"
                variant="contained"
                size="large"
                onClick={() => {
                  setReceiveModalOpen(true);
                }}
                disabled={isSaving || order?.status == 4}
              >
                {isSaving ? "Saving..." : "Cancel Order"}
              </Button>
            )}
          </Box>
        </Box>
        {/* TABLE */}

        <TableContainer>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = header.column.getIsSorted() === "asc";
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell
                        key={header.id}
                        align="center"
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          width:
                            header.column.id === "item"
                              ? "50% !important"
                              : "auto",
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          p={0}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "flex-start",
                            "&:hover": { color: "#888" },
                            "&:hover .hoverIcon": { opacity: 1 },
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={500}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Typography>
                          {isSortable && (
                            <Box
                              component="span"
                              className="hoverIcon"
                              ml={0.5}
                              sx={{
                                transition: "opacity 0.2s",
                                opacity: isActive ? 1 : 0,
                                fontSize: "0.9rem",
                                color: isActive ? "#000" : "#888",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              {isActive ? (isAsc ? "↑" : "↓") : "↑"}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {fetchOrders ? (
                <SkeletonLoader columns={simpleColumns} rowCount={5} />
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "calc(50vh - 100px)",
                      }}
                    >
                      <Image
                        src="/images/no-data.png"
                        alt="No data"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                        }}
                        width={200}
                        height={200}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ padding: "10px" }}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* NOTE */}
        <Box mt={3}>
          <TextField
            label="Note"
            sx={{ width: "50%" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Box>

        <Dialog open={modalOpen} onClose={handleCloseModal}>
          <DialogTitle>Select Delivery Date</DialogTitle>
          <DialogContent>
            <StyledDayPicker>
              <DayPicker
                mode="single"
                selected={singleDate}
                onSelect={setSingleDate}
                showOutsideDays
                defaultMonth={singleDate || new Date()}
                modifiersClassNames={{
                  selected: "rdp-day_selected",
                }}
              />
            </StyledDayPicker>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (selectedRow && singleDate) {
                  const formattedDate = formatDateLocal(singleDate);
                  await updateExpectedDate(selectedRow.order_id, formattedDate);
                  handleCloseModal();
                }
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* order receive */}
      <Drawer
        anchor="right"
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        sx={{
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h4" fontWeight={700}>
              Order {order?.order_id || ""}
            </Typography>
          </Box>

          <Stack spacing={2}>
            <Card
              sx={{
                borderRadius: "15px",
                boxShadow: (theme) => theme.shadows[9],
              }}
            >
              <Box p={2}>
                <Typography>Store: {order?.store_name || ""} </Typography>
                <Typography>
                  Supplier: {supplierIdsFromPO.join(", ")}
                </Typography>
                <Typography>Items Qty: {order?.order_qty} </Typography>
                <Typography>Receive On: {order?.date} </Typography>
                <Typography
                  display={"flex"}
                  gap={1}
                  alignItems={"center"}
                  justifyContent={"space-between"}
                >
                  <Typography display={"flex"} gap={1}>
                    Status:
                    <Typography
                      color={order?.status_color}
                      variant="h5"
                      fontWeight={600}
                    >
                      {order?.status_text}{" "}
                    </Typography>
                  </Typography>
                  <IconButton
                    color="error"
                    onClick={async (e) => {
                      e.stopPropagation();

                      try {
                        await api.post(
                          `purchase-orders/invoice?company_id=${user.company_id}&id=${order?.id}`,
                        );

                        const res = await api.get(
                          `purchase-orders/get?company_id=${user.company_id}&id=${order?.id}`,
                        );

                        if (res.data.IsSuccess) {
                          const invoiceUrl = res.data.info[0]?.invoice;

                          if (!invoiceUrl) {
                            return;
                          }

                          window.open(
                            invoiceUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }
                      } catch (error) {
                        console.error("Failed to open invoice:", error);
                      } finally {
                      }
                    }}
                  >
                    <IconFileTypePdf size={24} />
                  </IconButton>
                </Typography>
              </Box>
            </Card>
            {products?.map((item) => (
              <Box
                key={item.product_id}
                alignItems={"start"}
                display={"flex"}
                gap={1}
                p={2}
                border="1px solid #eee"
                borderRadius={2}
              >
                <CustomCheckbox
                  checked={selectedRowIds.has(item.product_id)}
                  disabled={item.receive_now <= 0}
                  onChange={(e) => {
                    setSelectedRowIds((prev) => {
                      const updated = new Set(prev);

                      if (e.target.checked) {
                        updated.add(item.product_id);
                      } else {
                        updated.delete(item.product_id);
                      }

                      return updated;
                    });
                  }}
                />
                <Box>
                  <Image
                    src={item.image_url || "/images/products/product.svg"}
                    alt="Product"
                    height={50}
                    width={50}
                  />
                </Box>
                <Box ml={3} width={"100%"}>
                  <Typography variant="h6" fontWeight={600} mb={1}>
                    {item.short_name}
                  </Typography>
                  <Typography variant="h6" mb={1}>
                    {item.uuid}
                  </Typography>
                  <Fab
                    size="small"
                    onClick={() => {
                      setProducts((prev) =>
                        prev.map((p) =>
                          p.product_id === item.product_id
                            ? {
                                ...p,
                                receive_now: Math.max(0, p.receive_now - 1),
                              }
                            : p,
                        ),
                      );

                      setSelectedRowIds((prev) => {
                        const updated = new Set(prev);

                        if (item.receive_now - 1 <= 0) {
                          updated.delete(item.product_id);
                        }

                        return updated;
                      });
                    }}
                  >
                    <IconMinus size={16} />
                  </Fab>
                  <TextField
                    size="small"
                    value={item.receive_now}
                    inputProps={{
                      style: { textAlign: "center" },
                    }}
                    sx={{ width: 60, ml: 1 }}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (!/^\d*$/.test(value)) return;

                      const num = Number(value || 0);

                      setProducts((prev) =>
                        prev.map((p) => {
                          if (p.product_id !== item.product_id) return p;

                          if (num > p.receive_now) return p;

                          return {
                            ...p,
                            receive_now: Math.max(0, num),
                          };
                        }),
                      );
                    }}
                  />

                  <Box display={"flex"} gap={1} alignItems={"center"}>
                    <Typography mt={1} variant="h6">
                      Delivered: {item?.delivered_qty}{" "}
                    </Typography>
                    <Typography mt={1} variant="h6">
                      Cancelled: {item?.cancelled_qty}{" "}
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter note..."
                    inputProps={{ maxLength: 50 }}
                    value={item.note || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProducts((prev) =>
                        prev.map((p) =>
                          p.product_id === item.product_id
                            ? { ...p, note: value }
                            : p,
                        ),
                      );
                    }}
                  />
                  <DropzoneComponent item={item} setProducts={setProducts} />
                  <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                    {item.images?.map((img: any, i: number) => (
                      <Box key={i} position="relative">
                        <img
                          src={img.preview}
                          alt="preview"
                          width={50}
                          height={50}
                          style={{ borderRadius: 6, objectFit: "cover" }}
                        />

                        {/* Remove image */}
                        <IconButton
                          size="small"
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            background: "#fff",
                          }}
                          onClick={() => {
                            setProducts((prev) =>
                              prev.map((p) =>
                                p.product_id === item.product_id
                                  ? {
                                      ...p,
                                      images: p.images.filter(
                                        (_: any, idx: number) => idx !== i,
                                      ),
                                    }
                                  : p,
                              ),
                            );
                          }}
                        >
                          ✕
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Buttons */}
        <Box mt={2} display="flex" gap={2}>
          {order?.status !== 5 && (
            <Button
              color="error"
              variant="contained"
              sx={{ borderRadius: 3 }}
              className="drawer_buttons"
              onClick={async () => {
                setReceiveModalOpen(false);
                await handleCancel();
              }}
              disabled={isSaving || selectedRowIds.size === 0}
            >
              {isSaving ? "Saving..." : "Cancel"}
            </Button>
          )}
        </Box>
      </Drawer>
    </Drawer>
  );
};

export default ReceivePurchaseOrder;
