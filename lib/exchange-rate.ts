export async function getExchangeRate(date?: string): Promise<number> {
  try {
    // Si se proporciona una fecha, buscar el valor histórico
    if (date) {
      const historicalRate = await getHistoricalRate(date)
      if (historicalRate) {
        console.log("[v0] Historical exchange rate for", date, ":", historicalRate)
        return historicalRate
      }
    }

    // Si no hay fecha o no se encontró histórico, obtener el actual
    const timestamp = Date.now()
    const response = await fetch(`https://api.bluelytics.com.ar/v2/latest?_=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.blue?.value_sell) {
        console.log("[v0] Current exchange rate:", data.blue.value_sell)
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
    console.log("[v0] Using fallback rate: 1200")
    return 1200
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return 1200
  }
}

async function getHistoricalRate(date: string): Promise<number | null> {
  try {
    // Intentar obtener datos históricos de ArgentinaDatos API
    const response = await fetch("https://api.argentinadatos.com/v1/cotizaciones/dolares", {
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()

      // Buscar el dólar blue de la fecha específica
      const blueRate = data.find((item: any) => item.casa === "blue" && item.fecha.startsWith(date))

      if (blueRate && blueRate.venta) {
        return blueRate.venta
      }
    }

    // Intentar con DolarAPI histórico si ArgentinaDatos falla
    const formattedDate = date.split("-").reverse().join("/") // Convertir YYYY-MM-DD a DD/MM/YYYY
    const dolarApiResponse = await fetch(`https://api.bluelytics.com.ar/v2/historical?date=${date}`, {
      cache: "no-store",
    })

    if (dolarApiResponse.ok) {
      const data = await dolarApiResponse.json()
      if (data.blue?.value_sell) {
        return data.blue.value_sell
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching historical rate:", error)
    return null
  }
}
