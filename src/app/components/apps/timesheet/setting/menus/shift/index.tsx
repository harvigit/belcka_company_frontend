import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Card,
  CardContent,
  Typography,
  Drawer,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import api from "@/utils/axios";
import ShiftSettings from "./shift-settings";
import {
  IconDotsVertical,
  IconNotes,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import toast from "react-hot-toast";
import { IconX } from "@tabler/icons-react";
import Link from "next/link";
import ArchiveShifts from "./archive";

interface Shift {
  id: number;
  name: string;
  days: string;
  time: string;
  break: string;
  enabled: boolean;
}

interface ShiftListsProps {
  onClose?: () => void;
}

const ShiftLists: React.FC<ShiftListsProps> = ({ onClose }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftSidebar, setShiftSidebar] = useState(false);
  const [shiftId, setShiftId] = useState<number | undefined>(undefined);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [archiveDrawerOpen, setarchiveDrawerOpen] = useState(false);

  const fetchShifts = async () => {
    try {
      const response = await api.get("/setting/get-shift-settings");
      if (response.data?.IsSuccess) {
        const transformedShifts: Shift[] = response.data.info.map(
          (shift: any) => ({
            id: shift.id,
            name: shift.name,
            days:
              shift.days
                .filter((day: any) => day.status)
                .map(
                  (day: any) =>
                    day.name.charAt(0).toUpperCase() + day.name.slice(1)
                )
                .join(",") || "Every weekday",
            time: `${shift.start_time} - ${shift.end_time}`,
            break:
              shift.shift_breaks.length > 0
                ? `${shift.shift_breaks[0].break_start_time} - ${shift.shift_breaks[0].break_end_time}`
                : "No break",
            enabled: shift.status,
          })
        );
        setShifts(transformedShifts);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const toggleShift = async (id: number) => {
    const updatedShifts = shifts.map((shift) =>
      shift.id === id ? { ...shift, enabled: !shift.enabled } : shift
    );
    setShifts(updatedShifts);

    const enabled = updatedShifts.find((shift) => shift.id === id)?.enabled;

    try {
      await api.post("/setting/change-shift-status", {
        shift_id: id,
        status: enabled,
      });
    } catch (error) {
      console.error("Error toggling shift status:", error);
      setShifts(shifts);
    }
  };

  const filteredShifts = shifts.filter((shift) =>
    shift.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditShiftSidebar = (shiftId: number) => {
    setShiftId(shiftId);
    setShiftSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShiftSidebar(false);
    setShiftId(undefined);
    fetchShifts();
  };

  const handleAddShift = () => {
    setShiftId(undefined);
    setShiftSidebar(true);
  };
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleArchive = async () => {
    try {
      const payload = {
        shift_id: shiftId,
      };
      const response = await api.post(`shift/archive`, payload);
      if (response.data.IsSuccess) {
        toast.success(response.data.message);
      }
      setOpenDeleteModal(false);
      fetchShifts();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2, position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "600px",
              height: "50px",
            }}
          >
            <TextField
              fullWidth
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: "12px" }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                ),
              }}
              sx={{
                mb: 2,
                borderRadius: "25px",
                bgcolor: "background.paper",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "25px",
                },
                width: "70%",
              }}
            />
            <Button
              variant="outlined"
              color="primary"
              onClick={handleAddShift}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                py: 0.5,
                fontWeight: 500,
                boxShadow: "none",
                height: "47px",
              }}
            >
              <IconPlus size={18} />
              Add Shift
            </Button>
            <IconButton
              sx={{ margin: "0px" }}
              id="basic-button"
              aria-controls={openMenu ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={openMenu ? "true" : undefined}
              onClick={handleClick}
            >
              <IconDotsVertical width={18} />
            </IconButton>
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
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setarchiveDrawerOpen(true);
                  }}
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
                    <IconNotes width={18} />
                  </ListItemIcon>
                  Archive List
                </Link>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Scrollable Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          bgcolor: "background.default",
          // Custom scrollbar styling
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f1f1",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#c1c1c1",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#a8a8a8",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignItems: "center",
          }}
        >
          {filteredShifts.map((shift) => (
            <Card
              onClick={() => handleEditShiftSidebar(shift.id)}
              key={shift.id}
              sx={{
                borderRadius: 2,
                boxShadow: 1,
                border: "1px solid",
                borderColor: "divider",
                width: "100%",
                maxWidth: "600px",
                margin: "0 auto",
                "&:hover": {
                  cursor: "pointer",
                  boxShadow: 2,
                },
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: 2,
                  wordBreak: "break-word",
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    pr: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ mb: 0.5, textTransform: "capitalize" }}
                  >
                    {shift.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {shift.days}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Shift:</strong> {shift.time}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Break:</strong> {shift.break}
                  </Typography>
                </Box>
                <Box display={"block"}>
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShiftId(shift.id);
                      setOpenDeleteModal(true);
                    }}
                  >
                    <IconTrash />
                  </IconButton>

                  <IOSSwitch
                    checked={shift.enabled}
                    onChange={(e) => {
                      toggleShift(shift.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    color="primary"
                    aria-label={`Toggle ${shift.name} shift`}
                    sx={{
                      mt: 1,
                      ml: 2,
                      flexShrink: 0,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}

          {filteredShifts.length === 0 && searchQuery && (
            <Typography
              sx={{ textAlign: "center", color: "text.secondary", py: 4 }}
            >
              No shifts found matching "{searchQuery}"
            </Typography>
          )}

          {filteredShifts.length === 0 && !searchQuery && (
            <Typography
              sx={{ textAlign: "center", color: "text.secondary", py: 4 }}
            >
              No shifts available. Click "Add Shift" to create one.
            </Typography>
          )}
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={shiftSidebar}
        onClose={handleCloseSidebar}
        sx={{
          "& .MuiDrawer-paper": {
            width: 500,
            boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
          },
        }}
      >
        <ShiftSettings
          shiftId={shiftId}
          onSaveSuccess={handleCloseSidebar}
          onClose={handleCloseSidebar}
        />
      </Drawer>
      {/* archive shift */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>
          <Typography color="GrayText" fontWeight={700}>
            Archive Confirmation
          </Typography>
          <IconButton
            onClick={() => setOpenDeleteModal(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 8,
              backgroundColor: "transparent",
            }}
          >
            <IconX size={40} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to archive this shift?</Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenDeleteModal(false)}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>

          <Button variant="outlined" color="error" onClick={handleArchive}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive task list */}
      <ArchiveShifts
        open={archiveDrawerOpen}
        onClose={() => setarchiveDrawerOpen(false)}
        onWorkUpdated={fetchShifts}
      />
    </Box>
  );
};

export default ShiftLists;
