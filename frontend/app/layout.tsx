'use client'
import './globals.css'
import { Inter } from 'next/font/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
  }))

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <title>Inbox2Order — F-Commerce CRM</title>
        <meta name="description" content="Smart order management for Bangladesh F-commerce sellers" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#1e2230',
                color: '#e8eaf0',
                border: '1px solid #2a2f42',
                borderRadius: '30px',
                fontFamily: 'Sora, sans-serif',
                fontSize: '13px',
                fontWeight: '600',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#1e2230' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#1e2230' } },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  )
}
