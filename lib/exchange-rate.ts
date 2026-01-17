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
