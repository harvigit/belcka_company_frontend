import {  IconInfoCircle, IconListDetails, IconShieldCheck, IconTicketOff } from "@tabler/icons-react";
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
      {
        id: uniqueId(),
        title: "Dashbaord",
        icon: IconPoint,
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
    ],
  },
];
export default Menuitems;
