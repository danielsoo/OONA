import { NextResponse } from "next/server";
import { timestampToIso } from "@/lib/collab-invite-pure";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { getProjectDetail, updateProject } from "@/lib/server/projects";
import { getDbOrNull } from "@/lib/server/works";
import type { ProjectMilestone, ProjectStatus } from "@/types/project";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);
  const { projectId } = await params;
  const result = await getProjectDetail(db, projectId, auth.session.uid);
  if (!result.ok) return jsonError(result.code, "프로젝트를 불러오지 못했습니다.", result.code === "forbidden" ? 403 : 404);
  return NextResponse.json({
    project: {
      ...result.project,
      createdAt: timestampToIso(result.project.createdAt),
      updatedAt: timestampToIso(result.project.updatedAt),
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);
  const { projectId } = await params;
  let body: { title?: string; description?: string; status?: ProjectStatus; category?: string; milestones?: ProjectMilestone[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식이 올바르지 않습니다.", 400);
  }
  const result = await updateProject(db, projectId, auth.session.uid, body);
  if (!result.ok) return jsonError(result.code, "프로젝트를 수정하지 못했습니다.", result.code === "forbidden" ? 403 : 404);
  return NextResponse.json({ ok: true });
}
