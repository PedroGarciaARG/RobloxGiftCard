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
    steam5: todaySales.filter((s) => s.cardType === "steam5").reduce((sum, s) => sum + s.quantity, 0),
    steam10: todaySales.filter((s) => s.cardType === "steam10").reduce((sum, s) => sum + s.quantity, 0),
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
        <div className="mt-2 text-[10px] sm:text-xs text-sky-400 flex flex-wrap gap-x-1 gap-y-0.5">
          <span>400R: {todayByType[400]}</span>
          <span>|</span>
          <span>800R: {todayByType[800]}</span>
          <span>|</span>
          <span>10USD: {todayByType[1000]}</span>
          {(todayByType.steam5 > 0 || todayByType.steam10 > 0) && (
            <>
              <span>|</span>
              <span>S$5: {todayByType.steam5}</span>
              <span>|</span>
              <span>S$10: {todayByType.steam10}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
