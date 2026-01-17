"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getExchangeRate } from "@/lib/exchange-rate"
import type { Purchase } from "@/lib/types"

interface PurchaseFormProps {
  onAddPurchase: (purchase: Purchase) => void
  cardPrices: { [key: number]: number }
}

const DEFAULT_PRICES: { [key: number]: number } = {
  400: 5.17,
  800: 10.34,
  1000: 10,
}

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function PurchaseForm({ onAddPurchase, cardPrices }: PurchaseFormProps) {
  const [cardType, setCardType] = useState<"400" | "800" | "1000">("400")
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(getLocalDateString())
  const [isLoading, setIsLoading] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [customRate, setCustomRate] = useState("")
  const [customPriceUSD, setCustomPriceUSD] = useState("")
  const [cardCodes, setCardCodes] = useState<string[]>([""])

  const getPrice = (type: number) => cardPrices[type] ?? DEFAULT_PRICES[type] ?? 10

  useEffect(() => {
    setCardCodes((prev) => {
      if (quantity > prev.length) {
        return [...prev, ...Array(quantity - prev.length).fill("")]
      } else if (quantity < prev.length) {
        return prev.slice(0, quantity)
      }
      return prev
    })
  }, [quantity])

  const updateCardCode = (index: number, value: string) => {
    setCardCodes((prev) => {
      const newCodes = [...prev]
      newCodes[index] = value
      return newCodes
    })
  }

  const fetchRate = async () => {
    setIsLoading(true)
    try {
      const rate = await getExchangeRate()
      setExchangeRate(rate)
      setCustomRate(rate.toString())
    } catch (error) {
      console.error("Error fetching rate:", error)
    }
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rate = customRate ? Number.parseFloat(customRate) : exchangeRate
    if (!rate) {
      alert("Por favor, obtén la cotización primero")
      return
    }

    const cardTypeNum = Number.parseInt(cardType) as 400 | 800 | 1000
    const priceUSD = customPriceUSD ? Number.parseFloat(customPriceUSD) : getPrice(cardTypeNum)
    const costARS = priceUSD * rate

    for (let i = 0; i < quantity; i++) {
      const purchase: Purchase = {
        id: crypto.randomUUID(),
        cardType: cardTypeNum,
        cardCode: cardCodes[i]?.trim() || undefined,
        priceUSD,
        exchangeRate: rate,
        costARS,
        purchaseDate: date,
        createdAt: new Date().toISOString(),
      }
      onAddPurchase(purchase)
    }

    setQuantity(1)
    setExchangeRate(null)
    setCustomRate("")
    setCustomPriceUSD("")
    setCardCodes([""])
  }

  const handleCardTypeChange = (v: "400" | "800" | "1000") => {
    setCardType(v)
    setCustomPriceUSD(getPrice(Number.parseInt(v)).toString())
  }

  const cardTypeNum = Number.parseInt(cardType) as 400 | 800 | 1000
  const priceUSD = customPriceUSD ? Number.parseFloat(customPriceUSD) : getPrice(cardTypeNum)
  const estimatedCost = customRate
    ? priceUSD * Number.parseFloat(customRate) * quantity
    : exchangeRate
      ? priceUSD * exchangeRate * quantity
      : 0

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Registrar Compra</CardTitle>
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
                  <SelectItem value="400">400 Robux</SelectItem>
                  <SelectItem value="800">800 Robux</SelectItem>
                  <SelectItem value="1000">1000 Robux (10 USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceUSD" className="text-sm">
                Precio USD
              </Label>
              <Input
                id="priceUSD"
                type="number"
                step="0.01"
                placeholder={cardPrices[cardTypeNum].toString()}
                value={customPriceUSD}
                onChange={(e) => setCustomPriceUSD(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm">
                Cantidad
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm">
                Fecha de Compra
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm">Cotización USD/ARS</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cotización"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  type="number"
                  step="0.01"
                  className="h-10 sm:h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchRate}
                  disabled={isLoading}
                  className="h-10 sm:h-9 px-3 shrink-0 bg-transparent"
                >
                  {isLoading ? "..." : "Obtener"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Números de Tarjeta ({quantity})</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cardCodes.map((code, index) => (
                <Input
                  key={index}
                  type="text"
                  placeholder={`Tarjeta ${index + 1}: XXXX-XXXX-XXXX`}
                  value={code}
                  onChange={(e) => updateCardCode(index, e.target.value)}
                  className="h-10 sm:h-9"
                />
              ))}
            </div>
          </div>

          {estimatedCost > 0 && (
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">Costo estimado:</p>
              <p className="text-lg sm:text-xl font-bold">
                ${estimatedCost.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                ({quantity} x ${priceUSD} USD x ${customRate || exchangeRate})
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 sm:h-10 text-base sm:text-sm"
            disabled={!customRate && !exchangeRate}
          >
            Registrar Compra
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
