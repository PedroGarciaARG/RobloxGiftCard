export type CardType = 400 | 800 | 1000 | "steam5" | "steam10"

export interface Purchase {
  id: string
  cardType: CardType
  priceUSD: number
  exchangeRate: number
  costARS: number
  purchaseDate: string
  createdAt: string
}

export interface Sale {
  id: string
  cardType: CardType
  cardCode?: string
  buyerName?: string
  salePrice: number
  commission: number
  netAmount: number
  saleDate: string
  platform: "mercadolibre" | "direct" | "lost"
  quantity: number
  createdAt: string
  // ML fees breakdown
  mlCargoVenta?: number
  mlCostoFijo?: number
  mlCostoEnvio?: number
  mlImpuestos?: number
  mlDescuentos?: number
  mlAnulaciones?: number
  // Buyer data
  buyerDNI?: string
  buyerAddress?: string
  buyerCity?: string
  buyerState?: string
  buyerPostalCode?: string
  buyerCountry?: string
  // ML order info
  mlOrderId?: string
  mlPublicationId?: string
  mlStatus?: string
}

export interface GiftCardCode {
  id: string
  cardType: CardType
  code: string
  createdAt: string
  imageConfirmedAt?: string
  deliveredAt?: string
  deliveredTo?: string
  status: "available" | "image_ready" | "delivered"
}
