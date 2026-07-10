import { uniqueId } from "lodash";

import {
  IconBasket,
  IconCategory,
  IconClock,
  IconCurrencyDollar,
  IconDatabase,
  IconFiles,
  IconInfoCircle,
  IconKeyframes,
  IconReportMedical,
  IconForms,
  IconServer,
  IconShieldCheck,
  IconShoppingBag,
  IconSql,
  IconTools,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconArrowsShuffle,
  IconReport,
  IconHome2,
} from "@tabler/icons-react";
import { NavGroup } from "@/app/(DashboardLayout)/types/layout/sidebar";
import { IconTicket } from "@tabler/icons-react";
import { IconSettings } from "@tabler/icons-react";
import { IconBox } from "@tabler/icons-react";
import { IconPoint, IconLocation } from "@tabler/icons-react";

const MenuItems: NavGroup[] = [
  {
    navlabel: true,
    subheader: "Management",
  },
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
    title: "Teams",
    slug: "teams",
    icon: IconUserPlus,
    href: "/apps/teams/list",
  },
  {
    id: uniqueId(),
    title: "Bookkeeper",
    slug: "bookkeper",
    icon: IconTicket,
    href: "/apps/timesheet/list",
  },
  {
    id: uniqueId(),
    title: "Time Tracking",
    slug: "time_tracking",
    icon: IconReport,
    href: "/apps/time-tracking/list",
  },
  {
    id: uniqueId(),
    title: "Payments",
    slug: "payments",
    icon: IconCurrencyDollar,
    href: "/apps/payments/index",
  },
  {
    id: uniqueId(),
    title: "Projects",
    slug: "projects",
    icon: IconFiles,
    href: "/apps/projects/list",
  },
  {
    id: uniqueId(),
    title: "Addresses",
    slug: "addresses",
    icon: IconHome2,
    href: "/apps/addresses/list",
  },
  {
    id: uniqueId(),
    title: "Cases",
    slug: "cases",
    icon: IconFiles,
    href: "/apps/cases/list",
  },
  {
    id: uniqueId(),
    title: "Health & Safety",
    slug: "health_safety",
    icon: IconReportMedical,
    href: "/apps/health-safety/index",
  },
  {
    id: uniqueId(),
    title: "Forms",
    slug: "forms",
    icon: IconForms,
    href: "/apps/forms",
  },
  {
    id: uniqueId(),
    title: "Conflicts",
    slug: "conflicts",
    icon: IconArrowsShuffle,
    href: "/apps/conflicts/index",
  },
  // {
  //   id: uniqueId(),
  //   title: "Clients",
  //   slug: "clients",
  //   icon: IconUsers,
  //   href: "/apps/clients/list",
  // },

  {
    navlabel: true,
    subheader: "Inventory",
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
    title: "Dashboard (Buyer)",
    slug: "purchasing",
    icon: IconKeyframes,
    href: "/dashboard/buyer",
    children: [
      {
        id: uniqueId(),
        title: "Home",
        slug: "purchasing",
        icon: IconPoint,
        href: "/dashboard/buyer",
      },
      {
        id: uniqueId(),
        title: "Purchasing",
        slug: "purchasing",
        icon: IconPoint,
        href: "/apps/purchase-orders/list",
      },
    ],
  },

  {
    id: uniqueId(),
    title: "Products",
    slug: "products",
    icon: IconDatabase,
    href: "/apps/products/list",
  },

  {
    id: uniqueId(),
    title: "Stock",
    slug: "stock",
    icon: IconServer,
    href: "/apps/stocks/list",
  },

  {
    id: uniqueId(),
    title: "Tools",
    slug: "tools",
    icon: IconTools,
    href: "/apps/tools/list",
  },

  {
    id: uniqueId(),
    title: "Stores",
    slug: "stores",
    icon: IconCategory,
    href: "/apps/stores/list",
  },

  // {
  //   id: uniqueId(),
  //   title: "Purchase Order",
  //   slug: "purchase_order",
  //   icon: IconShoppingBag,
  //   href: "/apps/purchase-orders/list",
  // },

  {
    id: uniqueId(),
    title: "Categories",
    slug: "categories",
    icon: IconKeyframes,
    href: "/apps/categories/list",
  },

  {
    id: uniqueId(),
    title: "Suppliers",
    slug: "suppliers",
    icon: IconBox,
    href: "/apps/suppliers/list",
  },

  {
    id: uniqueId(),
    title: "Settings",
    slug: "settings",
    icon: IconSettings,
    href: "/admin-settings",
  },
];

export default MenuItems;
