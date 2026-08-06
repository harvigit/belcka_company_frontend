"use client";

import React, { useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import {
  IconDotsVertical,
  IconExternalLink,
  IconEye,
} from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { ExpenseListItem } from "../types";
import ExpenseCategoryBadge from "./ExpenseCategoryBadge";
import ExpenseStatusBadge from "./ExpenseStatusBadge";

type Props = {
  expense: ExpenseListItem;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onViewReceipt?: (id: number) => void;
  onOpenDetails?: (expense: ExpenseListItem) => void;
  columnVisibility?: Record<string, boolean>;
};

const formatAmount = (currency: string, amount: number) =>
  `${currency}${Number(amount || 0).toFixed(2)}`;

const isVisible = (
  columnVisibility: Record<string, boolean> | undefined,
  id: string,
) => columnVisibility?.[id] !== false;

const ExpenseRow = ({
  expense,
  selected,
  onToggleSelect,
  onViewReceipt,
  onOpenDetails,
  columnVisibility,
}: Props) => {
  const hasReceipt = expense.attachmentCount > 0;
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleCloseMenu = () => setMenuAnchor(null);

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <CustomCheckbox
          checked={selected}
          onChange={() => onToggleSelect(expense.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      </TableCell>

      {isVisible(columnVisibility, "date") && (
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {expense.date}
          </Typography>
        </TableCell>
      )}

      {isVisible(columnVisibility, "submitted_by") && (
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 12,
                fontWeight: 600,
                bgcolor: expense.submittedBy.avatarColor,
              }}
            >
              {expense.submittedBy.initials}
            </Avatar>
            <Box>
              <Typography className="f-14" fontWeight={600} lineHeight={1.3}>
                {expense.submittedBy.name}
              </Typography>
              <Typography
                sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.3 }}
              >
                {expense.submittedBy.role}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
      )}

      {isVisible(columnVisibility, "project") && (
        <TableCell>
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {expense.project}
          </Typography>
        </TableCell>
      )}

      {isVisible(columnVisibility, "category") && (
        <TableCell>
          <Box sx={{ px: 1.5 }}>
            {expense.category !== "-" ? (
              <ExpenseCategoryBadge label={expense.category} />
            ) : (
              <Typography className="f-14">-</Typography>
            )}
          </Box>
        </TableCell>
      )}

      {isVisible(columnVisibility, "description") && (
        <TableCell sx={{ maxWidth: 240 }}>
          <Typography
            className="f-14"
            sx={{
              px: 1.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={expense.description !== "-" ? expense.description : undefined}
          >
            {expense.description}
          </Typography>
        </TableCell>
      )}

      {isVisible(columnVisibility, "amount") && (
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          <Typography className="f-14" fontWeight={600} sx={{ px: 1.5 }}>
            {formatAmount(expense.currency, expense.amount)}
          </Typography>
        </TableCell>
      )}

      {isVisible(columnVisibility, "receipt") && (
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          <Box sx={{ px: 1.5 }}>
            {hasReceipt ? (
              <Box
                component="button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReceipt?.(expense.id);
                }}
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
              <Typography className="f-14" color="text.secondary">
                —
              </Typography>
            )}
          </Box>
        </TableCell>
      )}

      {isVisible(columnVisibility, "status") && (
        <TableCell>
          <Box sx={{ px: 1.5 }}>
            <ExpenseStatusBadge status={expense.status} />
          </Box>
        </TableCell>
      )}

      {isVisible(columnVisibility, "actions") && (
        <TableCell align="right">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
            }}
          >
            <IconDotsVertical size={18} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              onClick={() => {
                handleCloseMenu();
                onOpenDetails?.(expense);
              }}
            >
              <ListItemIcon>
                <IconEye size={18} />
              </ListItemIcon>
              <ListItemText>Details</ListItemText>
            </MenuItem>
          </Menu>
        </TableCell>
      )}
    </TableRow>
  );
};

export default ExpenseRow;
