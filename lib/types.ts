export interface Purchase {
  id: string
  cardType: 400 | 800 | 1000
  priceUSD: number
  exchangeRate: number
  costARS: number
  purchaseDate: string
  createdAt: string
}

export interface Sale {
  id: string
  cardType: 400 | 800 | 1000
  cardCode?: string
  buyerName?: string
  salePrice: number
  commission: number
  netAmount: number
  saleDate: string
  platform: "mercadolibre" | "direct" | "lost"
  quantity: number
  createdAt: string
}
