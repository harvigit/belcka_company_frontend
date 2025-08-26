import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { ClientProvider } from "@/app/context/ClientContext";
import EditClient from "@/app/components/apps/clients/edit";

const TradeEdit = () => {
  return (
    <ClientProvider>
      <PageContainer title="Edit Client" description="this is Edit Client">
        <BlankCard>
          <EditClient id={null}  onWorkUpdated={() => {}} open={true} onClose={() => {}}  />
        </BlankCard>
      </PageContainer>
    </ClientProvider>
  );
};

export default TradeEdit;
