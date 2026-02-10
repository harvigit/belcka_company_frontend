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
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import {
  IconArrowLeft,
  IconNotes,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

interface WorkDetailPageProps {
  open: boolean;
  workId: number | null;
  companyId: number | null;
  addressId: number;
  onClose: () => void;
  onSubmit: () => void;
}

export default function WorkDetailPage({
  open,
  onClose,
  workId,
  companyId,
  addressId,
  onSubmit,
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
  const [editableProgress, setEditableProgress] = useState<number>(0);
  const [originalProgress, setOriginalProgress] = useState<number>(0);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [newBeforePreviews, setNewBeforePreviews] = useState<string[]>([]);
  const [newAfterPreviews, setNewAfterPreviews] = useState<string[]>([]);

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
        `project/get-work-detail?company_id=${companyId}&address_id=${addressId}&work_id=${workId}`,
      );
      if (res.data?.IsSuccess) {
        if (res.data?.IsSuccess) {
          setWork(res.data.info);
          setEditableProgress(res.data.info.progress ?? 0);
          setOriginalProgress(res.data.info.progress ?? 0);
        }
      } else {
        setWork(null);
      }
    } catch (err) {
      console.error(err);
      setWork(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && work) {
      setEditableProgress(work.progress ?? 0);
      setOriginalProgress(work.progress ?? 0);
    }
  }, [open, work]);

  useEffect(() => {
    if (workId && companyId && addressId) {
      fetchWorkDetail();
      [...newBeforePreviews, ...newAfterPreviews].forEach((url) =>
        URL.revokeObjectURL(url),
      );
    }
  }, [workId, companyId, addressId]);

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "#FF0000";
    if (progress < 50) return "#FF7A00";
    if (progress < 75) return "#FFD700";
    return "#32A852";
  };

  const handleAddFiles = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after",
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previews = files.map((file) => URL.createObjectURL(file));

    if (type === "before") {
      setNewBeforeFiles((prev) => [...prev, ...files]);
      setNewBeforePreviews((prev) => [...prev, ...previews]);
    } else {
      setNewAfterFiles((prev) => [...prev, ...files]);
      setNewAfterPreviews((prev) => [...prev, ...previews]);
    }

    e.target.value = "";
  };

  useEffect(() => {
    return () => {
      [...newBeforePreviews, ...newAfterPreviews].forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [newBeforePreviews, newAfterPreviews]);

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

    const checklogId = work?.checklogs?.[0]?.id || work?.images?.[0]?.record_id;

    if (!checklogId) {
      toast.error("Checklog not found");
      return;
    }

    formData.append("checklog_id", checklogId);
    formData.append("company_task_id", work.id);

    if (removeBeforeIds.length > 0) {
      formData.append(
        "before_attachment_remove_ids",
        removeBeforeIds.join(","),
      );
    }

    if (removeAfterIds.length > 0) {
      formData.append("after_attachment_remove_ids", removeAfterIds.join(","));
    }

    newBeforeFiles.forEach((file) => {
      formData.append(`before_company_task_attachments[${work.id}]`, file);
    });

    newAfterFiles.forEach((file) => {
      formData.append(`after_company_task_attachments[${work.id}]`, file);
    });

    try {
      setLoading(true);
      const res = await api.post("user-checklog/add-attachments", formData);

      if (res.data?.IsSuccess) {
        toast.success("Attachments updated successfully!");
        await fetchWorkDetail();
        setEditing(false);
        setNewBeforeFiles([]);
        setNewAfterFiles([]);
        setRemoveBeforeIds([]);
        setRemoveAfterIds([]);
        setNewAfterPreviews([]);
        setNewBeforePreviews([]);
      } else {
        toast.error(res.data.message || "Error updating attachments");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    try {
      setUpdatingProgress(true);

      const res = await api.put("company-tasks/update", {
        id: work.id,
        progress: String(editableProgress),
        company_id: companyId,
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        await fetchWorkDetail();
        onSubmit?.();
        onClose?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProgress(false);
    }
  };

  const formatSeconds = (seconds: number) => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const formattedHours = String(hours).padStart(2, "0");
    const formattedMinutes = String(minutes).padStart(2, "0");

    return `${formattedHours}:${formattedMinutes} h`;
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
      <Box display="flex" flexDirection="column" height="100%">
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 1,
          }}
        >
          <Box className="task-form">
            {!work || Object.keys(work).length === 0 ? (
              <>
                <Box p={3} textAlign="center">
                  <Typography>No detail found for this work!</Typography>
                </Box>
              </>
            ) : (
              <Box>
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
                      <Typography variant="h6" fontWeight={700}>
                        Work details
                      </Typography>
                    </Box>
                    {work.images.length > 0 && (
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
                <Box p={2} pt={0}>
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
                        textTransform: "lowercase",
                      }}
                    >
                      {work.trade_name}
                    </Box>
                    <Box
                      sx={{
                        backgroundColor:
                          work.repeatable_job === "Task"
                            ? "#32A852"
                            : "#FF008C",
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
                        textTransform: "lowercase",
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
                        textTransform: "lowercase",
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
                      sx={{
                        boxShadow: 3,
                        p: 2,
                        borderRadius: 2,
                        display: "flex",
                        gap: 1,
                      }}
                    >
                      
                      Estimated duration: ~{work.duration}{" "}
                      {work?.total_payable_seconds > 0 && (
                        <Tooltip title="user spend time" placement="top">
                          <Typography color="primary.main" className="f-14">
                           ({formatSeconds(work?.total_payable_seconds)})
                          </Typography>
                        </Tooltip>
                      )}
                    </Typography>
                  )}

                  {work.progress !== undefined && (
                    <Box sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}>
                      <Typography variant="h6" mb={1}>
                        Progress: {editableProgress}%
                      </Typography>

                      {work.status_text !== "Completed" ? (
                        <>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={editableProgress}
                            onChange={(e) =>
                              setEditableProgress(Number(e.target.value))
                            }
                            style={{
                              width: "100%",
                              height: "10px",
                              appearance: "none",
                              background: `linear-gradient(
      to right,
      ${getProgressColor(editableProgress)} ${editableProgress}%,
      #eee ${editableProgress}%
    )`,
                              borderRadius: "5px",
                              outline: "none",
                              cursor: "pointer",
                            }}
                          />
                        </>
                      ) : (
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
                      )}
                    </Box>
                  )}

                  <Box
                    sx={{
                      mt: 1,
                      boxShadow: 3,
                      p: 2,
                      borderRadius: 2,
                      gap: 1,
                    }}
                  >
                    <Typography variant="h6" mb={1} fontWeight={600}>
                      Checking summary :{" "}
                      {formatSeconds(work?.total_payable_seconds)}
                    </Typography>
                    {work?.checklog_summary.map((checklog: any, index: any) => (
                      <Box key={index}>
                        <Typography
                          variant="h6"
                          className="f-14"
                          fontWeight={600}
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          ({checklog.checkin_date}) {checklog.start_time}
                          {checklog.checkin_note && (
                            <Tooltip
                              title={checklog.checkin_note}
                              placement="top"
                            >
                              <IconNotes size={18} />
                            </Tooltip>
                          )}
                          {checklog.end_time && (
                            <>
                              <span>- {checklog.end_time}</span>

                              {checklog.checkout_note && (
                                <Tooltip
                                  title={checklog.checkout_note}
                                  placement="top"
                                >
                                  <IconNotes size={18} />
                                </Tooltip>
                              )}
                            </>
                          )}
                          <span>
                            = {formatSeconds(checklog.payable_seconds)}
                          </span>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Photos Before */}
                {work?.images.length > 0 && (
                  <Box p={2}>
                    <Box
                      display={"flex"}
                      justifyContent={"space-between"}
                      mb={2}
                    >
                      <Typography fontWeight="bold" mb={1}>
                        Photos Before
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<IconPlus />}
                        component="label"
                        size="small"
                      >
                        Add Photos
                        <input
                          type="file"
                          hidden
                          multiple
                          accept="image/*"
                          onChange={(e) => handleAddFiles(e, "before")}
                        />
                      </Button>
                    </Box>
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
                              onMouseEnter={(e) => {
                                setHoveredImage(img.image_url);
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setHoverPosition({
                                  x: rect.right + 10,
                                  y: rect.top,
                                });
                              }}
                              onMouseLeave={() => setHoveredImage(null)}
                            />
                            <IconButton
                              color="error"
                              size="small"
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                background: "#fff",
                              }}
                              onClick={() =>
                                handleRemoveExisting(img.id, "before")
                              }
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </Grid>
                        ))}
                    </Grid>

                    {newBeforePreviews.length > 0 && (
                      <Grid container spacing={2} mt={1}>
                        {newBeforePreviews.map((src, index) => (
                          <Grid
                            size={{ xs: 6 }}
                            key={index}
                            sx={{ position: "relative" }}
                          >
                            <Image
                              src={src}
                              alt="before-preview"
                              width={170}
                              height={170}
                              style={{
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "2px dashed #1976d2",
                              }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                background: "#fff",
                              }}
                              onClick={() => {
                                setNewBeforeFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                                setNewBeforePreviews((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                              }}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                )}

                {/* Photos After */}
                {work?.images.length > 0 && (
                  <Box p={2}>
                    <Box
                      display={"flex"}
                      justifyContent={"space-between"}
                      mb={2}
                    >
                      <Typography fontWeight="bold" mb={1}>
                        Photos After
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<IconPlus />}
                        component="label"
                        size="small"
                      >
                        Add Photos
                        <input
                          type="file"
                          hidden
                          multiple
                          accept="image/*"
                          onChange={(e) => handleAddFiles(e, "after")}
                        />
                      </Button>
                    </Box>
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
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setHoverPosition({
                                  x: rect.right + 10,
                                  y: rect.top,
                                });
                              }}
                              onMouseLeave={() => setHoveredImage(null)}
                            />
                            <IconButton
                              color="error"
                              size="small"
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                background: "#fff",
                              }}
                              onClick={() =>
                                handleRemoveExisting(img.id, "after")
                              }
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </Grid>
                        ))}
                    </Grid>

                    {newAfterPreviews.length > 0 && (
                      <Grid container spacing={2} mt={1}>
                        {newAfterPreviews.map((src, index) => (
                          <Grid
                            size={{ xs: 6 }}
                            key={index}
                            sx={{
                              position: "relative",
                              cursor: "pointer",
                            }}
                          >
                            <Image
                              src={src}
                              alt="after-preview"
                              width={170}
                              height={170}
                              style={{
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "2px dashed #1976d2",
                              }}
                            />

                            <IconButton
                              size="small"
                              color="error"
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                background: "#fff",
                              }}
                              onClick={() => {
                                setNewAfterFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                                setNewAfterPreviews((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                              }}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </Grid>
                        ))}
                      </Grid>
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
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
        {work?.status_int !== 4 && editableProgress !== originalProgress && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "start",
              gap: 2,
              mt: 2,
            }}
          >
            <Button
              color="primary"
              variant="contained"
              size="large"
              type="submit"
              fullWidth
              sx={{ borderRadius: 3, width: "50%" }}
              disabled={updatingProgress}
              onClick={handleUpdateProgress}
            >
              {updatingProgress ? "Updating..." : "Update Progress"}
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
