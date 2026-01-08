"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Pencil, Check, X, Copy } from "lucide-react"
import { formatLocalDate, compareDates } from "@/lib/date-utils"
import type { Purchase, Sale } from "@/lib/types"

interface TransactionHistoryProps {
  purchases: Purchase[]
  sales: Sale[]
  onDeletePurchase: (id: string) => void
  onDeleteSale: (id: string) => void
  onUpdatePurchase: (id: string, updated: Purchase) => void
  onUpdateSale: (id: string, updated: Sale) => void
}

export function TransactionHistory({
  purchases,
  sales,
  onDeletePurchase,
  onDeleteSale,
  onUpdatePurchase,
  onUpdateSale,
}: TransactionHistoryProps) {
  const [editingPurchase, setEditingPurchase] = useState<string | null>(null)
  const [editingSale, setEditingSale] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const sortedPurchases = [...purchases].sort((a, b) => compareDates(a.purchaseDate, b.purchaseDate))

  const sortedSales = [...sales].sort((a, b) => compareDates(a.saleDate, b.saleDate))

  const actualSales = sales.filter((s) => s.platform !== "lost")
  const lostCards = sales.filter((s) => s.platform === "lost")

  const startEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase.id)
    setEditValues({
      date: purchase.purchaseDate,
      rate: purchase.exchangeRate.toString(),
    })
  }

  const savePurchaseEdit = (purchase: Purchase) => {
    const newRate = Number.parseFloat(editValues.rate)
    const updated: Purchase = {
      ...purchase,
      purchaseDate: editValues.date,
      exchangeRate: newRate,
      costARS: purchase.priceUSD * newRate,
    }
    onUpdatePurchase(purchase.id, updated)
    setEditingPurchase(null)
  }

  const startEditSale = (sale: Sale) => {
    setEditingSale(sale.id)
    setEditValues({
      date: sale.saleDate,
      price: sale.salePrice.toString(),
      cardCode: sale.cardCode || "",
    })
  }

  const saveSaleEdit = (sale: Sale) => {
    const newPrice = Number.parseFloat(editValues.price)
    const commission = sale.platform === "mercadolibre" ? sale.commission : 0
    const updated: Sale = {
      ...sale,
      saleDate: editValues.date,
      salePrice: sale.platform === "lost" ? 0 : newPrice,
      netAmount: sale.platform === "lost" ? 0 : newPrice - commission,
      cardCode: editValues.cardCode?.trim() || undefined,
    }
    onUpdateSale(sale.id, updated)
    setEditingSale(null)
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "mercadolibre":
        return "ML"
      case "direct":
        return "Directa"
      case "lost":
        return "PERDIDA"
      default:
        return platform
    }
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Historial de Transacciones</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
        <Tabs defaultValue="purchases">
          <TabsList className="mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="purchases" className="text-xs sm:text-sm">
              Compras ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm">
              Ventas ({actualSales.length})
            </TabsTrigger>
            <TabsTrigger value="lost" className="text-xs sm:text-sm">
              Pérdidas ({lostCards.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            {sortedPurchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hay compras registradas</p>
            ) : (
              <div className="space-y-2">
                {sortedPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-3 bg-muted rounded-lg">
                    {editingPurchase === purchase.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={editValues.date}
                            onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                            className="flex-1 h-9 text-sm"
                          />
                          <Input
                            type="number"
                            value={editValues.rate}
                            onChange={(e) => setEditValues({ ...editValues, rate: e.target.value })}
                            className="w-20 h-9 text-sm"
                            placeholder="Cotiz."
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => savePurchaseEdit(purchase)}>
                            <Check className="h-4 w-4 mr-1" /> Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingPurchase(null)}>
                            <X className="h-4 w-4 mr-1" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{purchase.cardType} Robux</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatLocalDate(purchase.purchaseDate)} | ${purchase.priceUSD} x{" "}
                            {purchase.exchangeRate.toFixed(0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-bold text-sm">
                            ${purchase.costARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEditPurchase(purchase)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => onDeletePurchase(purchase.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales">
            {actualSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hay ventas registradas</p>
            ) : (
              <div className="space-y-2">
                {sortedSales
                  .filter((s) => s.platform !== "lost")
                  .map((sale) => (
                    <div key={sale.id} className="p-3 bg-muted rounded-lg">
                      {editingSale === sale.id ? (
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={editValues.date}
                              onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                              className="h-9 text-sm"
                            />
                            <Input
                              type="number"
                              value={editValues.price}
                              onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                              className="h-9 text-sm"
                              placeholder="Precio"
                            />
                          </div>
                          <Input
                            type="text"
                            value={editValues.cardCode}
                            onChange={(e) => setEditValues({ ...editValues, cardCode: e.target.value })}
                            className="h-9 text-sm"
                            placeholder="Código"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => saveSaleEdit(sale)}>
                              <Check className="h-4 w-4 mr-1" /> Guardar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSale(null)}>
                              <X className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                              {sale.cardType} Robux
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-background">
                                {getPlatformLabel(sale.platform)}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatLocalDate(sale.saleDate)} | ${sale.salePrice.toLocaleString("es-AR")}
                              {sale.commission > 0 && (
                                <span className="text-red-500"> -{sale.commission.toLocaleString("es-AR")}</span>
                              )}
                            </p>
                            {sale.cardCode && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded truncate max-w-[150px]">
                                  {sale.cardCode}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => copyCode(sale.cardCode!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-bold text-sm text-green-600">
                              ${sale.netAmount.toLocaleString("es-AR")}
                            </span>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditSale(sale)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => onDeleteSale(sale.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lost">
            {lostCards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hay tarjetas perdidas</p>
            ) : (
              <div className="space-y-2">
                {sortedSales
                  .filter((s) => s.platform === "lost")
                  .map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900"
                    >
                      {editingSale === sale.id ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={editValues.date}
                              onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                              className="flex-1 h-9 text-sm"
                            />
                          </div>
                          <Input
                            type="text"
                            value={editValues.cardCode}
                            onChange={(e) => setEditValues({ ...editValues, cardCode: e.target.value })}
                            className="h-9 text-sm"
                            placeholder="Código"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => saveSaleEdit(sale)}>
                              <Check className="h-4 w-4 mr-1" /> Guardar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSale(null)}>
                              <X className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-1.5">
                              {sale.cardType} Robux
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300">
                                PERDIDA
                              </span>
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">{formatLocalDate(sale.saleDate)}</p>
                            {sale.cardCode && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded truncate max-w-[150px]">
                                  {sale.cardCode}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => copyCode(sale.cardCode!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditSale(sale)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => onDeleteSale(sale.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
