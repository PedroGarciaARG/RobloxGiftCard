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
  giftCardCodes?: any[]
  // Sale prices (ARS) and commissions
  salePricesARS?: { [key: string]: number }
  mlCommissions?: { [key: string]: number }
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
    console.log("[v0] Saving data - Purchases:", data.purchases?.length || 0, "Sales:", data.sales?.length || 0, "Codes:", data.giftCardCodes?.length || 0)

    const payload = JSON.stringify({
      type: "fullData",
      purchases: data.purchases,
      sales: data.sales,
      cardPrices: data.cardPrices,
      giftCardCodes: data.giftCardCodes || [],
      salePricesARS: data.salePricesARS || {},
      mlCommissions: data.mlCommissions || {},
      lastUpdated: new Date().toISOString(),
    })

    // Google Apps Script requires redirect: "follow" for POST requests
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: payload,
      redirect: "follow",
      mode: "cors",
    })

    if (!response.ok) {
      console.error("[v0] Save HTTP error:", response.status, response.statusText)
      return false
    }

    const text = await response.text()
    console.log("[v0] Save response:", text)
    
    try {
      const result = JSON.parse(text)
      return result.success === true
    } catch {
      // If response is not JSON, check if it contains success indicators
      return text.includes("success") || text.includes("guardado")
    }
  } catch (error) {
    console.error("[v0] Save error:", error instanceof Error ? error.message : error)
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
      console.log("[v0] Loaded gift card codes count:", result.data.giftCardCodes?.length || 0)
      console.log("[v0] Loaded sale prices ARS:", result.data.salePricesARS)
      console.log("[v0] Loaded ML commissions:", result.data.mlCommissions)
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
// VERSION 3.0 - SIN LIMITE DE 50K CARACTERES
// ========================================
// INSTRUCCIONES DE INSTALACION:
// 1. Ve a https://script.google.com/
// 2. Crea un nuevo proyecto (o abre el existente)
// 3. Borra TODO el código y pega este completo
// 4. Guarda (Ctrl+S)
// 5. Click "Implementar" > "Nueva implementación" (IMPORTANTE: nueva, no actualizar)
// 6. Tipo: "Aplicación web"
// 7. Ejecutar como: "Yo (tu email)"
// 8. Acceso: "Cualquier persona"
// 9. Click "Implementar" y copia la URL que termina en /exec
// 10. Pega la URL en la configuración de la app
// ========================================

// IMPORTANTE: Cambia este ID por el de tu spreadsheet
const SPREADSHEET_ID = "1bumjCrgyYmlqu9pdgphgo0dx5pwh0IzrI-KlRA1DNpo";

function doGet(e) {
  try {
    const action = e?.parameter?.action;
    
    if (action === "load") {
      return loadDataFromSheets();
    }
    
    // Test de conexión
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "API activa",
        success: true,
        timestamp: new Date().toISOString(),
        version: "3.0"
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

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const data = JSON.parse(e.postData.contents);
    const timestamp = new Date().toISOString();
    
    Logger.log("Recibido: " + (data.purchases?.length || 0) + " compras, " + (data.sales?.length || 0) + " ventas, " + (data.giftCardCodes?.length || 0) + " códigos");
    
    // Guardar ventas en hoja visual (NO en JSON)
    saveVentasML(ss, data.sales || []);
    
    // Guardar compras en hoja visual
    saveCompras(ss, data.purchases || []);
    
    // Guardar códigos de gift cards
    saveCodigos(ss, data.giftCardCodes || []);
    
    // Guardar precios y comisiones (esto es pequeño, OK en una celda)
    savePreciosConfig(ss, data.cardPrices, data.salePricesARS, data.mlCommissions);
    
    // Guardar timestamp
    let configSheet = ss.getSheetByName("Config");
    if (!configSheet) {
      configSheet = ss.insertSheet("Config");
    }
    configSheet.getRange("A1").setValue("Última actualización:");
    configSheet.getRange("B1").setValue(timestamp);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: "Datos guardados correctamente",
        timestamp: timestamp,
        counts: {
          purchases: data.purchases?.length || 0,
          sales: data.sales?.length || 0,
          codes: data.giftCardCodes?.length || 0
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveVentasML(ss, sales) {
  var sheet = ss.getSheetByName("Ventas");
  if (!sheet) {
    sheet = ss.insertSheet("Ventas");
  }
  sheet.clear();
  
  var headers = [
    "ID", "Order ML", "Fecha", "Tipo Tarjeta", "Cantidad", 
    "Precio Venta", "Comisión Total", "Neto", "Plataforma",
    "Comprador", "DNI", "Dirección", "Ciudad", "Provincia", "CP", "País",
    "Estado ML", "Cargo Venta", "Costo Fijo", "Costo Envío", "Impuestos", "Descuentos", "Anulaciones",
    "Código Tarjeta", "Publicación ML", "Creado"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  
  if (sales.length === 0) return;
  
  var rows = [];
  for (var i = 0; i < sales.length; i++) {
    var s = sales[i];
    rows.push([
      s.id || "",
      s.mlOrderId || "",
      s.saleDate || "",
      getCardTypeLabel(s.cardType),
      s.quantity || 1,
      s.salePrice || 0,
      s.commission || 0,
      s.netAmount || 0,
      s.platform || "mercadolibre",
      s.buyerName || "",
      s.buyerDNI || "",
      s.buyerAddress || "",
      s.buyerCity || "",
      s.buyerState || "",
      s.buyerPostalCode || "",
      s.buyerCountry || "",
      s.mlStatus || "",
      s.mlCargoVenta || 0,
      s.mlCostoFijo || 0,
      s.mlCostoEnvio || 0,
      s.mlImpuestos || 0,
      s.mlDescuentos || 0,
      s.mlAnulaciones || 0,
      s.cardCode || "",
      s.mlPublicationId || "",
      s.createdAt || ""
    ]);
  }
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  Logger.log("Guardadas " + rows.length + " ventas");
}

function saveCompras(ss, purchases) {
  var sheet = ss.getSheetByName("Compras");
  if (!sheet) {
    sheet = ss.insertSheet("Compras");
  }
  sheet.clear();
  
  var headers = ["ID", "Fecha", "Tipo Tarjeta", "Precio USD", "Cotización", "Costo ARS"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  
  if (purchases.length === 0) return;
  
  var rows = [];
  for (var i = 0; i < purchases.length; i++) {
    var p = purchases[i];
    rows.push([
      p.id || "",
      p.purchaseDate || "",
      getCardTypeLabel(p.cardType),
      p.priceUSD || 0,
      p.exchangeRate || 0,
      p.costARS || 0
    ]);
  }
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function saveCodigos(ss, codes) {
  var sheet = ss.getSheetByName("Codigos");
  if (!sheet) {
    sheet = ss.insertSheet("Codigos");
  }
  sheet.clear();
  
  var headers = ["ID", "Tipo Tarjeta", "Código", "Estado", "Creado", "Imagen Lista", "Entregado", "Entregado A"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  
  if (codes.length === 0) return;
  
  var rows = [];
  for (var i = 0; i < codes.length; i++) {
    var c = codes[i];
    rows.push([
      c.id || "",
      getCardTypeLabel(c.cardType),
      c.code || "",
      c.status || "available",
      c.createdAt || "",
      c.imageConfirmedAt || "",
      c.deliveredAt || "",
      c.deliveredTo || ""
    ]);
  }
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function savePreciosConfig(ss, cardPrices, salePricesARS, mlCommissions) {
  var sheet = ss.getSheetByName("Precios");
  if (!sheet) {
    sheet = ss.insertSheet("Precios");
  }
  sheet.clear();
  
  sheet.getRange("A1:D1").setValues([["Tipo Tarjeta", "Precio Compra USD", "Precio Venta ARS", "Comisión ML ARS"]]);
  sheet.getRange("A1:D1").setFontWeight("bold");
  
  var cardTypes = ["400", "800", "1000", "steam5", "steam10"];
  var data = [];
  for (var i = 0; i < cardTypes.length; i++) {
    var tipo = cardTypes[i];
    data.push([
      getCardTypeLabel(tipo),
      cardPrices ? cardPrices[tipo] || 0 : 0,
      salePricesARS ? salePricesARS[tipo] || 0 : 0,
      mlCommissions ? mlCommissions[tipo] || 0 : 0
    ]);
  }
  
  sheet.getRange(2, 1, data.length, 4).setValues(data);
}

function getCardTypeLabel(cardType) {
  var labels = {
    "400": "400 Robux",
    "800": "800 Robux", 
    "1000": "1000 Robux",
    "steam5": "Steam $5",
    "steam10": "Steam $10"
  };
  return labels[String(cardType)] || String(cardType);
}

function parseCardType(label) {
  if (!label) return 400;
  var str = String(label);
  if (str.includes("Steam") && str.includes("5")) return "steam5";
  if (str.includes("Steam") && str.includes("10")) return "steam10";
  if (str.includes("steam5")) return "steam5";
  if (str.includes("steam10")) return "steam10";
  var num = parseInt(str.replace(/[^0-9]/g, ""));
  if (num === 400 || num === 800 || num === 1000) return num;
  return 400;
}

// CARGAR DATOS DESDE LAS HOJAS VISUALES (no desde JSON)
function loadDataFromSheets() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    var defaultPrices = { "400": 5.17, "800": 10.34, "1000": 10, "steam5": 5, "steam10": 11 };
    var defaultSalePrices = { "400": 13999, "800": 27999, "1000": 34999, "steam5": 11999, "steam10": 24999 };
    var defaultCommissions = { "400": 3284.84, "800": 6995, "1000": 8500, "steam5": 2800, "steam10": 5800 };
    
    // Leer ventas
    var sales = [];
    var ventasSheet = ss.getSheetByName("Ventas");
    if (ventasSheet && ventasSheet.getLastRow() > 1) {
      var ventasData = ventasSheet.getDataRange().getValues();
      for (var i = 1; i < ventasData.length; i++) {
        var row = ventasData[i];
        if (row[0]) {
          sales.push({
            id: String(row[0] || ""),
            mlOrderId: String(row[1] || ""),
            saleDate: String(row[2] || ""),
            cardType: parseCardType(row[3]),
            quantity: parseInt(row[4]) || 1,
            salePrice: parseFloat(row[5]) || 0,
            commission: parseFloat(row[6]) || 0,
            netAmount: parseFloat(row[7]) || 0,
            platform: String(row[8] || "mercadolibre"),
            buyerName: String(row[9] || ""),
            buyerDNI: String(row[10] || ""),
            buyerAddress: String(row[11] || ""),
            buyerCity: String(row[12] || ""),
            buyerState: String(row[13] || ""),
            buyerPostalCode: String(row[14] || ""),
            buyerCountry: String(row[15] || ""),
            mlStatus: String(row[16] || ""),
            mlCargoVenta: parseFloat(row[17]) || 0,
            mlCostoFijo: parseFloat(row[18]) || 0,
            mlCostoEnvio: parseFloat(row[19]) || 0,
            mlImpuestos: parseFloat(row[20]) || 0,
            mlDescuentos: parseFloat(row[21]) || 0,
            mlAnulaciones: parseFloat(row[22]) || 0,
            cardCode: String(row[23] || ""),
            mlPublicationId: String(row[24] || ""),
            createdAt: String(row[25] || "")
          });
        }
      }
    }
    
    // Leer compras
    var purchases = [];
    var comprasSheet = ss.getSheetByName("Compras");
    if (comprasSheet && comprasSheet.getLastRow() > 1) {
      var comprasData = comprasSheet.getDataRange().getValues();
      for (var i = 1; i < comprasData.length; i++) {
        var row = comprasData[i];
        if (row[0]) {
          purchases.push({
            id: String(row[0] || ""),
            purchaseDate: String(row[1] || ""),
            cardType: parseCardType(row[2]),
            priceUSD: parseFloat(row[3]) || 0,
            exchangeRate: parseFloat(row[4]) || 0,
            costARS: parseFloat(row[5]) || 0
          });
        }
      }
    }
    
    // Leer códigos
    var giftCardCodes = [];
    var codigosSheet = ss.getSheetByName("Codigos");
    if (codigosSheet && codigosSheet.getLastRow() > 1) {
      var codigosData = codigosSheet.getDataRange().getValues();
      for (var i = 1; i < codigosData.length; i++) {
        var row = codigosData[i];
        if (row[0]) {
          giftCardCodes.push({
            id: String(row[0] || ""),
            cardType: parseCardType(row[1]),
            code: String(row[2] || ""),
            status: String(row[3] || "available"),
            createdAt: String(row[4] || ""),
            imageConfirmedAt: row[5] ? String(row[5]) : undefined,
            deliveredAt: row[6] ? String(row[6]) : undefined,
            deliveredTo: row[7] ? String(row[7]) : undefined
          });
        }
      }
    }
    
    // Leer precios
    var cardPrices = defaultPrices;
    var salePricesARS = defaultSalePrices;
    var mlCommissions = defaultCommissions;
    
    var preciosSheet = ss.getSheetByName("Precios");
    if (preciosSheet && preciosSheet.getLastRow() > 1) {
      var preciosData = preciosSheet.getDataRange().getValues();
      var cardTypes = ["400", "800", "1000", "steam5", "steam10"];
      for (var i = 1; i < preciosData.length && i <= 5; i++) {
        var tipo = cardTypes[i - 1];
        cardPrices[tipo] = parseFloat(preciosData[i][1]) || defaultPrices[tipo];
        salePricesARS[tipo] = parseFloat(preciosData[i][2]) || defaultSalePrices[tipo];
        mlCommissions[tipo] = parseFloat(preciosData[i][3]) || defaultCommissions[tipo];
      }
    }
    
    Logger.log("Cargado: " + purchases.length + " compras, " + sales.length + " ventas, " + giftCardCodes.length + " códigos");
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true,
        data: {
          purchases: purchases,
          sales: sales,
          cardPrices: cardPrices,
          giftCardCodes: giftCardCodes,
          salePricesARS: salePricesARS,
          mlCommissions: mlCommissions
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("Error en loadDataFromSheets: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función de prueba
function testScript() {
  var result = loadDataFromSheets();
  Logger.log(result.getContent());
}
`
