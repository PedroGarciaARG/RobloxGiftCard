"use client"

import React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react"
import type { Sale } from "@/lib/types"
import * as XLSX from "xlsx"

interface MercadoLibreImportProps {
  onImportSales: (sales: Sale[]) => Promise<void>
  existingSales: Sale[]
}

interface ParsedRow {
  saleId: string
  date: string
  status: string
  units: number
  totalARS: number
  productTitle: string
  buyerName: string
  cardType: 400 | 800 | 1000 | "steam5" | "steam10" | null
  commission: number
  grossRevenue: number
  // ML fees breakdown
  cargoVenta: number
  costoFijo: number
  costoEnvio: number
  impuestos: number
  descuentos: number
  anulaciones: number
  // Buyer data
  buyerDNI: string
  buyerAddress: string
  buyerCity: string
  buyerState: string
  buyerPostalCode: string
  buyerCountry: string
  // ML order info
  publicationId: string
  // Duplicate detection
  isDuplicate?: boolean
}

const MONTH_MAP: { [key: string]: string } = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
}

function parseMLDate(dateStr: string): string {
  // Format: "18 de enero de 2026" or "19 de enero de 2026 11:59 hs."
  if (!dateStr) return ""
  
  const match = dateStr.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/)
  if (!match) return ""
  
  const day = match[1].padStart(2, "0")
  const month = MONTH_MAP[match[2].toLowerCase()] || "01"
  const year = match[3]
  
  return `${year}-${month}-${day}`
}

function detectCardType(title: string): 400 | 800 | 1000 | "steam5" | "steam10" | null {
  if (!title) return null
  const lowerTitle = title.toLowerCase()
  
  // Check for Steam Gift Cards first (exact patterns from ML)
  // "Steam Gift Card Digital 5 Usd Argentina" -> steam5
  // "Steam Gift Card 10 Usd | Código Digital" -> steam10
  if (lowerTitle.includes("steam gift card digital 5 usd argentina") || 
      lowerTitle.includes("steam gift card 5 usd") ||
      (lowerTitle.includes("steam") && lowerTitle.includes("5 usd"))) {
    return "steam5"
  }
  if (lowerTitle.includes("steam gift card 10 usd") || 
      lowerTitle.includes("steam gift card digital 10 usd") ||
      (lowerTitle.includes("steam") && lowerTitle.includes("10 usd"))) {
    return "steam10"
  }
  
  // Check for Roblox 10 USD gift card (equals 1000 robux)
  // "Tarjeta Gift Card Digital 10 Usd Roblox" -> 1000 robux
  if ((lowerTitle.includes("roblox") && lowerTitle.includes("10 usd")) ||
      lowerTitle.includes("tarjeta gift card digital 10 usd roblox") ||
      lowerTitle.includes("gift card digital 10 usd roblox")) {
    return 1000
  }
  
  // Check for "Saldo : 400", "Saldo : 800", "Saldo : 1000" pattern from ML (Robux)
  if (lowerTitle.includes("saldo : 400") || lowerTitle.includes("saldo: 400")) return 400
  if (lowerTitle.includes("saldo : 800") || lowerTitle.includes("saldo: 800")) return 800
  if (lowerTitle.includes("saldo : 1000") || lowerTitle.includes("saldo: 1000")) return 1000
  
  // Check for robux amounts
  if (lowerTitle.includes("400 robux") || lowerTitle.includes("400robux")) return 400
  if (lowerTitle.includes("800 robux") || lowerTitle.includes("800robux")) return 800
  if (lowerTitle.includes("1000 robux") || lowerTitle.includes("1000robux")) return 1000
  
  // Check for 10 usd without steam (could be other products, skip)
  // if (lowerTitle.includes("10 usd") || lowerTitle.includes("$10") || lowerTitle.includes("10usd")) return 1000
  
  // Check for just the number pattern ": 400", ": 800"
  if (/:\s*400\b/.test(lowerTitle)) return 400
  if (/:\s*800\b/.test(lowerTitle)) return 800
  if (/:\s*1000\b/.test(lowerTitle)) return 1000
  
  return null
}

function getCardTypeLabel(cardType: 400 | 800 | 1000 | "steam5" | "steam10" | null): string {
  if (cardType === "steam5") return "Steam $5"
  if (cardType === "steam10") return "Steam $10"
  if (cardType === 400) return "400 Robux"
  if (cardType === 800) return "800 Robux"
  if (cardType === 1000) return "1000 Robux"
  return "Tipo no detectado"
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (!value) return 0
  // Handle Spanish number format (comma as decimal separator)
  const str = String(value).replace(/[^\d.,-]/g, "").replace(",", ".")
  return parseFloat(str) || 0
}

export function MercadoLibreImport({ onImportSales, existingSales }: MercadoLibreImportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setParsedData([])
    setImportResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

      console.log("[v0] Total rows in file:", jsonData.length)
      
      if (jsonData.length < 7) {
        setError("El archivo no contiene datos suficientes")
        return
      }

      // ML Excel structure:
      // Row 1-3: Header info
      // Row 4: "Ventas Estado de tus ventas al..."
      // Row 5: Empty or category headers
      // Row 6: Column headers (# de venta, Fecha de venta, Estado, etc.)
      // Row 7+: Data
      
      // Find the header row (contains "# de venta")
      let headerRowIndex = -1
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i]
        if (!row) continue
        const rowStr = row.map(c => String(c || "").toLowerCase()).join(" ")
        if (rowStr.includes("# de venta") || rowStr.includes("#deventa") || rowStr.includes("nro de venta")) {
          headerRowIndex = i
          console.log("[v0] Found header row at index:", i)
          break
        }
      }
      
      if (headerRowIndex === -1) {
        // Try to detect by looking for "Fecha de venta" column
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i]
          if (!row) continue
          const rowStr = row.map(c => String(c || "").toLowerCase()).join(" ")
          if (rowStr.includes("fecha de venta")) {
            headerRowIndex = i
            console.log("[v0] Found header row (via fecha) at index:", i)
            break
          }
        }
      }

      if (headerRowIndex === -1) {
        setError("No se encontró la fila de encabezados. Asegúrate de que el archivo sea un reporte de ventas de Mercado Libre.")
        return
      }

      // Find column indices from headers
      const headers = jsonData[headerRowIndex].map((h) => (h ? String(h).toLowerCase().trim() : ""))
      console.log("[v0] Headers found:", headers)
      
      // Column mapping based on ML structure
      const saleIdCol = headers.findIndex((h) => h.includes("# de venta") || h.includes("nro de venta"))
      const dateCol = headers.findIndex((h) => h.includes("fecha de venta"))
      const statusCol = headers.findIndex((h) => h === "estado")
      const unitsCol = headers.findIndex((h) => h === "unidades")
      const revenueCol = headers.findIndex((h) => h.includes("ingresos por productos"))
      const commissionCol = headers.findIndex((h) => h.includes("cargo por venta"))
      const fixedCostCol = headers.findIndex((h) => h.includes("costo fijo"))
      const totalCol = headers.findIndex((h) => h.includes("total (ars)") || (h.includes("total") && h.includes("ars")))
      const titleCol = headers.findIndex((h) => h.includes("título de la publicación") || h.includes("titulo de la publicacion"))
      const buyerCol = headers.findIndex((h) => h === "comprador")
      
      // Additional fee columns
      const costoEnvioCol = headers.findIndex((h) => h.includes("costos de envío") || h.includes("costos de envio"))
      const impuestosCol = headers.findIndex((h) => h === "impuestos")
      const descuentosCol = headers.findIndex((h) => h === "descuentos")
      const anulacionesCol = headers.findIndex((h) => h.includes("anulaciones") && h.includes("reembolsos"))
      
      // Buyer data columns
      const dniCol = headers.findIndex((h) => h === "dni")
      const addressCol = headers.findIndex((h) => h === "domicilio")
      const cityCol = headers.findIndex((h) => h === "ciudad")
      const stateCol = headers.findIndex((h) => h === "estado" && headers.indexOf(h) > statusCol) // Second "estado" column
      const postalCodeCol = headers.findIndex((h) => h.includes("código postal") || h.includes("codigo postal"))
      const countryCol = headers.findIndex((h) => h === "país" || h === "pais")
      
      // Publication ID
      const publicationIdCol = headers.findIndex((h) => h.includes("# de publicación") || h.includes("# de publicacion") || h.includes("nro de publicación"))

      console.log("[v0] Column indices:", { 
        saleIdCol, dateCol, statusCol, unitsCol, revenueCol, 
        commissionCol, fixedCostCol, totalCol, titleCol, buyerCol,
        costoEnvioCol, impuestosCol, descuentosCol, anulacionesCol,
        dniCol, addressCol, cityCol, stateCol, postalCodeCol, countryCol, publicationIdCol
      })

      if (saleIdCol === -1) {
        setError("No se encontró la columna '# de venta'")
        return
      }

      const parsed: ParsedRow[] = []
      
      // Build set of existing sale IDs for duplicate detection
      const existingIds = new Set(existingSales.map((s) => s.mlOrderId || s.id.replace(/^ml-/, "").split("-")[0]))
      console.log("[v0] Existing sale IDs for duplicate check:", existingIds.size)
      
      // Start from row after headers
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue

        const saleId = String(row[saleIdCol] || "").trim()
        if (!saleId || saleId === "") continue
        
        // Skip if it looks like a header or non-data row
        if (saleId.toLowerCase().includes("venta") || saleId.toLowerCase().includes("total")) continue

        // Get revenue (Ingresos por productos)
        const grossRevenue = revenueCol !== -1 ? parseNumber(row[revenueCol]) : 0
        
        // Get all fees (typically negative values)
        const cargoVenta = commissionCol !== -1 ? Math.abs(parseNumber(row[commissionCol])) : 0
        const costoFijo = fixedCostCol !== -1 ? Math.abs(parseNumber(row[fixedCostCol])) : 0
        const costoEnvio = costoEnvioCol !== -1 ? Math.abs(parseNumber(row[costoEnvioCol])) : 0
        const impuestos = impuestosCol !== -1 ? Math.abs(parseNumber(row[impuestosCol])) : 0
        const descuentos = descuentosCol !== -1 ? parseNumber(row[descuentosCol]) : 0 // Can be positive (discount given)
        const anulaciones = anulacionesCol !== -1 ? Math.abs(parseNumber(row[anulacionesCol])) : 0
        
        // Total fees
        const totalFees = cargoVenta + costoFijo + costoEnvio + impuestos + anulaciones - descuentos
        
        // Get total or calculate net amount
        let totalARS = totalCol !== -1 ? parseNumber(row[totalCol]) : 0
        if (totalARS <= 0 && grossRevenue > 0) {
          totalARS = grossRevenue - totalFees
        }
        
        // Skip rows with no monetary value
        if (grossRevenue <= 0 && totalARS <= 0) continue

        const productTitle = titleCol !== -1 ? String(row[titleCol] || "") : ""
        const cardType = detectCardType(productTitle)
        const units = unitsCol !== -1 ? (parseInt(String(row[unitsCol])) || 1) : 1
        const dateStr = dateCol !== -1 ? String(row[dateCol] || "") : ""
        
        // Get buyer data
        const buyerName = buyerCol !== -1 ? String(row[buyerCol] || "") : ""
        const buyerDNI = dniCol !== -1 ? String(row[dniCol] || "") : ""
        const buyerAddress = addressCol !== -1 ? String(row[addressCol] || "") : ""
        const buyerCity = cityCol !== -1 ? String(row[cityCol] || "") : ""
        const buyerState = stateCol !== -1 ? String(row[stateCol] || "") : ""
        const buyerPostalCode = postalCodeCol !== -1 ? String(row[postalCodeCol] || "") : ""
        const buyerCountry = countryCol !== -1 ? String(row[countryCol] || "") : ""
        const publicationId = publicationIdCol !== -1 ? String(row[publicationIdCol] || "") : ""

        // Check if this sale is already imported
        const isDuplicate = existingIds.has(saleId)
        
        parsed.push({
          saleId,
          date: parseMLDate(dateStr),
          status: statusCol !== -1 ? String(row[statusCol] || "") : "",
          units,
          totalARS,
          grossRevenue,
          productTitle,
          buyerName,
          cardType,
          commission: totalFees,
          cargoVenta,
          costoFijo,
          costoEnvio,
          impuestos,
          descuentos,
          anulaciones,
          buyerDNI,
          buyerAddress,
          buyerCity,
          buyerState,
          buyerPostalCode,
          buyerCountry,
          publicationId,
          isDuplicate,
        })
      }

      // Sort: duplicates at the end
      parsed.sort((a, b) => {
        if (a.isDuplicate && !b.isDuplicate) return 1
        if (!a.isDuplicate && b.isDuplicate) return -1
        return 0
      })

      const duplicateCount = parsed.filter(p => p.isDuplicate).length
      const newCount = parsed.filter(p => !p.isDuplicate).length
      console.log("[v0] Parsed rows:", parsed.length, "- New:", newCount, "- Duplicates:", duplicateCount)
      setParsedData(parsed)
    } catch (err) {
      console.error("[v0] Error parsing file:", err)
      setError("Error al procesar el archivo. Asegúrate de que sea un archivo Excel válido.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      const existingIds = new Set(existingSales.map((s) => s.id))
      const newSales: Sale[] = []
      let skipped = 0

      for (const row of parsedData) {
        // Skip if already imported (using ML sale ID)
        const mlId = `ml-${row.saleId}`
        if (existingIds.has(mlId)) {
          skipped++
          continue
        }

        // Skip if card type couldn't be detected
        if (!row.cardType) {
          console.log("[v0] Skipping row without card type:", row.productTitle)
          skipped++
          continue
        }

        // Create sale entries based on units
        for (let i = 0; i < row.units; i++) {
          const saleId = row.units > 1 ? `ml-${row.saleId}-${i + 1}` : mlId
          if (existingIds.has(saleId)) {
            skipped++
            continue
          }

          // Calculate per-unit values
          const unitGrossRevenue = row.grossRevenue / row.units
          const unitCommission = row.commission / row.units
          const unitNetAmount = row.totalARS / row.units

          newSales.push({
            id: saleId,
            cardType: row.cardType,
            cardCode: "",
            buyerName: row.buyerName,
            salePrice: unitGrossRevenue, // Gross amount (Ingresos por productos)
            commission: unitCommission, // Total ML fees
            netAmount: unitNetAmount, // Net amount after fees
            saleDate: row.date,
            platform: "mercadolibre",
            quantity: 1,
            createdAt: new Date().toISOString(),
            // ML fees breakdown
            mlCargoVenta: row.cargoVenta / row.units,
            mlCostoFijo: row.costoFijo / row.units,
            mlCostoEnvio: row.costoEnvio / row.units,
            mlImpuestos: row.impuestos / row.units,
            mlDescuentos: row.descuentos / row.units,
            mlAnulaciones: row.anulaciones / row.units,
            // Buyer data
            buyerDNI: row.buyerDNI,
            buyerAddress: row.buyerAddress,
            buyerCity: row.buyerCity,
            buyerState: row.buyerState,
            buyerPostalCode: row.buyerPostalCode,
            buyerCountry: row.buyerCountry,
            // ML order info
            mlOrderId: row.saleId,
            mlPublicationId: row.publicationId,
            mlStatus: row.status,
          })
          existingIds.add(saleId)
        }
      }

      if (newSales.length > 0) {
        await onImportSales(newSales)
      }

      setImportResult({ imported: newSales.length, skipped })
      setParsedData([])
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("[v0] Error importing:", err)
      setError("Error al importar las ventas")
    } finally {
      setIsProcessing(false)
    }
  }

  const clearData = () => {
    setParsedData([])
    setError(null)
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="border-sky-500/30 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="w-5 h-5 text-sky-400" />
          Importar desde Mercado Libre
        </CardTitle>
        <CardDescription>
          Sube el archivo Excel exportado desde Mercado Libre para importar tus ventas automáticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="ml-file-input"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="border-sky-500/50 hover:bg-sky-500/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar archivo
          </Button>
          {parsedData.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearData}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {importResult && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              Se importaron {importResult.imported} ventas. {importResult.skipped > 0 && `(${importResult.skipped} omitidas por duplicadas o sin tipo de tarjeta)`}
            </AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-3">
            {(() => {
              const newSales = parsedData.filter(p => !p.isDuplicate && p.cardType)
              const duplicates = parsedData.filter(p => p.isDuplicate)
              const noType = parsedData.filter(p => !p.isDuplicate && !p.cardType)
              return (
                <div className="text-sm space-y-1">
                  <div className="text-muted-foreground">
                    Se encontraron <span className="text-sky-400 font-medium">{parsedData.length}</span> ventas en el archivo:
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {newSales.length > 0 && (
                      <span className="text-green-400">Nuevas: {newSales.length}</span>
                    )}
                    {duplicates.length > 0 && (
                      <span className="text-yellow-500">Ya cargadas: {duplicates.length}</span>
                    )}
                    {noType.length > 0 && (
                      <span className="text-destructive">Sin tipo: {noType.length}</span>
                    )}
                  </div>
                </div>
              )
            })()}
            
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border border-border p-2">
              {parsedData.map((row, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded relative ${
                    row.isDuplicate 
                      ? "bg-yellow-500/10 border border-yellow-500/30 opacity-60" 
                      : row.cardType 
                        ? "bg-secondary" 
                        : "bg-destructive/20"
                  }`}
                >
                  {row.isDuplicate && (
                    <div className="absolute top-1 right-1 text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                      YA CARGADA
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{row.date || "Sin fecha"}</span>
                      {" - "}
                      <span className={row.cardType ? (row.isDuplicate ? "text-yellow-400" : "text-sky-400") : "text-destructive"}>
                        {getCardTypeLabel(row.cardType)}
                      </span>
                      {row.units > 1 && <span className="text-muted-foreground"> x{row.units}</span>}
                    </div>
                    <div className="text-right">
                      <div className={row.isDuplicate ? "text-yellow-400" : "text-green-400"}>${row.grossRevenue.toLocaleString("es-AR")}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Neto: ${row.totalARS.toLocaleString("es-AR")}
                      </div>
                    </div>
                  </div>
                  {/* Buyer info */}
                  <div className="text-muted-foreground truncate">
                    {row.buyerName}{row.buyerDNI && ` - DNI: ${row.buyerDNI}`}
                  </div>
                  {row.buyerCity && (
                    <div className="text-muted-foreground text-[10px] truncate">
                      {[row.buyerCity, row.buyerState, row.buyerCountry].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {/* Fees breakdown */}
                  {row.commission > 0 && !row.isDuplicate && (
                    <div className="flex flex-wrap gap-x-2 mt-1 text-[10px]">
                      {row.cargoVenta > 0 && <span className="text-red-400">Cargo: -${row.cargoVenta.toLocaleString("es-AR")}</span>}
                      {row.costoFijo > 0 && <span className="text-red-400">Fijo: -${row.costoFijo.toLocaleString("es-AR")}</span>}
                      {row.impuestos > 0 && <span className="text-orange-400">Imp: -${row.impuestos.toLocaleString("es-AR")}</span>}
                      {row.costoEnvio > 0 && <span className="text-yellow-400">Envío: -${row.costoEnvio.toLocaleString("es-AR")}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {(() => {
                const importableCount = parsedData.filter((r) => r.cardType && !r.isDuplicate).length
                return (
                  <>
                    <Button
                      onClick={handleImport}
                      disabled={isProcessing || importableCount === 0}
                      className="bg-sky-500 hover:bg-sky-600 text-white"
                    >
                      {isProcessing ? "Importando..." : importableCount > 0 ? `Importar ${importableCount} ventas nuevas` : "No hay ventas nuevas"}
                    </Button>
                    <Button variant="outline" onClick={clearData} className="bg-transparent">
                      Cancelar
                    </Button>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>El sistema detecta automáticamente el tipo de tarjeta basándose en el título del producto:</p>
          <ul className="list-disc list-inside ml-2">
            <li><span className="text-purple-400">Steam $5</span> - "Steam Gift Card Digital 5 Usd Argentina"</li>
            <li><span className="text-purple-400">Steam $10</span> - "Steam Gift Card 10 Usd | Código Digital"</li>
            <li><span className="text-sky-400">400 Robux</span> - detecta "400 robux" o "saldo: 400"</li>
            <li><span className="text-sky-400">800 Robux</span> - detecta "800 robux" o "saldo: 800"</li>
            <li><span className="text-sky-400">1000 Robux</span> - detecta "1000 robux" o "saldo: 1000"</li>
          </ul>
          <p className="mt-2 text-yellow-500/80">Las ventas ya importadas se marcan como "Ya cargadas" y no se duplican.</p>
        </div>
      </CardContent>
    </Card>
  )
}
