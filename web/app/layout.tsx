import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MUIThemeProvider } from './mui-theme-provider'
import { ToastProvider } from './components/ToastContext'
import { ToastContainer } from './components/ToastContainer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Workflow Engine',
  description: 'A powerful workflow orchestration platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MUIThemeProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </MUIThemeProvider>
      </body>
    </html>
  )
}
