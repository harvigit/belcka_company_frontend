import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  CircularProgress,
  MenuItem,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import "react-phone-input-2/lib/material.css";
import PhoneInput from "react-phone-input-2";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import { Grid, Stack } from "@mui/system";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import { AxiosResponse } from "axios";
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
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

interface SupplierFormData {
  id: number;
  company_id: any;
  name: string;
  email?: string;
  company_name?: string;
  street?: string;
  location?: string;
  town?: string;
  postcode?: string;
  address?: string;
  phone?: string;
  extension?: string;
  status: boolean;
  store_manager_id?: number | null;
  manager_name?: string;
  product_ids?: string;
}

interface EditStoreProps {
  open: boolean;
  companyId: number | null;
  supplierId: number | null;
  onClose: () => void;
  isSaving: boolean;
  formData: SupplierFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierFormData>>;
  EditStore: (e: React.FormEvent) => void;
}

const EditStore: React.FC<EditStoreProps> = ({
  open,
  onClose,
  companyId,
  supplierId,
  isSaving,
  EditStore,
  formData,
  setFormData,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("+44");
  const [postcodeQuery, setPostcodeQuery] = useState(formData.postcode || "");
  const [addressOptions, setAddressOptions] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(
    formData.address || "",
  );
  const [data, setData] = useState<any[]>([]);
  const [fetchProject, setFetchProject] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<any>([]);

  const isIEPostcode = (v: string) =>
    /^(D6W|[AC-FHKNPRTV-Y]\d{2})\s?[A-Z0-9]{4}$/i.test(v.trim());

  const isAUPostcode = (v: string) => /^\d{4}$/.test(v.trim());
  const isNZPostcode = (v: string) => /^\d{4}$/.test(v.trim());

  const getCountry = (v: string) => {
    if (isIEPostcode(v)) return "IE";
    if (isAUPostcode(v)) return "AU";
    if (isNZPostcode(v)) return "NZ";
    return "UK";
  };
  const fetchAddresses = async (query: string) => {
    try {
      setLoadingAddresses(true);
      const country = getCountry(query);
      const res = await fetch(
        `https://ws.postcoder.com/pcw/${process.env.NEXT_PUBLIC_POSTCODER_KEY}/address/${country}/${encodeURIComponent(
          query,
        )}?format=json`,
      );
      const data = await res.json();
      setAddressOptions(data || []);
    } catch {
      setAddressOptions([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (postcodeQuery.length >= 3) fetchAddresses(postcodeQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [postcodeQuery]);

  const fetchUsers = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${companyId}`,
      );
      if (res.data) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  // Fetch product
  const fetchProducts = async () => {
    setFetchProject(true);
    try {
      const res: AxiosResponse<any> = await api.get(
        `products/get?company_id=${companyId}`,
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    } finally {
      setFetchProject(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProducts();
  }, [open == true]);

  useEffect(() => {
    if (open && formData.postcode) {
      console.log(formData.address);
      setPostcodeQuery(formData.postcode);
      fetchAddresses(formData.postcode);
    }
  }, [open]);

  const fetchStore = async () => {
    if (!supplierId || !companyId) return;
    try {
      const res = await api.get(
        `stores/get?company_id=${companyId}&id=${supplierId}`,
      );
      if (res.data?.info) {
        const data = res.data.info[0];
        setFormData({
          id: data.id,
          company_id: data.company_id,
          name: data.name,
          email: data.email || "",
          company_name: data.company_name || "",
          street: data.street || "",
          location: data.location || "",
          town: data.town || "",
          postcode: data.postcode || "",
          phone: data.phone || "",
          extension: data.extension || "+44",
          store_manager_id: data.manager_id || 0,
          manager_name: data.manager_name || "",
          address: data.address || "",
          status: data.status,
        });
        setSelectedAddress(data.address || "");

        if (data.product_ids) {
          const productIds = data.product_ids.split(",").map(Number);
          setSelectedRowIds(new Set(productIds));
        }
        setPostcodeQuery(data.postcode);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
  };
  const selectedManager =
    users.find((u) => u.id === formData.store_manager_id) || null;

  useEffect(() => {
    if (open) {
      fetchStore();
    }
  }, [open, supplierId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      return item;
    });
  }, [data]);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("image_url", {
      id: "Image",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />
          <Typography variant="subtitle2" fontWeight="inherit">
            Image
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const showCheckbox = isChecked || hoveredRow === item.id;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 1 }}
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedRowIds(newSelected);
                const ids = Array.from(newSelected);
                setFormData({
                  ...formData,
                  product_ids: ids.join(","),
                });
              }}
              sx={{
                opacity: showCheckbox ? 1 : 0,
                pointerEvents: showCheckbox ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            />
            <Image
              src={item.image_url || "/images/products/product.svg"}
              alt={"Product image"}
              width={50}
              height={50}
            />
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.uuid, {
      id: "uuid",
      header: () => "UUId",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.uuid ? item.uuid : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.short_name, {
      id: "short_name",
      header: () => "Short Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.short_name ? item.short_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredData,
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
          borderRadius: 0,
          height: "95vh",
          boxShadow: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          overflow: "hidden",
        },
      }}
    >
      <Box display="flex" justifyContent={"flex-end"} m={1} mb={0}>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          px: 2,
        }}
      >
        <Grid container spacing={2} height="100%">
          <Grid
            size={{ xs: 12, md: 4 }}
            display="flex"
            flexDirection="column"
            height="100%"
          >
            <Box
              display="flex"
              alignItems="center"
              p={1}
              justifyContent="space-between"
            >
              <Box display="flex" alignItems="center">
                <IconButton onClick={onClose}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={700}>
                  Edit Store
                </Typography>
              </Box>
              <IOSSwitch
                checked={Boolean(formData.status)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.checked,
                  }))
                }
                color="success"
              />
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", pr: 1, p: 2, pt: 0 }}>
              <form
                className="task-form"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              >
                <Box className="form_inputs">
                  <Typography variant="body1">Store Name</Typography>
                  <CustomTextField
                    name="name"
                    fullWidth
                    value={formData.name}
                    onChange={handleChange}
                    inputProps={{ maxLength: 50 }}
                    sx={{ mb: 2 }}
                  />

                  <PhoneInput
                    country={"gb"}
                    value={(formData.extension || "") + (formData.phone || "")}
                    onChange={(value, country: any) => {
                      if (!country) return;

                      const dialCode = "+" + country.dialCode;

                      let localNumber = value.startsWith(country.dialCode)
                        ? value.slice(country.dialCode.length)
                        : value;

                      localNumber = localNumber.replace(/\D/g, "");
                      localNumber = localNumber.slice(0, 10);

                      setPhone(localNumber);
                      setExtension(dialCode);

                      setFormData((prev) => ({
                        ...prev,
                        phone: localNumber,
                        extension: dialCode,
                        phone_with_extension: localNumber
                          ? dialCode + localNumber
                          : "",
                      }));
                    }}
                    inputStyle={{
                      width: "100%",
                      height: "47px",
                      borderColor: "#c0d1dc9c",
                    }}
                    enableSearch
                  />

                  <Typography variant="body1" mt={2}>
                    Email
                  </Typography>
                  <CustomTextField
                    fullWidth
                    name="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                  />

                  <Grid container spacing={2} mt={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Typography>Postcode</Typography>
                      <CustomTextField
                        fullWidth
                        value={postcodeQuery}
                        onChange={(e: any) => {
                          setPostcodeQuery(e.target.value);
                          setFormData((p) => ({
                            ...p,
                            postcode: e.target.value,
                          }));
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 9 }}>
                      <Typography>Select Address</Typography>
                      <Autocomplete
                        fullWidth
                        freeSolo
                        disableCloseOnSelect
                        options={addressOptions || []}
                        value={selectedAddress}
                        loading={loadingAddresses}
                        getOptionLabel={(o: any) =>
                          typeof o === "string"
                            ? o
                            : o.summaryline ||
                              `${o.addressline1}, ${o.posttown}`
                        }
                        isOptionEqualToValue={(o: any, v: any) =>
                          typeof o !== "string" &&
                          typeof v !== "string" &&
                          o.addressline1 === v.addressline1 &&
                          o.postcode === v.postcode
                        }
                        onInputChange={(event, value, reason) => {
                          if (reason === "input") {
                            setPostcodeQuery(String(formData.postcode));
                          }
                        }}
                        onChange={(_, value) => {
                          if (!value) return;

                          if (typeof value === "string") {
                            setSelectedAddress(value);
                            setFormData((prev) => ({
                              ...prev,
                              street: value,
                              town: "",
                              postcode: "",
                              address: value,
                            }));
                          } else {
                            setSelectedAddress(value);
                            setFormData((prev) => ({
                              ...prev,
                              street: value.addressline1 || "",
                              town: value.posttown || "",
                              postcode: value.postcode || prev.postcode,
                              address: value.summaryline,
                            }));
                          }
                        }}
                        renderInput={(params) => (
                          <CustomTextField
                            {...params}
                            placeholder="Select or type address"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {loadingAddresses && (
                                    <CircularProgress size={18} />
                                  )}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                            sx={{
                              "& .MuiAutocomplete-inputRoot": {
                                flexWrap: "wrap",
                                alignItems: "flex-start",
                                minHeight: 40,
                                paddingTop: "10px",
                                paddingBottom: "10px",
                                paddingRight: "30px",
                              },
                              "& .MuiAutocomplete-tag": {
                                margin: "4px",
                                maxWidth: "100%",
                              },
                              "& .MuiAutocomplete-endAdornment": {
                                right: "8px",
                                top: "50%",
                                transform: "translateY(-50%)",
                              },
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                  <Box
                    display={"flex"}
                    justifyContent={"space-between"}
                    gap={2}
                  >
                    <Box width={"100%"}>
                      <Typography variant="body1" mt={2}>
                        Street
                      </Typography>
                      <CustomTextField
                        fullWidth
                        name="street"
                        value={formData.street || ""}
                        onChange={handleChange}
                      />
                    </Box>
                    <Box width={"100%"}>
                      <Typography variant="body1" mt={2}>
                        Town
                      </Typography>
                      <CustomTextField
                        fullWidth
                        name="town"
                        value={formData.town || ""}
                        onChange={handleChange}
                      />
                    </Box>
                  </Box>

                  <Typography variant="body1" mt={2}>
                    Location
                  </Typography>
                  <CustomTextField
                    fullWidth
                    name="location"
                    value={formData.location || ""}
                    onChange={handleChange}
                  />

                  <Typography variant="body1" mt={2}>
                    Store Manager
                  </Typography>

                  <Autocomplete
                    fullWidth
                    options={users}
                    value={selectedManager}
                    onChange={(_, newValue) => {
                      setFormData((prev) => ({
                        ...prev,
                        store_manager_id: newValue?.id || null,
                        manager_name: newValue?.name || "",
                      }));
                    }}
                    getOptionLabel={(option) => option?.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    renderInput={(params) => (
                      <CustomTextField
                        {...params}
                        placeholder="Select Manager"
                      />
                    )}
                  />
                </Box>
              </form>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
                mt: 2,
                mb: 2,
              }}
            >
              <Button
                color="primary"
                variant="contained"
                type="submit"
                onClick={EditStore}
                disabled={isSaving}
                sx={{ borderRadius: 3, width: "20%" }}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                color="inherit"
                onClick={onClose}
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: "transparent",
                  borderRadius: 3,
                  color: "GrayText",
                }}
              >
                Close
              </Button>
            </Box>
          </Grid>

          <Grid
            container
            spacing={2}
            height="calc(100vh - 100px)"
            display="flex"
            flexDirection="column"
            size={{ xs: 12, md: 8 }}
            sx={{
              overflowY: "auto",
              pl: 1,
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
              }}
            >
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
                                  header.column.id === "actions" ? 210 : "auto",
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
                                <Typography variant="subtitle2">
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
                    {fetchProject ? (
                      <SkeletonLoader
                        columns={simpleColumns}
                        rowCount={simpleColumns.length}
                      />
                    ) : data.length === 0 ? (
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
              {data.length ? <Divider /> : <></>}
            </Box>
            <Divider />
            <Stack
              gap={1}
              pr={3}
              pl={3}
              pb={3}
              alignItems="center"
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Typography color="textSecondary" className="f-14">
                  {table.getPrePaginationRowModel().rows.length} Rows
                </Typography>
              </Box>
              <Box
                sx={{
                  display: {
                    xs: "block",
                    sm: "flex",
                  },
                }}
                alignItems="center"
              >
                <Stack direction="row" alignItems="center">
                  <Typography color="textSecondary" className="f-14">
                    Page
                  </Typography>
                  <Typography
                    color="textSecondary"
                    className="f-14"
                    fontWeight={600}
                    ml={1}
                  >
                    {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                  </Typography>
                  <Typography color="textSecondary" ml={"3px"} className="f-14">
                    {" "}
                    | Entries :{" "}
                  </Typography>
                </Stack>
                <Stack
                  ml={"5px"}
                  direction="row"
                  alignItems="center"
                  color="textSecondary"
                >
                  <CustomSelect
                    className="custom-select"
                    value={table.getState().pagination.pageSize}
                    onChange={(e: { target: { value: any } }) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                  >
                    {[50, 100, 250, 500].map((pageSize) => (
                      <MenuItem key={pageSize} value={pageSize}>
                        {pageSize}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                  <IconButton
                    size="small"
                    sx={{ width: "30px" }}
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <IconChevronLeft />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ width: "30px" }}
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <IconChevronRight />
                  </IconButton>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Drawer>
  );
};

export default EditStore;
