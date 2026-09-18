import MenuItems from "./MenuItems";
import { usePathname } from "next/navigation";
import { Box, List, useMediaQuery } from "@mui/material";
import NavItem from "./NavItem";
import NavCollapse from "./NavCollapse";
import NavGroup from "./NavGroup/NavGroup";
import { useContext } from "react";
import { CustomizerContext } from "@/app/context/customizerContext";
import React from "react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { usePermissions } from "@/hooks/usePermissions";
import { filterSidebarMenuItems } from "@/lib/permissions";

const SidebarItems = () => {
  const pathname = usePathname() ?? "/";
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf("/"));

  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);
  const { permissions } = usePermissions();

  const session = useSession();
  const user = session.data?.user as User & { company_id?: string | null } & {
    company_name?: string | null;
  } & {
    company_image?: number | null;
  } & { id: number } & { user_role_id: number };

  const isAdmin = user?.user_role_id === 1;
  const filteredMenuItems = filterSidebarMenuItems(
    MenuItems,
    permissions,
    isAdmin,
  );

  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const hideMenu = lgUp ? isCollapse == "mini-sidebar" && !isSidebarHover : "";

  const mainMenuItems = filteredMenuItems.filter(
    (item: any) => item.title !== "Settings",
  );

  const bottomMenuItems = filteredMenuItems.filter(
    (item: any) => item.title === "Settings",
  );

  return (
    <Box
      sx={{
        px: 3,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 77px)",
      }}
    >
      {/* TOP MENU */}
      <Box sx={{ flexGrow: 1 }}>
        <List sx={{ pt: 0 }} className="sidebarNav">
          {mainMenuItems.map((item: any) => {
            if (item.subheader) {
              return (
                <NavGroup
                  item={item}
                  hideMenu={hideMenu}
                  key={item.subheader}
                />
              );
            } else if (item.children) {
              return (
                <NavCollapse
                  menu={item}
                  pathDirect={pathDirect}
                  hideMenu={hideMenu}
                  pathWithoutLastPart={pathWithoutLastPart}
                  level={1}
                  key={item.id}
                  onClick={() => setIsMobileSidebar(!isMobileSidebar)}
                />
              );
            } else {
              return (
                <NavItem
                  item={item}
                  key={item.id}
                  pathDirect={pathDirect}
                  hideMenu={hideMenu}
                  onClick={() => setIsMobileSidebar(!isMobileSidebar)}
                />
              );
            }
          })}
        </List>
      </Box>

      <Box>
        <List className="sidebarNav">
          {bottomMenuItems.map((item: any) => (
            <NavItem
              item={item}
              key={item.id}
              pathDirect={pathDirect}
              hideMenu={hideMenu}
              onClick={() => setIsMobileSidebar(!isMobileSidebar)}
            />
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default SidebarItems;
