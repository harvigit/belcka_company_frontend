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
  Paper,
  IconButton,
} from "@mui/material";
import {
  IconArrowLeft,
  IconEye,
  IconFile,
  IconFileDownload,
  IconPdf,
  IconPlus,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import AnnouncementModal from "../../modals/announcement-modal";
import Image from "next/image";
import { Grid } from "@mui/system";

const emojiList = [
  { emoji: "😊", code: "1f60a" },
  { emoji: "😠", code: "1f620" },
  { emoji: "👍", code: "1f44d" },
  { emoji: "👎", code: "1f44e" },
  { emoji: "😢", code: "1f622" },
];

export default function AnnouncementsList({
  userId,
  announcement,
  onUpdate,
  isDrawerOpen,
  companyId,
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
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [emojiDrawerOpen, setEmojiDrawerOpen] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    number | null
  >(null);
  const [emojiDetails, setEmojiDetails] = useState<any[]>([]);
  const [readDetails, setReadDetails] = useState<any[]>([]);
  const [readDrawerOpen, setReadDrawerOpen] = useState(false);
  const [announcementDetails, setAnnouncementDetails] = useState<any>([]);
  const [announcementDrawerOpen, setAnnouncementDrawerOpen] = useState(false);

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

  const handleEmojiClick = async (
    announcementId: number,
    emoji: string,
    emojiCode: string
  ) => {
    const payload = {
      id: announcementId,
      user_id: userId,
      company_id: companyId,
      emoji,
      emoji_code: emojiCode,
    };

    try {
      const response = await api.post("announcements/store-feed", payload);
      toast.success(response.data.message);
      onUpdate?.();
    } catch (err) {
      toast.error("Failed to add emoji reaction.");
    }
  };

  const fetchEmojiDetails = async (announcementId: number) => {
    try {
      const response = await api.get(
        `announcements/emoji-detail?announcement_id=${announcementId}`
      );
      const data = response.data.info;
      setEmojiDetails(data);
    } catch (error) {
      console.error("Failed to fetch emoji details:", error);
    }
  };

  const fetchReadDetails = async (announcementId: number) => {
    try {
      const response = await api.get(
        `announcements/read-detail?announcement_id=${announcementId}`
      );
      const data = response.data.info;
      setReadDetails(data);
    } catch (error) {
      console.error("Failed to fetch read details:", error);
    }
  };

  const fetchAnnouncementDetails = async (announcementId: number) => {
    try {
      const response = await api.get(
        `announcements/detail?id=${announcementId}&user_id=${userId}`
      );
      const data = response.data.info;
      setAnnouncementDetails(data);
    } catch (error) {
      console.error("Failed to fetch announcement details:", error);
    }
  };

  const handleOpenEmojiDrawer = (announcementId: number) => {
    setSelectedAnnouncementId(announcementId);
    setEmojiDrawerOpen(true);
    fetchEmojiDetails(announcementId);
  };

  const handleOpenReadDrawer = (announcementId: number) => {
    setSelectedAnnouncementId(announcementId);
    setReadDrawerOpen(true);
    fetchReadDetails(announcementId);
  };

  const handleCloseReadDrawer = () => {
    setReadDrawerOpen(false);
    setSelectedAnnouncementId(null);
    setReadDetails([]);
  };

  const handleOpenAnnouncementDrawer = (announcementId: number) => {
    setAnnouncementDrawerOpen(true);
    fetchAnnouncementDetails(announcementId);
  };

  const handleCloseEmojiDrawer = () => {
    setEmojiDrawerOpen(false);
    setSelectedAnnouncementId(null);
    setEmojiDetails([]);
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
        {/* <Button
          variant="contained"
          onClick={() => setOpenDrawer(true)}
          startIcon={<IconPlus />}
        >
          Announcement
        </Button> */}
      </Box>

      <List sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6">Loading...</Typography>
          </Box>
        ) : paginatedAnnouncement?.length > 0 ? (
          <>
            {paginatedAnnouncement.map((it: any) => (
              <Box key={it.id} sx={{ position: "relative" }}>
                <Divider />
                <ListItem
                  sx={{ mb: 1 }}
                  onMouseEnter={() => setHoveredId(it.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Avatar
                    alt={it.sender_name}
                    src={it.sender_image}
                    sx={{ height: 50, width: 50, mr: 4 }}
                  />
                  <ListItemText
                    sx={{ cursor: "pointer" }}
                    primary={
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAnnouncementDrawer(it.id);
                        }}
                      >
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
                      </Box>
                    }
                    secondary={
                      <>
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
                                const url =
                                  doc.image_url || doc.thumb_url || "";
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
                                      width: isVideo ? 200 : 100,
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
                                        startIcon={<IconFile />}
                                      >
                                        <IconPdf />
                                      </Button>
                                    ) : (
                                      <Button
                                        href={url}
                                        target="_blank"
                                        variant="outlined"
                                        size="small"
                                        startIcon={<IconFileDownload />}
                                      ></Button>
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </Box>

                        <Box display={"flex"} justifyContent={"space-between"}>
                          {it.feeds && it.feeds.length > 0 ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                mt: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              {Object.entries(
                                it.feeds.reduce((acc: any, feed: any) => {
                                  acc[feed.action] =
                                    (acc[feed.action] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]: any) => (
                                <Box
                                  key={emoji}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    backgroundColor: "#f5f5f5",
                                    borderRadius: "20px",
                                    px: 1.5,
                                    py: 0.5,
                                    cursor: "pointer",
                                    "&:hover": {
                                      backgroundColor: "#e0e0e0",
                                    },
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEmojiDrawer(it.id);
                                  }}
                                >
                                  <Typography>{emoji}</Typography>
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    {count}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Box></Box>
                          )}
                          {it.read_count > 0 && (
                            <Box>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReadDrawer(it.id);
                                }}
                              >
                                <IconEye />
                              </IconButton>
                              {it.read_count}
                            </Box>
                          )}
                        </Box>
                      </>
                    }
                  />

                  {/* Emoji Popup */}
                  {hoveredId === it.id && (
                    <Paper
                      sx={{
                        position: "absolute",
                        top: -30,
                        p: 1,
                        borderRadius: 3,
                        ml: "20%",
                        display: "flex",
                        gap: 1,
                        backgroundColor: "white",
                      }}
                    >
                      {emojiList.map((e) => (
                        <IconButton
                          key={e.code}
                          size="small"
                          onClick={() =>
                            handleEmojiClick(it.id, e.emoji, e.code)
                          }
                          sx={{ opacity: 1, color: "white" }}
                        >
                          <span style={{ fontSize: 22 }}>{e.emoji}</span>
                        </IconButton>
                      ))}
                    </Paper>
                  )}
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

      {/* open emoji details */}
      <Drawer
        anchor="right"
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
        open={emojiDrawerOpen}
        onClose={handleCloseEmojiDrawer}
      >
        <Grid container>
          <Grid size={{ xs: 12, lg: 12 }}>
            <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
              <IconButton onClick={handleCloseEmojiDrawer}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" color="inherit" fontWeight={700}>
                Feed Emoji Details
              </Typography>
            </Box>

            {emojiDetails.length === 0 ? (
              <Typography color="textSecondary">No reactions yet.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {emojiDetails.map((feed: any) => (
                  <Box
                    key={feed.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <Avatar src={feed.user_image} alt={feed.user_name} />
                    <Box
                      display={"flex"}
                      justifyContent={"space-between"}
                      alignItems={"center"}
                      width={"80%"}
                    >
                      <Typography>
                        <strong>{feed.user_name}</strong>
                      </Typography>
                      <IconButton sx={{ color: "white" }}>
                        <span>{feed.emoji}</span>
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </Drawer>

      {/* open read details */}
      <Drawer
        anchor="right"
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
        open={readDrawerOpen}
        onClose={handleCloseReadDrawer}
      >
        <Grid container>
          <Grid size={{ xs: 12, lg: 12 }}>
            <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
              <IconButton onClick={handleCloseReadDrawer}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" color="inherit" fontWeight={700}>
                Read by
              </Typography>
            </Box>

            {readDetails.length === 0 ? (
              <Typography color="textSecondary">No reactions yet.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {readDetails.map((feed: any) => (
                  <Box
                    key={feed.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <Avatar src={feed.user_image} alt={feed.user_name} />
                    <Box
                      display={"flex"}
                      justifyContent={"space-between"}
                      alignItems={"center"}
                      width={"80%"}
                    >
                      <Typography>
                        <strong>{feed.user_name}</strong>
                      </Typography>
                      <Typography color="textSecondary">{feed.read_at}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </Drawer>

      {/* open announcement details */}
      <Drawer
        anchor="right"
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
        open={announcementDrawerOpen}
        onClose={() => setAnnouncementDrawerOpen(false)}
      >
        <Grid container>
          <Grid size={{ xs: 12, lg: 12 }}>
            <Box display="flex" alignItems="center" flexWrap="wrap" mb={1}>
              <IconButton onClick={() => setAnnouncementDrawerOpen(false)}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" color="inherit" fontWeight={700}>
                Announcement Details
              </Typography>
            </Box>

            {announcementDetails.length === 0 ? (
              <Typography color="textSecondary">No reactions yet.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                  key={announcementDetails.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderRadius: 2,
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <Avatar
                    alt={announcementDetails.sender_name}
                    src={announcementDetails.sender_image}
                    sx={{ height: 50, width: 50 }}
                  />
                  <Box>
                    <Typography variant="h6" color="inherit">
                      Announcement from {announcementDetails.sender_name} •{" "}
                      {announcementDetails.type}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      className="f-14"
                    >
                      {announcementDetails.name || announcementDetails.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="textSecondary"
                      sx={{ fontSize: "12px !important" }}
                    >
                      {announcementDetails.date}
                    </Typography>
                  </Box>
                </Box>
                <Divider />
                <Box my={1}>
                  <Typography variant="body1" color="textSecondary">
                    Send notification as:
                  </Typography>
                  {announcementDetails.type}
                </Box>
                <Divider />
                <Box>
                  {announcementDetails.documents &&
                    announcementDetails.documents.length > 0 && (
                      <Box my={1}>
                        Attachements
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1.5,
                            mt: 1,
                          }}
                        >
                          {announcementDetails.documents.map(
                            (doc: any, idx: number) => {
                              const url = doc.image_url || doc.thumb_url || "";
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
                                    width: isVideo ? 200 : 100,
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
                                      startIcon={<IconFile />}
                                    >
                                      <IconPdf />
                                    </Button>
                                  ) : (
                                    <Button
                                      href={url}
                                      target="_blank"
                                      variant="outlined"
                                      size="small"
                                      startIcon={<IconFileDownload />}
                                    ></Button>
                                  )}
                                </Box>
                              );
                            }
                          )}
                        </Box>
                      </Box>
                    )}
                </Box>
                {announcementDetails.documents.length ? (
                  <>
                    <Divider />
                  </>
                ) : (
                  <></>
                )}
                <Box>
                  {announcementDetails.feeds &&
                    announcementDetails.feeds.length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "start",
                          gap: 1.5,
                          mt: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        Feeds
                        {Object.entries(
                          announcementDetails.feeds.reduce(
                            (acc: any, feed: any) => {
                              acc[feed.action] = (acc[feed.action] || 0) + 1;
                              return acc;
                            },
                            {}
                          )
                        ).map(([emoji, count]: any) => (
                          <Box
                            key={emoji}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              backgroundColor: "#e0e0e0",
                              borderRadius: "20px",
                              px: 1.5,
                              py: 0.5,
                              cursor: "pointer",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEmojiDrawer(announcementDetails.id);
                            }}
                          >
                            <Typography>{emoji}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {count}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </Drawer>
    </Box>
  );
}
