import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ClientList from "@/app/components/apps/clients/list";
import BlankCard from "@/app/components/shared/BlankCard";
import { UserProvider } from "@/app/context/UserContext";

const ClientListing = () => {
  return (
    <UserProvider>
      <PageContainer title="Client List" description="this is Client List">
        <BlankCard>
          <ClientList />
        </BlankCard>
      </PageContainer>
    </UserProvider>
  );
};
export default ClientListing;
