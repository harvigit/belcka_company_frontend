"use client";

import React from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconCalendar,
  IconCheck,
  IconExternalLink,
  IconGasStation,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { ExpenseListItem } from "../types";
import ExpenseStatusBadge from "./ExpenseStatusBadge";

type ApprovalHistoryItem = {
  id: string;
  type: "submitted" | "pending";
  title: string;
  date: string;
  byName?: string;
  avatar: {
    initials: string;
    color: string;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  expense: ExpenseListItem | null;
};

/** Temporary mock history until approval API is wired. */
const getMockApprovalHistory = (
  expense: ExpenseListItem,
): ApprovalHistoryItem[] => [
  {
    id: "submitted",
    type: "submitted",
    title: "Submitted",
    date: expense.date.includes(",")
      ? expense.date
      : expense.date.replace(/(\d{4})\s/, "$1, "),
    byName: expense.submittedBy.name,
    avatar: {
      initials: expense.submittedBy.initials,
      color: expense.submittedBy.avatarColor,
    },
  },
  {
    id: "pending",
    type: "pending",
    title: "Pending Approval",
    date: expense.date.includes(",")
      ? expense.date
      : expense.date.replace(/(\d{4})\s/, "$1, "),
    avatar: {
      initials: "RG",
      color: "#C9A227",
    },
  },
];

const formatAmount = (currency: string, amount: number) =>
  `${currency}${Number(amount || 0).toFixed(2)}`;

const ExpenseDetailsDrawer = ({ open, onClose, expense }: Props) => {
  const history = expense ? getMockApprovalHistory(expense) : [];
  const categoryLine = expense
    ? `${expense.category}${
        expense.description && expense.description !== "-"
          ? ` | ${expense.description}`
          : ""
      }`
    : "";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 420,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: 420 },
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fff",
        },
      }}
    >
      {!expense ? null : (
        <>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              Expense Details
            </Typography>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <IconX size={20} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              mb={1.5}
            >
              <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
                {formatAmount(expense.currency, expense.amount)}
              </Typography>
              <ExpenseStatusBadge status={expense.status} />
            </Stack>

            <Stack spacing={1} mb={2.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconGasStation size={18} color="#757575" />
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                  {categoryLine}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconCalendar size={18} color="#757575" />
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                  {expense.date.includes(",")
                    ? expense.date
                    : expense.date.replace(/(\d{4})\s/, "$1, ")}
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.25} mb={2.5}>
              <Box>
                <Typography
                  sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}
                >
                  Submitted by
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: 13,
                      fontWeight: 600,
                      bgcolor: expense.submittedBy.avatarColor,
                    }}
                  >
                    {expense.submittedBy.initials}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {expense.submittedBy.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {expense.submittedBy.role}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Box>
                <Typography
                  sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}
                >
                  Project
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  {expense.project}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}
                >
                  Description
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  {expense.description}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}
                >
                  Receipt
                </Typography>
                {expense.attachmentCount > 0 ? (
                  <Box
                    component="button"
                    type="button"
                    onClick={() =>
                      toast("Receipt preview — connect API later")
                    }
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      border: "none",
                      background: "none",
                      p: 0,
                      cursor: "pointer",
                      color: "primary.main",
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: "inherit",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    View receipt
                    <IconExternalLink size={14} />
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    No receipt
                  </Typography>
                )}
              </Box>
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>
              Approval History
            </Typography>

            <Stack spacing={0}>
              {history.map((item, index) => {
                const isLast = index === history.length - 1;
                const nodeColor =
                  item.type === "submitted" ? "#1E4DB7" : "#C47A00";

                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    alignItems="stretch"
                    spacing={0}
                  >
                    {/* Timeline axis — same pattern as activity feed */}
                    <Box
                      sx={{
                        width: 20,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pt: "10px",
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          border: `2px solid ${nodeColor}`,
                          bgcolor: "#fff",
                          flexShrink: 0,
                          zIndex: 1,
                        }}
                      />
                      {!isLast && (
                        <Box
                          sx={{
                            width: "2px",
                            flex: 1,
                            minHeight: 24,
                            bgcolor: "#E0E0E0",
                            mt: "4px",
                          }}
                        />
                      )}
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="flex-start"
                      sx={{
                        flex: 1,
                        ml: 1.25,
                        pb: isLast ? 0 : 2.5,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          fontWeight: 600,
                          bgcolor: item.avatar.color,
                        }}
                      >
                        {item.avatar.initials}
                      </Avatar>
                      <Box sx={{ pt: 0.25 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {item.title}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 13, color: "text.secondary" }}
                        >
                          {item.date}
                          {item.byName ? (
                            <>
                              {" "}
                              by{" "}
                              <Box
                                component="span"
                                sx={{
                                  color: "primary.main",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                {item.byName}
                              </Box>
                            </>
                          ) : null}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              gap: 1.5,
            }}
          >
            <Button
              fullWidth
              startIcon={<IconCheck size={15} />}
              variant="outlined"
              color="success"
              size="small"
              onClick={() => toast("Approve — coming soon")}
              sx={{
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              Approve
            </Button>
            <Button
              fullWidth
              startIcon={<IconX size={15} />}
              variant="outlined"
              color="error"
              size="small"
              onClick={() => toast("Reject — coming soon")}
              sx={{
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              Reject
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
};

export default ExpenseDetailsDrawer;
