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
  Stack,
  TextField,
} from "@mui/material";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconEye,
  IconFile,
  IconFileDownload,
  IconMessage,
  IconPdf,
  IconPlus,
} from "@tabler/icons-react";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import AnnouncementModal from "../../modals/announcement-modal";
import Image from "next/image";
import { Grid } from "@mui/system";
import { User } from "next-auth";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";

const wrappedText = {
  minWidth: 0,
  maxWidth: "100%",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
} as const;

function CommentRow({
  name,
  image,
  text,
  date,
  onReply,
  replyLabel,
}: {
  name?: string;
  image?: string;
  text?: string;
  date?: string;
  onReply?: () => void;
  replyLabel?: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{ minWidth: 0, maxWidth: "100%" }}
    >
      <Avatar
        src={image}
        alt={name}
        sx={{ width: 36, height: 36, flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={700} sx={wrappedText}>
          {name}
        </Typography>
        <Typography variant="body2" sx={{ ...wrappedText, mt: 0.25 }}>
          {text}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          {date ? (
            <Typography variant="caption" color="text.secondary">
              {date}
            </Typography>
          ) : null}
          {onReply ? (
            <Button
              variant="text"
              size="small"
              onClick={onReply}
              startIcon={<IconArrowBackUp size={14} stroke={1.75} />}
              sx={{
                p: 0,
                minWidth: 0,
                minHeight: 0,
                color: "text.secondary",
                lineHeight: 1,
                textTransform: "none",
                fontSize: 12,
                fontWeight: 500,
                "& .MuiButton-startIcon": { mr: 0.4, ml: 0 },
                "&:hover": { color: "primary.main", bgcolor: "transparent" },
              }}
            >
              {/* {replyLabel} */}
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}

const fallbackEmojis = [
  { emoji: "👍", code: "1f44d" },
  { emoji: "👎", code: "1f44e" },
  { emoji: "❤️", code: "2764" },
  { emoji: "😂", code: "1f602" },
  { emoji: "😮", code: "1f62e" },
  { emoji: "😢", code: "1f622" },
  { emoji: "😠", code: "1f620" },
  { emoji: "🔥", code: "1f525" },
  { emoji: "👏", code: "1f44f" },
  { emoji: "🎉", code: "1f389" },
  { emoji: "🙏", code: "1f64f" },
  { emoji: "✅", code: "2705" },
  { emoji: "😊", code: "1f60a" },
];

export default function AnnouncementsList({
  userId,
  roleId,
  announcement,
  onUpdate,
  isDrawerOpen,
  companyId,
}: {
  companyId: number;
  userId: number;
  roleId: number;
  announcement: any;
  onUpdate: () => void;
  onDrawerClose: any;
  isDrawerOpen: boolean;
}) {
  const { t } = useTranslation();
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
  const [emojiList, setEmojiList] = useState(fallbackEmojis);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [commentSaving, setCommentSaving] = useState(false);
  const [likes, setLikes] = useState<
    Record<number, { liked: boolean; count: number }>
  >({});
  const session = useSession();
  const user = session.data?.user as User & { id?: number | null };
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
    emojiCode: string,
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
      toast.error(t("Failed to add emoji reaction."));
    }
  };

  const fetchEmojiDetails = async (announcementId: number) => {
    try {
      const response = await api.get(
        `announcements/emoji-detail?announcement_id=${announcementId}`,
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
        `announcements/read-detail?announcement_id=${announcementId}`,
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
        `announcements/detail?id=${announcementId}&user_id=${userId}`,
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

  const fetchComments = async (announcementId: number) => {
    try {
      const response = await api.get(
        `announcements/comments?announcement_id=${announcementId}&sort=newest`,
      );
      setComments(response.data?.info ?? []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      setComments([]);
    }
  };

  const handleOpenAnnouncementDrawer = (announcementId: number) => {
    setAnnouncementDrawerOpen(true);
    setCommentText("");
    setReplyTo(null);
    setComments([]);
    fetchAnnouncementDetails(announcementId);
    if (allowComments) fetchComments(announcementId);
  };

  const saveAnnouncementSettings = async (next: {
    allow_reactions?: boolean;
    allow_comments?: boolean;
  }) => {
    const payload = {
      company_id: companyId,
      allow_reactions: next.allow_reactions ?? allowReactions,
      allow_comments: next.allow_comments ?? allowComments,
    };
    setAllowReactions(payload.allow_reactions);
    setAllowComments(payload.allow_comments);
    try {
      const response = await api.post("setting/announcement-settings", payload);
      if (response.data?.IsSuccess === false) {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Failed to save announcement settings:", error);
      toast.error(t("Failed to save announcement settings."));
    }
  };

  const likeInfo = (item: any) => {
    const override = likes[item?.id];
    const liked = override?.liked ?? Boolean(item?.is_like);
    const count =
      override?.count ?? Number(item?.like_count ?? (liked ? 1 : 0));
    return { liked, count, filled: count > 0 };
  };

  const handleLike = async (item: any) => {
    const current = likeInfo(item);
    const nextLiked = !current.liked;
    const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));
    setLikes((previous) => ({
      ...previous,
      [item.id]: { liked: nextLiked, count: nextCount },
    }));
    try {
      const response = await api.post("announcements/like", {
        announcement_id: item.id,
        user_id: userId,
        company_id: companyId,
        is_like: nextLiked,
      });
      if (response.data?.IsSuccess === false) {
        setLikes((previous) => ({
          ...previous,
          [item.id]: { liked: current.liked, count: current.count },
        }));
        toast.error(response.data.message);
        return;
      }
      const info = response.data?.info;
      setLikes((previous) => ({
        ...previous,
        [item.id]: {
          liked: Boolean(info?.is_like),
          count: Number(info?.like_count ?? nextCount),
        },
      }));
      onUpdate?.();
      if (announcementDetails?.id === item.id) {
        setAnnouncementDetails((currentDetails: any) => ({
          ...currentDetails,
          is_like: Boolean(info?.is_like),
          like_count: Number(info?.like_count ?? nextCount),
        }));
      }
    } catch (error) {
      setLikes((previous) => ({
        ...previous,
        [item.id]: { liked: current.liked, count: current.count },
      }));
      console.error("Failed to update like:", error);
      toast.error(t("Failed to update the like."));
    }
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || !announcementDetails?.id) return;
    setCommentSaving(true);
    try {
      const response = await api.post(
        replyTo ? "announcements/reply" : "announcements/comment",
        {
          announcement_id: announcementDetails.id,
          user_id: userId,
          company_id: companyId,
          comment: text,
          ...(replyTo ? { comment_id: replyTo.id } : {}),
        },
      );
      if (response.data?.IsSuccess === false) {
        toast.error(response.data.message);
        return;
      }
      setCommentText("");
      setReplyTo(null);
      await fetchComments(announcementDetails.id);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to save comment:", error);
      toast.error(t("Failed to save the comment."));
    } finally {
      setCommentSaving(false);
    }
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

  useEffect(() => {
    if (!isDrawerOpen || !companyId) return;
    api
      .get(`setting/announcement-settings?company_id=${companyId}`)
      .then((response) => {
        const settings = response.data?.data;
        if (!settings) return;
        setAllowReactions(settings.allow_reactions !== false);
        setAllowComments(settings.allow_comments !== false);
      })
      .catch(() => undefined);
  }, [isDrawerOpen, companyId]);

  useEffect(() => {
    let active = true;
    api
      .get("announcements/emojis")
      .then((response) => {
        const list = response.data?.info;
        if (!active || !Array.isArray(list) || !list.length) return;
        setEmojiList(
          list.map((item) => ({
            emoji: item.emoji,
            code: item.code || item.emoji_code,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const paginatedAnnouncement = announcement?.slice(0, page * limit) || [];

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        flexWrap="wrap"
        px={2}
      >
        {roleId == 1 ? (
          <Stack spacing={1.25} sx={{ flex: 1, minWidth: 240, maxWidth: 420 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <ThumbUpAltIcon sx={{ fontSize: 22, color: "#1e4db7" }} />
                <Typography fontSize={15} color="text.primary">
                  {t("Allow reactions")}
                </Typography>
              </Stack>
              <IOSSwitch
                checked={allowReactions}
                onChange={(_event, checked) =>
                  saveAnnouncementSettings({ allow_reactions: checked })
                }
              />
            </Stack>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <IconMessage size={22} color="#1e4db7" stroke={1.75} />
                <Typography fontSize={15} color="text.primary">
                  {t("Allow comments")}
                </Typography>
              </Stack>
              <IOSSwitch
                checked={allowComments}
                onChange={(_event, checked) =>
                  saveAnnouncementSettings({ allow_comments: checked })
                }
              />
            </Stack>
          </Stack>
        ) : (
          <Box />
        )}
        {roleId == 1 && (
          <Button
            variant="contained"
            onClick={() => setOpenDrawer(true)}
            startIcon={<IconPlus />}
          >
            {t("Announcement")}
          </Button>
        )}
      </Box>

      <List sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6">{t("Loading...")}</Typography>
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
                    primaryTypographyProps={{ component: "div" }}
                    secondaryTypographyProps={{ component: "div" }}
                    primary={
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAnnouncementDrawer(it.id);
                        }}
                      >
                        <Typography variant="h6" color="inherit">
                          {t("Announcement from")} {it.sender_name} •{" "}
                          {it.announcement_type == 2
                            ? it.sender_name
                            : t(it.type)}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          variant="h6"
                          className="f-14"
                          sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-word",
                          }}
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
                                  url,
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

                        <Box
                          display={"flex"}
                          justifyContent={"space-between"}
                          alignItems={"center"}
                          gap={1}
                          flexWrap="wrap"
                          sx={{ minWidth: 0, maxWidth: "100%" }}
                        >
                          {allowReactions && it.feeds && it.feeds.length > 0 ? (
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
                                }, {}),
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
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            {allowReactions && (
                              <Stack
                                direction="row"
                                spacing={0.25}
                                alignItems="center"
                              >
                                <IconButton
                                  size="small"
                                  aria-label={t("Like")}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleLike(it);
                                  }}
                                  sx={{
                                    color: likeInfo(it).filled
                                      ? "#1e4db7"
                                      : "text.secondary",
                                  }}
                                >
                                  {likeInfo(it).filled ? (
                                    <ThumbUpAltIcon sx={{ fontSize: 20 }} />
                                  ) : (
                                    <ThumbUpOffAltIcon sx={{ fontSize: 20 }} />
                                  )}
                                </IconButton>
                                {likeInfo(it).count > 0 && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {likeInfo(it).count}
                                  </Typography>
                                )}
                              </Stack>
                            )}
                            {allowComments && (
                              <Button
                                size="small"
                                color="inherit"
                                startIcon={<IconMessage size={18} />}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenAnnouncementDrawer(it.id);
                                }}
                                sx={{ textTransform: "none", fontWeight: 600 }}
                              >
                                {t("Comments")} ({it.comment_count || 0})
                              </Button>
                            )}
                          </Stack>
                          {it.read_count > 0 && it.user_id == user.id && (
                            <Box sx={{ px: 1.5, py: 0.5 }}>
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
                  {allowReactions && hoveredId === it.id && (
                    <Paper
                      sx={{
                        position: "absolute",
                        top: -30,
                        p: 1,
                        borderRadius: 3,
                        ml: "20%",
                        display: "flex",
                        flexWrap: "wrap",
                        maxWidth: 350,
                        gap: 0.5,
                        backgroundColor: "white",
                        zIndex: 2,
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
                  {t("See More")}
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ p: 6, pt: 3, textAlign: "center" }}>
            <Typography variant="h4" color="text.secondary">
              {t("No records found for announcement.")}
            </Typography>
          </Box>
        )}
      </List>

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        sx={{
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <AnnouncementModal
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          onCreated={() => onUpdate?.()}
        />
      </Drawer>

      {/* open emoji details */}
      <Drawer
        anchor="right"
        sx={{
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
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
                {t("Feed Emoji Details")}
              </Typography>
            </Box>

            {emojiDetails.length === 0 ? (
              <Typography color="textSecondary">
                {t("No reactions yet.")}
              </Typography>
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
                {t("Read by")}
              </Typography>
            </Box>

            {readDetails.length === 0 ? (
              <Typography color="textSecondary">
                {t("No user read yet.")}
              </Typography>
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
                      <Typography color="textSecondary">
                        {feed.read_at}
                      </Typography>
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
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
            maxWidth: "100%",
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
            overflowX: "hidden",
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
                {t("Announcement Details")}
              </Typography>
            </Box>

            {announcementDetails.length === 0 ? (
              <Typography color="textSecondary">
                {t("No reactions yet.")}
              </Typography>
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
                      {t("Announcement from")} {announcementDetails.sender_name}{" "}
                      • {t(announcementDetails.type)}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      variant="h6"
                      className="f-14"
                      sx={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        wordBreak: "break-word",
                      }}
                    >
                      {announcementDetails.name || announcementDetails.title}
                    </Typography>
                    <Typography
                      mt={1}
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
                    {t("Send notification as:")}
                  </Typography>
                  {announcementDetails.type}
                </Box>
                <Divider />
                <Box>
                  {announcementDetails.documents &&
                    announcementDetails.documents.length > 0 && (
                      <Box my={1}>
                        {t("Attachments")}
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
                                url,
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
                            },
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
                {allowComments && (
                  <Box mt={2} sx={{ minWidth: 0, maxWidth: "100%" }}>
                    <Typography fontWeight={700} fontSize={16} sx={{ mb: 1.5 }}>
                      {t("Comments")} (
                      {comments.reduce(
                        (total, comment) =>
                          total + 1 + (comment.replies?.length ?? 0),
                        0,
                      )}
                      )
                    </Typography>
                    <Stack spacing={2} sx={{ minWidth: 0 }}>
                      {comments.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t("No comments yet.")}
                        </Typography>
                      ) : (
                        comments.map((comment) => (
                          <Box key={comment.id} sx={{ minWidth: 0 }}>
                            <CommentRow
                              name={comment.user_name}
                              image={
                                comment.user_thumb_image || comment.user_image
                              }
                              text={comment.comment}
                              date={comment.date}
                              onReply={() =>
                                setReplyTo({
                                  id: comment.id,
                                  name: comment.user_name,
                                })
                              }
                              replyLabel={t("Reply")}
                            />
                            {(comment.replies ?? []).length > 0 && (
                              <Stack
                                spacing={1.5}
                                sx={{
                                  mt: 1.25,
                                  ml: 5,
                                  pl: 1.5,
                                  borderLeft: "2px solid",
                                  borderColor: "divider",
                                  minWidth: 0,
                                }}
                              >
                                {(comment.replies ?? []).map((reply: any) => (
                                  <CommentRow
                                    key={reply.id}
                                    name={reply.user_name}
                                    image={
                                      reply.user_thumb_image || reply.user_image
                                    }
                                    text={reply.comment}
                                    date={reply.date}
                                  />
                                ))}
                              </Stack>
                            )}
                          </Box>
                        ))
                      )}
                    </Stack>
                    {replyTo && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={wrappedText}
                      >
                        {t("Replying to")} {replyTo.name}
                        <Button
                          size="small"
                          onClick={() => setReplyTo(null)}
                          sx={{ ml: 1 }}
                        >
                          {t("Cancel")}
                        </Button>
                      </Typography>
                    )}
                    <Stack
                      direction="row"
                      spacing={1}
                      mt={1.5}
                      alignItems="flex-end"
                      sx={{ minWidth: 0, maxWidth: "100%" }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        minRows={1}
                        maxRows={4}
                        placeholder={t("Write a comment...")}
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            submitComment();
                          }
                        }}
                        sx={{
                          minWidth: 0,
                          flex: 1,
                          "& .MuiOutlinedInput-root": {
                            alignItems: "flex-end",
                            overflow: "hidden",
                          },
                          "& textarea": {
                            overflowX: "hidden",
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        disabled={commentSaving || !commentText.trim()}
                        onClick={submitComment}
                        sx={{ flexShrink: 0, height: 40, mb: 0.25 }}
                      >
                        {t("Send")}
                      </Button>
                    </Stack>
                  </Box>
                )}
                <Divider sx={{ mt: 1 }} />
                <Box>
                  {allowReactions &&
                    announcementDetails.feeds &&
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
                        {t("Feeds")}
                        {Object.entries(
                          announcementDetails.feeds.reduce(
                            (acc: any, feed: any) => {
                              acc[feed.action] = (acc[feed.action] || 0) + 1;
                              return acc;
                            },
                            {},
                          ),
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
