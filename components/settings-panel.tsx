"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Save, Upload } from "lucide-react"
import type { Purchase, Sale, SalePrices } from "@/lib/types"

interface SettingsPanelProps {
  cardPrices: { [key: number]: number }
  salePrices: SalePrices
  onUpdatePrices: (prices: { [key: number]: number }) => void
  onUpdateSalePrices: (prices: SalePrices) => void
  onImportData: (purchases: Purchase[], sales: Sale[]) => void
}

export function SettingsPanel({
  cardPrices,
  salePrices,
  onUpdatePrices,
  onUpdateSalePrices,
  onImportData,
}: SettingsPanelProps) {
  const [price400, setPrice400] = useState(cardPrices[400]?.toString() || "5.17")
  const [price800, setPrice800] = useState(cardPrices[800]?.toString() || "10.34")
  const [mlPrice400, setMlPrice400] = useState(salePrices.mlPrice400.toString())
  const [mlPrice800, setMlPrice800] = useState(salePrices.mlPrice800.toString())
  const [mlCommission400, setMlCommission400] = useState(salePrices.mlCommission400.toString())
  const [mlCommission800, setMlCommission800] = useState(salePrices.mlCommission800.toString())
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  useEffect(() => {
    setPrice400(cardPrices[400]?.toString() || "5.17")
    setPrice800(cardPrices[800]?.toString() || "10.34")
  }, [cardPrices])

  useEffect(() => {
    setMlPrice400(salePrices.mlPrice400.toString())
    setMlPrice800(salePrices.mlPrice800.toString())
    setMlCommission400(salePrices.mlCommission400.toString())
    setMlCommission800(salePrices.mlCommission800.toString())
  }, [salePrices])

  const handleSavePrices = () => {
    const newPrices = {
      400: Number.parseFloat(price400) || 5.17,
      800: Number.parseFloat(price800) || 10.34,
    }
    onUpdatePrices(newPrices)
    alert("Precios de compra actualizados correctamente")
  }

  const handleSaveSalePrices = () => {
    const newSalePrices: SalePrices = {
      mlPrice400: Number.parseFloat(mlPrice400) || 13999,
      mlPrice800: Number.parseFloat(mlPrice800) || 27999,
      mlCommission400: Number.parseFloat(mlCommission400) || 3284.84,
      mlCommission800: Number.parseFloat(mlCommission800) || 6995,
    }
    onUpdateSalePrices(newSalePrices)
    alert("Precios de venta actualizados correctamente")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)
    setImportSuccess(false)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())

        const purchases: Purchase[] = []
        const sales: Sale[] = []

        let section = ""

        for (const line of lines) {
          const trimmed = line.trim().toUpperCase()

          if (trimmed === "COMPRAS" || trimmed.includes("COMPRAS")) {
            section = "compras"
            continue
          }
          if (trimmed === "VENTAS" || trimmed.includes("VENTAS")) {
            section = "ventas"
            continue
          }
          if (trimmed === "PÉRDIDAS" || trimmed.includes("PERDIDAS") || trimmed.includes("PÉRDIDAS")) {
            section = "perdidas"
            continue
          }
          if (trimmed === "RESUMEN" || trimmed.includes("RESUMEN")) {
            section = "resumen"
            continue
          }

          if (
            trimmed.includes("TIPO") ||
            trimmed.includes("FECHA") ||
            trimmed.includes("PRECIO") ||
            trimmed.includes("INVERSIÓN") ||
            trimmed.includes("INGRESOS") ||
            trimmed.includes("GANANCIA") ||
            trimmed.includes("TARJETAS")
          ) {
            continue
          }

          const parts = line.split(",").map((p) => p.trim())

          if (section === "compras" && parts.length >= 5) {
            const cardType = parts[0].includes("800") ? 800 : 400
            const date = parseDate(parts[1])
            const priceUSD = Number.parseFloat(parts[2]) || (cardType === 400 ? 5.17 : 10.34)
            const rate = Number.parseFloat(parts[3]) || 1000
            const costARS = Number.parseFloat(parts[4]) || priceUSD * rate

            if (date) {
              purchases.push({
                id: crypto.randomUUID(),
                cardType,
                priceUSD,
                exchangeRate: rate,
                costARS,
                purchaseDate: date,
                createdAt: new Date().toISOString(),
              })
            }
          }

          if (section === "ventas" && parts.length >= 5) {
            const cardType = parts[0].includes("800") ? 800 : 400
            const date = parseDate(parts[1])
            const platform = parts[2].toLowerCase().includes("ml") ? "mercadolibre" : "direct"
            const cardCode = parts[3] || undefined
            const salePrice = Number.parseFloat(parts[4]) || 0
            const commission = Number.parseFloat(parts[5]) || 0
            const netAmount = Number.parseFloat(parts[6]) || salePrice - commission

            if (date) {
              sales.push({
                id: crypto.randomUUID(),
                cardType,
                cardCode,
                salePrice,
                commission,
                netAmount,
                saleDate: date,
                platform,
                quantity: 1,
                createdAt: new Date().toISOString(),
              })
            }
          }

          if (section === "perdidas" && parts.length >= 2) {
            const cardType = parts[0].includes("800") ? 800 : 400
            const date = parseDate(parts[1])
            const cardCode = parts[2] || undefined

            if (date) {
              sales.push({
                id: crypto.randomUUID(),
                cardType,
                cardCode,
                salePrice: 0,
                commission: 0,
                netAmount: 0,
                saleDate: date,
                platform: "lost",
                quantity: 1,
                createdAt: new Date().toISOString(),
              })
            }
          }
        }

        if (purchases.length === 0 && sales.length === 0) {
          setImportError("No se encontraron datos válidos en el archivo. Asegúrate de que el formato sea correcto.")
          return
        }

        onImportData(purchases, sales)
        setImportSuccess(true)
        setTimeout(() => setImportSuccess(false), 3000)
      } catch (error) {
        console.error("Import error:", error)
        setImportError("Error al procesar el archivo. Verifica el formato.")
      }
    }

    reader.readAsText(file)
    e.target.value = ""
  }

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null

    let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match) {
      const [, day, month, year] = match
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return dateStr
    }

    match = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})/)
    if (match) {
      const [, day, month, year] = match
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    return null
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
        {/* Price Editor - Purchase Prices */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Precios de Compra (USD)</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price400" className="text-sm">
                400 Robux (USD)
              </Label>
              <Input
                id="price400"
                type="number"
                step="0.01"
                value={price400}
                onChange={(e) => setPrice400(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price800" className="text-sm">
                800 Robux (USD)
              </Label>
              <Input
                id="price800"
                type="number"
                step="0.01"
                value={price800}
                onChange={(e) => setPrice800(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          </div>
          <Button onClick={handleSavePrices} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Guardar Precios de Compra
          </Button>
        </div>

        {/* Sale Prices Section */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Precios de Venta MercadoLibre (ARS)</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mlPrice400" className="text-sm">
                Precio 400 Robux
              </Label>
              <Input
                id="mlPrice400"
                type="number"
                step="1"
                value={mlPrice400}
                onChange={(e) => setMlPrice400(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mlPrice800" className="text-sm">
                Precio 800 Robux
              </Label>
              <Input
                id="mlPrice800"
                type="number"
                step="1"
                value={mlPrice800}
                onChange={(e) => setMlPrice800(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mlCommission400" className="text-sm">
                Comisión 400 Robux
              </Label>
              <Input
                id="mlCommission400"
                type="number"
                step="0.01"
                value={mlCommission400}
                onChange={(e) => setMlCommission400(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mlCommission800" className="text-sm">
                Comisión 800 Robux
              </Label>
              <Input
                id="mlCommission800"
                type="number"
                step="0.01"
                value={mlCommission800}
                onChange={(e) => setMlCommission800(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          </div>
          <Button onClick={handleSaveSalePrices} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Guardar Precios de Venta
          </Button>
        </div>

        {/* Import Section */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Importar Datos</h3>
          <p className="text-xs text-muted-foreground">
            Importa datos desde un archivo CSV exportado previamente o con el formato:
            <br />
            <code className="bg-muted px-1 rounded">COMPRAS: Tipo,Fecha,PrecioUSD,Cotización,CostoARS</code>
            <br />
            <code className="bg-muted px-1 rounded">VENTAS: Tipo,Fecha,Plataforma,Código,Precio,Comisión,Neto</code>
          </p>

          <div className="flex flex-col gap-2">
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} id="file-upload" className="hidden" />
            <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
              <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                Seleccionar Archivo CSV
              </label>
            </Button>
          </div>

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
            </div>
          )}

          {importSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">Datos importados correctamente</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
