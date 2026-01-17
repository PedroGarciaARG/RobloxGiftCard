"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle } from "lucide-react"
import type { Purchase, Sale } from "@/lib/types"
import Image from "next/image"

const CARD_IMAGES = {
  400: "/images/400-20robux.jpeg",
  800: "/images/800-20robux.jpeg",
  1000: "/images/10-20usd.jpeg",
}

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
    <div className="space-y-4">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-sky-500/20 to-sky-600/10 border-sky-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-sky-300">Inversión</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-sky-400" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-white">
              ${totalPurchaseCostARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] sm:text-xs text-sky-400">{purchases.length} compradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-amber-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-amber-300">Ingresos</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-white">
              ${totalSalesRevenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] sm:text-xs text-amber-400">{soldCards} vendidas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-300">Pérdidas</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-red-400">
              ${totalLostValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] sm:text-xs text-red-400">{lostCardsCount} perdidas</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br ${profit >= 0 ? "from-green-500/20 to-emerald-600/10 border-green-500/30" : "from-red-500/20 to-red-600/10 border-red-500/30"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className={`text-xs sm:text-sm font-medium ${profit >= 0 ? "text-green-300" : "text-red-300"}`}>
              {profit >= 0 ? "Ganancia" : "Pérdida"}
            </CardTitle>
            {profit >= 0 ? (
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className={`text-lg sm:text-2xl font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${Math.abs(profit).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </div>
            <p className={`text-[10px] sm:text-xs ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>Balance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-sky-500/30 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-sky-400" />
            Stock Disponible
          </CardTitle>
          <span className="text-2xl font-bold text-amber-400">{totalAvailable}</span>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {/* 400 Robux Card */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 border border-amber-500/20">
              <Image
                src={CARD_IMAGES[400] || "/placeholder.svg"}
                alt="400 Robux"
                width={60}
                height={80}
                className="rounded-md mb-2 shadow-lg"
              />
              <span className="text-xs text-muted-foreground">400 Robux</span>
              <span className="text-xl font-bold text-amber-400">{available400}</span>
            </div>

            {/* 800 Robux Card */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 border border-amber-500/20">
              <Image
                src={CARD_IMAGES[800] || "/placeholder.svg"}
                alt="800 Robux"
                width={60}
                height={80}
                className="rounded-md mb-2 shadow-lg"
              />
              <span className="text-xs text-muted-foreground">800 Robux</span>
              <span className="text-xl font-bold text-amber-400">{available800}</span>
            </div>

            {/* 10 USD Card */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 border border-amber-500/20">
              <Image
                src={CARD_IMAGES[1000] || "/placeholder.svg"}
                alt="10 USD"
                width={60}
                height={80}
                className="rounded-md mb-2 shadow-lg"
              />
              <span className="text-xs text-muted-foreground">10 USD</span>
              <span className="text-xl font-bold text-amber-400">{available1000}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
