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
    console.log("[v0] Saving all data to sheet:", JSON.stringify(data, null, 2))
    console.log("[v0] Purchases count:", data.purchases?.length || 0)
    console.log("[v0] Sales count:", data.sales?.length || 0)

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        type: "fullData",
        purchases: data.purchases,
        sales: data.sales,
        cardPrices: data.cardPrices,
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
    console.log("[v0] Loading data from sheet, URL:", webAppUrl)
    const response = await fetch(`${webAppUrl}?action=load`, {
      method: "GET",
      redirect: "follow",
    })
    const text = await response.text()
    console.log("[v0] Load raw response:", text)
    const result = JSON.parse(text)

    if (result.data) {
      console.log("[v0] Loaded purchases count:", result.data.purchases?.length || 0)
      console.log("[v0] Loaded sales count:", result.data.sales?.length || 0)
      console.log("[v0] Loaded from sheets:", JSON.stringify(result.data, null, 2))
      return result.data as AppData
    }
    console.log("[v0] No data in response")
    return null
  } catch (error) {
    console.error("[v0] Load error:", error)
    return null
  }
}

export async function migrateFromVisualSheets(webAppUrl: string): Promise<AppData | null> {
  try {
    console.log("[v0] Attempting to migrate from visual sheets...")
    const response = await fetch(`${webAppUrl}?action=migrate`, {
      method: "GET",
      redirect: "follow",
    })
    const text = await response.text()
    console.log("[v0] Migration response:", text)
    const result = JSON.parse(text)

    if (result.success && result.data) {
      return result.data as AppData
    }
    return null
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return null
  }
}

// Google Apps Script actualizado para tu spreadsheet
export const GOOGLE_APPS_SCRIPT_CODE = `
// ========================================
// SCRIPT PARA GIFT CARDS - ROBLOX ARGENTINA
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
  
  if (action === "migrate") {
    return migrateFromVisualSheets();
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
    
    // Guardar datos en formato JSON en B2
    sheet.getRange("A1").setValue("Última actualización:");
    sheet.getRange("B1").setValue(timestamp);
    sheet.getRange("A2").setValue("Datos:");
    sheet.getRange("B2").setValue(JSON.stringify(data));
    
    // También guardar en hojas visuales
    saveToVisualSheet(ss, "Compras", data.purchases || [], 
      ["ID", "Fecha", "Tipo Tarjeta", "Precio USD", "Cotización", "Costo ARS"],
      (p) => [p.id, p.purchaseDate, p.cardType + " Robux", p.priceUSD, p.exchangeRate, p.costARS]
    );
    
    saveToVisualSheet(ss, "Ventas", data.sales || [],
      ["ID", "Fecha", "Tipo Tarjeta", "Cantidad", "Precio Venta", "Comisión", "Neto", "Plataforma"],
      (s) => [s.id, s.saleDate, s.cardType + " Robux", s.quantity, s.salePrice, s.commission, s.netAmount, s.platform]
    );
    
    // Guardar precios
    let preciosSheet = ss.getSheetByName("Precios");
    if (!preciosSheet) {
      preciosSheet = ss.insertSheet("Precios");
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
          data: { purchases: [], sales: [], cardPrices: { "400": 4.99, "800": 9.99 } },
          message: "No hay hoja AppData"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const jsonStr = sheet.getRange("B2").getValue();
    if (!jsonStr) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true,
          data: { purchases: [], sales: [], cardPrices: { "400": 4.99, "800": 9.99 } },
          message: "Celda B2 vacía"
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
          cardPrices: data.cardPrices || { "400": 4.99, "800": 9.99 }
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

// Nueva función para migrar datos de hojas existentes
function migrateFromVisualSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const purchases = [];
    const sales = [];
    
    // Leer compras de la hoja Compras
    const comprasSheet = ss.getSheetByName("Compras");
    if (comprasSheet) {
      const comprasData = comprasSheet.getDataRange().getValues();
      for (let i = 1; i < comprasData.length; i++) {
        const row = comprasData[i];
        if (row[0]) { // Si tiene ID
          purchases.push({
            id: row[0].toString(),
            purchaseDate: row[1]?.toString() || "",
            cardType: (row[2]?.toString() || "").replace(" Robux", ""),
            priceUSD: parseFloat(row[3]) || 0,
            exchangeRate: parseFloat(row[4]) || 0,
            costARS: parseFloat(row[5]) || 0
          });
        }
      }
    }
    
    // Leer ventas de la hoja Ventas
    const ventasSheet = ss.getSheetByName("Ventas");
    if (ventasSheet) {
      const ventasData = ventasSheet.getDataRange().getValues();
      for (let i = 1; i < ventasData.length; i++) {
        const row = ventasData[i];
        if (row[0]) { // Si tiene ID
          sales.push({
            id: row[0].toString(),
            saleDate: row[1]?.toString() || "",
            cardType: (row[2]?.toString() || "").replace(" Robux", ""),
            quantity: parseInt(row[3]) || 1,
            salePrice: parseFloat(row[4]) || 0,
            commission: parseFloat(row[5]) || 0,
            netAmount: parseFloat(row[6]) || 0,
            platform: row[7]?.toString() || "MercadoLibre"
          });
        }
      }
    }
    
    const data = {
      purchases,
      sales,
      cardPrices: { "400": 4.99, "800": 9.99 }
    };
    
    // Guardar en AppData si hay datos
    if (purchases.length > 0 || sales.length > 0) {
      let sheet = ss.getSheetByName("AppData");
      if (!sheet) {
        sheet = ss.insertSheet("AppData");
      }
      sheet.getRange("A1").setValue("Última actualización:");
      sheet.getRange("B1").setValue(new Date().toISOString());
      sheet.getRange("A2").setValue("Datos:");
      sheet.getRange("B2").setValue(JSON.stringify(data));
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true,
        data: data,
        migrated: purchases.length + sales.length
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
