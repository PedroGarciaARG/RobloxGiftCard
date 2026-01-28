"use client"

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseForm } from "./purchase-form"
import { SaleForm } from "./sale-form"
import { BalanceOverview } from "./balance-overview"
import { TransactionHistory } from "./transaction-history"
import { ExportButton } from "./export-button"
import { SettingsPanel } from "./settings-panel"
import { GoogleSheetsSetup } from "./google-sheets-setup"
import { DailySalesCounter } from "./daily-sales-counter"
import { MercadoLibreImport } from "./mercadolibre-import"
import { PurchaseImageImport } from "./purchase-image-import"
import { CodeManager } from "./code-manager"
import { ExportAdvanced } from "./export-advanced"
import { saveAllData, loadAllData, getSheetConfig } from "@/lib/google-sheets"
import type { Purchase, Sale, GiftCardCode } from "@/lib/types"
import { RefreshCw, Cloud, CloudOff, Upload, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Button } from "@/components/ui/button"
import Image from "next/image"

const DEFAULT_CARD_PRICES: { [key: string]: number } = {
  400: 5.17,
  800: 10.34,
  1000: 10,
  steam5: 5,
  steam10: 11,
}

const DEFAULT_SALE_PRICES_ARS: { [key: string]: number } = {
  400: 13999,
  800: 27999,
  1000: 34999,
  steam5: 11999,
  steam10: 24999,
}

const DEFAULT_ML_COMMISSIONS: { [key: string]: number } = {
  400: 3284.84,
  800: 6995,
  1000: 8500,
  steam5: 2800,
  steam10: 5800,
}

export function GiftCardManager() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [giftCardCodes, setGiftCardCodes] = useState<GiftCardCode[]>([])
  const [cardPrices, setCardPrices] = useState<{ [key: string]: number }>(DEFAULT_CARD_PRICES)
  const [salePricesARS, setSalePricesARS] = useState<{ [key: string]: number }>(DEFAULT_SALE_PRICES_ARS)
  const [mlCommissions, setMlCommissions] = useState<{ [key: string]: number }>(DEFAULT_ML_COMMISSIONS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConnectedToSheets, setIsConnectedToSheets] = useState(false)
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null)
  const [lastSyncStatus, setLastSyncStatus] = useState<"success" | "error" | null>(null)
  
  // Debounce ref to prevent rapid successive sync calls
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSyncRef = useRef<{
    purchases: Purchase[]
    sales: Sale[]
    prices: { [key: string]: number }
    codes?: GiftCardCode[]
    salePricesARS?: { [key: string]: number }
    mlCommissions?: { [key: string]: number }
  } | null>(null)

  const syncToSheets = useCallback(
    async (
      newPurchases: Purchase[], 
      newSales: Sale[], 
      newPrices: { [key: string]: number }, 
      newCodes?: GiftCardCode[],
      newSalePricesARS?: { [key: string]: number },
      newMlCommissions?: { [key: string]: number }
    ) => {
      if (!isConnectedToSheets || !sheetsUrl) return

      // Store the latest data to sync
      pendingSyncRef.current = {
        purchases: newPurchases,
        sales: newSales,
        prices: newPrices,
        codes: newCodes,
        salePricesARS: newSalePricesARS || salePricesARS,
        mlCommissions: newMlCommissions || mlCommissions,
      }

      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      // Debounce: wait 1 second before syncing to batch rapid changes
      syncTimeoutRef.current = setTimeout(async () => {
        if (!pendingSyncRef.current) return
        
        const dataToSync = pendingSyncRef.current
        pendingSyncRef.current = null
        
        setIsSyncing(true)
        try {
          const success = await saveAllData(sheetsUrl, {
            purchases: dataToSync.purchases,
            sales: dataToSync.sales,
            cardPrices: dataToSync.prices,
            giftCardCodes: dataToSync.codes,
            salePricesARS: dataToSync.salePricesARS,
            mlCommissions: dataToSync.mlCommissions,
          })
          setLastSyncStatus(success ? "success" : "error")
        } catch (error) {
          console.error("[v0] Error syncing to sheets:", error)
          setLastSyncStatus("error")
        } finally {
          setIsSyncing(false)
        }
      }, 1000)
    },
    [isConnectedToSheets, sheetsUrl, salePricesARS, mlCommissions],
  )

  const loadFromSheets = useCallback(async (webAppUrl: string, mergeWithLocal: boolean = false) => {
    setIsSyncing(true)
    try {
      const data = await loadAllData(webAppUrl)
      if (data) {
        // Get local data for potential merge
        const localPurchases = JSON.parse(localStorage.getItem("roblox-purchases") || "[]")
        const localSales = JSON.parse(localStorage.getItem("roblox-sales") || "[]")
        const localCodes = JSON.parse(localStorage.getItem("roblox-gift-codes") || "[]")

        // Merge strategy: use the dataset with more items, or merge unique items
        let finalPurchases = data.purchases || []
        let finalSales = data.sales || []
        let finalCodes = data.giftCardCodes || []

        if (mergeWithLocal) {
          // Merge purchases by ID
          const purchaseIds = new Set(finalPurchases.map((p: Purchase) => p.id))
          localPurchases.forEach((p: Purchase) => {
            if (!purchaseIds.has(p.id)) {
              finalPurchases.push(p)
            }
          })

          // Merge sales by ID
          const saleIds = new Set(finalSales.map((s: Sale) => s.id))
          localSales.forEach((s: Sale) => {
            if (!saleIds.has(s.id)) {
              finalSales.push(s)
            }
          })

          // Merge codes by ID
          const codeIds = new Set(finalCodes.map((c: GiftCardCode) => c.id))
          localCodes.forEach((c: GiftCardCode) => {
            if (!codeIds.has(c.id)) {
              finalCodes.push(c)
            }
          })

          console.log("[v0] Merged data - Purchases:", finalPurchases.length, "Sales:", finalSales.length, "Codes:", finalCodes.length)
        } else {
          // If sheets has less data than local, use local data
          if (localSales.length > finalSales.length) {
            console.log("[v0] Local has more sales, keeping local data:", localSales.length, "vs", finalSales.length)
            finalSales = localSales
          }
          if (localPurchases.length > finalPurchases.length) {
            console.log("[v0] Local has more purchases, keeping local data:", localPurchases.length, "vs", finalPurchases.length)
            finalPurchases = localPurchases
          }
          if (localCodes.length > finalCodes.length) {
            console.log("[v0] Local has more codes, keeping local data:", localCodes.length, "vs", finalCodes.length)
            finalCodes = localCodes
          }
        }

        setPurchases(finalPurchases)
        setSales(finalSales)
        setGiftCardCodes(finalCodes)

        if (data.cardPrices && Object.keys(data.cardPrices).length > 0) {
          const prices: { [key: string]: number } = { ...DEFAULT_CARD_PRICES }
          Object.entries(data.cardPrices).forEach(([key, value]) => {
            prices[key] = Number(value)
          })
          setCardPrices(prices)
        }
        if (data.salePricesARS && Object.keys(data.salePricesARS).length > 0) {
          const salePrices: { [key: string]: number } = { ...DEFAULT_SALE_PRICES_ARS }
          Object.entries(data.salePricesARS).forEach(([key, value]) => {
            salePrices[key] = Number(value)
          })
          setSalePricesARS(salePrices)
        }
        if (data.mlCommissions && Object.keys(data.mlCommissions).length > 0) {
          const commissions: { [key: string]: number } = { ...DEFAULT_ML_COMMISSIONS }
          Object.entries(data.mlCommissions).forEach(([key, value]) => {
            commissions[key] = Number(value)
          })
          setMlCommissions(commissions)
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
    const savedCodes = localStorage.getItem("roblox-gift-codes")
    const savedSalePricesARS = localStorage.getItem("roblox-sale-prices-ars")
    const savedMlCommissions = localStorage.getItem("roblox-ml-commissions")

    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedSales) setSales(JSON.parse(savedSales))
    if (savedPrices) {
      const loaded = JSON.parse(savedPrices)
      setCardPrices({ ...DEFAULT_CARD_PRICES, ...loaded })
    }
    if (savedCodes) setGiftCardCodes(JSON.parse(savedCodes))
    if (savedSalePricesARS) {
      const loaded = JSON.parse(savedSalePricesARS)
      setSalePricesARS({ ...DEFAULT_SALE_PRICES_ARS, ...loaded })
    }
    if (savedMlCommissions) {
      const loaded = JSON.parse(savedMlCommissions)
      setMlCommissions({ ...DEFAULT_ML_COMMISSIONS, ...loaded })
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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("roblox-gift-codes", JSON.stringify(giftCardCodes))
    }
  }, [giftCardCodes, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("roblox-sale-prices-ars", JSON.stringify(salePricesARS))
    }
  }, [salePricesARS, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("roblox-ml-commissions", JSON.stringify(mlCommissions))
    }
  }, [mlCommissions, isLoaded])

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

  const handleForceUpload = async () => {
    if (sheetsUrl) {
      console.log("[v0] Force uploading local data to sheets...")
      await syncToSheets(purchases, sales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
    }
  }

  const addPurchase = async (newPurchasesToAdd: Purchase[]) => {
    const newPurchases = [...purchases, ...newPurchasesToAdd]
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const addSale = async (sale: Sale) => {
    const newSales = [...sales, sale]
    setSales(newSales)
    await syncToSheets(purchases, newSales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const deletePurchase = async (id: string) => {
    const newPurchases = purchases.filter((p) => p.id !== id)
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const deleteSale = async (id: string) => {
    const newSales = sales.filter((s) => s.id !== id)
    setSales(newSales)
    await syncToSheets(purchases, newSales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const updatePurchase = async (id: string, updated: Purchase) => {
    const newPurchases = purchases.map((p) => (p.id === id ? updated : p))
    setPurchases(newPurchases)
    await syncToSheets(newPurchases, sales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const updateSale = async (id: string, updated: Sale) => {
    const newSales = sales.map((s) => (s.id === id ? updated : s))
    setSales(newSales)
    await syncToSheets(purchases, newSales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const updateCardPrices = async (prices: { [key: string]: number }) => {
    setCardPrices(prices)
    await syncToSheets(purchases, sales, prices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const updateSalePricesARS = async (prices: { [key: string]: number }) => {
    setSalePricesARS(prices)
    await syncToSheets(purchases, sales, cardPrices, giftCardCodes, prices, mlCommissions)
  }

  const updateMlCommissions = async (commissions: { [key: string]: number }) => {
    setMlCommissions(commissions)
    await syncToSheets(purchases, sales, cardPrices, giftCardCodes, salePricesARS, commissions)
  }

  const updateAllPrices = async (
    purchasePrices: { [key: string]: number },
    salePrices: { [key: string]: number },
    commissions: { [key: string]: number }
  ) => {
    setCardPrices(purchasePrices)
    setSalePricesARS(salePrices)
    setMlCommissions(commissions)
    await syncToSheets(purchases, sales, purchasePrices, giftCardCodes, salePrices, commissions)
  }

  const importData = async (newPurchases: Purchase[], newSales: Sale[]) => {
    const allPurchases = [...purchases, ...newPurchases]
    const allSales = [...sales, ...newSales]
    setPurchases(allPurchases)
    setSales(allSales)
    await syncToSheets(allPurchases, allSales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const importSalesFromML = async (newSales: Sale[]) => {
    const allSales = [...sales, ...newSales]
    setSales(allSales)
    await syncToSheets(purchases, allSales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const importPurchasesFromImage = async (newPurchases: Purchase[]) => {
    const allPurchases = [...purchases, ...newPurchases]
    setPurchases(allPurchases)
    await syncToSheets(allPurchases, sales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const addGiftCardCode = async (code: GiftCardCode) => {
    const newCodes = [...giftCardCodes, code]
    setGiftCardCodes(newCodes)
    await syncToSheets(purchases, sales, cardPrices, newCodes, salePricesARS, mlCommissions)
  }

  const updateGiftCardCode = async (id: string, updated: GiftCardCode) => {
    const newCodes = giftCardCodes.map((c) => (c.id === id ? updated : c))
    setGiftCardCodes(newCodes)
    await syncToSheets(purchases, sales, cardPrices, newCodes, salePricesARS, mlCommissions)
  }

  const deleteGiftCardCode = async (id: string) => {
    const newCodes = giftCardCodes.filter((c) => c.id !== id)
    setGiftCardCodes(newCodes)
    await syncToSheets(purchases, sales, cardPrices, newCodes, salePricesARS, mlCommissions)
  }

  const deleteAllPurchases = async () => {
    setPurchases([])
    localStorage.removeItem("roblox-purchases")
    await syncToSheets([], sales, cardPrices, giftCardCodes, salePricesARS, mlCommissions)
  }

  const deleteAllSales = async () => {
    setSales([])
    localStorage.removeItem("roblox-sales")
    await syncToSheets(purchases, [], cardPrices, giftCardCodes, salePricesARS, mlCommissions)
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
      <header className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Image
              src="/images/whatsapp-20image-202026-01-17-20at-2011.jpeg"
              alt="Roblox Argentina"
              width={120}
              height={60}
              className="rounded-lg w-16 h-8 sm:w-[120px] sm:h-[60px] object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-foreground truncate">Gift Card Manager</h1>
              <p className="text-[10px] sm:text-sm text-sky-400">@ROBLOX_ARGENTINA_OK</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isConnectedToSheets ? (
              <Cloud
                className={`w-4 h-4 ${lastSyncStatus === "success" ? "text-green-500" : lastSyncStatus === "error" ? "text-red-500" : "text-muted-foreground"}`}
              />
            ) : (
              <CloudOff className="w-4 h-4 text-muted-foreground" />
            )}
            {isConnectedToSheets && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceUpload}
                  disabled={isSyncing}
                  className="border-green-500/50 hover:bg-green-500/10 bg-transparent h-8 px-2 sm:px-3"
                  title="Subir datos locales al Drive"
                >
                  <Upload className={`w-3 h-3 sm:w-4 sm:h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline sm:ml-2">Subir</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="border-sky-500/50 hover:bg-sky-500/10 bg-transparent h-8 px-2 sm:px-3"
                  title="Descargar datos del Drive"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline sm:ml-2">{isSyncing ? "Sincronizando..." : "Descargar"}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-[1fr_250px]">
        <BalanceOverview purchases={purchases} sales={sales} />
        <DailySalesCounter sales={sales} />
      </div>

      <Tabs defaultValue="purchases" className="mt-6 sm:mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:flex bg-secondary">
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
              value="codes"
              className="text-xs sm:text-sm data-[state=active]:bg-sky-500 data-[state=active]:text-white"
            >
              Codigos
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
          <ExportButton purchases={purchases} sales={sales} />
        </div>

        <TabsContent value="purchases">
          <PurchaseForm onAddPurchase={addPurchase} cardPrices={cardPrices} />
        </TabsContent>

        <TabsContent value="sales">
          <SaleForm 
            onAddSale={addSale} 
            purchases={purchases} 
            sales={sales} 
            salePricesARS={salePricesARS}
            mlCommissions={mlCommissions}
          />
        </TabsContent>

        <TabsContent value="codes">
          <CodeManager
            codes={giftCardCodes}
            onAddCode={addGiftCardCode}
            onUpdateCode={updateGiftCardCode}
            onDeleteCode={deleteGiftCardCode}
          />
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
          <ExportAdvanced purchases={purchases} sales={sales} />
          <PurchaseImageImport 
            onImportPurchases={importPurchasesFromImage} 
            cardPrices={cardPrices}
          />
          <MercadoLibreImport onImportSales={importSalesFromML} existingSales={sales} />
          <SettingsPanel 
            cardPrices={cardPrices} 
            salePricesARS={salePricesARS}
            mlCommissions={mlCommissions}
            onUpdateAllPrices={updateAllPrices} 
            onImportData={importData} 
          />
          
          {/* Delete All Data Section */}
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Borrar Datos
              </CardTitle>
              <CardDescription>
                Elimina todas las compras o ventas de la aplicacion y del Drive. Esta accion no se puede deshacer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Borrar Todas las Compras ({purchases.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Borrar todas las compras</AlertDialogTitle>
                    <AlertDialogDescription>
                      Estas seguro que deseas eliminar las {purchases.length} compras? Esta accion eliminara los datos tanto de la aplicacion como del Drive y no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent">Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={deleteAllPurchases}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Eliminar Compras
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Borrar Todas las Ventas ({sales.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Borrar todas las ventas</AlertDialogTitle>
                    <AlertDialogDescription>
                      Estas seguro que deseas eliminar las {sales.length} ventas? Esta accion eliminara los datos tanto de la aplicacion como del Drive y no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent">Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={deleteAllSales}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Eliminar Ventas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
