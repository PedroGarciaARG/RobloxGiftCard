"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, TrendingUp } from "lucide-react"
import type { Sale } from "@/lib/types"

interface DailySalesCounterProps {
  sales: Sale[]
}

export function DailySalesCounter({ sales }: DailySalesCounterProps) {
  const today = new Date().toISOString().split("T")[0]

  const todaySales = sales.filter((s) => s.saleDate === today && s.platform !== "lost")
  const todayCount = todaySales.reduce((sum, s) => sum + s.quantity, 0)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.netAmount, 0)

  const todayByType = {
    400: todaySales.filter((s) => s.cardType === 400).reduce((sum, s) => sum + s.quantity, 0),
    800: todaySales.filter((s) => s.cardType === 800).reduce((sum, s) => sum + s.quantity, 0),
    1000: todaySales.filter((s) => s.cardType === 1000).reduce((sum, s) => sum + s.quantity, 0),
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Ventas de Hoy</CardTitle>
        <CalendarDays className="h-4 w-4 text-green-600 dark:text-green-400" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-700 dark:text-green-300">{todayCount}</span>
          <span className="text-sm text-green-600 dark:text-green-400">tarjetas</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>${todayRevenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          400R: {todayByType[400]} | 800R: {todayByType[800]} | 1000R: {todayByType[1000]}
        </div>
      </CardContent>
    </Card>
  )
}
