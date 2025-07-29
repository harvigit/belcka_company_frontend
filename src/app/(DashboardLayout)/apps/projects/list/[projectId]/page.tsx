"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router"; 
import ProjectList from "@/app/components/apps/projects/list";
import { TeamProvider } from "@/app/context/TeamContext";

const ProjectListing = () => {
  const router = useRouter();
  const { projectId } = router.query;  

  const [projectIdNumber, setProjectIdNumber] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      setProjectIdNumber(parseInt(projectId as string, 10));
    }
  }, [projectId]);

  return (
    <TeamProvider>
      <ProjectList projectId={projectIdNumber} />  
    </TeamProvider>
  );
};

export default ProjectListing;
