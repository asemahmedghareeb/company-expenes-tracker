import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createProjectSchema, updateProjectSplitsSchema } from "@/lib/validations";

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { projectPartners: true, clientPayments: true, expenses: true },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid project data." },
      { status: 400 },
    );
  }
  const { name, description, contractValue, status, splits } = parsed.data;
  const project = await db.project.create({
    data: {
      name,
      description: description || null,
      contractValue,
      status,
      projectPartners: {
        create: splits.map((s) => ({
          partnerId: s.partnerId,
          sharePercentage: s.sharePercentage,
        })),
      },
    },
    include: { projectPartners: true },
  });
  return NextResponse.json(project, { status: 201 });
}

export async function PUT(req: Request) {
  // Update a single project's snapshot splits: { projectId, splits }
  const body = await req.json();
  const parsed = updateProjectSplitsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Splits must sum to 100%." },
      { status: 400 },
    );
  }
  const { projectId, splits } = parsed.data;
  await db.$transaction([
    db.projectPartner.deleteMany({ where: { projectId } }),
    db.projectPartner.createMany({
      data: splits.map((s) => ({
        projectId,
        partnerId: s.partnerId,
        sharePercentage: s.sharePercentage,
      })),
    }),
  ]);
  return NextResponse.json({ ok: true });
}
