"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileSpreadsheet } from "lucide-react"
import type { Purchase, Sale, CardType } from "@/lib/types"

interface ExportAdvancedProps {
  purchases: Purchase[]
  sales: Sale[]
}

const CARD_TYPE_LABELS: Record<string, string> = {
  "400": "400 Robux",
  "800": "800 Robux", 
  "1000": "1000 Robux",
  "steam5": "Steam $5",
  "steam10": "Steam $10",
}

export function ExportAdvanced({ purchases, sales }: ExportAdvancedProps) {
  const [dataType, setDataType] = useState<"purchases" | "sales" | "all">("all")
  const [cardTypeFilter, setCardTypeFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  const filterByDate = <T extends { purchaseDate?: string; saleDate?: string }>(
    items: T[],
    dateField: "purchaseDate" | "saleDate"
  ): T[] => {
    return items.filter((item) => {
      const itemDate = item[dateField]
      if (!itemDate) return false
      
      if (dateFrom && itemDate < dateFrom) return false
      if (dateTo && itemDate > dateTo) return false
      return true
    })
  }

  const filterByCardType = <T extends { cardType: CardType }>(items: T[]): T[] => {
    if (cardTypeFilter === "all") return items
    return items.filter((item) => String(item.cardType) === cardTypeFilter)
  }

  const getFilteredPurchases = (): Purchase[] => {
    let filtered = [...purchases]
    filtered = filterByCardType(filtered)
    filtered = filterByDate(filtered, "purchaseDate")
    return filtered
  }

  const getFilteredSales = (): Sale[] => {
    let filtered = [...sales]
    filtered = filterByCardType(filtered)
    filtered = filterByDate(filtered, "saleDate")
    return filtered
  }

  const getCardTypeLabel = (cardType: CardType): string => {
    return CARD_TYPE_LABELS[String(cardType)] || String(cardType)
  }

  const exportToCSV = () => {
    const filteredPurchases = getFilteredPurchases()
    const filteredSales = getFilteredSales()
    
    let csvContent = ""
    const timestamp = new Date().toISOString().split("T")[0]
    let filename = `export-${timestamp}`

    if (dataType === "purchases" || dataType === "all") {
      csvContent += "COMPRAS\n"
      csvContent += "ID,Tipo,Fecha,Precio USD,Cotizacion,Costo ARS\n"
      filteredPurchases.forEach((p) => {
        csvContent += `${p.id},${getCardTypeLabel(p.cardType)},${p.purchaseDate},${p.priceUSD},${p.exchangeRate},${p.costARS.toFixed(2)}\n`
      })
      
      const totalCost = filteredPurchases.reduce((sum, p) => sum + p.costARS, 0)
      csvContent += `\nTotal Compras:,${filteredPurchases.length}\n`
      csvContent += `Inversion Total:,${totalCost.toFixed(2)} ARS\n`
      csvContent += "\n"
      
      if (dataType === "purchases") filename = `compras-${timestamp}`
    }

    if (dataType === "sales" || dataType === "all") {
      const actualSales = filteredSales.filter((s) => s.platform !== "lost")
      const lostCards = filteredSales.filter((s) => s.platform === "lost")
      
      csvContent += "VENTAS\n"
      csvContent += "ID,Tipo,Fecha,Plataforma,Codigo,Comprador,Precio Bruto,Comision,Neto\n"
      actualSales.forEach((s) => {
        csvContent += `${s.id},${getCardTypeLabel(s.cardType)},${s.saleDate},${s.platform},${s.cardCode || ""},${s.buyerName || ""},${s.salePrice},${s.commission},${s.netAmount}\n`
      })
      
      const totalRevenue = actualSales.reduce((sum, s) => sum + s.netAmount, 0)
      const totalGross = actualSales.reduce((sum, s) => sum + s.salePrice, 0)
      csvContent += `\nTotal Ventas:,${actualSales.length}\n`
      csvContent += `Ingresos Brutos:,${totalGross.toFixed(2)} ARS\n`
      csvContent += `Ingresos Netos:,${totalRevenue.toFixed(2)} ARS\n`
      
      if (lostCards.length > 0) {
        csvContent += "\nPERDIDAS\n"
        csvContent += "ID,Tipo,Fecha,Codigo\n"
        lostCards.forEach((s) => {
          csvContent += `${s.id},${getCardTypeLabel(s.cardType)},${s.saleDate},${s.cardCode || ""}\n`
        })
        csvContent += `\nTotal Perdidas:,${lostCards.length}\n`
      }
      
      if (dataType === "sales") filename = `ventas-${timestamp}`
    }

    // Add filters info
    csvContent += "\n\nFILTROS APLICADOS\n"
    csvContent += `Tipo de datos:,${dataType === "all" ? "Todos" : dataType === "purchases" ? "Compras" : "Ventas"}\n`
    csvContent += `Tipo de tarjeta:,${cardTypeFilter === "all" ? "Todas" : CARD_TYPE_LABELS[cardTypeFilter]}\n`
    csvContent += `Desde:,${dateFrom || "Sin limite"}\n`
    csvContent += `Hasta:,${dateTo || "Sin limite"}\n`

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredPurchasesCount = getFilteredPurchases().length
  const filteredSalesCount = getFilteredSales().length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Exportar Datos
        </CardTitle>
        <CardDescription>
          Exporta compras o ventas filtradas por tipo de tarjeta y rango de fechas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Data type */}
          <div className="space-y-2">
            <Label>Tipo de datos</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as typeof dataType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="purchases">Solo Compras</SelectItem>
                <SelectItem value="sales">Solo Ventas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card type filter */}
          <div className="space-y-2">
            <Label>Tipo de tarjeta</Label>
            <Select value={cardTypeFilter} onValueChange={setCardTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="400">400 Robux</SelectItem>
                <SelectItem value="800">800 Robux</SelectItem>
                <SelectItem value="1000">1000 Robux</SelectItem>
                <SelectItem value="steam5">Steam $5</SelectItem>
                <SelectItem value="steam10">Steam $10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date to */}
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Preview counts */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t border-border pt-4">
          {(dataType === "purchases" || dataType === "all") && (
            <div>
              Compras a exportar: <span className="text-foreground font-medium">{filteredPurchasesCount}</span>
            </div>
          )}
          {(dataType === "sales" || dataType === "all") && (
            <div>
              Ventas a exportar: <span className="text-foreground font-medium">{filteredSalesCount}</span>
            </div>
          )}
        </div>

        {/* Export button */}
        <Button 
          onClick={exportToCSV} 
          className="w-full sm:w-auto"
          disabled={(dataType === "purchases" && filteredPurchasesCount === 0) || 
                   (dataType === "sales" && filteredSalesCount === 0) ||
                   (dataType === "all" && filteredPurchasesCount === 0 && filteredSalesCount === 0)}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar a CSV
        </Button>
      </CardContent>
    </Card>
  )
}
