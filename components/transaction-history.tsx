"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Pencil, Check, X, Copy } from "lucide-react"
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

  const sortedPurchases = [...purchases].sort(
    (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
  )

  const sortedSales = [...sales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())

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
      <CardHeader>
        <CardTitle>Historial de Transacciones</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="purchases">
          <TabsList className="mb-4">
            <TabsTrigger value="purchases">Compras ({purchases.length})</TabsTrigger>
            <TabsTrigger value="sales">Ventas ({actualSales.length})</TabsTrigger>
            <TabsTrigger value="lost">Pérdidas ({lostCards.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            {sortedPurchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay compras registradas</p>
            ) : (
              <div className="space-y-2">
                {sortedPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    {editingPurchase === purchase.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="date"
                          value={editValues.date}
                          onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                          className="w-40"
                        />
                        <Input
                          type="number"
                          value={editValues.rate}
                          onChange={(e) => setEditValues({ ...editValues, rate: e.target.value })}
                          className="w-24"
                          placeholder="Cotización"
                        />
                        <Button size="icon" variant="ghost" onClick={() => savePurchaseEdit(purchase)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingPurchase(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">{purchase.cardType} Robux</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(purchase.purchaseDate).toLocaleDateString("es-AR")} | ${purchase.priceUSD} USD x{" "}
                            {purchase.exchangeRate}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            ${purchase.costARS.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                          </span>
                          <Button size="icon" variant="ghost" onClick={() => startEditPurchase(purchase)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => onDeletePurchase(purchase.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales">
            {actualSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay ventas registradas</p>
            ) : (
              <div className="space-y-2">
                {sortedSales
                  .filter((s) => s.platform !== "lost")
                  .map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      {editingSale === sale.id ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <Input
                            type="date"
                            value={editValues.date}
                            onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                            className="w-40"
                          />
                          <Input
                            type="number"
                            value={editValues.price}
                            onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                            className="w-28"
                            placeholder="Precio"
                          />
                          <Input
                            type="text"
                            value={editValues.cardCode}
                            onChange={(e) => setEditValues({ ...editValues, cardCode: e.target.value })}
                            className="w-36"
                            placeholder="Código"
                          />
                          <Button size="icon" variant="ghost" onClick={() => saveSaleEdit(sale)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingSale(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-medium">
                              {sale.cardType} Robux
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-background">
                                {getPlatformLabel(sale.platform)}
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sale.saleDate).toLocaleDateString("es-AR")} | Bruto: $
                              {sale.salePrice.toLocaleString("es-AR")}
                              {sale.commission > 0 && ` - Com: $${sale.commission.toLocaleString("es-AR")}`}
                            </p>
                            {sale.cardCode && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs font-mono bg-background px-2 py-0.5 rounded">
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">${sale.netAmount.toLocaleString("es-AR")}</span>
                            <Button size="icon" variant="ghost" onClick={() => startEditSale(sale)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => onDeleteSale(sale.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lost">
            {lostCards.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay tarjetas perdidas</p>
            ) : (
              <div className="space-y-2">
                {sortedSales
                  .filter((s) => s.platform === "lost")
                  .map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900"
                    >
                      {editingSale === sale.id ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <Input
                            type="date"
                            value={editValues.date}
                            onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
                            className="w-40"
                          />
                          <Input
                            type="text"
                            value={editValues.cardCode}
                            onChange={(e) => setEditValues({ ...editValues, cardCode: e.target.value })}
                            className="w-36"
                            placeholder="Código"
                          />
                          <Button size="icon" variant="ghost" onClick={() => saveSaleEdit(sale)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingSale(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-medium text-red-700 dark:text-red-400">
                              {sale.cardType} Robux
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300">
                                PERDIDA
                              </span>
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {new Date(sale.saleDate).toLocaleDateString("es-AR")}
                            </p>
                            {sale.cardCode && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs font-mono bg-background px-2 py-0.5 rounded">
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
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => startEditSale(sale)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => onDeleteSale(sale.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </>
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
