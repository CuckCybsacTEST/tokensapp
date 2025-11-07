import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { redeemCustomerPoints } from "@/lib/customerPoints";

const redeemSchema = z.object({
  customerId: z.string().min(1, "ID del cliente es requerido"),
  pointsToRedeem: z.number().int().min(1, "Los puntos a canjear deben ser al menos 1"),
  reason: z.string().min(1, "Razón del canje es requerida"),
  benefit: z.string().optional(), // Descripción del beneficio obtenido
});

// POST /api/customers/redeem - Redeem customer points
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = redeemSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const data = parsed.data;

    const result = await redeemCustomerPoints(
      data.customerId,
      data.pointsToRedeem,
      data.reason
    );

    if (!result.success) {
      return apiError("INSUFFICIENT_POINTS", "El cliente no tiene suficientes puntos", {
        required: data.pointsToRedeem,
        available: result.newPoints,
      }, 400);
    }

    return apiOk({
      customerId: data.customerId,
      pointsRedeemed: data.pointsToRedeem,
      newPointsBalance: result.newPoints,
      reason: data.reason,
      benefit: data.benefit,
    }, 200);
  } catch (error) {
    console.error("Error redeeming points:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}
