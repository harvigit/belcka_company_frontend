"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Autocomplete,
  Tooltip,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconLayersIntersect,
  IconArrowsMaximize,
  IconArrowsMinimize,
} from "@tabler/icons-react";
import {
  SurveyRoom,
  SurveyItem,
  SurveyGroupOption,
  SurveyElementOption,
} from "../../types";

interface Step3ConfigureProps {
  rooms: SurveyRoom[];
  setRooms: React.Dispatch<React.SetStateAction<SurveyRoom[]>>;
  availableGroups: SurveyGroupOption[];
  availableElements: SurveyElementOption[];
  templateName?: string;
  isTemplateMode: boolean;
}

export default function Step3Configure({
  rooms,
  setRooms,
  availableGroups,
  availableElements,
  templateName,
  isTemplateMode,
}: Step3ConfigureProps) {
  // Accordion expanded state
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    rooms.forEach((r) => {
      initial[String(r.id)] = true; // Default all expanded
    });
    return initial;
  });

  // Editing room name inline
  const [editingRoomId, setEditingRoomId] = useState<string | number | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");

  // Dialog: Add Room
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState<number | null>(null);
  const [customRoomName, setCustomRoomName] = useState("");

  // Dialog: Add Element to specific room
  const [addElementRoomId, setAddElementRoomId] = useState<string | number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);

  const toggleAccordion = (roomId: string | number) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [String(roomId)]: !prev[String(roomId)],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    rooms.forEach((r) => {
      next[String(r.id)] = true;
    });
    setExpandedRooms(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    rooms.forEach((r) => {
      next[String(r.id)] = false;
    });
    setExpandedRooms(next);
  };

  // Start editing a room name
  const startEditRoomName = (room: SurveyRoom) => {
    setEditingRoomId(room.id);
    setEditingRoomName(room.name);
  };

  const saveEditRoomName = (roomId: string | number) => {
    if (!editingRoomName.trim()) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, name: editingRoomName.trim() } : r,
      ),
    );
    setEditingRoomId(null);
    setEditingRoomName("");
  };

  // Remove a room
  const handleRemoveRoom = (roomId: string | number) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  // Remove an element from a room
  const handleRemoveElement = (roomId: string | number, itemId: string | number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          items: r.items.filter((item) => item.id !== itemId),
        };
      }),
    );
  };

  // Add Room from dialog
  const handleConfirmAddRoom = () => {
    if (selectedGroupToAdd) {
      // Find group in availableGroups
      const group = availableGroups.find((g) => g.id === selectedGroupToAdd);
      if (group) {
        const newRoom: SurveyRoom = {
          id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: customRoomName.trim() || group.name,
          group_id: group.id,
          sort_order: rooms.length,
          items: (group.elements || []).map((el) => ({
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            element_id: el.id,
            name: el.name,
            output_unit: el.output_unit,
          })),
        };
        setRooms((prev) => [...prev, newRoom]);
        setExpandedRooms((prev) => ({ ...prev, [String(newRoom.id)]: true }));
      }
    } else if (customRoomName.trim()) {
      // Create empty custom room
      const newRoom: SurveyRoom = {
        id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: customRoomName.trim(),
        group_id: null,
        sort_order: rooms.length,
        items: [],
      };
      setRooms((prev) => [...prev, newRoom]);
      setExpandedRooms((prev) => ({ ...prev, [String(newRoom.id)]: true }));
    }

    setAddRoomDialogOpen(false);
    setSelectedGroupToAdd(null);
    setCustomRoomName("");
  };

  // Add Element to Room from dialog
  const handleConfirmAddElement = () => {
    if (!addElementRoomId || !selectedElementId) return;

    const el = availableElements.find((e) => e.id === selectedElementId);
    if (!el) return;

    const newItem: SurveyItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      element_id: el.id,
      name: el.name,
      output_unit: el.output_unit,
      dimension_1_name: el.dimension_1_name,
      dimension_1_unit: el.dimension_1_unit,
      dimension_2_name: el.dimension_2_name,
      dimension_2_unit: el.dimension_2_unit,
      dimension_3_name: el.dimension_3_name,
      dimension_3_unit: el.dimension_3_unit,
      dimension_4_name: el.dimension_4_name,
      dimension_4_unit: el.dimension_4_unit,
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== addElementRoomId) return r;
        return {
          ...r,
          items: [...r.items, newItem],
        };
      }),
    );

    setAddElementRoomId(null);
    setSelectedElementId(null);
  };

  const totalElements = rooms.reduce((acc, r) => acc + r.items.length, 0);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Step 3: Configure Rooms & Elements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isTemplateMode && templateName
              ? `Loaded from template "${templateName}". Customise rooms and inspection elements for this specific survey.`
              : "Define the property rooms and inspection elements required for this survey."}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="text"
            startIcon={<IconArrowsMaximize size={16} />}
            onClick={handleExpandAll}
          >
            Expand All
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={<IconArrowsMinimize size={16} />}
            onClick={handleCollapseAll}
          >
            Collapse All
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={18} />}
            onClick={() => setAddRoomDialogOpen(true)}
          >
            Add Room / Area
          </Button>
        </Stack>
      </Stack>

      {/* Scope Summary Badge */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Chip
          label={`${rooms.length} Rooms / Areas`}
          color="primary"
          variant="filled"
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`${totalElements} Total Elements`}
          color="secondary"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <Box
          p={6}
          textAlign="center"
          bgcolor="#f8fafc"
          borderRadius={2}
          border="1px dashed #cbd5e1"
        >
          <IconLayersIntersect size={40} color="#94a3b8" />
          <Typography variant="subtitle1" fontWeight={600} mt={1.5} mb={0.5}>
            No rooms or areas added yet
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={400} mx="auto" mb={2}>
            Add standard rooms from your survey groups library or create custom rooms to begin configuring your scope.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={18} />}
            onClick={() => setAddRoomDialogOpen(true)}
          >
            Add Room / Area
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {rooms.map((room, index) => {
            const isExpanded = expandedRooms[String(room.id)] ?? true;
            const isEditing = editingRoomId === room.id;

            return (
              <Accordion
                key={room.id}
                expanded={isExpanded}
                onChange={() => toggleAccordion(room.id)}
                variant="outlined"
                sx={{
                  borderRadius: "8px !important",
                  "&:before": { display: "none" },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  component="div"
                  expandIcon={<IconChevronDown size={20} />}
                  sx={{
                    bgcolor: isExpanded ? "#f8fafc" : "background.paper",
                    px: 2.5,
                    py: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                    pr={1}
                    onClick={(e) => {
                      if (isEditing) e.stopPropagation();
                    }}
                  >
                    {/* Room Name or Inline Editor */}
                    <Stack direction="row" alignItems="center" spacing={1.5} flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        #{index + 1}
                      </Typography>

                      {isEditing ? (
                        <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                          <TextField
                            size="small"
                            value={editingRoomName}
                            onChange={(e) => setEditingRoomName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditRoomName(room.id);
                              if (e.key === "Escape") setEditingRoomId(null);
                            }}
                            autoFocus
                            sx={{ width: 220 }}
                          />
                          <IconButton
                            component="span"
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEditRoomName(room.id);
                            }}
                          >
                            <IconCheck size={18} />
                          </IconButton>
                          <IconButton
                            component="span"
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoomId(null);
                            }}
                          >
                            <IconX size={18} />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {room.name}
                          </Typography>
                          <Tooltip title="Rename Room">
                            <IconButton
                              component="span"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditRoomName(room);
                              }}
                            >
                              <IconEdit size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}

                      <Chip
                        label={`${room.items.length} elements`}
                        size="small"
                        color={room.items.length > 0 ? "default" : "warning"}
                        sx={{ fontSize: "0.75rem" }}
                      />
                    </Stack>

                    {/* Room Actions */}
                    <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        component="span"
                        size="small"
                        variant="outlined"
                        startIcon={<IconPlus size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddElementRoomId(room.id);
                          setSelectedElementId(null);
                        }}
                      >
                        Add Element
                      </Button>
                      <Tooltip title="Remove Room">
                        <IconButton
                          component="span"
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRoom(room.id);
                          }}
                        >
                          <IconTrash size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 0 }}>
                  <Divider />
                  {room.items.length === 0 ? (
                    <Box
                      p={3}
                      textAlign="center"
                      bgcolor="background.paper"
                    >
                      <Typography variant="body2" color="text.secondary" mb={1.5} fontStyle="italic">
                        No elements in this room yet. Add elements for the surveyor to inspect.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<IconPlus size={16} />}
                        onClick={() => {
                          setAddElementRoomId(room.id);
                          setSelectedElementId(null);
                        }}
                      >
                        Add Element
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ overflowX: "auto" }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: "grey.50" }}>
                          <TableRow>
                            <TableCell sx={{ width: 50, py: 1.25, fontWeight: 700, fontSize: "0.75rem" }}>
                              #
                            </TableCell>
                            <TableCell sx={{ width: "35%", py: 1.25, fontWeight: 700, fontSize: "0.75rem" }}>
                              ELEMENT NAME
                            </TableCell>
                            <TableCell sx={{ width: 140, py: 1.25, fontWeight: 700, fontSize: "0.75rem" }}>
                              OUTPUT UNIT
                            </TableCell>
                            <TableCell sx={{ py: 1.25, fontWeight: 700, fontSize: "0.75rem" }}>
                              DIMENSION SPECIFICATIONS
                            </TableCell>
                            <TableCell align="right" sx={{ width: 80, py: 1.25, fontWeight: 700, fontSize: "0.75rem" }}>
                              ACTION
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {room.items.map((item, itemIdx) => {
                            const dims = [
                              item.dimension_1_name,
                              item.dimension_2_name,
                              item.dimension_3_name,
                              item.dimension_4_name,
                            ].filter(Boolean);

                            return (
                              <TableRow key={item.id} hover>
                                <TableCell sx={{ py: 1.25, color: "text.secondary", fontWeight: 600 }}>
                                  {itemIdx + 1}
                                </TableCell>
                                <TableCell sx={{ py: 1.25 }}>
                                  <Typography variant="body2" fontWeight={700}>
                                    {item.name}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1.25 }}>
                                  {item.output_unit ? (
                                    <Chip
                                      label={item.output_unit}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: "0.75rem", height: 22, fontWeight: 600 }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ py: 1.25 }}>
                                  {dims.length > 0 ? (
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                                      {dims.map((d, dIdx) => (
                                        <Chip
                                          key={dIdx}
                                          label={d}
                                          size="small"
                                          variant="filled"
                                          sx={{
                                            bgcolor: "primary.light",
                                            color: "primary.main",
                                            fontWeight: 600,
                                            fontSize: "0.7rem",
                                            height: 20,
                                          }}
                                        />
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                      Standard inspection
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.25 }}>
                                  <Tooltip title="Remove Element from this room">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleRemoveElement(room.id, item.id)}
                                    >
                                      <IconTrash size={16} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      {/* Dialog: Add Room / Area */}
      <Dialog
        open={addRoomDialogOpen}
        onClose={() => setAddRoomDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Room / Area</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Select a standard group from your Survey Settings or specify a custom room name.
          </Typography>

          <Stack spacing={3}>
            {/* Standard Groups */}
            <TextField
              select
              fullWidth
              label="Select Standard Group (Recommended)"
              value={selectedGroupToAdd || ""}
              onChange={(e) => {
                const val = Number(e.target.value) || null;
                setSelectedGroupToAdd(val);
                if (val) {
                  const grp = availableGroups.find((g) => g.id === val);
                  if (grp) setCustomRoomName(grp.name);
                }
              }}
              helperText="Loads standard elements linked to this group in Survey Settings"
            >
              <MenuItem value="">-- None (Blank Custom Room) --</MenuItem>
              {availableGroups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name} ({g.elements?.length || 0} elements)
                </MenuItem>
              ))}
            </TextField>

            <Divider>OR</Divider>

            {/* Custom Room Name */}
            <TextField
              fullWidth
              label="Room / Area Display Name"
              placeholder="e.g. Master Bedroom, Living Room, Rear Garden, Hallway"
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              helperText="The survey-specific room label shown to the surveyor"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddRoomDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!selectedGroupToAdd && !customRoomName.trim()}
            onClick={handleConfirmAddRoom}
          >
            Add Room
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Element to Room */}
      <Dialog
        open={Boolean(addElementRoomId)}
        onClose={() => setAddElementRoomId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Element to Room</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Choose an element from your Elements Library to add to this room.
          </Typography>

          <Autocomplete
            options={availableElements}
            getOptionLabel={(option) => `${option.name} ${option.output_unit ? `(${option.output_unit})` : ""}`}
            onChange={(_, val) => setSelectedElementId(val?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Survey Elements"
                placeholder="e.g. Wall, Window, Ceiling, Radiator..."
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddElementRoomId(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!selectedElementId}
            onClick={handleConfirmAddElement}
          >
            Add Element
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
