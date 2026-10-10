import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createConnectionSchema = z.object({
  targetId: z.string().min(1),
  label: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    // Parallelize authentication session fetch, parent prompt lookup, and incoming/outgoing connection queries
    // to eliminate sequential async waterfall delays.
    const [prompt, session, outgoingConnections, incomingConnections] = await Promise.all([
      db.prompt.findUnique({
        where: { id, deletedAt: null },
        select: { id: true, isPrivate: true, authorId: true },
      }),
      auth(),
      db.promptConnection.findMany({
        where: { sourceId: id, label: { not: "related" } },
        orderBy: { order: "asc" },
        include: {
          target: {
            select: {
              id: true,
              title: true,
              slug: true,
              isPrivate: true,
              authorId: true,
            },
          },
        },
      }),
      db.promptConnection.findMany({
        where: { targetId: id, label: { not: "related" } },
        orderBy: { order: "asc" },
        include: {
          source: {
            select: {
              id: true,
              title: true,
              slug: true,
              isPrivate: true,
              authorId: true,
            },
          },
        },
      }),
    ]);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    // Filter out private prompts the user can't see
    const userId = session?.user?.id;

    const filteredOutgoing = outgoingConnections.filter(
      (c: (typeof outgoingConnections)[number]) =>
        !c.target.isPrivate || c.target.authorId === userId
    );

    const filteredIncoming = incomingConnections.filter(
      (c: (typeof incomingConnections)[number]) =>
        !c.source.isPrivate || c.source.authorId === userId
    );

    return NextResponse.json({
      outgoing: filteredOutgoing,
      incoming: filteredIncoming,
    });
  } catch (error) {
    console.error("Failed to fetch connections:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  // Parallelize session authentication, params resolution, and request JSON body parsing
  const [session, { id }, bodyResult] = await Promise.all([
    auth(),
    params,
    request.json().catch(() => null),
  ]);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetId, label, order } = createConnectionSchema.parse(bodyResult);

    // Prevent self-connection early before hitting the database
    if (id === targetId) {
      return NextResponse.json({ error: "Cannot connect a prompt to itself" }, { status: 400 });
    }

    // Parallelize prompt database queries: source prompt, target prompt, and existing connection check
    const [sourcePrompt, targetPrompt, existing] = await Promise.all([
      db.prompt.findUnique({
        where: { id, deletedAt: null },
        select: { authorId: true },
      }),
      db.prompt.findUnique({
        where: { id: targetId, deletedAt: null },
        select: { id: true, title: true, authorId: true },
      }),
      db.promptConnection.findUnique({
        where: { sourceId_targetId: { sourceId: id, targetId } },
      }),
    ]);

    if (!sourcePrompt) {
      return NextResponse.json({ error: "Source prompt not found" }, { status: 404 });
    }

    if (sourcePrompt.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only add connections to your own prompts" },
        { status: 403 }
      );
    }

    if (!targetPrompt) {
      return NextResponse.json({ error: "Target prompt not found" }, { status: 404 });
    }

    // Verify user owns the target prompt (users can only connect their own prompts)
    if (targetPrompt.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only connect to your own prompts" },
        { status: 403 }
      );
    }

    if (existing) {
      return NextResponse.json({ error: "Connection already exists" }, { status: 400 });
    }

    // Calculate order if not provided
    let connectionOrder = order;
    if (connectionOrder === undefined) {
      const lastConnection = await db.promptConnection.findFirst({
        where: { sourceId: id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      connectionOrder = (lastConnection?.order ?? -1) + 1;
    }

    const connection = await db.promptConnection.create({
      data: {
        sourceId: id,
        targetId,
        label,
        order: connectionOrder,
      },
      include: {
        target: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Failed to create connection:", error);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}
