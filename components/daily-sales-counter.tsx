"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, TrendingUp } from "lucide-react"
import type { Sale } from "@/lib/types"

interface DailySalesCounterProps {
  sales: Sale[]
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") {
    return null
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return null
  }
  return date.toISOString().split("T")[0]
}

function getTodayLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DailySalesCounter({ sales }: DailySalesCounterProps) {
  const today = getTodayLocal()

  const todaySales = sales.filter((s) => {
    const saleDate = normalizeDate(s.saleDate)
    return saleDate === today && s.platform !== "lost"
  })

  const todayCount = todaySales.reduce((sum, s) => sum + s.quantity, 0)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.netAmount, 0)

  const todayByType = {
    400: todaySales.filter((s) => s.cardType === 400).reduce((sum, s) => sum + s.quantity, 0),
    800: todaySales.filter((s) => s.cardType === 800).reduce((sum, s) => sum + s.quantity, 0),
    1000: todaySales.filter((s) => s.cardType === 1000).reduce((sum, s) => sum + s.quantity, 0),
  }

  return (
    <Card className="bg-gradient-to-br from-sky-500/20 to-sky-600/10 border-sky-500/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-medium text-sky-300">Ventas de Hoy</CardTitle>
        <CalendarDays className="h-4 w-4 text-sky-400" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-xs text-sky-400/70 mb-1">{today}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{todayCount}</span>
          <span className="text-sm text-sky-300">tarjetas</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-sm text-amber-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>${todayRevenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="mt-2 text-xs text-sky-400">
          400R: {todayByType[400]} | 800R: {todayByType[800]} | 10USD: {todayByType[1000]}
        </div>
      </CardContent>
    </Card>
  )
}
