"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/utils/axios";
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  LinearProgress,
  IconButton,
  Drawer,
} from "@mui/material";
import Image from "next/image";
import { IconArrowLeft } from "@tabler/icons-react";

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
  const [loading, setLoading] = useState<boolean>(false);
  const [work, setWork] = useState<any>([]);
  const router = useRouter();
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  useEffect(() => {
    console.log("Props received:", { workId, companyId, addressId });
    if (workId !== null && companyId && addressId) {
      fetchWorkDetail();
    }
  }, [workId, companyId, addressId]);

  const fetchWorkDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `project/get-work-detail?company_id=${companyId}&address_id=${addressId}&work_id=${workId}`
      );
      if (res.data?.IsSuccess) {
        setWork(res.data.info);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "#FF0000";
    if (progress < 50) return "#FF7A00";
    if (progress < 75) return "#FFD700";
    return "#32A852";
  };
  if (work.length < 0)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography className="f-18">
          No detail found for this work!!
        </Typography>
      </Box>
    );

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
      <Box mb={2} p={1} className="work_detail_wrapper">
        <Box
          display={"flex"}
          alignContent={"center"}
          alignItems={"center"}
          flexWrap={"wrap"}
        >
          <IconButton onClick={() => onClose()}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            Work details
          </Typography>
        </Box>
        <Box
          p={2}
          pb={0}
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
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
              whiteSpace: "nowrap",
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

        {/* Work Details */}
        <Box p={2}>
          <Typography
            variant="h6"
            mb={1}
            className="f-18"
            sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
          >
            {work.name}
          </Typography>
          {work.location && (
            <Typography
              variant="h6"
              mb={1}
              className="f-18"
              sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
            >
              Location: {work.location}
            </Typography>
          )}
          {work.units && (
            <Typography
              variant="h6"
              mb={1}
              className="f-18"
              sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
            >
              Units: {work.units}
            </Typography>
          )}
          {work.duration && (
            <Typography
              variant="h6"
              mb={1}
              className="f-18"
              sx={{ boxShadow: 3, p: 2, borderRadius: 2 }}
            >
              Estimated duration: ~{work.duration}
            </Typography>
          )}

          {/* Progress bar */}
          {work.progress !== undefined && (
            <Box>
              <Typography
                variant="h6"
                mb={0.5}
                className="f-18"
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
        {work.images?.filter((i: any) => i.is_before).length > 0 && (
          <Box mb={2} p={2}>
            <Typography mb={1} fontWeight="bold">
              Photos Before
            </Typography>
            <Grid container spacing={2}>
              {work.images
                .filter((i: any) => i.is_before)
                .map((img: any, idx: number) => (
                  <Grid
                    size={{ sm: 6 }}
                    key={idx}
                    sx={{
                      transition: "transform .2s",
                      overflow: "visible",
                      cursor: "pointer",
                      "&:hover img": {
                        transform: "scale(1.2)",
                      },
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
                  >
                    <Image
                      width={150}
                      height={150}
                      src={img.image_url}
                      alt="bofore images"
                      style={{
                        borderRadius: 8,
                        objectFit: "cover",
                        transition: "transform 0.3s ease-in-out",
                      }}
                    />
                  </Grid>
                ))}
            </Grid>
          </Box>
        )}

        {/* Photos After */}
        {work.images?.filter((i: any) => !i.is_before).length > 0 && (
          <Box mb={2} p={2}>
            <Typography mb={1} fontWeight="bold">
              Photos After
            </Typography>
            <Grid container spacing={2}>
              {work.images
                .filter((i: any) => !i.is_before)
                .map((img: any, idx: number) => (
                  <Grid
                    size={{ sm: 6 }}
                    key={idx}
                    sx={{
                      transition: "transform .2s",
                      overflow: "visible",
                      cursor: "pointer",
                      "&:hover img": {
                        transform: "scale(1.2)",
                      },
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
                  >
                    <Image
                      width={150}
                      height={150}
                      src={img.image_url}
                      alt="after images"
                      style={{
                        borderRadius: 8,
                        objectFit: "cover",
                        transition: "transform 0.3s ease-in-out",
                      }}
                    />
                  </Grid>
                ))}
            </Grid>
          </Box>
        )}
        {/* Hover Preview */}
        {hoveredImage && (
          <Box
            sx={{
              position: "fixed",
              top: "30%",
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
    </Drawer>
  );
}
