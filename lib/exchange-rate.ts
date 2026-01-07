export async function getExchangeRate(date: string): Promise<number> {
  try {
    const response = await fetch("https://www.dolarsi.com/api/api.php?type=valoresprincipales")

    if (response.ok) {
      const data = await response.json()
      // Buscar el dólar crypto en la respuesta
      const cryptoDolar = data.find(
        (item: { casa: { nombre: string } }) =>
          item.casa.nombre.toLowerCase().includes("crypto") || item.casa.nombre.toLowerCase().includes("cripto"),
      )

      if (cryptoDolar && cryptoDolar.casa.venta) {
        const rate = Number.parseFloat(cryptoDolar.casa.venta.replace(",", ".").replace("$", ""))
        if (!isNaN(rate) && rate > 0) {
          return rate
        }
      }

      // Fallback al dólar blue si no encuentra crypto
      const blueDolar = data.find((item: { casa: { nombre: string } }) =>
        item.casa.nombre.toLowerCase().includes("blue"),
      )

      if (blueDolar && blueDolar.casa.venta) {
        const rate = Number.parseFloat(blueDolar.casa.venta.replace(",", ".").replace("$", ""))
        if (!isNaN(rate) && rate > 0) {
          return rate
        }
      }
    }

    // Si DolarSi falla, usar API alternativa de dólar blue
    const fallbackResponse = await fetch("https://dolarapi.com/v1/dolares/blue")

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json()
      return fallbackData.venta || fallbackData.compra || 1200
    }

    // Si todas las APIs fallan, retornar valor por defecto actualizado
    return 1200
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return 1200
  }
}
