import { NextResponse } from "next/server";
import { timestampToIso } from "@/lib/collab-invite-pure";
import { jsonError, requireUser } from "@/lib/server/api-auth";
import { createProject, listProjectsForUser } from "@/lib/server/projects";
import { getDbOrNull } from "@/lib/server/works";

function safeProject<T extends { createdAt?: unknown; updatedAt?: unknown }>(project: T) {
  return {
    ...project,
    createdAt: timestampToIso(project.createdAt),
    updatedAt: timestampToIso(project.updatedAt),
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);
  const projects = await listProjectsForUser(db, auth.session.uid);
  return NextResponse.json({ projects: projects.map(safeProject) });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;
  const db = await getDbOrNull();
  if (!db) return jsonError("admin_not_configured", "서버 DB를 사용할 수 없습니다.", 503);
  let body: { title?: string; description?: string; category?: string; workId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("invalid_json", "요청 형식이 올바르지 않습니다.", 400);
  }
  const result = await createProject(db, auth.session.uid, body);
  if (!result.ok) {
    return jsonError(result.code, result.code === "title_required" ? "프로젝트 제목을 입력해 주세요." : "프로젝트를 만들지 못했습니다.", 400);
  }
  return NextResponse.json({ ok: true, project: safeProject(result.project) });
}
