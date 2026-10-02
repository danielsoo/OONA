import type { ProjectStatus } from "@/types/project";

/** English source labels (translated with ui()), same as the website's statusLabel. */
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  development: "Development",
  in_production: "In Production",
  post_production: "Post Production",
  complete: "Complete",
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];
