import MenuItems from "./MenuItems";
import { usePathname } from "next/navigation";
import { Box, List, useMediaQuery } from "@mui/material";
import NavItem from "./NavItem";
import NavCollapse from "./NavCollapse";
import NavGroup from "./NavGroup/NavGroup";
import { useContext, useEffect, useState } from "react";
import { CustomizerContext } from "@/app/context/customizerContext";
import React from "react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";

interface Permission {
  id: number;
  name: string;
  is_web: boolean;
}

const SidebarItems = () => {
  const pathname = usePathname() ?? "/";
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf("/"));

  // States and Contexts
  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);
  const [permissions, setPermissions] = useState<any[]>([]);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: string | null } & {
    company_name?: string | null;
  } & {
    company_image?: number | null;
  } & { id: number } & { user_role_id: number };

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const payload = {
          user_id: Number(user.id),
          company_id: Number(user.company_id),
        };

        const response = await api.post("/dashboard/user-permissions", payload);
        setPermissions(response.data.permissions);
      } catch (error) {
        console.error("Error fetching permissions:", error);
      }
    };

    fetchPermissions();
  }, [user?.company_id, user?.id]);

  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const hideMenu = lgUp ? isCollapse == "mini-sidebar" && !isSidebarHover : "";

    const hasWebPermission = (title?: string) => {
        if (!title) return false;

        return permissions.some(
            (perm) =>
                perm.name === title &&
                perm.is_web === true &&
                (perm.status === 1 || perm.status === 2)
        );
    };

    const filteredMenuItems = MenuItems.filter((item: any) => {
        if (item.title === 'Settings' && user?.user_role_id === 1) {
            return true;
        }

        if (item && item.length > 0) {
            return item.some((child: any) =>
                hasWebPermission(child.title)
            );
        }

        return hasWebPermission(item.title);
    });

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {filteredMenuItems.map((item: any) => {
          // {/********SubHeader**********/}
          if (item.subheader) {
            return (
              <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />
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
  );
};

export default SidebarItems;
