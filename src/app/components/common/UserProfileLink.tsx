"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { getUserDetailsHref } from "@/utils/userDetailsRoute";

type UserProfileLinkProps = {
  userId?: number | string | null;
  children: ReactNode;
  style?: CSSProperties;
};

const UserProfileLink = ({ userId, children, style }: UserProfileLinkProps) => {
  const numericId = Number(userId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return <>{children}</>;
  }

  return (
    <Link
      href={getUserDetailsHref(numericId)}
      onClick={(e) => e.stopPropagation()}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </Link>
  );
};

export default UserProfileLink;
