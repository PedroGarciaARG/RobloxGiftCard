"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Check, ImageIcon as ImageIconComponent, Send, Plus } from "lucide-react"
import type { GiftCardCode, CardType } from "@/lib/types"

interface CodeManagerProps {
  codes: GiftCardCode[]
  onAddCode: (code: GiftCardCode) => void
  onUpdateCode: (id: string, code: GiftCardCode) => void
  onDeleteCode: (id: string) => void
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  400: "400 Robux",
  800: "800 Robux",
  1000: "1000 Robux",
  steam5: "Steam $5",
  steam10: "Steam $10",
}

export function CodeManager({ codes, onAddCode, onUpdateCode, onDeleteCode }: CodeManagerProps) {
  const [newCode, setNewCode] = useState("")
  const [newCardType, setNewCardType] = useState<CardType>(400)
  const [deliverTo, setDeliverTo] = useState<Record<string, string>>({})

  const handleAddCode = () => {
    if (!newCode.trim()) return

    const code: GiftCardCode = {
      id: crypto.randomUUID(),
      cardType: newCardType,
      code: newCode.trim(),
      createdAt: new Date().toISOString(),
      status: "available",
    }

    onAddCode(code)
    setNewCode("")
  }

  const handleMarkImageReady = (code: GiftCardCode) => {
    onUpdateCode(code.id, {
      ...code,
      status: "image_ready",
      imageConfirmedAt: new Date().toISOString(),
    })
  }

  const handleMarkDelivered = (code: GiftCardCode) => {
    const buyer = deliverTo[code.id] || ""
    onUpdateCode(code.id, {
      ...code,
      status: "delivered",
      deliveredAt: new Date().toISOString(),
      deliveredTo: buyer,
    })
    setDeliverTo((prev) => {
      const next = { ...prev }
      delete next[code.id]
      return next
    })
  }

  const getStatusBadge = (status: GiftCardCode["status"]) => {
    switch (status) {
      case "available":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Disponible</Badge>
      case "image_ready":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50">Imagen Lista</Badge>
      case "delivered":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50">Entregado</Badge>
    }
  }

  const availableCodes = codes.filter((c) => c.status === "available")
  const imageReadyCodes = codes.filter((c) => c.status === "image_ready")
  const deliveredCodes = codes.filter((c) => c.status === "delivered")

  return (
    <div className="space-y-6">
      {/* Add new code */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Agregar Codigo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="code" className="sr-only">Codigo</Label>
              <Input
                id="code"
                placeholder="Ingresa el codigo..."
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="w-full sm:w-40">
              <Label htmlFor="cardType" className="sr-only">Tipo de tarjeta</Label>
              <Select value={String(newCardType)} onValueChange={(v) => setNewCardType(v === "steam5" || v === "steam10" ? v : Number(v) as CardType)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400 Robux</SelectItem>
                  <SelectItem value="800">800 Robux</SelectItem>
                  <SelectItem value="1000">1000 Robux</SelectItem>
                  <SelectItem value="steam5">Steam $5</SelectItem>
                  <SelectItem value="steam10">Steam $10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddCode} className="bg-sky-500 hover:bg-sky-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available codes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            Disponibles
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">{availableCodes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableCodes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay codigos disponibles</p>
          ) : (
            <div className="space-y-2">
              {availableCodes.map((code) => (
                <div key={code.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Badge variant="outline" className="border-sky-500/50 text-sky-400 text-[10px] sm:text-xs">
                      {CARD_TYPE_LABELS[code.cardType]}
                    </Badge>
                    <code className="text-xs sm:text-sm font-mono text-foreground break-all">{code.code}</code>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="sm:hidden">{getStatusBadge(code.status)}</span>
                    <span className="hidden sm:inline">{getStatusBadge(code.status)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkImageReady(code)}
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <ImageIconComponent className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteCode(code.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image ready codes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            Imagen Lista
            <Badge variant="outline" className="border-blue-500/50 text-blue-400">{imageReadyCodes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imageReadyCodes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay codigos con imagen lista</p>
          ) : (
            <div className="space-y-2">
              {imageReadyCodes.map((code) => (
                <div key={code.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Badge variant="outline" className="border-sky-500/50 text-sky-400 text-[10px] sm:text-xs">
                      {CARD_TYPE_LABELS[code.cardType]}
                    </Badge>
                    <code className="text-xs sm:text-sm font-mono text-foreground break-all">{code.code}</code>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="hidden sm:inline">{getStatusBadge(code.status)}</span>
                    <Input
                      placeholder="Comprador..."
                      value={deliverTo[code.id] || ""}
                      onChange={(e) => setDeliverTo((prev) => ({ ...prev, [code.id]: e.target.value }))}
                      className="w-24 sm:w-32 bg-background border-border text-xs sm:text-sm h-8 sm:h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkDelivered(code)}
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10 h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteCode(code.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivered codes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            Entregados
            <Badge variant="outline" className="border-green-500/50 text-green-400">{deliveredCodes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveredCodes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay codigos entregados</p>
          ) : (
            <div className="space-y-2">
              {deliveredCodes.map((code) => (
                <div key={code.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-secondary gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Badge variant="outline" className="border-sky-500/50 text-sky-400 text-[10px] sm:text-xs">
                      {CARD_TYPE_LABELS[code.cardType]}
                    </Badge>
                    <code className="text-xs sm:text-sm font-mono text-foreground break-all">{code.code}</code>
                    {code.deliveredTo && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        a {code.deliveredTo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="sm:hidden">{getStatusBadge(code.status)}</span>
                    <span className="hidden sm:inline">{getStatusBadge(code.status)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteCode(code.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
