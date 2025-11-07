export interface OfferWithPurchases {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  imagePath?: string;
  maxQuantity?: number;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  availableDays?: number[];
  startTime?: string;
  endTime?: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    purchases: number;
  };
  purchases: Array<{
    amount: number;
    currency: string;
    createdAt: Date;
  }>;
}

export interface OfferPurchaseWithDetails {
  id: string;
  offerId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  culqiChargeId?: string;
  culqiPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  offer: {
    id: string;
    title: string;
    description: string;
    price: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface OfferAvailability {
  isAvailable: boolean;
  nextAvailableTime?: Date;
  availabilityText: string;
}

export interface FormattedOffer {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  maxStock?: number;
  currentStock?: number;
  validFrom?: Date;
  validUntil?: Date;
  availableDays?: number[];
  startTime?: string;
  endTime?: string;
  availabilityText: string;
  isAvailable: boolean;
  createdAt: Date;
}
