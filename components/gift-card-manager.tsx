"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseForm } from "./purchase-form"
import { SaleForm } from "./sale-form"
import { BalanceOverview } from "./balance-overview"
import { TransactionHistory } from "./transaction-history"
import { ExportButton } from "./export-button"
import { SettingsPanel } from "./settings-panel"
import { GoogleSheetsSetup } from "./google-sheets-setup"
import { DailySalesCounter } from "./daily-sales-counter"
import { saveAllData, loadAllData, getSheetConfig } from "@/lib/google-sheets"
import type { Purchase, Sale } from "@/lib/types"
import { RefreshCw, Cloud, CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEFAULT_CARD_PRICES = {
  400: 5.17,
  800: 10.34,
  1000: 10, // Added new 1000 Robux card type (10 USD)
}

export function GiftCardManager() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [cardPrices, setCardPrices] = useState<{ [key: number]: number }>(DEFAULT_CARD_PRICES)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConnectedToSheets, setIsConnectedToSheets] = useState(false)
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null)
  const [lastSyncStatus, setLastSyncStatus] = useState<"success" | "error" | null>(null)

  const syncToSheets = useCallback(
    async (newPurchases: Purchase[], newSales: Sale[], newPrices: { [key: number]: number }) => {
      if (!isConnectedToSheets || !sheetsUrl) return

      setIsSyncing(true)
      try {
        const success = await saveAllData(sheetsUrl, {
          purchases: newPurchases,
          sales: newSales,
          cardPrices: newPrices,
        })
        setLastSyncStatus(success ? "success" : "error")
        console.log("[v0] Sync to sheets:", success ? "success" : "failed")
      } catch (error) {
        console.error("[v0] Error syncing to sheets:", error)
        setLastSyncStatus("error")
      } finally {
        setIsSyncing(false)
      }
    },
    [isConnectedToSheets, sheetsUrl],
  )

  const loadFromSheets = useCallback(async (webAppUrl: string) => {
    setIsSyncing(true)
    try {
      const data = await loadAllData(webAppUrl)
      if (data) {
        setPurchases(data.purchases || [])
        setSales(data.sales || [])
        if (data.cardPrices && Object.keys(data.cardPrices).length > 0) {
          // Convertir claves string a number
          const prices: { [key: number]: number } = {}
          Object.entries(data.cardPrices).forEach(([key, value]) => {
            prices[Number(key)] = Number(value)
          })
          setCardPrices(prices)
        }
        setLastSyncStatus("success")
        console.log("[v0] Loaded from sheets:", data)
      } else {
        loadFromLocalStorage()
      }
    } catch (error) {
      console.error("[v0] Error loading from sheets:", error)
      setLastSyncStatus("error")
      loadFromLocalStorage()
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const loadFromLocalStorage = () => {
    const savedPurchases = localStorage.getItem("roblox-purchases")
    const savedSales = localStorage.getItem("roblox-sales")
    const savedPrices = localStorage.getItem("roblox-card-prices")

    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedSales) setSales(JSON.parse(savedSales))
    if (savedPrices) setCardPrices(JSON.parse(savedPrices))
  }

  useEffect(() => {
    const config = getSheetConfig()
    if (config?.webAppUrl) {
      setIsConnectedToSheets(true)
      setSheetsUrl(config.webAppUrl)
      loadFromSheets(config.webAppUrl).then(() => setIsLoaded(true))
    } else {
      loadFromLocalStorage()
      setIsLoaded(true)
    }
  }, [loadFromSheets])

  // Save to localStorage as backup
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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("roblox-card-prices", JSON.stringify(cardPrices))
    }
  }, [cardPrices, isLoaded])

  const handleConnectionChange = (connected: boolean, webAppUrl: string | null) => {
    setIsConnectedToSheets(connected)
    setSheetsUrl(webAppUrl)
    if (connected && webAppUrl) {
      loadFromSheets(webAppUrl)
    }
  }

  const handleSync = () => {
    if (sheetsUrl) {
      loadFromSheets(sheetsUrl)
    }
  }

  const addPurchase = async (purchase: Purchase) => {
    const newPurchases = [...purchases, purchase]
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices)
  }

  const addSale = async (sale: Sale) => {
    const newSales = [...sales, sale]
    setSales(newSales)
    await syncToSheets(purchases, newSales, cardPrices)
  }

  const deletePurchase = async (id: string) => {
    const newPurchases = purchases.filter((p) => p.id !== id)
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices)
  }

  const deleteSale = async (id: string) => {
    const newSales = sales.filter((s) => s.id !== id)
    setSales(newSales)
    await syncToSheets(purchases, newSales, cardPrices)
  }

  const updatePurchase = async (id: string, updated: Purchase) => {
    const newPurchases = purchases.map((p) => (p.id === id ? updated : p))
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices)
  }

  const updateSale = async (id: string, updated: Sale) => {
    const newSales = sales.map((s) => (s.id === id ? updated : s))
    setSales(newSales)
    await syncToSheets(purchases, newSales, cardPrices)
  }

  const updateCardPrices = async (prices: { [key: number]: number }) => {
    setCardPrices(prices)
    await syncToSheets(purchases, sales, prices)
  }

  const importData = async (newPurchases: Purchase[], newSales: Sale[]) => {
    const allPurchases = [...purchases, ...newPurchases]
    const allSales = [...sales, ...newSales]
    setPurchases(allPurchases)
    setSales(allSales)
    await syncToSheets(allPurchases, allSales, cardPrices)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Roblox Gift Cards</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Balance de compras y ventas</p>
          </div>
          <div className="flex items-center gap-2">
            {isConnectedToSheets ? (
              <Cloud
                className={`w-4 h-4 ${lastSyncStatus === "success" ? "text-green-500" : lastSyncStatus === "error" ? "text-red-500" : "text-muted-foreground"}`}
              />
            ) : (
              <CloudOff className="w-4 h-4 text-muted-foreground" />
            )}
            {isConnectedToSheets && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
        <BalanceOverview purchases={purchases} sales={sales} />
        <DailySalesCounter sales={sales} />
      </div>

      <Tabs defaultValue="purchases" className="mt-6 sm:mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="purchases" className="text-xs sm:text-sm">
              Compras
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm">
              Ventas
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              Historial
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              Config
            </TabsTrigger>
          </TabsList>
          <ExportButton purchases={purchases} sales={sales} />
        </div>

        <TabsContent value="purchases">
          <PurchaseForm onAddPurchase={addPurchase} cardPrices={cardPrices} />
        </TabsContent>

        <TabsContent value="sales">
          <SaleForm onAddSale={addSale} purchases={purchases} sales={sales} />
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

        <TabsContent value="settings" className="space-y-6">
          <GoogleSheetsSetup onConnectionChange={handleConnectionChange} />
          <SettingsPanel cardPrices={cardPrices} onUpdatePrices={updateCardPrices} onImportData={importData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
