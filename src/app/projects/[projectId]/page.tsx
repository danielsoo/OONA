"use client";

import { useParams } from "next/navigation";
import ProjectWorkspace from "@/components/projects/ProjectWorkspace";

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  return projectId ? <ProjectWorkspace projectId={projectId} /> : null;
}
