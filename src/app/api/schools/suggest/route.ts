import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { getDbOrNull } from "@/lib/server/works";
import { collectSchoolsForSuggestions, filterSchoolSuggestions } from "@/lib/server/schools";
import { searchRorSchools } from "@/lib/server/ror";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("error" in auth) return auth.error;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const db = await getDbOrNull();
  const catalog = db ? await collectSchoolsForSuggestions(db) : [];
  const localItems = filterSchoolSuggestions(catalog, q).map((item) => ({ ...item, source: "local" as const }));
  const remoteItems = localItems.length < 8 ? await searchRorSchools(q, 8 - localItems.length) : [];
  const localNames = new Set(localItems.map((item) => item.name.trim().toLowerCase()));
  const items = [...localItems, ...remoteItems.filter((item) => !localNames.has(item.name.trim().toLowerCase()))].slice(0, 8);
  return NextResponse.json({ items });
}
