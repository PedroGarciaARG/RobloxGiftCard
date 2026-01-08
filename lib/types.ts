export interface Purchase {
  id: string
  cardType: 400 | 800
  priceUSD: number
  exchangeRate: number
  costARS: number
  purchaseDate: string
  createdAt: string
}

export interface Sale {
  id: string
  cardType: 400 | 800
  cardCode?: string
  salePrice: number
  commission: number
  netAmount: number
  saleDate: string
  platform: "mercadolibre" | "direct" | "lost"
  quantity: number
  createdAt: string
}

export interface SalePrices {
  mlPrice400: number
  mlPrice800: number
  mlCommission400: number
  mlCommission800: number
}
