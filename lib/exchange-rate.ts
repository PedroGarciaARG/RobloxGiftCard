export async function getExchangeRate(): Promise<number> {
  try {
    // Usar API de Bluelytics que no tiene dependencias de MetaMask/crypto
    const response = await fetch("https://api.bluelytics.com.ar/v2/latest")

    if (response.ok) {
      const data = await response.json()
      // Usar el dólar blue venta
      if (data.blue?.value_sell) {
        return data.blue.value_sell
      }
    }

    // Fallback valor por defecto actualizado
    return 1200
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return 1200
  }
}
