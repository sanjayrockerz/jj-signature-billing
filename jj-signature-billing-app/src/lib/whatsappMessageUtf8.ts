import { formatCurrency, formatInvoiceNo } from './retail'

export type WhatsAppLineItem = { name: string; qty: number; unit: string; unitType: 'unit' | 'weight' | 'volume' | 'bundle'; rate: number; lineTotal: number }
export type BuildWhatsAppMessageInput = { customerName?: string; phone?: string; invoiceNumber: string; invoiceDate?: string; invoiceUrl?: string; paymentMode?: string; items?: WhatsAppLineItem[]; subtotal?: number; couponDiscount?: number; manualDiscountAmount?: number; shipping?: number; gstAmount?: number; total?: number }
export type AdvanceDepositWhatsAppInput = { customerName?: string; depositId: string; productName: string; totalAmount: number; depositAmount: number; remainingBalance: number; expectedDeliveryDate: string; paymentMethod?: string }

export const publicInvoiceUrl = (invoiceNumber: string) => {
  const formatted = formatInvoiceNo(invoiceNumber)
  const origin = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost') ? window.location.origin : 'https://jj-signature.vercel.app'
  return `${origin}/invoice/${encodeURIComponent(formatted)}`
}

export const buildProfessionalWhatsAppMessage = (input: BuildWhatsAppMessageInput) => {
  const customerName = input.customerName?.trim() || 'Valued Customer'
  const invoiceUrl = input.invoiceUrl || publicInvoiceUrl(input.invoiceNumber)
  const formattedNo = formatInvoiceNo(input.invoiceNumber)
  const itemsText = input.items?.length ? input.items.map(item => `\u2022 ${item.name} (x${item.qty}) - ${formatCurrency(Number(item.lineTotal || 0))}`).join('\n') : ''
  return `\u2728 *J.J SIGNATURE* \u2728
*Official Purchase Invoice & Receipt*

Dear ${customerName},

Thank you for shopping with J.J Signature! We truly appreciate your order.

*INVOICE DETAILS*
*Invoice No:* #${formattedNo}
${input.invoiceDate ? `Date: ${new Date(input.invoiceDate).toLocaleDateString('en-GB')}\n` : ''}${input.paymentMode ? `Payment Mode: ${input.paymentMode}\n` : ''}${input.total !== undefined ? `Total Amount: ${formatCurrency(Number(input.total || 0))}\n` : ''}
${itemsText ? `*ITEMS ORDERED:*\n${itemsText}\n\n` : ''}*View & Download Digital Invoice / PDF:*
${invoiceUrl}

Thank you, and we hope to see you again soon!
\u0ba8\u0ba9\u0bcd\u0bb1\u0bbf! \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0b9a\u0ba8\u0bcd\u0ba4\u0bbf\u0baa\u0bcd\u0baa\u0bcb\u0bae\u0bcd`
}

export const buildAdvanceDepositWhatsAppMessage = (input: AdvanceDepositWhatsAppInput) => {
  const customerName = input.customerName?.trim() || 'Valued Customer'
  const deliveryDateFormatted = input.expectedDeliveryDate ? new Date(`${input.expectedDeliveryDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  return `Thank You for Your Advance Order with J.J Signature!

Dear ${customerName},

Thank you for choosing J.J Signature. We have successfully received your initial advance payment!

*Advance Deposit Details*
Deposit ID: ${input.depositId}
Product: ${input.productName}
Total Order Amount: ${formatCurrency(input.totalAmount)}
Advance Paid: ${formatCurrency(input.depositAmount)}${input.paymentMethod ? ` (${input.paymentMethod.toLowerCase() === 'upi' ? 'QR' : input.paymentMethod.toUpperCase()})` : ''}
Balance to Pay on Delivery: ${formatCurrency(input.remainingBalance)}
Expected Delivery Date: ${deliveryDateFormatted}

Tailoring and preparation for your cloth is now underway. We will have everything ready on or before ${deliveryDateFormatted} for final payment or pickup.

Thank you for paying the initial amount as advance!
\u0ba8\u0ba9\u0bcd\u0bb1\u0bbf! \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0b9a\u0ba8\u0bcd\u0ba4\u0bbf\u0baa\u0bcd\u0baa\u0bcb\u0bae\u0bcd`
}

export const BUSINESS_PHONE = '916379048966'
