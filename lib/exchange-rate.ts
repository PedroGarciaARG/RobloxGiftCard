// Cache for historical exchange rates to avoid repeated API calls
const historicalRateCache: Map<string, number> = new Map()

// Get historical exchange rate for a specific date
export async function getHistoricalExchangeRate(date: string): Promise<number> {
  // Check cache first
  if (historicalRateCache.has(date)) {
    return historicalRateCache.get(date)!
  }

  try {
    // Try Bluelytics historical API
    const response = await fetch(`https://api.bluelytics.com.ar/v2/historical?day=${date}`, {
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()
      // Get the blue dollar sell rate
      if (data.blue?.value_sell) {
        console.log(`[v0] Historical exchange rate for ${date}:`, data.blue.value_sell)
        historicalRateCache.set(date, data.blue.value_sell)
        return data.blue.value_sell
      }
    }

    // If historical API fails, try to get current rate as fallback
    // This might happen for very recent dates
    const currentRate = await getExchangeRate()
    historicalRateCache.set(date, currentRate)
    return currentRate
  } catch (error) {
    console.error(`[v0] Error fetching historical exchange rate for ${date}:`, error)
    // Fallback to current rate
    const currentRate = await getExchangeRate()
    historicalRateCache.set(date, currentRate)
    return currentRate
  }
}

export async function getExchangeRate(): Promise<number> {
  try {
    // Add timestamp to bust cache and get fresh data
    const timestamp = Date.now()
    const response = await fetch(`https://api.bluelytics.com.ar/v2/latest?_=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (response.ok) {
      const data = await response.json()
      // Usar el dólar blue venta
      if (data.blue?.value_sell) {
        console.log("[v0] Exchange rate fetched:", data.blue.value_sell)
        return data.blue.value_sell
      }
    }

    // Try alternative API if first one fails
    const altResponse = await fetch(`https://dolarapi.com/v1/dolares/blue?_=${timestamp}`, {
      cache: "no-store",
    })

    if (altResponse.ok) {
      const altData = await altResponse.json()
      if (altData.venta) {
        console.log("[v0] Exchange rate from alt API:", altData.venta)
        return altData.venta
      }
    }

    // Fallback valor por defecto
    return 1200
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return 1200
  }
}
