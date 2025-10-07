"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  InputAdornment,
  TextField,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import {
  IconFilter,
  IconSearch,
  IconDownload,
  IconPhoto,
} from "@tabler/icons-react";
import api from "@/utils/axios";

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
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (addressId) {
      fetchDocumentTabData();
    }
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

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => new Set(prev).add(imageUrl));
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
    if (tasksWithImages.length > 0) handleDownloadZip(tasksWithImages);
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
            onClick={handleDownloadSelected}
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

      {filteredData.length > 0 ? (
        filteredData.map((doc) => (
          <Box key={doc.id} mb={3}>
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
                  {doc.title || `Document #${doc.id}`}
                </Typography>
              </Stack>
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
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {doc.images && doc.images.length > 0 ? (
                doc.images.map((image: any, idx: number) => {
                  const imageUrl =
                    image.image_url || image.image_thumb_url || "";
                  const hasError = imageErrors.has(imageUrl);

                  return (
                    <Box
                      key={idx}
                      sx={{
                        width: {
                          xs: "calc(0% - 8px)",
                          sm: "calc(25% - 12px)",
                        },
                        position: "relative",
                      }}
                    >
                      <Card
                        sx={{
                          height: "140px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#f5f5f5",
                          cursor: "pointer",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => {
                          if (!hasError && imageUrl) {
                            setHoveredImage(imageUrl);
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setHoverPosition({
                              x: rect.right + 10,
                              y: rect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredImage(null)}
                      >
                        {hasError || !imageUrl ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1,
                              color: "text.secondary",
                            }}
                          >
                            <IconPhoto size={40} stroke={1.5} />
                            <Typography variant="caption">
                              Image not available
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={image.name || `Image ${idx + 1}`}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              transition: "transform 0.3s ease-in-out",
                            }}
                            onError={() => handleImageError(imageUrl)}
                          />
                        )}
                      </Card>
                    </Box>
                  );
                })
              ) : (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ width: "100%", textAlign: "center" }}
                >
                  No images available
                </Typography>
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

      {/* Hover Preview */}
      {hoveredImage && (
        <Box
          sx={{
            position: "fixed",
            top: 200,
            left: "45%",
            width: "500px",
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
  );
};
