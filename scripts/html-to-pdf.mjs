/**
 * Xuất PDF từ docs/staff-portal-api-flow-print.html (Playwright).
 * Chạy: node scripts/html-to-pdf.mjs
 */
/* global console */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const htmlPath = path.join(root, 'docs', 'staff-portal-api-flow-print.html')
const outPath = path.join(root, 'docs', 'staff-portal-api-flow.pdf')
const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(fileUrl, { waitUntil: 'networkidle' })
await page.pdf({
  path: outPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
})
await browser.close()
console.log('Wrote:', outPath)
