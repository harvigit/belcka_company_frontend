import { ListSubheader, styled, Theme } from "@mui/material";
import { IconDots } from "@tabler/icons-react";
import React, { useContext } from "react";
import { CustomizerContext } from "@/app/context/customizerContext";

type NavGroup = {
  navlabel?: boolean;
  subheader?: string;
};

interface ItemType {
  item: NavGroup;
  hideMenu: string | boolean;
}

const NavGroup = ({ item, hideMenu }: ItemType) => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  
  const ListSubheaderStyle = styled((props: Theme | any) => (
    <ListSubheader disableSticky {...props} />
  ))(({ theme }) => ({
    ...theme.typography.overline,
      fontWeight: '700',
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(0),
      lineHeight: '26px',
      padding: '3px 12px',
      color: theme.palette.text.primary,
      marginLeft: hideMenu ? '' : '-10px'
  }));

  return (
    <ListSubheaderStyle>
      {hideMenu ? <IconDots size="14" /> : item?.subheader}
    </ListSubheaderStyle>
  );
};

export default NavGroup;
