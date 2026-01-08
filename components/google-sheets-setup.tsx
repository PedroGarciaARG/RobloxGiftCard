"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Copy, ExternalLink, RefreshCw } from "lucide-react"
import { getSheetConfig, saveSheetConfig, testConnection, GOOGLE_APPS_SCRIPT_CODE } from "@/lib/google-sheets"

interface GoogleSheetsSetupProps {
  onConnectionChange: (connected: boolean, webAppUrl: string | null) => void
}

export function GoogleSheetsSetup({ onConnectionChange }: GoogleSheetsSetupProps) {
  const [webAppUrl, setWebAppUrl] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const config = getSheetConfig()
    if (config?.webAppUrl) {
      setWebAppUrl(config.webAppUrl)
      handleTestConnection(config.webAppUrl)
    }
  }, [])

  const handleTestConnection = async (url: string) => {
    setIsTesting(true)
    setError(null)
    try {
      const success = await testConnection(url)
      if (success) {
        setIsConnected(true)
        saveSheetConfig({ webAppUrl: url })
        onConnectionChange(true, url)
      } else {
        throw new Error("No se pudo conectar")
      }
    } catch (err) {
      setIsConnected(false)
      setError(
        "No se pudo conectar. Verifica que:\n1. El script esté desplegado como 'Aplicación web'\n2. Acceso sea 'Cualquier persona'\n3. La URL sea la de implementación (no la del editor)",
      )
      onConnectionChange(false, null)
    } finally {
      setIsTesting(false)
    }
  }

  const handleConnect = () => {
    if (webAppUrl.trim()) {
      handleTestConnection(webAppUrl.trim())
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem("google-sheets-config")
    setIsConnected(false)
    setWebAppUrl("")
    onConnectionChange(false, null)
  }

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback para cuando clipboard no está disponible
      const textArea = document.createElement("textarea")
      textArea.value = GOOGLE_APPS_SCRIPT_CODE
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Google Sheets</CardTitle>
            <CardDescription>Sincroniza tus datos con Google Sheets</CardDescription>
          </div>
          {isConnected ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="w-3 h-3 mr-1" />
              Desconectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <>
            <div className="space-y-2">
              <Label htmlFor="webAppUrl">URL del Google Apps Script</Label>
              <Input
                id="webAppUrl"
                placeholder="https://script.google.com/macros/s/AKfy.../exec"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
              />
              {error && <p className="text-sm text-destructive whitespace-pre-line">{error}</p>}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleConnect} disabled={!webAppUrl.trim() || isTesting}>
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Probando...
                  </>
                ) : (
                  "Conectar"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowInstructions(!showInstructions)}>
                {showInstructions ? "Ocultar instrucciones" : "Ver instrucciones"}
              </Button>
            </div>

            {showInstructions && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <h4 className="font-semibold">Instrucciones de configuración:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    Ve a{" "}
                    <a
                      href="https://script.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Google Apps Script <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Crea un nuevo proyecto</li>
                  <li>Borra todo el contenido y pega el código de abajo</li>
                  <li>Guarda el proyecto (Ctrl+S)</li>
                  <li>
                    Click en <strong>"Implementar"</strong> → <strong>"Nueva implementación"</strong>
                  </li>
                  <li>
                    Selecciona el ícono de engranaje → <strong>"Aplicación web"</strong>
                  </li>
                  <li>
                    Ejecutar como: <strong>"Yo"</strong>
                  </li>
                  <li>
                    Quién tiene acceso: <strong>"Cualquier persona"</strong>
                  </li>
                  <li>
                    Click en <strong>"Implementar"</strong> y autoriza los permisos
                  </li>
                  <li>
                    Copia la <strong>URL de la aplicación web</strong> y pégala arriba
                  </li>
                </ol>
                <div className="pt-2 flex gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={copyScript}>
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? "¡Copiado!" : "Copiar código del script"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "https://docs.google.com/spreadsheets/d/1bumjCrgyYmlqu9pdgphgo0dx5pwh0IzrI-KlRA1DNpo",
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Spreadsheet
                  </Button>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Ver código del script
                  </summary>
                  <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </details>
              </div>
            )}
          </>
        )}

        {isConnected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Los datos se sincronizan automáticamente con tu Google Sheet.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection(webAppUrl)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Probar conexión
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Desconectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    "https://docs.google.com/spreadsheets/d/1bumjCrgyYmlqu9pdgphgo0dx5pwh0IzrI-KlRA1DNpo",
                    "_blank",
                  )
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Sheet
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
