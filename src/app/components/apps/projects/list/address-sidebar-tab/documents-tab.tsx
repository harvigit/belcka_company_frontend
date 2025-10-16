import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  IconDownload,
  IconPlus,
  IconTrash,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";

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
  const [attachmentsPayload, setAttachmentsPayload] = useState<{
    add: Record<string, { before: File[]; after: File[] }>;
    delete: Record<string, string[]>;
  }>({ add: {}, delete: {} });

  const [imageType, setImageType] = useState<"before" | "after">("before"); // For before/after image selection
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

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
    recordId: string | number,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const key = String(recordId);
    setAttachmentsPayload((prev) => ({
      ...prev,
      add: {
        ...prev.add,
        [key]: {
          ...prev.add[key],
          [imageType]: [...(prev.add[key]?.[imageType] || []), ...newFiles],
        },
      },
    }));
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
  };

  const handleSaveChanges = async () => {
    const formData = new FormData();
    formData.append("address_id", String(addressId));
    formData.append("company_id", String(companyId));
    if (selectedTaskId !== undefined) {
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

    // Remove attachments
    Object.entries(attachmentsPayload.delete).forEach(([recordId, ids]) => {
      ids.forEach((id) => {
        formData.append("remove_attachment_ids[]", id);
        formData.append("record_id", recordId);
      });
    });

    try {
      const res = await api.post("address/add-attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.IsSuccess || res.data?.isSuccess) {
        toast.success(res.data.message);
        fetchDocumentTabData();
        setAttachmentsPayload({ add: {}, delete: {} });
      }
    } catch (err) {
      console.error("Attachment update failed", err);
    }
  };

  const handleCheckboxChange = (taskId: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
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

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => new Set(prev).add(imageUrl));
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <TextField
          placeholder="Search..."
          size="small"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ width: "70%" }}
        />
        <Stack direction="row" spacing={1}>
          <IconButton
            color="primary"
            onClick={() => handleDownloadZip(selectedTasks)}
            disabled={!hasTasksWithImages}
            sx={{
              border: "1px solid",
              borderColor: hasTasksWithImages ? "primary.main" : "grey.400",
              borderRadius: "8px",
              padding: "8px",
            }}
          >
            <IconDownload size={20} />
          </IconButton>
          <Button variant="contained">
            <IconFilter width={18} />
          </Button>
        </Stack>
      </Stack>

      <Box display={"flex"} justifyContent={"end"} mb={2}>
        <Button variant="contained" color="primary" onClick={handleSaveChanges}>
          Save Changes
        </Button>
      </Box>

      {filteredData.length > 0 ? (
        filteredData.map((doc) => (
          <Box key={doc.record_id} mb={3}>
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
                  component="label"
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
                  <input
                    hidden
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      setSelectedTaskId(doc.id);
                      handleAddImage(
                        doc.images[0].record_id ?? doc.id,
                        e.target.files
                      );
                    }}
                  />
                </IconButton>
                {/* Image Type Toggle */}
                <ToggleButtonGroup
                  value={imageType}
                  exclusive
                  onChange={(_, newType) => newType && setImageType(newType)}
                >
                  <ToggleButton value="before">Before</ToggleButton>
                  <ToggleButton value="after">After</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {doc.images
                ?.filter(
                  (image: any) => image.is_before === (imageType === "before")
                )
                .map((image: any) => (
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
                        }}
                        onError={() => handleImageError(image.image_url)}
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
    </Box>
  );
};
