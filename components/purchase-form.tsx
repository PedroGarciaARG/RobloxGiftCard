"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getExchangeRate } from "@/lib/exchange-rate"
import type { Purchase } from "@/lib/types"

interface PurchaseFormProps {
  onAddPurchase: (purchase: Purchase) => void
}

const CARD_PRICES_USD = {
  400: 5.17,
  800: 10.34,
}

export function PurchaseForm({ onAddPurchase }: PurchaseFormProps) {
  const [cardType, setCardType] = useState<"400" | "800">("400")
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [customRate, setCustomRate] = useState("")

  const fetchRate = async () => {
    setIsLoading(true)
    try {
      const rate = await getExchangeRate(date)
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

    const cardTypeNum = Number.parseInt(cardType) as 400 | 800
    const priceUSD = CARD_PRICES_USD[cardTypeNum]
    const costARS = priceUSD * rate

    for (let i = 0; i < quantity; i++) {
      const purchase: Purchase = {
        id: crypto.randomUUID(),
        cardType: cardTypeNum,
        priceUSD,
        exchangeRate: rate,
        costARS,
        purchaseDate: date,
        createdAt: new Date().toISOString(),
      }
      onAddPurchase(purchase)
    }

    // Reset form
    setQuantity(1)
    setExchangeRate(null)
    setCustomRate("")
  }

  const priceUSD = CARD_PRICES_USD[Number.parseInt(cardType) as 400 | 800]
  const estimatedCost = customRate
    ? priceUSD * Number.parseFloat(customRate) * quantity
    : exchangeRate
      ? priceUSD * exchangeRate * quantity
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Compra</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cardType">Tipo de Tarjeta</Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v as "400" | "800")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400 Robux - $5.17 USD</SelectItem>
                  <SelectItem value="800">800 Robux - $10.34 USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Compra</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Cotización USD/ARS</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cotización"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  type="number"
                  step="0.01"
                />
                <Button type="button" variant="outline" onClick={fetchRate} disabled={isLoading}>
                  {isLoading ? "..." : "Obtener"}
                </Button>
              </div>
            </div>
          </div>

          {estimatedCost > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Costo estimado:</p>
              <p className="text-xl font-bold">
                ${estimatedCost.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS
              </p>
              <p className="text-xs text-muted-foreground">
                ({quantity} x ${priceUSD} USD x ${customRate || exchangeRate})
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!customRate && !exchangeRate}>
            Registrar Compra
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
