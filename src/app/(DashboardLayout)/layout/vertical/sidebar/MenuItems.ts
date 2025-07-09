import { uniqueId } from "lodash";

import {
  IconChartPie,
  IconInfoCircle,
  IconPaperclip,
  IconUserCheck,
} from "@tabler/icons-react";
import { NavGroup } from "@/app/(DashboardLayout)/types/layout/sidebar";
import { IconTicket } from "@tabler/icons-react";
import { IconShieldCheck } from "@tabler/icons-react";

const Menuitems: NavGroup[] = [
  {
    navlabel: true,
    subheader: "Home",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconChartPie,
    href: "/",
  },
  {
    id: uniqueId(),
    title: "Privacy Policy",
    icon: IconShieldCheck,
    href: "/privacy-policy",
  },
  {
    id: uniqueId(),
    title: "App Info",
    icon: IconInfoCircle,
    href: "/app-info ",
  },
];

export default Menuitems;
