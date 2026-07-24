"use client";
import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import TaskLists from "@/app/components/apps/tasks";

const TaskListing = () => {
  return (
    <PageContainer title="Task List" description="this is Task List">
      <BlankCard>
        <TaskLists />
      </BlankCard>
    </PageContainer>
  );
};

export default TaskListing;
