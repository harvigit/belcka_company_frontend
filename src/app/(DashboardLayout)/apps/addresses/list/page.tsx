"use client";
import React from "react";
import AddressList from "@/app/components/apps/addresses/list";
import PageContainer from "@/app/components/container/PageContainer";

const AddressListing = () => {
  return (
    <PageContainer title="Addresses List" description="this is Addresses List">
      <AddressList projectId={null} />
    </PageContainer>
  );
};

export default AddressListing;
