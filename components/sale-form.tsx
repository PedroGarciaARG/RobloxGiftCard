"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Sale, Purchase, CardType } from "@/lib/types"
import { DEFAULT_ML_PRICE, DEFAULT_ML_COMMISSION } from "@/lib/constants"

interface SaleFormProps {
  onAddSale: (sale: Sale) => void
  purchases: Purchase[]
  sales: Sale[]
  salePricesARS: { [key: string]: number }
  mlCommissions: { [key: string]: number }
}

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function SaleForm({ onAddSale, purchases, sales, salePricesARS, mlCommissions }: SaleFormProps) {
  const [cardType, setCardType] = useState<string>("400")
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(getLocalDateString())
  const [platform, setPlatform] = useState<"mercadolibre" | "direct" | "lost">("mercadolibre")
  const [customPrice, setCustomPrice] = useState("")
  const [cardCode, setCardCode] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const [mlPrice, setMlPrice] = useState<string>("")

  const cardTypeNum = Number.parseInt(cardType)

  const currentMLPrice = mlPrice ? Number.parseFloat(mlPrice) : (salePricesARS[cardType] || 0)
  const commission = platform === "mercadolibre" ? (mlCommissions[cardType] || 0) : 0

  const salePrice =
    platform === "lost" ? 0 : platform === "mercadolibre" ? currentMLPrice : Number.parseFloat(customPrice) || 0

  const netAmount = platform === "lost" ? 0 : salePrice - commission

  const calculateAvailableStock = (type: CardType) => {
    const purchased = purchases.filter((p) => p.cardType === type).length
    const sold = sales.filter((s) => s.cardType === type).reduce((sum, s) => sum + s.quantity, 0)
    return purchased - sold
  }

  const available400 = calculateAvailableStock(400)
  const available800 = calculateAvailableStock(800)
  const available1000 = calculateAvailableStock(1000)
  const availableSteam5 = calculateAvailableStock("steam5")
  const availableSteam10 = calculateAvailableStock("steam10")
  
  const getCardTypeValue = (): CardType => {
    if (cardType === "steam5" || cardType === "steam10") return cardType
    return Number.parseInt(cardType) as 400 | 800 | 1000
  }
  
  const currentAvailable = calculateAvailableStock(getCardTypeValue())

  const handleCardTypeChange = (value: string) => {
    setCardType(value)
    setMlPrice("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (platform === "direct" && !customPrice) {
      alert("Por favor, ingresa el precio de venta")
      return
    }

    if (quantity > currentAvailable) {
      alert(`No hay suficiente stock. Disponible: ${currentAvailable}`)
      return
    }

    for (let i = 0; i < quantity; i++) {
      const sale: Sale = {
        id: crypto.randomUUID(),
        cardType: getCardTypeValue(),
        cardCode: cardCode.trim() || undefined,
        buyerName: buyerName.trim() || undefined,
        salePrice,
        commission,
        netAmount,
        saleDate: date,
        platform,
        createdAt: new Date().toISOString(),
        quantity: 1,
      }
      onAddSale(sale)
    }

    setQuantity(1)
    setCustomPrice("")
    setCardCode("")
    setBuyerName("")
    setMlPrice("")
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Registrar Venta / Pérdida</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cardType" className="text-sm">
                Tipo de Tarjeta
              </Label>
              <Select value={cardType} onValueChange={handleCardTypeChange}>
                <SelectTrigger className="h-10 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400 Robux (Disp: {available400})</SelectItem>
                  <SelectItem value="800">800 Robux (Disp: {available800})</SelectItem>
                  <SelectItem value="1000">1000 Robux (Disp: {available1000})</SelectItem>
                  <SelectItem value="steam5">Steam $5 USD (Disp: {availableSteam5})</SelectItem>
                  <SelectItem value="steam10">Steam $10 USD (Disp: {availableSteam10})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm">
                Cantidad (máx: {currentAvailable})
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={currentAvailable}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(Number.parseInt(e.target.value) || 1, currentAvailable))}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerName" className="text-sm">
                Nombre del Comprador
              </Label>
              <Input
                id="buyerName"
                type="text"
                placeholder="Ej: Juan Pérez"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardCode" className="text-sm">
                Código de Tarjeta
              </Label>
              <Input
                id="cardCode"
                type="text"
                placeholder="Ej: XXXX-XXXX-XXXX"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm">
                Fecha
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Tipo de Operación</Label>
            <RadioGroup
              value={platform}
              onValueChange={(v) => setPlatform(v as "mercadolibre" | "direct" | "lost")}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="mercadolibre" id="ml" className="mt-0.5" />
                <Label htmlFor="ml" className="font-normal cursor-pointer text-sm leading-tight">
                  MercadoLibre{" "}
                  <span className="text-muted-foreground">
                    (com: ${(mlCommissions[cardType] || 0).toLocaleString("es-AR")})
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct" className="font-normal cursor-pointer text-sm">
                  Venta Directa <span className="text-muted-foreground">(sin comisión)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lost" id="lost" />
                <Label htmlFor="lost" className="font-normal cursor-pointer text-sm text-red-600">
                  Tarjeta Perdida
                </Label>
              </div>
            </RadioGroup>
          </div>

          {platform === "mercadolibre" && (
            <div className="space-y-2">
              <Label htmlFor="mlPrice" className="text-sm">
                Precio de Venta ML (ARS)
              </Label>
              <Input
                id="mlPrice"
                type="number"
                placeholder={`Default: ${salePricesARS[cardType] || 0}`}
                value={mlPrice}
                onChange={(e) => setMlPrice(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          )}

          {platform === "direct" && (
            <div className="space-y-2">
              <Label htmlFor="customPrice" className="text-sm">
                Precio de Venta (ARS)
              </Label>
              <Input
                id="customPrice"
                type="number"
                placeholder="Ej: 12000"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>
          )}

          <div
            className={`p-3 sm:p-4 rounded-lg space-y-2 ${platform === "lost" ? "bg-red-50 dark:bg-red-950" : "bg-muted"}`}
          >
            {platform === "lost" ? (
              <div className="text-center text-red-600 font-medium text-sm">Se registrará como pérdida total</div>
            ) : (
              <>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Precio de venta:</span>
                  <span>${(salePrice * quantity).toLocaleString("es-AR")}</span>
                </div>
                {platform === "mercadolibre" && (
                  <div className="flex justify-between text-xs sm:text-sm text-red-600">
                    <span>Comisión ML:</span>
                    <span>-${(commission * quantity).toLocaleString("es-AR")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2 text-sm sm:text-base">
                  <span>Neto total:</span>
                  <span className="text-green-600">${(netAmount * quantity).toLocaleString("es-AR")}</span>
                </div>
              </>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 sm:h-10 text-base sm:text-sm"
            variant={platform === "lost" ? "destructive" : "default"}
            disabled={currentAvailable <= 0}
          >
            {currentAvailable <= 0
              ? "Sin stock disponible"
              : platform === "lost"
                ? "Registrar Pérdida"
                : "Registrar Venta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
