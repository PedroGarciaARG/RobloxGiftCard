"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download } from "lucide-react"
import type { Purchase, Sale } from "@/lib/types"

interface ExportDialogProps {
  purchases: Purchase[]
  sales: Sale[]
}

export function ExportDialog({ purchases, sales }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [includePurchases, setIncludePurchases] = useState(true)
  const [includeSales, setIncludeSales] = useState(true)
  const [includeLost, setIncludeLost] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [cardTypes, setCardTypes] = useState<{ 400: boolean; 800: boolean; 1000: boolean }>({
    400: true,
    800: true,
    1000: true,
  })

  const filterByDate = <T extends { purchaseDate?: string; saleDate?: string }>(items: T[]): T[] => {
    return items.filter((item) => {
      const itemDate = "purchaseDate" in item ? item.purchaseDate : (item as any).saleDate
      if (!itemDate) return true

      const date = new Date(itemDate)
      if (dateFrom && date < new Date(dateFrom)) return false
      if (dateTo && date > new Date(dateTo + "T23:59:59")) return false
      return true
    })
  }

  const filterByCardType = <T extends { cardType: 400 | 800 | 1000 }>(items: T[]): T[] => {
    return items.filter((item) => cardTypes[item.cardType])
  }

  const exportToExcel = () => {
    const filteredPurchases = filterByCardType(filterByDate(purchases))
    const allSales = filterByCardType(filterByDate(sales))
    const actualSales = allSales.filter((s) => s.platform !== "lost")
    const lostCards = allSales.filter((s) => s.platform === "lost")

    let csvContent = ""

    // Compras
    if (includePurchases && filteredPurchases.length > 0) {
      csvContent += "COMPRAS\n"
      csvContent += "Tipo,Código Tarjeta,Fecha,Precio USD,Cotización,Costo ARS\n"
      filteredPurchases.forEach((p) => {
        csvContent += `${p.cardType} Robux,${p.cardCode || ""},${p.purchaseDate},${p.priceUSD},${p.exchangeRate},${p.costARS.toFixed(2)}\n`
      })
      csvContent += "\n"
    }

    // Ventas
    if (includeSales && actualSales.length > 0) {
      csvContent += "VENTAS\n"
      csvContent += "Tipo,Código Tarjeta,Comprador,Fecha,Plataforma,Precio Bruto,Comisión,Neto\n"
      actualSales.forEach((s) => {
        const platformName = s.platform === "mercadolibre" ? "MercadoLibre" : "Venta Directa"
        csvContent += `${s.cardType} Robux,${s.cardCode || ""},${s.buyerName || ""},${s.saleDate},${platformName},${s.salePrice},${s.commission},${s.netAmount}\n`
      })
      csvContent += "\n"
    }

    // Pérdidas
    if (includeLost && lostCards.length > 0) {
      csvContent += "PÉRDIDAS\n"
      csvContent += "Tipo,Código Tarjeta,Fecha\n"
      lostCards.forEach((s) => {
        csvContent += `${s.cardType} Robux,${s.cardCode || ""},${s.saleDate}\n`
      })
      csvContent += "\n"
    }

    // Resumen
    if (includeSummary) {
      const totalInvestment = filteredPurchases.reduce((sum, p) => sum + p.costARS, 0)
      const totalRevenue = actualSales.reduce((sum, s) => sum + s.netAmount, 0)
      const profit = totalRevenue - totalInvestment

      csvContent += "RESUMEN\n"
      csvContent += `Total Compras,${filteredPurchases.length}\n`
      csvContent += `Total Ventas,${actualSales.length}\n`
      csvContent += `Tarjetas Perdidas,${lostCards.length}\n`
      csvContent += `Inversión Total,$${totalInvestment.toFixed(2)}\n`
      csvContent += `Ingresos Netos,$${totalRevenue.toFixed(2)}\n`
      csvContent += `Ganancia/Pérdida,$${profit.toFixed(2)}\n`
    }

    if (!csvContent) {
      alert("No hay datos para exportar con los filtros seleccionados")
      return
    }

    // Add BOM for Excel UTF-8 compatibility
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url

    const dateStr = new Date().toISOString().split("T")[0]
    link.download = `roblox-balance-${dateStr}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const selectedCardTypes = Object.entries(cardTypes)
    .filter(([_, selected]) => selected)
    .map(([type]) => type)
    .join(", ")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 sm:h-9 text-sm bg-transparent">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exportar Datos</DialogTitle>
          <DialogDescription>Selecciona qué datos exportar y aplica filtros</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tipo de datos */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Datos a incluir</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="purchases"
                  checked={includePurchases}
                  onCheckedChange={(checked) => setIncludePurchases(checked as boolean)}
                />
                <Label htmlFor="purchases" className="text-sm font-normal cursor-pointer">
                  Compras ({purchases.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sales"
                  checked={includeSales}
                  onCheckedChange={(checked) => setIncludeSales(checked as boolean)}
                />
                <Label htmlFor="sales" className="text-sm font-normal cursor-pointer">
                  Ventas ({sales.filter((s) => s.platform !== "lost").length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lost"
                  checked={includeLost}
                  onCheckedChange={(checked) => setIncludeLost(checked as boolean)}
                />
                <Label htmlFor="lost" className="text-sm font-normal cursor-pointer">
                  Pérdidas ({sales.filter((s) => s.platform === "lost").length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <Label htmlFor="summary" className="text-sm font-normal cursor-pointer">
                  Resumen
                </Label>
              </div>
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Rango de fechas</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                }}
                className="h-7 text-xs"
              >
                Limpiar fechas
              </Button>
            )}
          </div>

          {/* Tipo de tarjeta */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de tarjeta</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="card400"
                  checked={cardTypes[400]}
                  onCheckedChange={(checked) => setCardTypes((prev) => ({ ...prev, 400: checked as boolean }))}
                />
                <Label htmlFor="card400" className="text-sm font-normal cursor-pointer">
                  400 Robux
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="card800"
                  checked={cardTypes[800]}
                  onCheckedChange={(checked) => setCardTypes((prev) => ({ ...prev, 800: checked as boolean }))}
                />
                <Label htmlFor="card800" className="text-sm font-normal cursor-pointer">
                  800 Robux
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="card1000"
                  checked={cardTypes[1000]}
                  onCheckedChange={(checked) => setCardTypes((prev) => ({ ...prev, 1000: checked as boolean }))}
                />
                <Label htmlFor="card1000" className="text-sm font-normal cursor-pointer">
                  1000 Robux
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Descargar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
