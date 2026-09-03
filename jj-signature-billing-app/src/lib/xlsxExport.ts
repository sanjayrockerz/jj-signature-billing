import * as XLSX from 'xlsx'
import { BRAND_EN } from './brand'

export function downloadXlsx(fileName: string, rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ [BRAND_EN]: 'No records' }])
  XLSX.utils.book_append_sheet(workbook, sheet, 'J.J Signature')
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}
