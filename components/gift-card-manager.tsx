"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseForm } from "./purchase-form"
import { SaleForm } from "./sale-form"
import { BalanceOverview } from "./balance-overview"
import { TransactionHistory } from "./transaction-history"
import { ExportDialog } from "./export-dialog"
import { SettingsPanel } from "./settings-panel"
import { GoogleSheetsSetup } from "./google-sheets-setup"
import { DailySalesCounter } from "./daily-sales-counter"
import { saveAllData, loadAllData, getSheetConfig } from "@/lib/google-sheets"
import type { Purchase, Sale } from "@/lib/types"
import { RefreshCw, Cloud, CloudOff, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const DEFAULT_CARD_PRICES = {
  400: 5.17,
  800: 10.34,
  1000: 10,
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
      console.log("[v0] Raw data from sheets:", data)
      if (data) {
        const parsedPurchases = (data.purchases || []).map((p: any) => ({
          ...p,
          cardType: Number(p.cardType) as 400 | 800 | 1000,
          priceUSD: Number(p.priceUSD) || 0,
          exchangeRate: Number(p.exchangeRate) || 0,
          costARS: Number(p.costARS) || 0,
        }))
        const parsedSales = (data.sales || []).map((s: any) => ({
          ...s,
          cardType: Number(s.cardType) as 400 | 800 | 1000,
          salePrice: Number(s.salePrice) || 0,
          commission: Number(s.commission) || 0,
          netAmount: Number(s.netAmount) || 0,
          quantity: Number(s.quantity) || 1,
        }))
        console.log("[v0] Parsed purchases:", parsedPurchases)
        console.log("[v0] Parsed sales:", parsedSales)
        setPurchases(parsedPurchases)
        setSales(parsedSales)
        if (data.cardPrices && Object.keys(data.cardPrices).length > 0) {
          // Convertir claves string a number
          const prices: { [key: number]: number } = { ...DEFAULT_CARD_PRICES } // Start with defaults
          Object.entries(data.cardPrices).forEach(([key, value]) => {
            prices[Number(key)] = Number(value)
          })
          setCardPrices(prices)
        }
        setLastSyncStatus("success")
        console.log("[v0] Loaded from sheets successfully")
      } else {
        console.log("[v0] No data from sheets, loading from localStorage")
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
    if (savedPrices) {
      const loaded = JSON.parse(savedPrices)
      setCardPrices({ ...DEFAULT_CARD_PRICES, ...loaded })
    }
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

  const handleDataMigrated = () => {
    if (sheetsUrl) {
      loadFromSheets(sheetsUrl)
    }
  }

  const handleSync = () => {
    if (sheetsUrl) {
      loadFromSheets(sheetsUrl)
    }
  }

  const addPurchases = async (newPurchasesToAdd: Purchase[]) => {
    const newPurchases = [...purchases, ...newPurchasesToAdd]
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices)
  }

  const addSales = async (newSalesToAdd: Sale[]) => {
    const newSales = [...sales, ...newSalesToAdd]
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

  const clearAllData = async () => {
    // Clear localStorage
    localStorage.removeItem("roblox-purchases")
    localStorage.removeItem("roblox-sales")
    localStorage.removeItem("roblox-card-prices")

    // Reset state
    setPurchases([])
    setSales([])
    setCardPrices(DEFAULT_CARD_PRICES)

    // Sync empty data to sheets if connected
    if (isConnectedToSheets && sheetsUrl) {
      await syncToSheets([], [], DEFAULT_CARD_PRICES)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Image
          src="/images/whatsapp-20image-202026-01-17-20at-2011.jpeg"
          alt="Roblox Argentina"
          width={200}
          height={100}
          className="mb-4"
        />
        <div className="animate-pulse text-sky-400">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 px-3 sm:py-8 sm:px-4 max-w-6xl">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/images/whatsapp-20image-202026-01-17-20at-2011.jpeg"
              alt="Roblox Argentina"
              width={120}
              height={60}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gift Card Manager</h1>
              <p className="text-xs sm:text-sm text-sky-400">@ROBLOX_ARGENTINA_OK</p>
            </div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="border-sky-500/50 hover:bg-sky-500/10 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
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
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex bg-secondary">
            <TabsTrigger
              value="purchases"
              className="text-xs sm:text-sm data-[state=active]:bg-sky-500 data-[state=active]:text-white"
            >
              Compras
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="text-xs sm:text-sm data-[state=active]:bg-sky-500 data-[state=active]:text-white"
            >
              Ventas
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs sm:text-sm data-[state=active]:bg-sky-500 data-[state=active]:text-white"
            >
              Historial
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-xs sm:text-sm data-[state=active]:bg-sky-500 data-[state=active]:text-white"
            >
              Config
            </TabsTrigger>
          </TabsList>
          <ExportDialog purchases={purchases} sales={sales} />
        </div>

        <TabsContent value="purchases">
          <PurchaseForm onAddPurchases={addPurchases} cardPrices={cardPrices} />
        </TabsContent>

        <TabsContent value="sales">
          <SaleForm onAddSales={addSales} purchases={purchases} sales={sales} />
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
          <GoogleSheetsSetup onConnectionChange={handleConnectionChange} onDataMigrated={handleDataMigrated} />
          <SettingsPanel cardPrices={cardPrices} onUpdatePrices={updateCardPrices} onImportData={importData} />

          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Zona de Peligro</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Esta acción borrará todas las compras, ventas y configuraciones. No se puede deshacer.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Borrar Todos los Datos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background border-red-500/30">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-400">¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará permanentemente todas las compras, ventas y configuraciones de precios.
                    También se borrarán los datos en Google Sheets si está conectado.
                    <br />
                    <br />
                    <strong>Esta acción no se puede deshacer.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-muted-foreground/30">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllData} className="bg-red-600 hover:bg-red-700 text-white">
                    Sí, borrar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
