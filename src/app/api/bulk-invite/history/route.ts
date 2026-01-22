import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const jobs = await prisma.bulkInviteJob.findMany({
        where: {
            creatorSub: session.user.id
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit
    });

    return NextResponse.json({ jobs });
}
