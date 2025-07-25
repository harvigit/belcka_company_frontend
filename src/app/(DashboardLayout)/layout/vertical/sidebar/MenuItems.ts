import { uniqueId } from "lodash";

import { IconUserPlus, IconUsers } from "@tabler/icons-react";
import { NavGroup } from "@/app/(DashboardLayout)/types/layout/sidebar";
import { IconTicket } from "@tabler/icons-react";
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
  {
    id: uniqueId(),
    title: "Timesheet",
    icon: IconTicket,
    href: "/apps/timesheet/list",
  },
  {
    id: uniqueId(),
    title: "Settings",
    icon: IconSettings,
    href: "/admin-settings",
  },
];

export default Menuitems;
