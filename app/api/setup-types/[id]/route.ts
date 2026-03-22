import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.setupType.findFirst({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = existing.userId === session.user.id;

  try {
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    if (isOwner) {
      const data: { name?: string; description?: string | null } = {};
      if (parsed.name !== undefined) data.name = parsed.name;
      if (parsed.description !== undefined) data.description = parsed.description;
      const updated = await prisma.setupType.update({
        where: { id },
        data,
      });
      return NextResponse.json(updated);
    }

    if (parsed.description !== undefined) {
      await prisma.userSetupDescription.upsert({
        where: {
          userId_setupTypeId: { userId: session.user.id!, setupTypeId: id },
        },
        create: {
          userId: session.user.id!,
          setupTypeId: id,
          description: parsed.description || "",
        },
        update: { description: parsed.description || "" },
      });
      const updated = await prisma.setupType.findUnique({
        where: { id },
        include: {
          userDescriptions: {
            where: { userId: session.user.id },
            select: { description: true },
          },
        },
      });
      const { userDescriptions, ...rest } = updated!;
      return NextResponse.json({
        ...rest,
        userDescription: userDescriptions[0]?.description ?? parsed.description ?? null,
      });
    }

    return NextResponse.json({ error: "Not found or not editable" }, { status: 404 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.setupType.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found or not deletable" }, { status: 404 });
  }

  await prisma.setupType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
