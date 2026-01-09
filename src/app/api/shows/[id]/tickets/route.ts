import { NextRequest, NextResponse } from 'next/server';
import { getTicketTypesForShow } from '@/lib/tickets/service';
import { getById } from '@/lib/shows/service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const showId = params.id;
    console.log('Getting ticket types for show:', showId);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
    console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

    // Verificar que el show existe y está publicado
    const show = await getById(showId);
    console.log('Show found:', show);

    if (!show || show.status !== 'PUBLISHED') {
      console.log('Show not found or not published');
      return NextResponse.json(
        { error: 'Show not found or not available' },
        { status: 404 }
      );
    }

    // Obtener tipos de tickets disponibles para este show
    console.log('Getting ticket types for show:', showId);
    const ticketTypes = await getTicketTypesForShow(showId);
    console.log('Ticket types found:', ticketTypes);

    // Filtrar por disponibilidad de tiempo (esto debería hacerse en la query de Supabase)
    const now = new Date();
    const availableTicketTypes = ticketTypes.filter(ticket => {
      const availableFrom = ticket.availableFrom ? new Date(ticket.availableFrom) : null;
      const availableTo = ticket.availableTo ? new Date(ticket.availableTo) : null;

      if (!availableFrom && !availableTo) return true;
      if (availableFrom && availableFrom > now) return false;
      if (availableTo && availableTo < now) return false;
      return true;
    });

    // Calcular disponibilidad para cada tipo de ticket
    const ticketTypesWithAvailability = availableTicketTypes.map(ticket => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description,
      price: ticket.price,
      capacity: ticket.capacity,
      soldCount: ticket.soldCount,
      availableCount: Math.max(0, ticket.capacity - ticket.soldCount),
      availableFrom: ticket.availableFrom,
      availableTo: ticket.availableTo,
    }));

    return NextResponse.json({
      ok: true,
      ticketTypes: ticketTypesWithAvailability
    });

  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}