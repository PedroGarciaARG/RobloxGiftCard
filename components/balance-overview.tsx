"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle } from "lucide-react"
import type { Purchase, Sale } from "@/lib/types"

interface BalanceOverviewProps {
  purchases: Purchase[]
  sales: Sale[]
}

export function BalanceOverview({ purchases, sales }: BalanceOverviewProps) {
  const totalPurchaseCostARS = purchases.reduce((sum, p) => sum + p.costARS, 0)

  const actualSales = sales.filter((s) => s.platform !== "lost")
  const lostCards = sales.filter((s) => s.platform === "lost")

  const totalSalesRevenue = actualSales.reduce((sum, s) => sum + s.netAmount, 0)
  const totalLostValue = lostCards.reduce((sum, s) => {
    const samePurchases = purchases.filter((p) => p.cardType === s.cardType)
    const avgCost =
      samePurchases.length > 0 ? samePurchases.reduce((a, p) => a + p.costARS, 0) / samePurchases.length : 0
    return sum + avgCost
  }, 0)

  const purchases400 = purchases.filter((p) => p.cardType === 400).length
  const purchases800 = purchases.filter((p) => p.cardType === 800).length
  const purchases1000 = purchases.filter((p) => p.cardType === 1000).length

  const sold400 = sales
    .filter((s) => s.cardType === 400 && s.platform !== "lost")
    .reduce((sum, s) => sum + s.quantity, 0)
  const sold800 = sales
    .filter((s) => s.cardType === 800 && s.platform !== "lost")
    .reduce((sum, s) => sum + s.quantity, 0)
  const sold1000 = sales
    .filter((s) => s.cardType === 1000 && s.platform !== "lost")
    .reduce((sum, s) => sum + s.quantity, 0)

  const lost400 = lostCards.filter((s) => s.cardType === 400).length
  const lost800 = lostCards.filter((s) => s.cardType === 800).length
  const lost1000 = lostCards.filter((s) => s.cardType === 1000).length

  const available400 = purchases400 - sold400 - lost400
  const available800 = purchases800 - sold800 - lost800
  const available1000 = purchases1000 - sold1000 - lost1000
  const totalAvailable = available400 + available800 + available1000

  const soldCards = actualSales.reduce((sum, s) => sum + s.quantity, 0)
  const lostCardsCount = lostCards.length

  const profit = totalSalesRevenue - totalPurchaseCostARS

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Inversión</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">
            ${totalPurchaseCostARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{purchases.length} compradas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Ingresos</CardTitle>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">
            ${totalSalesRevenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{soldCards} vendidas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Pérdidas</CardTitle>
          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold text-red-600">
            ${totalLostValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{lostCardsCount} perdidas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">{profit >= 0 ? "Ganancia" : "Pérdida"}</CardTitle>
          {profit >= 0 ? (
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className={`text-lg sm:text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${Math.abs(profit).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
        </CardContent>
      </Card>

      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Stock Disponible</CardTitle>
          <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold">{totalAvailable}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            400R: {available400} | 800R: {available800} | 1000R: {available1000}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
