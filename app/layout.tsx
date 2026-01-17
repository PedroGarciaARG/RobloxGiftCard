import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Roblox Argentina",
  description: "Gestiona tus compras y ventas de gift cards de Roblox - @ROBLOX_ARGENTINA_OK",
  icons: {
    icon: "/images/whatsapp-20image-202026-01-17-20at-2011.jpeg",
    apple: "/images/whatsapp-20image-202026-01-17-20at-2011.jpeg",
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`font-sans antialiased`}>{children}</body>
    </html>
  )
}
