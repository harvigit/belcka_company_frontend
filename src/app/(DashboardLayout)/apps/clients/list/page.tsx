import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ClientList from "@/app/components/apps/clients/list";
import BlankCard from "@/app/components/shared/BlankCard";

const ClientListing = () => {
  return (
      <PageContainer title="Client List" description="this is Client List">
        <BlankCard>
          <ClientList />
        </BlankCard>
      </PageContainer>
  );
};
export default ClientListing;
