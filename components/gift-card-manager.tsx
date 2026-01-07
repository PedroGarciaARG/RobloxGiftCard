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
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Roblox Gift Card Manager</h1>
        <p className="text-muted-foreground">Gestiona tus compras y ventas de gift cards de Roblox</p>
      </header>

      <BalanceOverview purchases={purchases} sales={sales} />

      <Tabs defaultValue="purchases" className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="purchases">Compras</TabsTrigger>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
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
