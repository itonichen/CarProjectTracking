import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import { THEME_COOKIE, parseTheme } from '@/lib/theme'
import './globals.css'

const instrumentSans = Instrument_Sans({ variable: '--font-instrument-sans', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Garage', template: '%s · Garage' },
  description: 'Track parts, money and progress on the 3000GT builds.',
  appleWebApp: { capable: true, title: 'Garage', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' },
  ],
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html
      lang="en"
      data-theme={theme === 'system' ? undefined : theme}
      className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  )
}
