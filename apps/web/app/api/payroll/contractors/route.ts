import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { seedContractorsIfEmpty } from "@/lib/payroll/seed";

export const runtime = "nodejs";

export async function GET() {
  seedContractorsIfEmpty();
  const list = [...store.contractors.values()].sort((a, b) => a.id.localeCompare(b.id));
  return NextResponse.json({ contractors: list });
}
