"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Sale, Purchase } from "@/lib/types"

interface SaleFormProps {
  onAddSale: (sale: Sale) => void
  purchases: Purchase[]
}

const ML_COMMISSION = {
  400: 3284.84,
  800: 6995,
}

const ML_PRICE = {
  400: 13999,
  800: 27999,
}

export function SaleForm({ onAddSale, purchases }: SaleFormProps) {
  const [cardType, setCardType] = useState<"400" | "800">("400")
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [platform, setPlatform] = useState<"mercadolibre" | "direct" | "lost">("mercadolibre")
  const [customPrice, setCustomPrice] = useState("")
  const [cardCode, setCardCode] = useState("")

  const cardTypeNum = Number.parseInt(cardType) as 400 | 800

  const salePrice =
    platform === "lost" ? 0 : platform === "mercadolibre" ? ML_PRICE[cardTypeNum] : Number.parseFloat(customPrice) || 0

  const commission = platform === "mercadolibre" ? ML_COMMISSION[cardTypeNum] : 0
  const netAmount = platform === "lost" ? 0 : salePrice - commission

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (platform === "direct" && !customPrice) {
      alert("Por favor, ingresa el precio de venta")
      return
    }

    for (let i = 0; i < quantity; i++) {
      const sale: Sale = {
        id: crypto.randomUUID(),
        cardType: cardTypeNum,
        cardCode: cardCode.trim() || undefined,
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

    // Reset
    setQuantity(1)
    setCustomPrice("")
    setCardCode("")
  }

  // Count available cards by type
  const availableByType = purchases.reduce(
    (acc, p) => {
      acc[p.cardType] = (acc[p.cardType] || 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Venta / Pérdida</CardTitle>
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
                  <SelectItem value="400">400 Robux (Stock: {availableByType[400] || 0})</SelectItem>
                  <SelectItem value="800">800 Robux (Stock: {availableByType[800] || 0})</SelectItem>
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
              <Label htmlFor="cardCode">Código de Tarjeta</Label>
              <Input
                id="cardCode"
                type="text"
                placeholder="Ej: XXXX-XXXX-XXXX"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tipo de Operación</Label>
            <RadioGroup
              value={platform}
              onValueChange={(v) => setPlatform(v as "mercadolibre" | "direct" | "lost")}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mercadolibre" id="ml" />
                <Label htmlFor="ml" className="font-normal cursor-pointer">
                  Venta MercadoLibre (comisión: ${ML_COMMISSION[cardTypeNum].toLocaleString("es-AR")})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct" className="font-normal cursor-pointer">
                  Venta Directa (sin comisión)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lost" id="lost" />
                <Label htmlFor="lost" className="font-normal cursor-pointer text-red-600">
                  Tarjeta Perdida (solo pérdida)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {platform === "direct" && (
            <div className="space-y-2">
              <Label htmlFor="customPrice">Precio de Venta (ARS)</Label>
              <Input
                id="customPrice"
                type="number"
                placeholder="Ej: 12000"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </div>
          )}

          <div className={`p-4 rounded-lg space-y-2 ${platform === "lost" ? "bg-red-50 dark:bg-red-950" : "bg-muted"}`}>
            {platform === "lost" ? (
              <div className="text-center text-red-600 font-medium">Esta tarjeta se registrará como pérdida total</div>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span>Precio de venta:</span>
                  <span>${(salePrice * quantity).toLocaleString("es-AR")}</span>
                </div>
                {platform === "mercadolibre" && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Comisión MercadoLibre:</span>
                    <span>-${(commission * quantity).toLocaleString("es-AR")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Neto total:</span>
                  <span className="text-green-600">${(netAmount * quantity).toLocaleString("es-AR")}</span>
                </div>
              </>
            )}
          </div>

          <Button type="submit" className="w-full" variant={platform === "lost" ? "destructive" : "default"}>
            {platform === "lost" ? "Registrar Pérdida" : "Registrar Venta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
