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
  Tooltip,
  Skeleton,
} from "@mui/material";
import {
  IconArrowLeft,
  IconArrowRight,
  IconDownload,
  IconFilter,
  IconPlus,
  IconTrash,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { Grid } from "@mui/system";
import Image from "next/image";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

interface DocumentsTabProps {
  addressId: number;
  projectId: number;
  companyId: number;
  addressName: any;
}

export const DocumentsTab = ({
  addressId,
  projectId,
  companyId,
  addressName,
}: DocumentsTabProps) => {
  const [tabData, setTabData] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState<string>("");
  const [selectedTasks, setSelectedTasks] = useState<Array<number | string>>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number>();
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const selectedImage = previewImages[selectedImageIndex] ?? null;
  const [attachmentsPayload, setAttachmentsPayload] = useState<{
    add: Record<string, { before: File[]; after: File[] }>;
    delete: Record<string, string[]>;
  }>({ add: {}, delete: {} });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fetchWork, setFetchWork] = useState(false);

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

  const closePreview = () => {
    setPreviewImages([]);
    setSelectedImageIndex(0);
    setZoom(1);
  };

  const openPreview = (images: string[], index: number) => {
    setPreviewImages(images);
    setSelectedImageIndex(index);
    setZoom(1);
  };

  const showPreviousImage = () => {
    setSelectedImageIndex((current) =>
      (current - 1 + previewImages.length) % previewImages.length,
    );
    setZoom(1);
  };

  const showNextImage = () => {
    setSelectedImageIndex((current) =>
      (current + 1) % previewImages.length,
    );
    setZoom(1);
  };

  const handleDownloadImage = async () => {
    if (!selectedImage) return;
    const imageName = selectedImage.split("?")[0].split("/").pop() || "attachment.jpg";

    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = imageName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement("a");
      link.href = selectedImage;
      link.download = imageName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  useEffect(() => {
    if (addressId) fetchDocumentTabData();
  }, [addressId, projectId]);

  const fetchDocumentTabData = async () => {
    setFetchWork(true);
    try {
      const res = await api.get(
        `address/address-document?address_id=${addressId}&company_id=${companyId}`,
      );
      if (res.data?.isSuccess) setTabData(res.data.info || []);
      else setTabData([]);
    } catch (error) {
      console.error("Document fetch failed:", error);
      setTabData([]);
    }
    setFetchWork(false);
  };

  const handleDownloadZip = async (taskIds: number[] = [], priceworkIds: number[] = []) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${addressId}`,
        {
          params: {
            taskIds: taskIds.join(","),
            priceworkIds: priceworkIds.join(","),
          },
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `task_${addressName}.zip`);
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
    type: "before" | "after",
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
    attachmentId: string | number,
  ) => {
    setTabData((prev) =>
      prev.map((doc) =>
        doc.id === Number(companyTaskId)
          ? {
              ...doc,
              images: doc.images.filter((img: any) => img.id !== attachmentId),
            }
          : doc,
      ),
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

  const handleCheckboxChange = (taskId: number | string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const handleDownloadSelected = () => {
    const selectedDocuments = tabData.filter(
      (document) => selectedTasks.includes(document.id) && document.images?.length > 0,
    );
    const taskIds = selectedDocuments
      .filter((document) => !document.is_pricework_document)
      .map((document) => Number(document.id));
    const priceworkIds = selectedDocuments
      .filter((document) => document.is_pricework_document)
      .map((document) => Number(document.record_id));
    if (taskIds.length || priceworkIds.length) handleDownloadZip(taskIds, priceworkIds);
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
        item.user_name?.toLowerCase().includes(search) ||
        item.created_at?.toLowerCase().includes(search),
    );
  }, [searchUser, tabData]);

  const selectableDocuments = filteredData.filter((item) => item.images?.length > 0);
  const isAllSelected =
    selectableDocuments.length > 0 && selectableDocuments.every((item) => selectedTasks.includes(item.id));

  const selectedVisibleCount = selectableDocuments.filter((item) => selectedTasks.includes(item.id)).length;
  const isIndeterminate = selectedVisibleCount > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const visibleIds = new Set(selectableDocuments.map((item) => item.id));
      setSelectedTasks((current) => current.filter((id) => !visibleIds.has(id)));
    } else {
      const allIds = selectableDocuments.map((item) => item.id);
      setSelectedTasks((current) => [...new Set([...current, ...allIds])]);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        display={"flex"}
        justifyContent={"flex-end"}
      >
        <FormControlLabel
          label="Select All"
          control={
            <CustomCheckbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={handleSelectAll}
            />
          }
        />
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
        <Button variant="contained" sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}>
          <IconFilter width={18} />
        </Button>
      </Stack>
      {fetchWork ? (
        <Box mb={2} mt={1} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
          <Skeleton variant="text" width="50%" height={28} />
          <Skeleton variant="rectangular" width="100%" height={120} sx={{ mt: 1, borderRadius: 1 }} />
        </Box>
      ) : filteredData.length > 0 ? (
        filteredData.map((doc) => (
          <Box key={doc.id} mb={3} mt={1}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <CustomCheckbox
                  checked={selectedTasks.includes(doc.id)}
                  onChange={() => handleCheckboxChange(doc.id)}
                />
                {doc.is_pricework_document && (
                  <Box sx={{ bgcolor: "#1e4db7", color: "#fff", borderRadius: "999px", px: 1, py: 0.25, fontSize: 11, fontWeight: 600 }}>
                    Pricework
                  </Box>
                )}
                <Typography variant="h6" fontWeight={600}>
                  {doc.title || `Document #${doc.record_id}`}
                </Typography>
                {doc.is_pricework_document && doc.user_name && (
                  <Typography variant="caption" color="text.secondary">{doc.user_name}</Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Badge
                  badgeContent={doc.images?.length || 0}
                  color="error"
                  overlap="circular"
                >
                  <IconButton
                    color="error"
                    onClick={() => doc.is_pricework_document
                      ? handleDownloadZip([], [Number(doc.record_id)])
                      : handleDownloadZip([Number(doc.id)])}
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
                {!doc.is_pricework_document && (
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
                )}
              </Stack>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {doc.images.map((image: any, imageIndex: number) => (
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
                        cursor: "pointer",
                      }}
                      onClick={() => openPreview(
                        doc.images.map((item: any) => item.image_url).filter(Boolean),
                        imageIndex,
                      )}
                    />
                  </Card>
                  {!doc.is_pricework_document && (
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() =>
                        handleDeleteImage(
                          doc.id,
                          image.record_id ?? doc.record_id,
                          image.id,
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
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(55vh - 100px)",
          }}
        >
          <Image
            src="/images/svgs/no-data.webp"
            alt="No data"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
            }}
            width={250}
            height={250}
          />
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

      <Dialog open={Boolean(selectedImage)} onClose={closePreview} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          Attachment Preview
          <IconButton onClick={closePreview} size="small" aria-label="Close preview">
            <IconX size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            sx={{
              height: { xs: "55vh", sm: "65vh" },
              width: "100%",
              backgroundColor: "#f5f5f5",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              overflow: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Box
              component="img"
              src={selectedImage || ""}
              alt={`Attachment preview ${selectedImageIndex + 1}`}
              sx={{
                maxWidth: zoom <= 1 ? `${zoom * 100}%` : "none",
                maxHeight: zoom <= 1 ? `${zoom * 100}%` : "none",
                width: zoom <= 1 ? "auto" : `${zoom * 100}%`,
                height: "auto",
                objectFit: "contain",
                display: "block",
                transition: "width 150ms ease",
              }}
            />

            {previewImages.length > 1 && (
              <>
                <Tooltip title="Previous attachment">
                  <IconButton
                    onClick={showPreviousImage}
                    aria-label="Previous attachment"
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: 12,
                      transform: "translateY(-50%)",
                      color: "#fff",
                      backgroundColor: "rgba(0, 0, 0, 0.55)",
                      zIndex: 1,
                      "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.75)" },
                    }}
                  >
                    <IconArrowLeft size={24} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next attachment">
                  <IconButton
                    onClick={showNextImage}
                    aria-label="Next attachment"
                    sx={{
                      position: "absolute",
                      top: "50%",
                      right: 12,
                      transform: "translateY(-50%)",
                      color: "#fff",
                      backgroundColor: "rgba(0, 0, 0, 0.55)",
                      zIndex: 1,
                      "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.75)" },
                    }}
                  >
                    <IconArrowRight size={24} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>

          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
            <Tooltip title="Zoom out">
              <span>
                <IconButton
                  onClick={() => setZoom((current) => Math.max(0.5, current - 0.25))}
                  disabled={zoom <= 0.5}
                  aria-label="Zoom out"
                >
                  <IconZoomOut size={22} />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="body2" minWidth={48} textAlign="center">
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="Zoom in">
              <span>
                <IconButton
                  onClick={() => setZoom((current) => Math.min(3, current + 0.25))}
                  disabled={zoom >= 3}
                  aria-label="Zoom in"
                >
                  <IconZoomIn size={22} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            {selectedImageIndex + 1} / {previewImages.length}
          </Typography>
          <Button variant="contained" startIcon={<IconDownload size={18} />} onClick={handleDownloadImage}>
            Download
          </Button>
        </DialogActions>
      </Dialog>

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
                  selectedImageType,
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
