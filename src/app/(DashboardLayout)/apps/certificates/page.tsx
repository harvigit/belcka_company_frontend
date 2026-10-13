import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import Certificates from "@/app/components/apps/certificates";

const CertificatesPage = () => {
  return (
    <PageContainer title="Certificates" description="Company certificates">
      <PermissionGuard permission="Certificates">
        <BlankCard>
          <Certificates />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default CertificatesPage;
