"use client";
import React from "react";
import AddressList from "@/app/components/apps/addresses/list";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";

const AddressListing = () => {
  return (
    <PageContainer title="Addresses List" description="this is Addresses List">
      <PermissionGuard permission="Addresses">
        <BlankCard>
          <AddressList projectId={null} />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default AddressListing;
