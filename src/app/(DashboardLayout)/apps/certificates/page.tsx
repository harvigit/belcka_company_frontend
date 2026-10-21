import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import Certificates from "@/app/components/apps/certificates";

const CertificatesPage = () => {
  return (
    <PageContainer title="Certificates" description="Company certificates">
      <BlankCard>
        <Certificates />
      </BlankCard>
    </PageContainer>
  );
};

export default CertificatesPage;
