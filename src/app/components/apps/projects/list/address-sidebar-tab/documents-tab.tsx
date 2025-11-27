import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  IconButton,
  Stack,
  Typography,
  Badge,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import {
  IconDownload,
  IconFilter,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { Grid } from "@mui/system";

interface DocumentsTabProps {
  addressId: number;
  projectId: number;
  companyId: number;
}

export const DocumentsTab = ({
  addressId,
  projectId,
  companyId,
}: DocumentsTabProps) => {
  const [tabData, setTabData] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState<string>("");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number>();
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [attachmentsPayload, setAttachmentsPayload] = useState<{
    add: Record<string, { before: File[]; after: File[] }>;
    delete: Record<string, string[]>;
  }>({ add: {}, delete: {} });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleBoxClick = () => {
    fileInputRef.current?.click(); // Trigger file input click
  };
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [selectedImageType, setSelectedImageType] = useState<
    "before" | "after"
  >("before");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  useEffect(() => {
    if (addressId) fetchDocumentTabData();
  }, [addressId, projectId]);

  const fetchDocumentTabData = async () => {
    try {
      const res = await api.get(
        `address/address-document?address_id=${addressId}&company_id=${companyId}`
      );
      if (res.data?.isSuccess) setTabData(res.data.info || []);
      else setTabData([]);
    } catch (error) {
      console.error("Document fetch failed:", error);
      setTabData([]);
    }
  };

  const handleDownloadZip = async (taskIds: number[]) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${addressId}?taskIds=${taskIds.join(",")}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tasks_address_${addressId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const handleAddImage = (
    companyTaskId: number | string,
    recordId: string | number,
    files: FileList | null,
    type: "before" | "after"
  ) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const key = String(recordId);

    setSelectedTaskId(Number(companyTaskId));
    setAttachmentsPayload((prev) => ({
      ...prev,
      add: {
        ...prev.add,
        [key]: {
          ...prev.add[key],
          [type]: [...(prev.add[key]?.[type] || []), ...newFiles],
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleOpenDialog = (doc: any) => {
    setSelectedDoc(doc);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDoc(null);
  };

  const handleSaveImage = async () => {
    if (!selectedDoc) return;
    const key = String(selectedDoc.record_id);
    setSelectedTaskId(selectedDoc.id);

    setAttachmentsPayload((prev) => ({
      ...prev,
      add: {
        ...prev.add,
        [key]: {
          ...prev.add[key],
          [selectedImageType]: [
            ...(prev.add[key]?.[selectedImageType] || []),
            selectedDoc,
          ],
        },
      },
    }));
    await handleSaveChanges();
    setHasUnsavedChanges(true);
    setOpenDialog(false);
  };

  const handleDeleteImage = (
    companyTaskId: number | string,
    recordId: string | number,
    attachmentId: string | number
  ) => {
    setTabData((prev) =>
      prev.map((doc) =>
        doc.id === Number(companyTaskId)
          ? {
              ...doc,
              images: doc.images.filter((img: any) => img.id !== attachmentId),
            }
          : doc
      )
    );

    setAttachmentsPayload((prev) => ({
      ...prev,
      delete: {
        ...prev.delete,
        [String(recordId)]: [
          ...(prev.delete[String(recordId)] || []),
          String(attachmentId),
        ],
      },
    }));

    setSelectedTaskId(Number(companyTaskId));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    const formData = new FormData();
    formData.append("address_id", String(addressId));
    formData.append("company_id", String(companyId));
    if (selectedTaskId) {
      formData.append("company_task_id", String(selectedTaskId));
    }

    Object.entries(attachmentsPayload.add).forEach(([recordId, types]) => {
      if (!recordId) return;
      Object.entries(types).forEach(([type, files]) => {
        files.forEach((file) => {
          formData.append(`attachments[${recordId}][${type}]`, file);
        });
      });
    });

    Object.entries(attachmentsPayload.delete).forEach(([recordId, ids]) => {
      ids.forEach((id) => {
        formData.append("remove_attachment_ids[]", id);
        formData.append("record_id", recordId);
      });
    });

    try {
      setIsSaving(true);
      const res = await api.post("address/add-attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.IsSuccess || res.data?.isSuccess) {
        toast.success(res.data.message);
        await fetchDocumentTabData();
        setAttachmentsPayload({ add: {}, delete: {} });
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error("Attachment update failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckboxChange = (taskId: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleDownloadSelected = () => {
    const tasksWithImages = selectedTasks.filter((taskId) => {
      const task = tabData.find((doc) => doc.id === taskId);
      return task?.images?.length > 0;
    });
    if (tasksWithImages.length > 0) {
      handleDownloadZip(tasksWithImages);
    }
  };

  const hasTasksWithImages = useMemo(() => {
    return selectedTasks.some((taskId) => {
      const task = tabData.find((doc) => doc.id === taskId);
      return task?.images?.length > 0;
    });
  }, [selectedTasks, tabData]);

  const filteredData = useMemo(() => {
    const search = searchUser.trim().toLowerCase();
    if (!search) return tabData;
    return tabData.filter(
      (item) =>
        item.title?.toLowerCase().includes(search) ||
        item.created_at?.toLowerCase().includes(search)
    );
  }, [searchUser, tabData]);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        display={"flex"}
        justifyContent={"flex-end"}
      >
        <IconButton
          color="primary"
          onClick={handleDownloadSelected}
          disabled={!hasTasksWithImages}
          sx={{
            border: "1px solid",
            borderColor: hasTasksWithImages ? "primary.main" : "grey.400",
            borderRadius: "8px",
            padding: "8px",
          }}
        >
          <IconDownload size={18} />
        </IconButton>
        <Button variant="contained">
          <IconFilter width={18} />
        </Button>
      </Stack>
      {filteredData.length > 0 ? (
        filteredData.map((doc) => (
          <Box key={doc.id} mb={3} mt={1}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Checkbox
                  checked={selectedTasks.includes(doc.id)}
                  onChange={() => handleCheckboxChange(doc.id)}
                />
                <Typography variant="h6" fontWeight={600}>
                  {doc.title || `Document #${doc.record_id}`}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Badge
                  badgeContent={doc.images?.length || 0}
                  color="error"
                  overlap="circular"
                >
                  <IconButton
                    color="error"
                    onClick={() => handleDownloadZip([doc.id])}
                    sx={{
                      border: "1px solid",
                      borderColor: "error.main",
                      borderRadius: "8px",
                      display:
                        doc.images && doc.images.length === 0
                          ? "none"
                          : "inline-flex",
                    }}
                  >
                    <IconDownload size={20} />
                  </IconButton>
                </Badge>
                <IconButton
                  color="primary"
                  onClick={() => handleOpenDialog(doc)}
                  sx={{
                    border: "1px solid",
                    borderColor: "primary.main",
                    borderRadius: "8px",
                    display:
                      doc.images && doc.images.length === 0
                        ? "none"
                        : "inline-flex",
                  }}
                >
                  <IconPlus size={20} />
                </IconButton>
              </Stack>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {doc.images.map((image: any) => (
                <Box
                  key={image.id}
                  sx={{ width: "100px", position: "relative" }}
                >
                  <Card
                    sx={{
                      height: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    <Box
                      component="img"
                      src={image.image_url}
                      alt={`Image ${image.id}`}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        setHoveredImage(image.image_url);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoverPosition({
                          x: rect.right + 10,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredImage(null)}
                    />
                  </Card>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() =>
                      handleDeleteImage(
                        doc.id,
                        image.record_id ?? doc.record_id,
                        image.id
                      )
                    }
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: "white",
                      "&:hover": { backgroundColor: "#fee" },
                    }}
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Box>
              ))}
              {/* Hover Preview */}
              {hoveredImage && (
                <Box
                  sx={{
                    position: "fixed",
                    top: "20%",
                    left: "35%",
                    width: "25%",
                    maxHeight: "80vh",
                    zIndex: 2000,
                    border: "1px solid #ccc",
                    borderRadius: 2,
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    boxShadow: 3,
                  }}
                >
                  <Box
                    component="img"
                    src={hoveredImage}
                    alt="Preview"
                    sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        ))
      ) : (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="textSecondary">
            No documents found
          </Typography>
        </Box>
      )}

      {hasUnsavedChanges && (
        <Box mt={3} textAlign="center">
          <Button
            color="primary"
            variant="contained"
            onClick={handleSaveChanges}
            disabled={isSaving}
            sx={{ borderRadius: 3 }}
            className="drawer_buttons"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      )}

      {/* Dialog for selecting image and type */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth>
        <Box display={"flex"} justifyContent={"space-between"} mt={1} pr={1}>
          <DialogTitle>Choose Image Type</DialogTitle>
          <IconButton>
            <IconX size={22} onClick={handleCloseDialog} />
          </IconButton>
        </Box>
        <DialogContent>
          <Box
            mt={2}
            fontSize="12px"
            sx={{
              backgroundColor: "primary.light",
              color: "primary.main",
              padding: "25px",
              textAlign: "center",
              border: `1px dashed`,
              borderColor: "primary.main",
              borderRadius: 1,
              cursor: "pointer",
            }}
            onClick={handleBoxClick}
          >
            <input
              type="file"
              multiple
              hidden
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                setSelectedFiles(files); // save files to state
                handleAddImage(
                  selectedDoc?.id ?? 0,
                  selectedDoc?.images?.[0]?.record_id ?? selectedDoc?.record_id,
                  e.target.files,
                  selectedImageType
                );
              }}
            />

            <Typography>Drag & drop files here, or click to select</Typography>
          </Box>

          {/* Show uploaded file names */}
          <Grid container spacing={2} mt={2}>
            {selectedFiles.length > 0 ? (
              selectedFiles.map((file, idx) => (
                <Grid size={{ xs: 6, md: 3 }} key={idx}>
                  <Box
                    sx={{
                      padding: 1,
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <Typography variant="body2">{file.name}</Typography>
                  </Box>
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="textSecondary">
                  No files selected
                </Typography>
              </Grid>
            )}
          </Grid>

          <RadioGroup
            sx={{
              display: "flex !important",
              justifyContent: "space-between",
              flexDirection: "row",
              width: "30%",
              flexWrap: "nowrap",
              mt: 2,
            }}
            value={selectedImageType}
            onChange={(e) =>
              setSelectedImageType(e.target.value as "before" | "after")
            }
          >
            <FormControlLabel
              value="before"
              control={<Radio />}
              label="Before"
            />
            <FormControlLabel value="after" control={<Radio />} label="After" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveImage} color="primary" variant="contained">
            Upload images
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
