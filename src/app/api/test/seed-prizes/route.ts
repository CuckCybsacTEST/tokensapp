import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const prizes = Array.isArray(body.prizes) ? body.prizes : [];
  for (const p of prizes) {
    await prisma.prize.upsert({
      where: { id: p.id },
      update: {
        stock: p.stock,
        active: p.active ?? true,
        label: p.label,
        key: p.key,
        color: p.color || null,
      },
      create: {
        id: p.id,
        key: p.key,
        label: p.label,
        stock: p.stock,
        active: p.active ?? true,
        color: p.color || null,
      },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
