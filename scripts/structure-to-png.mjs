/**
 * Export PNG from docs/staff-project-structure.html (Playwright).
 * Run: node scripts/structure-to-png.mjs
 */
/* global console */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const htmlPath = path.join(root, 'docs', 'staff-project-structure.html')
const outPath = path.join(root, 'docs', 'staff-project-structure.png')

const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 520 } })
await page.goto(fileUrl, { waitUntil: 'networkidle' })

// Ensure fonts/layout are settled before screenshot
await page.waitForTimeout(200)
await page.screenshot({ path: outPath, fullPage: false })
await browser.close()

console.log('Wrote:', outPath)

