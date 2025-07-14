import {
    IconInfoCircle,
    IconListDetails,
    IconSettings,
    IconShieldCheck,
    IconTicket,
    IconTicketOff,
    IconUserPlus,
    IconUsers
} from '@tabler/icons-react';
import { IconPaperclip } from "@tabler/icons-react";
import {
  IconHome,
  IconPoint,
  IconAppWindow,
} from "@tabler/icons-react";
import { uniqueId } from "lodash";

const Menuitems = [
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconHome,
    href: "/dashboards/",
    children: [
      // {
      //   id: uniqueId(),
      //   title: "Dashbaord",
      //   icon: IconPoint,
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
        title: "Timesheet",
        icon: IconTicket,
        href: "/apps/timesheet/list",
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
        title: "Admin",
        icon: IconSettings,
        href: "/admin-settings",
      },
    ],
  },
];
export default Menuitems;
