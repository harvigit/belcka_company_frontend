"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
// import ExpenseList from "@/app/components/apps/expenses/list";
import ExpenseListUI from "@/app/components/apps/expenses/list/ExpenseListUI";

const ExpenseListing = () => {
  return (
    <PageContainer title="Expense" description="This is Expense List">
      <PermissionGuard permission="Expense">
        <BlankCard>
          {/* ===== OLD Expense Listing UI (commented for rebuild) =====
          <ExpenseList />
          ===== END OLD UI ===== */}

          {/* ===== NEW UI ===== */}
          <ExpenseListUI />
          {/* ===== END NEW UI ===== */}
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default ExpenseListing;
