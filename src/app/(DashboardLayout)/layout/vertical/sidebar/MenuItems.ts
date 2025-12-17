import { uniqueId } from "lodash";

import { IconFiles, IconInfoCircle, IconShieldCheck, IconUser, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { NavGroup } from "@/app/(DashboardLayout)/types/layout/sidebar";
import { IconTicket } from "@tabler/icons-react";
import { IconSettings } from "@tabler/icons-react";

const MenuItems: NavGroup[] = [
  // {
  //   id: uniqueId(),
  //   title: "Dashboard",
  //   slug: "Dashboard",
  //   icon: IconChartPie,
  //   href: "/",
  // },
  {
    id: uniqueId(),
    title: "Users", 
    slug: "users",
    icon: IconUsers,
    href: "/apps/users/list",
  },
  {
    id: uniqueId(),
    title: "User",
    slug: "user",
    icon: IconUser,
    href: "/apps/users/index",
  },
  {
    id: uniqueId(),
    title: "Teams", 
    slug: "teams",
    icon: IconUserPlus,
    href: "/apps/teams/list",
  },
  {
    id: uniqueId(),
    title: "Time Tracking", 
    slug: "time_tracking",
    icon: IconTicket,
    href: "/apps/timesheet/list",
  },
  {
    id: uniqueId(),
    title: "Projects", 
    slug: "projects",
    icon: IconFiles,
    href: "/apps/projects/index",
  },
  {
    id: uniqueId(),
    title: "Clients", 
    slug: "clients",
    icon: IconUsers,
    href: "/apps/clients/list",
  },
  // {
  //   id: uniqueId(),
  //   title: "Privacy Policy",
  //   icon: IconShieldCheck,
  //   href: "/privacy-policy",
  // },
  // {
  //   id: uniqueId(),
  //   title: "App Info",
  //   icon: IconInfoCircle,
  //   href: "/app-info",
  // },
  {
    id: uniqueId(),
    title: "Settings", 
    slug: "settings",
    icon: IconSettings,
    href: "/admin-settings",
  },
];

export default MenuItems;
