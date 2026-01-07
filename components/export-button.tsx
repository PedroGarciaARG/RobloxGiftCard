"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import type { Purchase, Sale } from "@/lib/types"

interface ExportButtonProps {
  purchases: Purchase[]
  sales: Sale[]
}

export function ExportButton({ purchases, sales }: ExportButtonProps) {
  const exportToCSV = () => {
    // Create purchases CSV
    const purchasesCSV = [
      "Tipo,Fecha,Precio USD,Cotización,Costo ARS",
      ...purchases.map(
        (p) => `${p.cardType} Robux,${p.purchaseDate},${p.priceUSD},${p.exchangeRate},${p.costARS.toFixed(2)}`,
      ),
    ].join("\n")

    const actualSales = sales.filter((s) => s.platform !== "lost")
    const lostCards = sales.filter((s) => s.platform === "lost")

    // Create sales CSV
    const salesCSV = [
      "Tipo,Fecha,Plataforma,Código Tarjeta,Precio Bruto,Comisión,Neto",
      ...actualSales.map(
        (s) =>
          `${s.cardType} Robux,${s.saleDate},${s.platform},${s.cardCode || ""},${s.salePrice},${s.commission},${s.netAmount}`,
      ),
    ].join("\n")

    const lostCSV = [
      "Tipo,Fecha,Código Tarjeta",
      ...lostCards.map((s) => `${s.cardType} Robux,${s.saleDate},${s.cardCode || ""}`),
    ].join("\n")

    // Calculate summary
    const totalInvestment = purchases.reduce((sum, p) => sum + p.costARS, 0)
    const totalRevenue = actualSales.reduce((sum, s) => sum + s.netAmount, 0)
    const profit = totalRevenue - totalInvestment

    const summaryCSV = [
      "",
      "RESUMEN",
      `Inversión Total,${totalInvestment.toFixed(2)}`,
      `Ingresos Netos,${totalRevenue.toFixed(2)}`,
      `Tarjetas Perdidas,${lostCards.length}`,
      `Ganancia/Pérdida,${profit.toFixed(2)}`,
    ].join("\n")

    const fullCSV = `COMPRAS\n${purchasesCSV}\n\nVENTAS\n${salesCSV}\n\nPÉRDIDAS\n${lostCSV}\n\n${summaryCSV}`

    // Download
    const blob = new Blob([fullCSV], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `roblox-balance-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={exportToCSV}>
      <Download className="h-4 w-4 mr-2" />
      Exportar CSV
    </Button>
  )
}
