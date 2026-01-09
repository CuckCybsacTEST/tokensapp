import { supabaseAdmin } from '@/lib/supabase';

/**
 * Servicio para gestión de tickets usando Supabase
 */

// Interfaces para tickets
export interface TicketType {
  id: string;
  showId: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  soldCount: number;
  availableFrom?: string;
  availableTo?: string;
  createdAt: string;
  updatedAt: string;
  show?: Show;
}

export interface TicketPurchase {
  id: string;
  userId?: string;
  ticketTypeId: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  purchasedAt: string;
  createdAt: string;
  updatedAt: string;
  ticketType?: TicketType;
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  ticketPurchaseId: string;
  qrCode: string;
  qrDataUrl?: string;
  status: string;
  customerName?: string;
  customerDni?: string;
  customerPhone?: string;
  usedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface para Show (simplificada para evitar importaciones circulares)
interface Show {
  id: string;
  title: string;
  startsAt: string;
  imageWebpPath?: string;
  status: string;
  slug?: string;
}

// Funciones para TicketType
export async function getTicketTypesForShow(showId: string): Promise<TicketType[]> {
  const { data, error } = await supabaseAdmin
    .from('TicketType')
    .select('*')
    .eq('showId', showId)
    .order('createdAt', { ascending: true });

  if (error) throw new Error(`Error fetching ticket types: ${error.message}`);
  return data || [];
}

export async function createTicketType(ticketType: Omit<TicketType, 'id' | 'createdAt' | 'updatedAt'>): Promise<TicketType> {
  const { data, error } = await supabaseAdmin
    .from('TicketType')
    .insert(ticketType)
    .select()
    .single();

  if (error) throw new Error(`Error creating ticket type: ${error.message}`);
  return data;
}

export async function updateTicketType(id: string, updates: Partial<TicketType>): Promise<TicketType> {
  const { data, error } = await supabaseAdmin
    .from('TicketType')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating ticket type: ${error.message}`);
  return data;
}

export async function deleteTicketType(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('TicketType')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Error deleting ticket type: ${error.message}`);
}

// Funciones para TicketPurchase
export async function getTicketPurchasesForUser(userId: string): Promise<TicketPurchase[]> {
  const { data, error } = await supabaseAdmin
    .from('TicketPurchase')
    .select(`
      *,
      ticketType:TicketType(
        *,
        show:Show(*)
      ),
      tickets:Ticket(*)
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) throw new Error(`Error fetching ticket purchases: ${error.message}`);
  return data || [];
}

export async function getAllTicketPurchases(): Promise<TicketPurchase[]> {
  const { data, error } = await supabaseAdmin
    .from('TicketPurchase')
    .select(`
      *,
      ticketType:TicketType(*)
    `)
    .order('createdAt', { ascending: false });

  if (error) throw new Error(`Error fetching all ticket purchases: ${error.message}`);
  return data || [];
}

export async function createTicketPurchase(purchase: Omit<TicketPurchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TicketPurchase> {
  const { data, error } = await supabaseAdmin
    .from('TicketPurchase')
    .insert(purchase)
    .select()
    .single();

  if (error) throw new Error(`Error creating ticket purchase: ${error.message}`);
  return data;
}

// Funciones para Ticket
export async function getTicketsForPurchase(purchaseId: string): Promise<Ticket[]> {
  const { data, error } = await supabaseAdmin
    .from('Ticket')
    .select('*')
    .eq('ticketPurchaseId', purchaseId)
    .order('createdAt', { ascending: true });

  if (error) throw new Error(`Error fetching tickets: ${error.message}`);
  return data || [];
}

export async function getTicketByIdForUser(ticketId: string, userId: string): Promise<Ticket | null> {
  const { data, error } = await supabaseAdmin
    .from('Ticket')
    .select(`
      *,
      ticketPurchase:TicketPurchase!inner(
        userId,
        ticketType:TicketType(
          show:Show(
            id,
            title,
            startsAt,
            imageWebpPath,
            status
          )
        )
      )
    `)
    .eq('id', ticketId)
    .eq('ticketPurchase.userId', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Ticket;
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ticket> {
  const { data, error } = await supabaseAdmin
    .from('Ticket')
    .insert(ticket)
    .select()
    .single();

  if (error) throw new Error(`Error creating ticket: ${error.message}`);
  return data;
}

export async function updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
  const { data, error } = await supabaseAdmin
    .from('Ticket')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error updating ticket: ${error.message}`);
  return data;
}