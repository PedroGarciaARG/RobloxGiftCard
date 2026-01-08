// Google Sheets Integration
// Usa tu script de Google Apps Script existente

const SPREADSHEET_ID = "1bumjCrgyYmlqu9pdgphgo0dx5pwh0IzrI-KlRA1DNpo"

export interface SheetConfig {
  webAppUrl: string
}

export interface AppData {
  purchases: any[]
  sales: any[]
  cardPrices: { [key: string]: number }
  salePrices?: {
    mlPrice400: number
    mlPrice800: number
    mlCommission400: number
    mlCommission800: number
  }
}

export function getSheetConfig(): SheetConfig | null {
  if (typeof window === "undefined") return null
  const saved = localStorage.getItem("google-sheets-config")
  return saved ? JSON.parse(saved) : null
}

export function saveSheetConfig(config: SheetConfig) {
  localStorage.setItem("google-sheets-config", JSON.stringify(config))
}

export async function testConnection(webAppUrl: string): Promise<boolean> {
  try {
    const response = await fetch(webAppUrl, {
      method: "GET",
      redirect: "follow",
    })
    const text = await response.text()
    console.log("[v0] Test connection response:", text)
    const data = JSON.parse(text)
    return data.status === "API activa" || data.success === true
  } catch (error) {
    console.error("[v0] Test connection error:", error)
    return false
  }
}

export async function saveAllData(webAppUrl: string, data: AppData): Promise<boolean> {
  try {
    console.log("[v0] Saving all data to sheet:", data)
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        type: "fullData",
        purchases: data.purchases,
        sales: data.sales,
        cardPrices: data.cardPrices,
        salePrices: data.salePrices,
        lastUpdated: new Date().toISOString(),
      }),
      redirect: "follow",
    })
    const text = await response.text()
    console.log("[v0] Save response:", text)
    const result = JSON.parse(text)
    return result.success === true
  } catch (error) {
    console.error("[v0] Save error:", error)
    return false
  }
}

export async function loadAllData(webAppUrl: string): Promise<AppData | null> {
  try {
    console.log("[v0] Loading data from sheet")
    const response = await fetch(`${webAppUrl}?action=load`, {
      method: "GET",
      redirect: "follow",
    })
    const text = await response.text()
    console.log("[v0] Load response:", text)
    const result = JSON.parse(text)
    if (result.data) {
      return result.data as AppData
    }
    return null
  } catch (error) {
    console.error("[v0] Load error:", error)
    return null
  }
}

// Google Apps Script actualizado para tu spreadsheet
export const GOOGLE_APPS_SCRIPT_CODE = `
// ========================================
// SCRIPT PARA GIFT CARDS - ROBLOX
// ========================================
// 1. Ve a https://script.google.com/
// 2. Crea un nuevo proyecto
// 3. Borra todo y pega este código
// 4. Guarda (Ctrl+S)
// 5. Click "Implementar" > "Nueva implementación"
// 6. Tipo: "Aplicación web"
// 7. Ejecutar como: "Yo"
// 8. Acceso: "Cualquier persona"
// 9. Click "Implementar" y copia la URL
// ========================================

const SPREADSHEET_ID = "1bumjCrgyYmlqu9pdgphgo0dx5pwh0IzrI-KlRA1DNpo";

function doGet(e) {
  const action = e?.parameter?.action;
  
  if (action === "load") {
    return loadData();
  }
  
  // Test de conexión
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: "API activa",
      success: true,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("AppData");
    
    if (!sheet) {
      sheet = ss.insertSheet("AppData");
    }
    
    const data = JSON.parse(e.postData.contents);
    const timestamp = new Date().toISOString();
    
    // Guardar datos en formato JSON
    sheet.clear();
    sheet.getRange("A1").setValue("Última actualización:");
    sheet.getRange("B1").setValue(timestamp);
    sheet.getRange("A2").setValue("Datos:");
    sheet.getRange("B2").setValue(JSON.stringify(data));
    
    // También crear hojas individuales para visualización
    saveToVisualSheet(ss, "Compras", data.purchases || [], 
      ["ID", "Fecha", "Tipo Tarjeta", "Precio USD", "Cotización", "Costo ARS"],
      (p) => [p.id, p.purchaseDate, p.cardType + " Robux", p.priceUSD, p.exchangeRate, p.costARS]
    );
    
    saveToVisualSheet(ss, "Ventas", data.sales || [],
      ["ID", "Fecha", "Tipo Tarjeta", "Cantidad", "Precio Venta", "Comisión", "Neto", "Plataforma"],
      (s) => [s.id, s.saleDate, s.cardType + " Robux", s.quantity, s.salePrice, s.commission, s.netAmount, s.platform]
    );
    
    // Guardar precios de compra
    let preciosSheet = ss.getSheetByName("Precios Compra");
    if (!preciosSheet) {
      preciosSheet = ss.insertSheet("Precios Compra");
    }
    preciosSheet.clear();
    preciosSheet.getRange("A1:B1").setValues([["Tipo Tarjeta", "Precio USD"]]);
    if (data.cardPrices) {
      const precios = Object.entries(data.cardPrices);
      if (precios.length > 0) {
        preciosSheet.getRange(2, 1, precios.length, 2).setValues(
          precios.map(([tipo, precio]) => [tipo + " Robux", precio])
        );
      }
    }
    
    // Guardar precios de venta
    if (data.salePrices) {
      let ventaPreciosSheet = ss.getSheetByName("Precios Venta");
      if (!ventaPreciosSheet) {
        ventaPreciosSheet = ss.insertSheet("Precios Venta");
      }
      ventaPreciosSheet.clear();
      ventaPreciosSheet.getRange("A1:B1").setValues([["Concepto", "Valor ARS"]]);
      ventaPreciosSheet.getRange("A2:B5").setValues([
        ["Precio ML 400 Robux", data.salePrices.mlPrice400],
        ["Precio ML 800 Robux", data.salePrices.mlPrice800],
        ["Comisión ML 400 Robux", data.salePrices.mlCommission400],
        ["Comisión ML 800 Robux", data.salePrices.mlCommission800]
      ]);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: "Datos guardados",
        timestamp: timestamp
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function loadData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("AppData");
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true,
          data: { 
            purchases: [], 
            sales: [], 
            cardPrices: { "400": 5.17, "800": 10.34 },
            salePrices: {
              mlPrice400: 13999,
              mlPrice800: 27999,
              mlCommission400: 3284.84,
              mlCommission800: 6995
            }
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const jsonStr = sheet.getRange("B2").getValue();
    if (!jsonStr) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true,
          data: { 
            purchases: [], 
            sales: [], 
            cardPrices: { "400": 5.17, "800": 10.34 },
            salePrices: {
              mlPrice400: 13999,
              mlPrice800: 27999,
              mlCommission400: 3284.84,
              mlCommission800: 6995
            }
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(jsonStr);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true,
        data: {
          purchases: data.purchases || [],
          sales: data.sales || [],
          cardPrices: data.cardPrices || { "400": 5.17, "800": 10.34 },
          salePrices: data.salePrices || {
            mlPrice400: 13999,
            mlPrice800: 27999,
            mlCommission400: 3284.84,
            mlCommission800: 6995
          }
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveToVisualSheet(ss, name, data, headers, rowMapper) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  sheet.clear();
  
  if (data.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  
  const rows = [headers, ...data.map(rowMapper)];
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}
`
