"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle } from "lucide-react"
import type { Purchase, Sale } from "@/lib/types"

interface BalanceOverviewProps {
  purchases: Purchase[]
  sales: Sale[]
}

export function BalanceOverview({ purchases, sales }: BalanceOverviewProps) {
  // Calculate totals
  const totalPurchaseCostARS = purchases.reduce((sum, p) => sum + p.costARS, 0)

  const actualSales = sales.filter((s) => s.platform !== "lost")
  const lostCards = sales.filter((s) => s.platform === "lost")

  const totalSalesRevenue = actualSales.reduce((sum, s) => sum + s.netAmount, 0)
  const totalLostValue = lostCards.reduce((sum, s) => {
    // Calcular costo de la tarjeta perdida basado en el promedio de compras del mismo tipo
    const samePurchases = purchases.filter((p) => p.cardType === s.cardType)
    const avgCost =
      samePurchases.length > 0 ? samePurchases.reduce((a, p) => a + p.costARS, 0) / samePurchases.length : 0
    return sum + avgCost
  }, 0)

  const totalCards400 = purchases.filter((p) => p.cardType === 400).length
  const totalCards800 = purchases.filter((p) => p.cardType === 800).length

  const soldCards = actualSales.reduce((sum, s) => sum + s.quantity, 0)
  const lostCardsCount = lostCards.length
  const availableCards = purchases.length - soldCards - lostCardsCount

  const profit = totalSalesRevenue - totalPurchaseCostARS

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalPurchaseCostARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground">{purchases.length} tarjetas compradas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Netos</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalSalesRevenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground">{soldCards} tarjetas vendidas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pérdidas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${totalLostValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground">{lostCardsCount} tarjetas perdidas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{profit >= 0 ? "Ganancia" : "Pérdida"}</CardTitle>
          {profit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${Math.abs(profit).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground">Balance actual</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{availableCards}</div>
          <p className="text-xs text-muted-foreground">
            400R: {totalCards400} | 800R: {totalCards800}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
