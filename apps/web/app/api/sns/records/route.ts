import { NextResponse } from "next/server";
import {
  getRecordsBundle,
  isValidSnsHandle,
  type SnsCluster,
} from "@/lib/sns/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = url.searchParams.get("handle")?.trim().toLowerCase() ?? "";
  const cluster = (url.searchParams.get("cluster") as SnsCluster | null) ?? undefined;

  if (!isValidSnsHandle(handle)) {
    return NextResponse.json({ error: "invalid handle" }, { status: 400 });
  }

  const records = await getRecordsBundle(handle, cluster ? { cluster } : undefined);
  return NextResponse.json({ handle, records });
}
