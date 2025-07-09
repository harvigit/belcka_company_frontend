import React, { useContext } from 'react';
import { useTheme } from '@mui/material/styles';
import { usePathname } from "next/navigation";

// mui imports
import { ListItemIcon, styled, ListItemText, Box, ListItemButton } from '@mui/material';
// custom imports
import NavItem from '../NavItem/NavItem';

// plugins
import { IconChevronDown } from '@tabler/icons-react';
import { CustomizerContext } from '@/app/context/customizerContext';
import { NavCollapseProps } from '@/app/(DashboardLayout)/types/layout/sidebar';



// FC Component For Dropdown Menu
const NavCollapse = ({ menu, level, pathWithoutLastPart, pathDirect, hideMenu, onClick }: NavCollapseProps) => {
  const Icon = menu.icon;
  const theme = useTheme();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = React.useState(false);
  const { isBorderRadius } = useContext(CustomizerContext);



  const menuIcon = Icon ? (
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.1rem" />
  ) : null;


  React.useEffect(() => {
    setOpen(false);
    menu?.children?.forEach((item) => {
      if (item.href === pathname) {
        setOpen(true);
      }
    });
  }, [pathname, menu.children]);

  const ListItemStyled = styled(ListItemButton)(() => ({
    width: 'auto',
    padding: '5px 10px',
    position: 'relative',
    flexGrow: 'unset',
    gap: '10px',
    borderRadius: `${isBorderRadius}px`,
    whiteSpace: 'nowrap',
    color: open || pathname.includes(menu.href || '') || level < 1 ? 'white' : theme.palette.text.primary,
    backgroundColor: open || pathname.includes(menu.href || '') ? theme.palette.primary.main : '',

    '&:hover': {
      backgroundColor:
        open || pathname.includes(menu.href || '')
          ? theme.palette.primary.main
          : theme.palette.primary.light,
    },
    '&:hover > .SubNav': { display: 'block' },
  }));

  const ListSubMenu = styled((props: any) => <Box {...props} />)(() => ({
    display: 'none',
    position: 'absolute',
    top: level > 1 ? `0px` : '35px',
    left: level > 1 ? `${level + 228}px` : '0px',
    padding: '10px',
    width: '250px',
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[8],
    backgroundColor: theme.palette.background.paper,
  }));

  const listItemProps: {
    component: string;
  } = {
    component: 'li',
  };

  // If Menu has Children
  const submenus = menu.children?.map((item: any) => {
    if (item.children) {
      return (
        <NavCollapse
          key={item.id}
          menu={item}
          level={level + 1}
          pathWithoutLastPart={pathWithoutLastPart}
          pathDirect={pathDirect}
          hideMenu={hideMenu} onClick={onClick} />
      );
    } else {
      return (
        <NavItem
          key={item.id}
          item={item}
          level={level + 1}
          pathDirect={pathDirect}
          hideMenu={hideMenu} onClick={function (): void {
            throw new Error('Function not implemented.');
          }} />
      );
    }
  });

  return (
    <React.Fragment key={menu.id}>
      <ListItemStyled
        {...listItemProps}
        selected={pathWithoutLastPart === menu.href}
        className={open ? 'selected' : ''}
      >
        <ListItemIcon
          sx={{
            minWidth: 'auto',
            p: '3px 0',
            color: 'inherit',
          }}
        >
          {menuIcon}
        </ListItemIcon>
        <ListItemText color="inherit" sx={{ mr: 'auto' }}>
          {menu.title}
        </ListItemText>
        <IconChevronDown size="1rem" />
        <ListSubMenu component={'ul'} className="SubNav">
          {submenus}
        </ListSubMenu>
      </ListItemStyled>
    </React.Fragment>
  );
};

export default NavCollapse;
