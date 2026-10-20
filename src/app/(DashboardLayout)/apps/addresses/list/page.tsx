"use client";
import React from "react";
import AddressWorkspace from "@/app/components/apps/addresses/list/address-workspace";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";

const AddressListing = () => {
  return (
    <PageContainer title="Addresses List" description="this is Addresses List">
      <PermissionGuard permission="Addresses">
        <BlankCard
          sx={{
            height: "calc(100vh - 200px)",
            maxHeight: "calc(100vh - 200px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AddressWorkspace />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default AddressListing;
