"use client"
import React, { useState } from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import EditTeamPage from "@/app/components/apps/teams/edit";

const TradeEdit = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [editTeamId, setEditTeamId] = useState<number | null>(null);

  return (
    <PageContainer title="Edit Trade" description="this is Edit Trade">
      <BlankCard>
        <CardContent sx={{ width: "70%" }}>
          <EditTeamPage
            open={true}
            onClose={() => {}}
            teamId={editTeamId}
            teams={teams}
          />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};

export default TradeEdit;
