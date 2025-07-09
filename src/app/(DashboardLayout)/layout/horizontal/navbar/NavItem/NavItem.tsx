import React, { useContext } from "react";
import Link from "next/link";

// mui imports
import {
  ListItemIcon,
  List,
  styled,
  ListItemText,
  Chip,
  useTheme,
  Typography,
  ListItemButton,
  useMediaQuery,
  Theme,
} from "@mui/material";

import { useTranslation } from "react-i18next";

import { CustomizerContext } from "@/app/context/customizerContext";
import { ItemType } from "@/app/(DashboardLayout)/types/layout/sidebar";



export default function NavItem({
  item,
  level,
  pathDirect,
  hideMenu,
  onClick,
}: ItemType) {
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

  const { isBorderRadius } = useContext(CustomizerContext);

  const Icon = item?.icon;
  const theme = useTheme();
  const { t } = useTranslation();


  const itemIcon = Icon ? (
    (level ?? 1) > 1 ? (
      <Icon stroke={1.5} size="1rem" />
    ) : (
      <Icon stroke={1.5} size="1.3rem" />
    )
  ) : null;

  const ListItemStyled = styled(ListItemButton)(() => ({
    padding: '5px 10px',
    gap: '10px',
    borderRadius: `${isBorderRadius}px`,
    marginBottom: (level ?? 1) > 1 ? '3px' : '0px',
    color:
      (level ?? 1) > 1 && pathDirect === item.href ? `${theme.palette.primary.main}!important` : theme.palette.text.primary,

    '&:hover': {
      backgroundColor: theme.palette.primary.light,
    },
    '&.Mui-selected': {
      color: (level ?? 1) > 1 ? theme.palette.primary.main : 'white!important',
      backgroundColor: (level ?? 1) > 1 ? 'transparent' : theme.palette.primary.main,
      '&:hover': {
        backgroundColor: (level ?? 1) > 1 ? '' : theme.palette.primary.main,
        color: 'white',
      },
    },
  }));



  return (
    <List component="li" disablePadding key={item?.id && item.title}>
      <Link href={item.href || ''}>
        <ListItemStyled
          // {...listItemProps}
          disabled={item?.disabled}
          selected={pathDirect === item?.href}
          onClick={lgDown ? onClick : undefined}
        >
          <ListItemIcon
            sx={{
              minWidth: 'auto',
              p: "3px 0",
              color:
                (level ?? 1) > 1 && pathDirect === item?.href
                  ? `${theme.palette.primary.main}!important`
                  : "inherit",
            }}
          >
            {itemIcon}
          </ListItemIcon>
          <ListItemText>
            {hideMenu ? "" : <>{t(`${item?.title}`)}</>}
            <br />
            {item?.subtitle ? (
              <Typography variant="caption">
                {hideMenu ? "" : item?.subtitle}
              </Typography>
            ) : (
              ""
            )}
          </ListItemText>

          {!item?.chip || hideMenu ? null : (
            <Chip
              color={(item?.chipColor as "default" | "error" | "primary" | "secondary" | "info" | "success" | "warning") || "default"}
              variant={(item?.variant as "filled" | "outlined") || "filled"}
              size="small"
              label={item?.chip}
            />
          )}
        </ListItemStyled>
      </Link>
    </List>
  );
}
