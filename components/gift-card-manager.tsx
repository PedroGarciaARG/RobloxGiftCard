"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseForm } from "./purchase-form"
import { SaleForm } from "./sale-form"
import { BalanceOverview } from "./balance-overview"
import { TransactionHistory } from "./transaction-history"
import { ExportButton } from "./export-button"
import type { Purchase, Sale } from "@/lib/types"

export function GiftCardManager() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load data from localStorage
  useEffect(() => {
    const savedPurchases = localStorage.getItem("roblox-purchases")
    const savedSales = localStorage.getItem("roblox-sales")

    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedSales) setSales(JSON.parse(savedSales))
    setIsLoaded(true)
  }, [])

  // Save to localStorage when data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("roblox-purchases", JSON.stringify(purchases))
    }
  }, [purchases, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("roblox-sales", JSON.stringify(sales))
    }
  }, [sales, isLoaded])

  const addPurchase = (purchase: Purchase) => {
    setPurchases((prev) => [...prev, purchase])
  }

  const addSale = (sale: Sale) => {
    setSales((prev) => [...prev, sale])
  }

  const deletePurchase = (id: string) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id))
  }

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id))
  }

  const updatePurchase = (id: string, updated: Purchase) => {
    setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }

  const updateSale = (id: string, updated: Sale) => {
    setSales((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 px-3 sm:py-8 sm:px-4 max-w-6xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Roblox Gift Cards</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Balance de compras y ventas</p>
      </header>

      <BalanceOverview purchases={purchases} sales={sales} />

      <Tabs defaultValue="purchases" className="mt-6 sm:mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="purchases" className="text-xs sm:text-sm">
              Compras
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm">
              Ventas
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              Historial
            </TabsTrigger>
          </TabsList>
          <ExportButton purchases={purchases} sales={sales} />
        </div>

        <TabsContent value="purchases">
          <PurchaseForm onAddPurchase={addPurchase} />
        </TabsContent>

        <TabsContent value="sales">
          <SaleForm onAddSale={addSale} purchases={purchases} />
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistory
            purchases={purchases}
            sales={sales}
            onDeletePurchase={deletePurchase}
            onDeleteSale={deleteSale}
            onUpdatePurchase={updatePurchase}
            onUpdateSale={updateSale}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
