import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ClientList from "@/app/components/apps/clients/list";
import BlankCard from "@/app/components/shared/BlankCard";
import { ClientProvider } from "@/app/context/ClientContext";

const ClientListing = () => {
  return (
    <ClientProvider>
      <PageContainer title="Client List" description="this is Client List">
        <BlankCard>
          <ClientList />
        </BlankCard>
      </PageContainer>
    </ClientProvider>
  );
};
export default ClientListing;
