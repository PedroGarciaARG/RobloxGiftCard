"use client"

import React, { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2, Upload } from "lucide-react"
import type { Purchase, CardType } from "@/lib/types"

interface PurchaseFileImportProps {
  onImportPurchases: (purchases: Purchase[]) => Promise<void>
  cardPrices: { [key: string]: number }
}

interface ParsedPurchase {
  id: string
  cardType: CardType | null
  cardTypeLabel: string
  priceUSD: number
  date: string
  quantity: number
  exchangeRate: number
  costARS: number
  rawLine: string
}

// Map card type names from Excel to internal types
function mapCardType(producto: string): { cardType: CardType | null; label: string } {
  if (!producto) return { cardType: null, label: "Sin producto" }
  
  const lower = producto.toLowerCase().trim()
  
  // Steam $10
  if (lower.includes("steam") && (lower.includes("10") || lower.includes("$10"))) {
    return { cardType: "steam10", label: "Steam $10" }
  }
  
  // Steam $5
  if (lower.includes("steam") && (lower.includes("5") || lower.includes("$5"))) {
    return { cardType: "steam5", label: "Steam $5" }
  }
  
  // Roblox Gift Card - 400 Robux GLOBAL
  if ((lower.includes("roblox") || lower.includes("reblox")) && lower.includes("400")) {
    return { cardType: 400, label: "400 Robux" }
  }
  
  // Roblox Gift Card 800 Robux GLOBAL
  if ((lower.includes("roblox") || lower.includes("reblox")) && lower.includes("800")) {
    return { cardType: 800, label: "800 Robux" }
  }
  
  // Roblox 1000 Robux explicit
  if ((lower.includes("roblox") || lower.includes("reblox")) && lower.includes("1000")) {
    return { cardType: 1000, label: "1000 Robux" }
  }
  
  // Roblox $10 / 10 usd Global (1000 Robux) - check this AFTER 400, 800, 1000
  if ((lower.includes("roblox") || lower.includes("reblox")) && (lower.includes("$10") || lower.includes("10 usd") || lower.includes("10usd") || /\b10\b/.test(lower))) {
    return { cardType: 1000, label: "1000 Robux ($10)" }
  }
  
  return { cardType: null, label: `No reconocido: ${producto}` }
}

// Parse date from various formats
function parseDate(value: unknown): string {
  if (!value) return ""
  
  // If it's a Date object (from Excel)
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  
  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
    }
  }
  
  // If it's a string
  const str = String(value).trim()
  
  // Try D/M/YYYY format
  const dateMatch1 = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dateMatch1) {
    const day = dateMatch1[1].padStart(2, "0")
    const month = dateMatch1[2].padStart(2, "0")
    const year = dateMatch1[3]
    return `${year}-${month}-${day}`
  }
  
  // Try YYYY-MM-DD format
  const dateMatch2 = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch2) {
    return dateMatch2[0]
  }
  
  return ""
}

// Parse number from various formats
function parseNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (!value) return 0
  
  const str = String(value).trim()
  // Replace comma with dot for decimal separator
  const normalized = str.replace(/\./g, "").replace(",", ".")
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : num
}

export function PurchaseImageImport({ onImportPurchases }: PurchaseFileImportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedPurchase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setFileName(file.name)
    setIsProcessing(true)
    setError(null)
    setParsedData([])
    setImportResult(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 })
      
      if (jsonData.length < 2) {
        setError("El archivo esta vacio o no tiene datos")
        return
      }
      
      // Get headers from first row
      const headers = (jsonData[0] as unknown[]).map(h => String(h || "").toLowerCase().trim())
      
      // Find column indices
      const fechaIdx = headers.findIndex(h => h.includes("fecha"))
      const productoIdx = headers.findIndex(h => h.includes("producto"))
      const cantidadIdx = headers.findIndex(h => h.includes("cantidad"))
      const usdIdx = headers.findIndex(h => h.includes("usd") && !h.includes("cotiz"))
      const cotizacionIdx = headers.findIndex(h => h.includes("cotiz"))
      const precioARSIdx = headers.findIndex(h => h.includes("ars") || h.includes("precio"))
      
      // Validate required columns
      if (fechaIdx === -1 || productoIdx === -1) {
        setError(`No se encontraron las columnas requeridas. Headers encontrados: ${headers.join(", ")}`)
        return
      }
      
      const parsed: ParsedPurchase[] = []
      
      // Process data rows (skip header)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[]
        if (!row || row.length === 0) continue
        
        const fechaVal = row[fechaIdx]
        const producto = String(row[productoIdx] || "")
        const cantidad = cantidadIdx >= 0 ? Math.max(1, Math.round(parseNumber(row[cantidadIdx]))) : 1
        const priceUSD = usdIdx >= 0 ? parseNumber(row[usdIdx]) : 0
        const exchangeRate = cotizacionIdx >= 0 ? parseNumber(row[cotizacionIdx]) : 0
        const costARS = precioARSIdx >= 0 ? parseNumber(row[precioARSIdx]) : (priceUSD * exchangeRate)
        
        const date = parseDate(fechaVal)
        
        if (!date || !producto) continue
        
        const { cardType, label } = mapCardType(producto)
        
        // Create entries based on quantity
        for (let j = 0; j < cantidad; j++) {
          parsed.push({
            id: `xlsx-${i}-${j}-${Date.now()}`,
            cardType,
            cardTypeLabel: label,
            priceUSD,
            date,
            quantity: 1,
            exchangeRate,
            costARS: costARS / cantidad, // Per unit cost
            rawLine: `${producto} (${cantidad > 1 ? `${j + 1}/${cantidad}` : "1"})`,
          })
        }
      }
      
      setParsedData(parsed)
      
    } catch (err) {
      console.error("Error processing file:", err)
      setError("Error al procesar el archivo. Asegurate de que sea un archivo Excel valido (.xlsx)")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      const newPurchases: Purchase[] = []
      let skipped = 0

      for (const row of parsedData) {
        if (!row.cardType) {
          skipped++
          continue
        }

        const purchase: Purchase = {
          id: `xlsx-${crypto.randomUUID()}`,
          cardType: row.cardType,
          priceUSD: row.priceUSD,
          exchangeRate: row.exchangeRate,
          costARS: row.costARS,
          purchaseDate: row.date,
          createdAt: new Date().toISOString(),
        }
        newPurchases.push(purchase)
      }

      if (newPurchases.length > 0) {
        await onImportPurchases(newPurchases)
      }

      setImportResult({ imported: newPurchases.length, skipped })
      setParsedData([])
      setFileName("")
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("Error importing:", err)
      setError("Error al importar las compras")
    } finally {
      setIsProcessing(false)
    }
  }

  const clearData = () => {
    setParsedData([])
    setError(null)
    setImportResult(null)
    setFileName("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeParsedItem = (index: number) => {
    const newParsed = [...parsedData]
    newParsed.splice(index, 1)
    setParsedData(newParsed)
  }

  const validCount = parsedData.filter(p => p.cardType).length
  const invalidCount = parsedData.filter(p => !p.cardType).length

  return (
    <Card className="border-emerald-500/30 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          Importar Compras desde Excel
        </CardTitle>
        <CardDescription>
          Sube un archivo Excel (.xlsx) o CSV con tus compras.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="purchase-file-input"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-transparent"
          >
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar archivo Excel
          </Button>
          
          {fileName && (
            <span className="text-sm text-muted-foreground">
              {fileName}
            </span>
          )}
          
          {parsedData.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearData}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Procesando archivo...
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importResult && (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-emerald-300">
              Importacion completada: {importResult.imported} compras importadas
              {importResult.skipped > 0 && `, ${importResult.skipped} omitidas (sin tipo reconocido)`}
            </AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>{validCount} validas</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>{invalidCount} no reconocidas</span>
                </div>
              )}
            </div>

            {/* Parsed results */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {parsedData.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.cardType
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          item.cardType
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}>
                          {item.cardTypeLabel}
                        </span>
                      </div>
                      <div className="text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>Fecha: {item.date}</div>
                        <div>USD: ${item.priceUSD.toFixed(3)}</div>
                        <div>Cotiz: ${item.exchangeRate.toLocaleString("es-AR")}</div>
                        <div className="text-foreground font-medium">
                          ARS: ${item.costARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParsedItem(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Import button */}
            <Button
              onClick={handleImport}
              disabled={isProcessing || validCount === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Importar {validCount} compras
            </Button>
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
          <p className="font-medium">Columnas del archivo Excel:</p>
          <code className="block p-2 bg-muted/30 rounded text-xs overflow-x-auto">
            Fecha | ID Transaccion | Producto | Cantidad | USD | Cotizacion USDT | Precio ARS
          </code>
          <p className="mt-2">Productos reconocidos:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Roblox Gift Card - 400 Robux GLOBAL</li>
            <li>Roblox Gift Card 800 Robux GLOBAL</li>
            <li>Roblox Gift Card 10 usd</li>
            <li>Steam Gift Card 10 USD, Steam Gift Card 5 USD</li>
          </ul>
          <p className="mt-2 text-muted-foreground/80">
            La columna ID Transaccion se ignora. Si Cantidad {">"} 1, se crean multiples entradas.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
