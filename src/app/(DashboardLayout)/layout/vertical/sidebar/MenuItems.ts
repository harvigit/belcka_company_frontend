import { uniqueId } from "lodash";

import {
  IconChartPie,
  IconInfoCircle,
  IconPaperclip,
  IconSettings2,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { NavGroup } from "@/app/(DashboardLayout)/types/layout/sidebar";
import { IconTicket } from "@tabler/icons-react";
import { IconShieldCheck } from "@tabler/icons-react";
import { IconSettings } from "@tabler/icons-react";

const Menuitems: NavGroup[] = [
  // {
  //   id: uniqueId(),
  //   title: "Dashboard",
  //   icon: IconChartPie,
  //   href: "/",
  // },
  {
    id: uniqueId(),
    title: "Users",
    icon: IconUsers,
    href: "/apps/users/list",
  },
  {
    id: uniqueId(),
    title: "Teams",
    icon: IconUserPlus,
    href: "/apps/teams/list",
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
    title: "Timesheet",
    icon: IconTicket,
    href: "/apps/timesheet/list",
  },
  {
    id: uniqueId(),
    title: "Admin",
    icon: IconSettings,
    href: "/admin-settings",
  },
];

export default Menuitems;
