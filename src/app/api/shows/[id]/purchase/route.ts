import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import QRCode from 'qrcode';

interface PurchaseRequest {
  customerName: string;
  customerDni: string;
  customerPhone: string;
  tickets: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  totalAmount: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const showId = params.id;

    // Verificar sesión del usuario (opcional por ahora, pero recomendado)
    let userId: string | null = null;
    try {
      const cookie = req.headers.get('cookie');
      if (cookie) {
        const session = await verifyUserSessionCookie(cookie);
        userId = session?.userId || null;
      }
    } catch (error) {
      // Usuario no autenticado, continuar como compra anónima
    }

    const body: PurchaseRequest = await req.json();
    const { customerName, customerDni, customerPhone, tickets, totalAmount } = body;

    // Validaciones básicas
    if (!customerName?.trim() || !customerDni?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { error: 'Nombre, DNI y WhatsApp son requeridos' },
        { status: 400 }
      );
    }

    // Validar DNI (8 dígitos numéricos)
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(customerDni.trim())) {
      return NextResponse.json(
        { error: 'El DNI debe tener exactamente 8 dígitos numéricos' },
        { status: 400 }
      );
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un ticket' },
        { status: 400 }
      );
    }

    // Verificar que el show existe y está publicado
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { id: true, status: true, title: true, startsAt: true }
    });

    if (!show || show.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Show no encontrado o no disponible' },
        { status: 404 }
      );
    }

    // Verificar que el show no haya pasado
    if (show.startsAt < new Date()) {
      return NextResponse.json(
        { error: 'El show ya ha comenzado o terminado' },
        { status: 400 }
      );
    }

    // Procesar la compra en una transacción
    const result = await prisma.$transaction(async (tx) => {
      let calculatedTotal = 0;
      const purchaseItems: any[] = [];

      // Verificar disponibilidad y calcular total para cada tipo de ticket
      for (const item of tickets) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId },
          select: {
            id: true,
            showId: true,
            name: true,
            price: true,
            capacity: true,
            soldCount: true,
            availableFrom: true,
            availableTo: true
          }
        });

        if (!ticketType) {
          throw new Error(`Tipo de ticket no encontrado: ${item.ticketTypeId}`);
        }

        if (ticketType.showId !== showId) {
          throw new Error(`Tipo de ticket no pertenece a este show: ${item.ticketTypeId}`);
        }

        // Verificar disponibilidad de tiempo
        const now = new Date();
        if (ticketType.availableFrom && ticketType.availableFrom > now) {
          throw new Error(`Tickets ${ticketType.name} no disponibles aún`);
        }
        if (ticketType.availableTo && ticketType.availableTo < now) {
          throw new Error(`Tickets ${ticketType.name} ya no disponibles`);
        }

        // Verificar capacidad
        const available = ticketType.capacity - ticketType.soldCount;
        if (item.quantity > available) {
          throw new Error(`Solo ${available} tickets ${ticketType.name} disponibles`);
        }

        calculatedTotal += Number(ticketType.price) * item.quantity;
        purchaseItems.push({
          ticketType,
          quantity: item.quantity,
          unitPrice: Number(ticketType.price),
          subtotal: Number(ticketType.price) * item.quantity
        });
      }

      // Verificar que el total coincida
      if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        throw new Error('El total calculado no coincide con el enviado');
      }

      // Crear las compras y paquetes de tickets
      const purchases = [];
      const ticketPackages = [];

      for (const item of purchaseItems) {
        // Crear la compra
        const purchase = await tx.ticketPurchase.create({
          data: {
            userId,
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
            totalAmount: item.subtotal,
            status: 'CONFIRMED',
            customerName: customerName.trim(),
            customerDni: customerDni.trim(),
            customerPhone: customerPhone.trim(),
          }
        });
        purchases.push(purchase);

        // Generar código QR único para el paquete
        const qrCode = `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Generar QR data URL
        const qrDataUrl = await QRCode.toDataURL(qrCode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Crear el paquete de tickets
        const pkg = await tx.ticketPackage.create({
          data: {
            ticketPurchaseId: purchase.id,
            ticketTypeId: item.ticketType.id,
            qrCode,
            qrDataUrl,
            totalTickets: item.quantity,
            usedTickets: 0,
            customerDni: customerDni.trim(),
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            status: 'CONFIRMED'
          }
        });
        ticketPackages.push(pkg);
      }

      // Usar la primera compra como referencia para la respuesta
      const mainPurchase = purchases[0];
      const mainPackage = ticketPackages[0];

      // Actualizar contadores de tickets vendidos
      for (const item of purchaseItems) {
        await tx.ticketType.update({
          where: { id: item.ticketType.id },
          data: {
            soldCount: {
              increment: item.quantity
            }
          }
        });
      }

      return {
        purchases,
        ticketPackages,
        mainPurchase,
        mainPackage,
        items: purchaseItems,
        totalAmount: calculatedTotal
      };
    });

    // TODO: Enviar email de confirmación
    // TODO: Integrar con pasarela de pagos

    // Emitir evento de socket para notificar a staff/admin
    const io = (global as any).io;
    if (io) {
      io.to("staff-general").emit("ticket-purchased", {
        purchaseId: result.mainPurchase.id,
        packageId: result.mainPackage.id,
        qrCode: result.mainPackage.qrCode,
        customerName,
        customerDni,
        totalAmount: result.totalAmount,
        showId,
        ticketPackages: result.ticketPackages.map(pkg => ({
          id: pkg.id,
          qrCode: pkg.qrCode,
          totalTickets: pkg.totalTickets,
          ticketTypeName: result.items.find(item => item.ticketType.id === pkg.ticketTypeId)?.ticketType.name
        }))
      });
    }

    return NextResponse.json({
      ok: true,
      purchaseId: result.mainPurchase.id,
      packageId: result.mainPackage.id,
      qrCode: result.mainPackage.qrCode,
      totalAmount: result.totalAmount,
      ticketPackages: result.ticketPackages.map(pkg => ({
        id: pkg.id,
        qrCode: pkg.qrCode,
        totalTickets: pkg.totalTickets,
        ticketTypeName: result.items.find(item => item.ticketType.id === pkg.ticketTypeId)?.ticketType.name
      })),
      message: 'Compra procesada exitosamente'
    });

  } catch (error: any) {
    console.error('Error processing ticket purchase:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}