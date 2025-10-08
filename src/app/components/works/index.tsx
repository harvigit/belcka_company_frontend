"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/utils/axios";
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  IconButton,
  Drawer,
  Button,
} from "@mui/material";
import Image from "next/image";
import { IconArrowLeft, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface WorkDetailPageProps {
  open: boolean;
  workId: number | null;
  companyId: number | null;
  addressId: number;
  onClose: () => void;
}

export default function WorkDetailPage({
  open,
  onClose,
  workId,
  companyId,
  addressId,
}: WorkDetailPageProps) {
  const [loading, setLoading] = useState(false);
  const [work, setWork] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [newBeforeFiles, setNewBeforeFiles] = useState<File[]>([]);
  const [newAfterFiles, setNewAfterFiles] = useState<File[]>([]);
  const [removeBeforeIds, setRemoveBeforeIds] = useState<number[]>([]);
  const [removeAfterIds, setRemoveAfterIds] = useState<number[]>([]);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const router = useRouter();

  useEffect(() => {
    if (workId && companyId && addressId) fetchWorkDetail();
  }, [workId, companyId, addressId]);

  useEffect(() => {
    setEditing(false);
    setNewBeforeFiles([]);
    setNewAfterFiles([]);
    setRemoveBeforeIds([]);
    setRemoveAfterIds([]);
  }, [open]);
  const fetchWorkDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `project/get-work-detail?company_id=${companyId}&address_id=${addressId}&work_id=${workId}`
      );
      if (res.data?.IsSuccess) {
        setWork(res.data.info);
      } else {
        setWork(null);
      }
    } catch (err) {
      console.error(err);
      setWork(null);
    }
    setLoading(false);
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "#FF0000";
    if (progress < 50) return "#FF7A00";
    if (progress < 75) return "#FFD700";
    return "#32A852";
  };

  const handleAddFiles = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after"
  ) => {
    const files = Array.from(e.target.files || []);
    if (type === "before") setNewBeforeFiles((prev) => [...prev, ...files]);
    else setNewAfterFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveExisting = (id: number, type: "before" | "after") => {
    if (type === "before") setRemoveBeforeIds((prev) => [...prev, id]);
    else setRemoveAfterIds((prev) => [...prev, id]);

    setWork((prev: any) => ({
      ...prev,
      images: prev?.images?.filter((i: any) => i.id !== id),
    }));
  };

  const handleUpload = async () => {
    const formData = new FormData();
    const checklogId =
      work?.checklog_id || work?.images?.[0]?.record_id || null;

    console.log(checklogId, work.id, "checklogId");
    formData.append("checklog_id", checklogId);
    formData.append("company_task_id", work.id);

    if (removeBeforeIds.length > 0)
      formData.append(
        "before_attachment_remove_ids",
        removeBeforeIds.join(",")
      );
    if (removeAfterIds.length > 0)
      formData.append("after_attachment_remove_ids", removeAfterIds.join(","));

    newBeforeFiles.forEach((file) => {
      formData.append(`before_company_task_attachments[${work.id}]`, file);
    });
    newAfterFiles.forEach((file) => {
      formData.append(`after_company_task_attachments[${work.id}]`, file);
    });

    try {
      setLoading(true);
      const res = await api.post("user-checklog/add-attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.IsSuccess) {
        toast.success("Attachments updated successfully!");
        await fetchWorkDetail();
        setEditing(false);
        setNewBeforeFiles([]);
        setNewAfterFiles([]);
        setRemoveBeforeIds([]);
        setRemoveAfterIds([]);
      } else {
        toast.error(res.data.message || "Error updating attachments");
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 500,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 500,
          padding: 2,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      {!work || Object.keys(work).length === 0 ? (
        <>
          <Box p={3} textAlign="center">
            <Typography>No detail found for this work!</Typography>
          </Box>
        </>
      ) : (
        <>
          <Box mb={2}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" color="inherit" fontWeight={700}>
                  Work details
                </Typography>
              </Box>
              {!editing && work.images.length > 0 && (
                <Button variant="contained" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              {editing && work.images.length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleUpload}
                >
                  Save
                </Button>
              )}
            </Box>
          </Box>

          {/* Work Info */}
          <Box p={2}>
            {/* Tags */}
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              <Box
                sx={{
                  backgroundColor: "#FF7A00",
                  border: "1px solid #FF7A00",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 500,
                  px: 1,
                  py: 0.2,
                  borderRadius: "999px",
                }}
              >
                {work.trade_name}
              </Box>
              <Box
                sx={{
                  backgroundColor:
                    work.repeatable_job === "Task" ? "#32A852" : "#FF008C",
                  border:
                    work.repeatable_job === "Task"
                      ? "1px solid #32A852"
                      : "1px solid #FF008C",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 500,
                  px: 1,
                  py: 0.2,
                  borderRadius: "999px",
                }}
              >
                {work.repeatable_job === "Task" ? work.rate : "Job"}
              </Box>
              <Box
                sx={{
                  backgroundColor: work.status_color,
                  border: `1px solid ${work.status_color}`,
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 500,
                  px: 1,
                  py: 0.2,
                  borderRadius: "999px",
                }}
              >
                {work.status_text}
              </Box>
            </Box>

            {/* Basic info */}
            <Typography
              variant="h6"
              mb={1}
              sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
            >
              {work.name}
            </Typography>
            {work.location && (
              <Typography
                variant="h6"
                mb={1}
                sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
              >
                Location: {work.location}
              </Typography>
            )}
            {work.units && (
              <Typography
                variant="h6"
                mb={1}
                sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
              >
                Units: {work.units}
              </Typography>
            )}
            {work.duration && (
              <Typography
                variant="h6"
                mb={1}
                sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
              >
                Estimated duration: ~{work.duration}
              </Typography>
            )}

            {/* Progress */}
            {work.progress !== undefined && (
              <Box>
                <Typography
                  variant="h6"
                  mb={0.5}
                  sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
                >
                  Progress: {work.progress}%
                  <LinearProgress
                    variant="determinate"
                    value={work.progress}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: getProgressColor(work.progress),
                      },
                      backgroundColor: "#eee",
                    }}
                  />
                </Typography>
              </Box>
            )}
          </Box>

          {/* Photos Before */}
          {work?.images.length > 0 && (
            <Box p={2}>
              <Typography fontWeight="bold" mb={1}>
                Photos Before
              </Typography>
              <Grid container spacing={2}>
                {work.images
                  ?.filter((i: any) => i.is_before)
                  .map((img: any) => (
                    <Grid
                      size={{ xs: 6 }}
                      key={img.id}
                      sx={{
                        position: "relative",
                        transition: "transform .2s",
                        overflow: "visible",
                        cursor: "pointer",
                        "&:hover img": {
                          transform: "scale(1.2)",
                        },
                      }}
                    >
                      <Image
                        width={170}
                        height={170}
                        src={img.image_url}
                        alt="before"
                        style={{
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                        onClick={() => handleRemoveExisting(img.id, "before")}
                        onMouseEnter={(e) => {
                          setHoveredImage(img.image_url);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverPosition({
                            x: rect.right + 10,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredImage(null)}
                      />
                      {editing && (
                        <IconButton
                          color="error"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "#fff",
                          }}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      )}
                    </Grid>
                  ))}
              </Grid>

              {editing && work?.images.length > 0 && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconPlus />}
                    component="label"
                    size="small"
                  >
                    Add Before Photos
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => handleAddFiles(e, "before")}
                    />
                  </Button>
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    {newBeforeFiles.map((file, idx) => (
                      <Typography key={idx} variant="body2">
                        {file.name}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Photos After */}
          {work?.images.length > 0 && (
            <Box p={2}>
              <Typography fontWeight="bold" mb={1}>
                Photos After
              </Typography>
              <Grid container spacing={2}>
                {work.images
                  ?.filter((i: any) => !i.is_before)
                  .map((img: any) => (
                    <Grid
                      size={{ xs: 6 }}
                      key={img.id}
                      sx={{
                        position: "relative",
                        transition: "transform .2s",
                        overflow: "visible",
                        cursor: "pointer",
                        "&:hover img": {
                          transform: "scale(1.2)",
                        },
                      }}
                    >
                      <Image
                        width={170}
                        height={170}
                        src={img.image_url}
                        alt="after"
                        style={{
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                        onMouseEnter={(e) => {
                          setHoveredImage(img.image_url);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverPosition({
                            x: rect.right + 10,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredImage(null)}
                      />
                      {editing && (
                        <IconButton
                          color="error"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "#fff",
                          }}
                          onClick={() => handleRemoveExisting(img.id, "after")}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      )}
                    </Grid>
                  ))}
              </Grid>

              {editing && work?.images.length > 0 && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconPlus />}
                    component="label"
                    size="small"
                  >
                    Add After Photos
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => handleAddFiles(e, "after")}
                    />
                  </Button>
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    {newAfterFiles.map((file, idx) => (
                      <Typography key={idx} variant="body2">
                        {file.name}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

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
          )}
        </>
      )}
    </Drawer>
  );
}
