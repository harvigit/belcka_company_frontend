import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  Avatar,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import api from "@/utils/axios";
import SearchIcon from "@mui/icons-material/Search";
import { debounce } from "lodash";

interface OtherProductFormProps {
  open: boolean;
  onClose: () => void;
  formData: any;
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  mode: "create" | "edit";
}

const OtherProductForm = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  mode,
}: OtherProductFormProps) => {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      const fetchResources = async () => {
        try {
          const res = await api.get("/expense/get-resources");
          if (res.data) {
            setAddresses(res.data.addresses || []);
            setProjects(res.data.projects || []);
          }
        } catch (err) {
          console.error("Failed to fetch resources", err);
        }
      };

      const fetchUsers = async () => {
        try {
          const res = await api.get(`user/list`);
          setUsers(res.data.info || []);
        } catch (error) {
          console.error("Failed to load users", error);
        }
      };

      fetchResources();
      fetchUsers();
    }
  }, [open]);

  const filteredAddresses = useMemo(() => {
    if (!formData.project_id) return [];
    return addresses.filter((addr) => {
      const matchProject = addr.project_id === Number(formData.project_id);
      const name = (addr.name || "").toLowerCase();
      const matchName = name.includes(searchTerm.toLowerCase());
      return matchProject && matchName;
    });
  }, [addresses, searchTerm, formData.project_id]);

  const handleSearchChange = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    [],
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          bgcolor: "white",
          width: "100%",
          minWidth: { xs: "320px", sm: "560px" },
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={1}
          py={1}
          borderBottom="1px solid #f0f0f0"
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <IconButton onClick={onClose} size="small">
              <IconX size={20} />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              {mode === "create" ? "Add Product" : "Edit Product"}
            </Typography>
          </Box>
        </Box>

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <Box
            px={3}
            py={3}
            display="flex"
            flexDirection="column"
            gap={3}
            sx={{ flex: 1, overflowY: "auto" }}
          >
            {/* User */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                User
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.user_id || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      user_id: e.target.value,
                    });
                  }}
                  displayEmpty
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#bbb",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#50ABFF",
                    },
                  }}
                  renderValue={(selected) => {
                    if (!selected)
                      return (
                        <Typography color="#999" component="span">
                          Select User
                        </Typography>
                      );
                    const user = users.find((u) => u.id === Number(selected));
                    return (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          src={user?.user_image || user?.image}
                          sx={{ width: 24, height: 24, fontSize: "12px" }}
                        >
                          {user?.first_name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography
                          component={"span"}
                          variant="body1"
                          className="f-14"
                          sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 250,
                            wordBreak: "break-word",
                          }}
                        >
                          {user?.first_name} {user?.last_name}
                        </Typography>
                      </Box>
                    );
                  }}
                >
                  <MenuItem value="" disabled>
                    <span style={{ color: "#999" }}>Select User</span>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          src={user?.user_image || user?.image}
                          sx={{ width: 24, height: 24, fontSize: "12px" }}
                        >
                          {user?.first_name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography
                          component={"span"}
                          variant="body1"
                          className="f-14"
                          sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 250,
                            wordBreak: "break-word",
                          }}
                        >
                          {user?.first_name} {user?.last_name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Product Name */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Product Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.product_name || ""}
                inputProps={{ maxLength: 50, style: { textAlign: "left" } }}
                onChange={(e) =>
                  setFormData({ ...formData, product_name: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#bbb" },
                    "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                  },
                }}
              />
            </Box>

            {/* Cost */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Cost
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.cost || ""}
                onChange={(e) => {
                  const value = e.target.value;

                  if (
                    value === "" ||
                    (/^\d{0,4}(\.\d{0,2})?$/.test(value) &&
                      Number(value) <= 1000)
                  ) {
                    setFormData({ ...formData, cost: value });
                  }
                }}
                inputProps={{ style: { textAlign: "left" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#bbb" },
                    "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                  },
                }}
              />
            </Box>

            {/* Qty */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Qty
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.qty || ""}
                onChange={(e) => {
                  const value = e.target.value;

                  if (
                    value === "" ||
                    (/^\d{0,4}(\.\d{0,2})?$/.test(value) &&
                      Number(value) <= 1234)
                  ) {
                    setFormData({ ...formData, qty: value });
                  }
                }}
                inputProps={{ style: { textAlign: "left" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#bbb" },
                    "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                  },
                }}
              />
            </Box>

            {/* Unit of Qty */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Unit of Qty
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. kg, pcs"
                value={formData.unit_of_qty || ""}
                onChange={(e) =>
                  setFormData({ ...formData, unit_of_qty: e.target.value })
                }
                inputProps={{ style: { textAlign: "left" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#bbb" },
                    "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                  },
                }}
              />
            </Box>

            {/* Supplier Name */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Supplier Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.supplier_name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name: e.target.value })
                }
                inputProps={{ style: { textAlign: "left" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#bbb" },
                    "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                  },
                }}
              />
            </Box>

            {/* Supplier Code */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Supplier Code
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Optional"
                value={formData.supplier_code || ""}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_code: e.target.value })
                }
                inputProps={{ style: { textAlign: "left" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#bbb" },
                    "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                  },
                }}
              />
            </Box>

            {/* Project */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Project
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.project_id || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      project_id: e.target.value,
                      address_id: "",
                    });
                  }}
                  displayEmpty
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#bbb",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#50ABFF",
                    },
                  }}
                  renderValue={(selected) => {
                    if (!selected)
                      return (
                        <Typography color="#999" component="span">
                          Select Project
                        </Typography>
                      );
                    const project = projects.find(
                      (u) => u.id === Number(selected),
                    );
                    return (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          component={"span"}
                          variant="body1"
                          className="f-14"
                          sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 250,
                            wordBreak: "break-word",
                          }}
                        >
                          {project?.name || selected}
                        </Typography>
                      </Box>
                    );
                  }}
                >
                  {projects.map((proj) => (
                    <MenuItem key={proj.id} value={proj.id.toString()}>
                      <Typography
                        component={"span"}
                        variant="body1"
                        className="f-14"
                        sx={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 250,
                          wordBreak: "break-word",
                        }}
                      >
                        {proj.name}
                      </Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Address */}
            <Box
              display="grid"
              gridTemplateColumns="140px 1fr"
              alignItems="center"
              gap={2}
            >
              <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                Address
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={formData.address_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address_id: e.target.value })
                  }
                  displayEmpty
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e0e0e0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#bdbdbd",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#50ABFF",
                    },
                  }}
                  MenuProps={{
                    PaperProps: { style: { maxHeight: 400 } },
                    autoFocus: false,
                  }}
                  renderValue={(selected) => {
                    if (!selected)
                      return (
                        <Typography color="#999" component="span">
                          Select Address
                        </Typography>
                      );
                    const address = addresses.find(
                      (u) => u.id === Number(selected),
                    );
                    return (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          component={"span"}
                          variant="body1"
                          className="f-14"
                          sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 250,
                            wordBreak: "break-word",
                          }}
                        >
                          {address?.name || selected}
                        </Typography>
                      </Box>
                    );
                  }}
                >
                  <Box
                    px={2}
                    py={1.5}
                    position="sticky"
                    top={0}
                    bgcolor="white"
                    zIndex={1}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search address"
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <SearchIcon sx={{ color: "#999", fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "#e0e0e0" },
                          "&:hover fieldset": { borderColor: "#bdbdbd" },
                          "&.Mui-focused fieldset": { borderColor: "#50ABFF" },
                        },
                      }}
                    />
                  </Box>
                  {filteredAddresses.length === 0 ? (
                    <MenuItem disabled>
                      <Typography color="text.secondary" component="span">
                        No address found
                      </Typography>
                    </MenuItem>
                  ) : (
                    filteredAddresses.map((adress) => (
                      <MenuItem key={adress.id} value={adress.id.toString()}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Typography
                            component={"span"}
                            variant="body1"
                            className="f-14"
                            sx={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 450,
                              wordBreak: "break-word",
                            }}
                          >
                            {adress.name}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {/* Static Footer */}
          <Box
            px={3}
            py={2}
            borderTop="1px solid #f0f0f0"
            display="flex"
            justifyContent="flex-start"
            bgcolor="white"
          >
            <Button
              variant="contained"
              color="primary"
              className="drawer_buttons"
              type="submit"
              disabled={isSaving}
              sx={{ borderRadius: 3 }}
            >
              {isSaving ? "Saving..." : mode === "create" ? "Submit" : "Update"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OtherProductForm;
