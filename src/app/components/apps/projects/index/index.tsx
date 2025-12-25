"use client";

import React, { useEffect, useState } from "react";
import { Grid } from "@mui/material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import BlankCard from "@/app/components/shared/BlankCard";

import ProjectListing from "@/app/components/apps/projects/list";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Cookies from "js-cookie";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

dayjs.extend(customParseFormat);

const COOKIE_PREFIX = "project_";

const TablePagination = () => {
  const [projectId, setProjectId] = useState<number | null>(null);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryProjectId = searchParams ? searchParams.get("id") : "";
    if (queryProjectId) {
      setProjectId(Number(queryProjectId));
      if (user?.id && user?.company_id) {
        Cookies.set(COOKIE_PREFIX + user.id + user.company_id, queryProjectId, {
          expires: 30,
        });
      }
      router.push("/apps/projects/index");
    }
  }, [searchParams, user?.id, user?.company_id]);

  useEffect(() => {
    if (projectId && user?.id) {
      Cookies.set(
        COOKIE_PREFIX + user.id + user.company_id,
        projectId.toString(),
        {
          expires: 30,
        }
      );
    }
  }, [projectId, user?.id]);

  return (
    <Grid container spacing={3}>
      <Grid
        size={{
          xs: 12,
          lg: 12,
        }}
      >
        <BlankCard>
          <ProjectListing projectId={projectId} />
        </BlankCard>
      </Grid>
    </Grid>
  );
};

export default TablePagination;
