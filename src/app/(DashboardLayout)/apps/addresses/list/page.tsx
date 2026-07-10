"use client";
import React from "react";
import AddressList from "@/app/components/apps/addresses/list";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";

const AddressListing = () => {
  return (
    <PageContainer title="Addresses List" description="this is Addresses List">
      <BlankCard>
        <AddressList projectId={null} />
      </BlankCard>
    </PageContainer>
  );
};

export default AddressListing;
