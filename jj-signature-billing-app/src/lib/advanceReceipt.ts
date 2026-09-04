import { jsPDF } from 'jspdf'
import { BRAND_ADDRESS, BRAND_EN, BRAND_LOGO, BRAND_PHONE_DISPLAY } from './brand'
import { formatCurrency } from './retail'
import { formatIndianPhone } from './phone'
import { loadCanonicalLogo } from './invoicePdf'
import type { AdvanceOrder } from '../services/advanceOrderService'

const esc = (value: string) => value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char))

export async function advanceReceiptPdf(order: AdvanceOrder) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logoData = await loadCanonicalLogo()
  const pageWidth = 210
  const left = 18
  const right = 192
  const contentWidth = right - left
  const ink = '#171717'
  const muted = '#625A50'
  const beige = '#F3EBDD'
  const border = '#CBB89D'
  const lineHeight = 5

  // This is a document renderer, not a capture of the responsive UI.
  doc.setFillColor(border); doc.rect(0, 0, pageWidth, 6, 'F')
  if (logoData) doc.addImage(logoData, 'PNG', left, 12, 18, 18)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(ink)
  doc.text(BRAND_EN.toUpperCase(), left + 25, 21)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(muted)
  doc.text('ADVANCE RECEIPT - NOT A TAX INVOICE', left + 25, 27)
  const addressLines = doc.splitTextToSize(BRAND_ADDRESS, 68) as string[]
  doc.text(addressLines, right, 17, { align: 'right' })
  doc.text(BRAND_PHONE_DISPLAY, right, 17 + addressLines.length * lineHeight + 3, { align: 'right' })

  doc.setDrawColor(border); doc.setLineWidth(0.35); doc.line(left, 37, right, 37)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(ink); doc.text(order.deposit_id, left, 49)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(muted)
  doc.text(`Created: ${new Date(order.created_at).toLocaleString('en-IN')}`, right, 49, { align: 'right' })

  const rows: Array<[string, string]> = [
    ['Customer', order.customer_name || '-'],
    ['Phone', formatIndianPhone(order.phone)],
    ['Address', order.address || '-'],
    ['Product', order.product_name || '-'],
    ['Category', order.category || '-'],
    ['Expected delivery', new Date(`${order.expected_delivery_date}T00:00:00`).toLocaleDateString('en-IN')],
  ]
  let y = 65
  rows.forEach(([label, value]) => {
    const valueLines = doc.splitTextToSize(String(value), 122) as string[]
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(muted)
    doc.text(label.toUpperCase(), left, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(ink)
    doc.text(valueLines, 64, y)
    y += Math.max(9, valueLines.length * lineHeight + 3)
  })

  const financialTop = y + 6
  const financialHeight = 48
  doc.setFillColor(beige); doc.roundedRect(left, financialTop, contentWidth, financialHeight, 3, 3, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(ink); doc.text('PAYMENT SUMMARY', left + 7, financialTop + 9)
  doc.setDrawColor('#D8CBB7'); doc.setLineWidth(0.25); doc.line(left + 7, financialTop + 12, right - 7, financialTop + 12)

  const moneyRows = [
    ['Total order amount', order.total_amount],
    ['Deposit paid', order.deposit_amount],
    ['Remaining balance', order.remaining_balance],
  ] as const
  moneyRows.forEach(([label, value], index) => {
    const rowY = financialTop + 22 + index * 10
    doc.setFont('helvetica', index === 2 ? 'bold' : 'normal'); doc.setFontSize(9); doc.setTextColor(index === 2 ? ink : muted)
    doc.text(label, left + 7, rowY)
    // Fixed right edge + nowrap-safe column prevents currency clipping or drift.
    doc.text(formatCurrency(Number(value || 0)), right - 8, rowY, { align: 'right' })
  })

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(muted)
  const disclaimer = doc.splitTextToSize('This receipt records an advance payment only. It is not a final invoice.', contentWidth - 20) as string[]
  doc.text(disclaimer, pageWidth / 2, financialTop + financialHeight + 14, { align: 'center' })
  doc.setDrawColor(border); doc.setLineWidth(0.35); doc.line(left, 278, right, 278)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(muted)
  doc.text('Thank you for choosing J.J Signature.', pageWidth / 2, 285, { align: 'center' })
  return new File([doc.output('blob')], `Advance-Receipt-${order.deposit_id}.pdf`, { type: 'application/pdf' })
}

export function printAdvanceReceipt(order: AdvanceOrder) {
  const frame = document.createElement('iframe'); frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(frame)
  const doc = frame.contentWindow?.document; if (!doc) return
  doc.open(); doc.write(`<!doctype html><html><head><title>Advance Receipt ${esc(order.deposit_id)}</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}body{font:12px Arial,sans-serif;width:72mm;margin:0;padding:4mm;color:#111;background:#FFFDF8;overflow-wrap:anywhere}.c{text-align:center}.r{display:grid;grid-template-columns:minmax(0,1fr) max-content;align-items:baseline;column-gap:8px;margin:7px 0}.r>*:last-child{white-space:nowrap;text-align:right}.line{border-top:1px dashed #CBB89D;margin:10px 0}.big{font-size:16px;font-weight:bold}.warn{font-size:10px;font-weight:bold;margin-top:14px}</style></head><body><div class="c" style="margin-bottom:6px;"><img src="${BRAND_LOGO}" alt="${esc(BRAND_EN)}" style="width:40px;height:40px;object-fit:contain;display:inline-block;border-radius:10px;border:1px solid #D8CBB7;padding:3px;" /></div><div class="c big">${esc(BRAND_EN)}</div><div class="c">${esc(BRAND_ADDRESS)}</div><div class="c">${esc(BRAND_PHONE_DISPLAY)}</div><div class="line"></div><div class="c big">ADVANCE RECEIPT</div><div class="c">Not a final tax invoice</div><div class="line"></div><div><b>${esc(order.deposit_id)}</b></div><div>${new Date(order.created_at).toLocaleString('en-IN')}</div><div class="line"></div><div><b>Customer:</b> ${esc(order.customer_name)}</div><div><b>Phone:</b> ${esc(formatIndianPhone(order.phone))}</div><div><b>Product:</b> ${esc(order.product_name)}</div><div><b>Delivery:</b> ${esc(new Date(`${order.expected_delivery_date}T00:00:00`).toLocaleDateString('en-IN'))}</div><div class="line"></div><div class="r"><span>Total Amount</span><b>${esc(formatCurrency(order.total_amount))}</b></div><div class="r"><span>Deposit Paid</span><b>${esc(formatCurrency(order.deposit_amount))}</b></div><div class="r big"><span>Balance</span><span>${esc(formatCurrency(order.remaining_balance))}</span></div><div class="line"></div><div class="c warn">ADVANCE PAYMENT ONLY - NOT A FINAL INVOICE</div></body></html>`); doc.close()
  setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000) }, 250)
}

export function downloadFile(file: File | Promise<File>) {
  void Promise.resolve(file).then((resolved) => {
    const url = URL.createObjectURL(resolved)
    const link = document.createElement('a')
    link.href = url
    link.download = resolved.name
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
}

