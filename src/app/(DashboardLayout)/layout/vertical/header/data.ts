interface appLinkType {
  href: string;
  title: string;
  subtext: string;
  avatar: string;
}

interface pageLinksType {
  href: string;
  title: string;
}

const appsLink: appLinkType[] = [
];

const pageLinks: pageLinksType[] = [
  {
    href: '/auth',
    title: 'Authentication Design',
  },
  {
    href: '/privacy-policy',
    title: 'Authentication Design',
  },
  {
    href: '/auth/error',
    title: '404 Error Page',
  },
];

// Notifications dropdown

interface notificationType {
  avatar: string;
  title: string;
  subtitle: string;
}

interface msgType {
  avatar: string;
  title: string;
  subtitle: string;
  time: string;
  status: string;
}

const messages: msgType[] = [
  {
    avatar: "/images/users/1.jpg",
    title: "Roman Joined the Team!",
    subtitle: "Congratulate him",
    time: "9:08 AM",
    status: "success.main",
  },
  {
    avatar: "/images/users/2.jpg",
    title: "New message received",
    subtitle: "Salma sent you new message",
    time: "11:56 AM",
    status: "warning.main",
  },
  {
    avatar: "/images/users/3.jpg",
    title: "New Payment received",
    subtitle: "Check your earnings",
    time: "4:39 AM",
    status: "success.main",
  },
  {
    avatar: "/images/users/4.jpg",
    title: "Jolly completed tasks",
    subtitle: "Assign her new tasks",
    time: "1:12 AM",
    status: "error.main",
  },
];

const notifications: notificationType[] = [];

export { notifications, messages, appsLink, pageLinks };
