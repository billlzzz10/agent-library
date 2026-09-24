import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_PINNED_PROMPTS = 3;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Parallelize auth check and params resolution to eliminate request waterfall
    const [session, { id: promptId }] = await Promise.all([auth(), params]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallelize independent database validation queries (prompt check, pin check, pin count) to eliminate query waterfalls
    const [prompt, existingPin, pinnedCount] = await Promise.all([
      db.prompt.findUnique({
        where: { id: promptId },
        select: { authorId: true, isPrivate: true },
      }),
      db.pinnedPrompt.findUnique({
        where: {
          userId_promptId: {
            userId: session.user.id,
            promptId,
          },
        },
      }),
      db.pinnedPrompt.count({
        where: { userId: session.user.id },
      }),
    ]);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (prompt.authorId !== session.user.id) {
      return NextResponse.json({ error: "You can only pin your own prompts" }, { status: 403 });
    }

    if (existingPin) {
      return NextResponse.json({ error: "Prompt already pinned" }, { status: 400 });
    }

    if (pinnedCount >= MAX_PINNED_PROMPTS) {
      return NextResponse.json(
        { error: `You can only pin up to ${MAX_PINNED_PROMPTS} prompts` },
        { status: 400 }
      );
    }

    // Get next order number
    const maxOrder = await db.pinnedPrompt.aggregate({
      where: { userId: session.user.id },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    // Create pin
    await db.pinnedPrompt.create({
      data: {
        userId: session.user.id,
        promptId,
        order: nextOrder,
      },
    });

    return NextResponse.json({ success: true, pinned: true });
  } catch (error) {
    console.error("Failed to pin prompt:", error);
    return NextResponse.json({ error: "Failed to pin prompt" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Parallelize auth check and params resolution
    const [session, { id: promptId }] = await Promise.all([auth(), params]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the pin
    await db.pinnedPrompt.deleteMany({
      where: {
        userId: session.user.id,
        promptId,
      },
    });

    return NextResponse.json({ success: true, pinned: false });
  } catch (error) {
    console.error("Failed to unpin prompt:", error);
    return NextResponse.json({ error: "Failed to unpin prompt" }, { status: 500 });
  }
}
