"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Save, Upload } from "lucide-react"
import type { Purchase, Sale } from "@/lib/types"

interface SettingsPanelProps {
  cardPrices: { [key: string]: number }
  salePricesARS: { [key: string]: number }
  mlCommissions: { [key: string]: number }
  onUpdateAllPrices: (
    purchasePrices: { [key: string]: number },
    salePrices: { [key: string]: number },
    commissions: { [key: string]: number }
  ) => void
  onImportData: (purchases: Purchase[], sales: Sale[]) => void
}

export function SettingsPanel({ cardPrices, salePricesARS, mlCommissions, onUpdateAllPrices, onImportData }: SettingsPanelProps) {
  // Purchase prices (USD)
  const [price400, setPrice400] = useState(cardPrices["400"]?.toString() || "5.17")
  const [price800, setPrice800] = useState(cardPrices["800"]?.toString() || "10.34")
  const [price1000, setPrice1000] = useState(cardPrices["1000"]?.toString() || "10")
  const [priceSteam5, setPriceSteam5] = useState(cardPrices["steam5"]?.toString() || "5")
  const [priceSteam10, setPriceSteam10] = useState(cardPrices["steam10"]?.toString() || "11")
  
  // Sale prices (ARS)
  const [salePrice400, setSalePrice400] = useState(salePricesARS["400"]?.toString() || "13999")
  const [salePrice800, setSalePrice800] = useState(salePricesARS["800"]?.toString() || "27999")
  const [salePrice1000, setSalePrice1000] = useState(salePricesARS["1000"]?.toString() || "34999")
  const [salePriceSteam5, setSalePriceSteam5] = useState(salePricesARS["steam5"]?.toString() || "11999")
  const [salePriceSteam10, setSalePriceSteam10] = useState(salePricesARS["steam10"]?.toString() || "24999")
  
  // ML Commissions (ARS)
  const [commission400, setCommission400] = useState(mlCommissions["400"]?.toString() || "3284.84")
  const [commission800, setCommission800] = useState(mlCommissions["800"]?.toString() || "6995")
  const [commission1000, setCommission1000] = useState(mlCommissions["1000"]?.toString() || "8500")
  const [commissionSteam5, setCommissionSteam5] = useState(mlCommissions["steam5"]?.toString() || "2800")
  const [commissionSteam10, setCommissionSteam10] = useState(mlCommissions["steam10"]?.toString() || "5800")
  
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    setPrice400(cardPrices["400"]?.toString() || "5.17")
    setPrice800(cardPrices["800"]?.toString() || "10.34")
    setPrice1000(cardPrices["1000"]?.toString() || "10")
    setPriceSteam5(cardPrices["steam5"]?.toString() || "5")
    setPriceSteam10(cardPrices["steam10"]?.toString() || "11")
  }, [cardPrices])

  useEffect(() => {
    setSalePrice400(salePricesARS["400"]?.toString() || "13999")
    setSalePrice800(salePricesARS["800"]?.toString() || "27999")
    setSalePrice1000(salePricesARS["1000"]?.toString() || "34999")
    setSalePriceSteam5(salePricesARS["steam5"]?.toString() || "11999")
    setSalePriceSteam10(salePricesARS["steam10"]?.toString() || "24999")
  }, [salePricesARS])

  useEffect(() => {
    setCommission400(mlCommissions["400"]?.toString() || "3284.84")
    setCommission800(mlCommissions["800"]?.toString() || "6995")
    setCommission1000(mlCommissions["1000"]?.toString() || "8500")
    setCommissionSteam5(mlCommissions["steam5"]?.toString() || "2800")
    setCommissionSteam10(mlCommissions["steam10"]?.toString() || "5800")
  }, [mlCommissions])

  const handleSavePrices = () => {
    const purchasePrices: { [key: string]: number } = {
      "400": Number.parseFloat(price400) || 5.17,
      "800": Number.parseFloat(price800) || 10.34,
      "1000": Number.parseFloat(price1000) || 10,
      "steam5": Number.parseFloat(priceSteam5) || 5,
      "steam10": Number.parseFloat(priceSteam10) || 11,
    }
    const salePrices: { [key: string]: number } = {
      "400": Number.parseFloat(salePrice400) || 13999,
      "800": Number.parseFloat(salePrice800) || 27999,
      "1000": Number.parseFloat(salePrice1000) || 34999,
      "steam5": Number.parseFloat(salePriceSteam5) || 11999,
      "steam10": Number.parseFloat(salePriceSteam10) || 24999,
    }
    const commissions: { [key: string]: number } = {
      "400": Number.parseFloat(commission400) || 3284.84,
      "800": Number.parseFloat(commission800) || 6995,
      "1000": Number.parseFloat(commission1000) || 8500,
      "steam5": Number.parseFloat(commissionSteam5) || 2800,
      "steam10": Number.parseFloat(commissionSteam10) || 5800,
    }
    onUpdateAllPrices(purchasePrices, salePrices, commissions)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
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

          // Skip headers
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
            const cardType = parts[0].includes("1000") ? 1000 : parts[0].includes("800") ? 800 : 400
            const date = parseDate(parts[1])
            const priceUSD = Number.parseFloat(parts[2]) || (cardType === 400 ? 5.17 : cardType === 800 ? 10.34 : 10)
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
            const cardType = parts[0].includes("1000") ? 1000 : parts[0].includes("800") ? 800 : 400
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
            const cardType = parts[0].includes("1000") ? 1000 : parts[0].includes("800") ? 800 : 400
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

    // Try different date formats
    // Format: DD/MM/YYYY
    let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match) {
      const [, day, month, year] = match
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    // Format: YYYY-MM-DD
    match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return dateStr
    }

    // Format: DD-MM-YYYY
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
        {/* Purchase Prices (USD) */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Precios de Compra (USD)</h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="price400" className="text-xs">
                400 Robux
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
              <Label htmlFor="price800" className="text-xs">
                800 Robux
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
            <div className="space-y-2">
              <Label htmlFor="price1000" className="text-xs">
                1000 Robux
              </Label>
              <Input
                id="price1000"
                type="number"
                step="0.01"
                value={price1000}
                onChange={(e) => setPrice1000(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceSteam5" className="text-xs">
                Steam $5
              </Label>
              <Input
                id="priceSteam5"
                type="number"
                step="0.01"
                value={priceSteam5}
                onChange={(e) => setPriceSteam5(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceSteam10" className="text-xs">
                Steam $10
              </Label>
              <Input
                id="priceSteam10"
                type="number"
                step="0.01"
                value={priceSteam10}
                onChange={(e) => setPriceSteam10(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </div>

        {/* Sale Prices (ARS) */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium text-sm text-muted-foreground">Precios de Venta ML (ARS)</h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="salePrice400" className="text-xs">
                400 Robux
              </Label>
              <Input
                id="salePrice400"
                type="number"
                step="1"
                value={salePrice400}
                onChange={(e) => setSalePrice400(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice800" className="text-xs">
                800 Robux
              </Label>
              <Input
                id="salePrice800"
                type="number"
                step="1"
                value={salePrice800}
                onChange={(e) => setSalePrice800(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice1000" className="text-xs">
                1000 Robux
              </Label>
              <Input
                id="salePrice1000"
                type="number"
                step="1"
                value={salePrice1000}
                onChange={(e) => setSalePrice1000(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePriceSteam5" className="text-xs">
                Steam $5
              </Label>
              <Input
                id="salePriceSteam5"
                type="number"
                step="1"
                value={salePriceSteam5}
                onChange={(e) => setSalePriceSteam5(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePriceSteam10" className="text-xs">
                Steam $10
              </Label>
              <Input
                id="salePriceSteam10"
                type="number"
                step="1"
                value={salePriceSteam10}
                onChange={(e) => setSalePriceSteam10(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </div>

        {/* ML Commissions (ARS) */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-medium text-sm text-muted-foreground">Comisiones ML (ARS)</h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="commission400" className="text-xs">
                400 Robux
              </Label>
              <Input
                id="commission400"
                type="number"
                step="0.01"
                value={commission400}
                onChange={(e) => setCommission400(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission800" className="text-xs">
                800 Robux
              </Label>
              <Input
                id="commission800"
                type="number"
                step="0.01"
                value={commission800}
                onChange={(e) => setCommission800(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission1000" className="text-xs">
                1000 Robux
              </Label>
              <Input
                id="commission1000"
                type="number"
                step="0.01"
                value={commission1000}
                onChange={(e) => setCommission1000(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionSteam5" className="text-xs">
                Steam $5
              </Label>
              <Input
                id="commissionSteam5"
                type="number"
                step="0.01"
                value={commissionSteam5}
                onChange={(e) => setCommissionSteam5(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionSteam10" className="text-xs">
                Steam $10
              </Label>
              <Input
                id="commissionSteam10"
                type="number"
                step="0.01"
                value={commissionSteam10}
                onChange={(e) => setCommissionSteam10(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          <Button onClick={handleSavePrices} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Guardar Todos los Precios
          </Button>
          {saveSuccess && (
            <div className="flex items-center text-sm text-green-600">
              Precios guardados correctamente
            </div>
          )}
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
