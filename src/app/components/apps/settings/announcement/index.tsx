import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Typography,
  Drawer,
  Divider,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  IconFile,
  IconFileDownload,
  IconPdf,
  IconPlus,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import AnnouncementModal from "../../modals/announcement-modal";
import Image from "next/image";

export default function AnnouncementsList({
  userId,
  announcement,
  onUpdate,
  isDrawerOpen,
}: {
  companyId: number;
  userId: number;
  announcement: any;
  onUpdate: () => void;
  onDrawerClose: any;
  isDrawerOpen: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const markAsRead = async () => {
    try {
      const payload = {
        announcement_ids: announcement[0].unread_ids,
        user_id: userId,
      };
      const res = await api.post("announcements/mark-as-read", payload);
      if (res.data) {
        onUpdate?.();
        setPage(1);
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      console.error("Failed to read as announcement:", error);
    }
  };

  useEffect(() => {
    if (
      !isDrawerOpen &&
      announcement?.length > 0 &&
      announcement[0].unread_ids.length > 0
    ) {
      markAsRead();
    }
  }, [isDrawerOpen]);
  const paginatedAnnouncement = announcement?.slice(0, page * limit) || [];

  return (
    <Box>
      <Box display="flex" justifyContent="end" mt={1}>
        <Button
          variant="contained"
          onClick={() => setOpenDrawer(true)}
          startIcon={<IconPlus />}
        >
          Announcement
        </Button>
      </Box>

      <List sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6">Loading...</Typography>
          </Box>
        ) : paginatedAnnouncement?.length > 0 ? (
          <>
            {paginatedAnnouncement.map((it: any) => (
              <Box key={it.id}>
                <Divider />
                <ListItem sx={{ mb: 1 }}>
                  <Avatar
                    alt={it.sender_name}
                    src={it.sender_image}
                    sx={{ height: 50, width: 50, mr: 4 }}
                  />
                  <ListItemText
                    primary={
                      <>
                        <Typography variant="h6" color="inherit">
                          Announcement from {it.sender_name} • {it.type}
                        </Typography>
                        <Typography
                          variant="h6"
                          color="textSecondary"
                          className="f-14"
                        >
                          {it.name || it.title}
                        </Typography>
                        <Typography
                          variant="body1"
                          color="textSecondary"
                          sx={{ fontSize: "12px !important" }}
                        >
                          {it.date}
                        </Typography>
                      </>
                    }
                    secondary={
                      <Box mt={1}>
                        {it.body && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            gutterBottom
                          >
                            {it.body.slice(0, 200)}
                          </Typography>
                        )}

                        {it.documents && it.documents.length > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1.5,
                              mt: 1,
                            }}
                          >
                            {it.documents.map((doc: any, idx: number) => {
                              const url = doc.image_url || doc.thumb_url || "";
                              const fileName = url.split("/").pop() || "";
                              const isImage =
                                /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                              const isVideo = /\.(mp4|mov|webm|avi)$/i.test(
                                url
                              );
                              const isPDF = /\.pdf$/i.test(url);
                              return (
                                <Box
                                  key={doc.id ?? idx}
                                  sx={{
                                    borderRadius: 1,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    transition: "transform 0.2s ease-in-out",
                                    "&:hover": { transform: "scale(1.05)" },
                                    width: isVideo || isPDF ? 200 : 100,
                                  }}
                                >
                                  {isImage ? (
                                    <Image
                                      src={doc.thumb_url || doc.image_url}
                                      alt={`announcement-image-${idx}`}
                                      height={100}
                                      width={100}
                                      style={{
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  ) : isVideo ? (
                                    <video
                                      src={url}
                                      width="200"
                                      height="120"
                                      controls
                                      style={{
                                        objectFit: "cover",
                                        borderRadius: "8px",
                                      }}
                                    />
                                  ) : isPDF ? (
                                    <Button
                                      href={url}
                                      target="_blank"
                                      variant="outlined"
                                      size="small"
                                    >
                                      <IconFile />
                                      <IconPdf />
                                    </Button>
                                  ) : (
                                    <Button
                                      href={url}
                                      target="_blank"
                                      variant="outlined"
                                      size="small"
                                      sx={{ mt: 1 }}
                                    >
                                      <IconFileDownload />
                                    </Button>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
              </Box>
            ))}

            {paginatedAnnouncement.length < announcement.length && (
              <Box display="flex" justifyContent="center" my={2}>
                <Button
                  variant="outlined"
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  See More
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ p: 6, pt: 3, textAlign: "center" }}>
            <Typography variant="h4" color="text.secondary">
              No records found for announcement.
            </Typography>
          </Box>
        )}
      </List>

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        sx={{
          width: 400,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 400,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
          <Box className="task-form">
            <AnnouncementModal
              open={openDrawer}
              onClose={() => setOpenDrawer(false)}
              onCreated={() => onUpdate?.()}
            />
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}
