const env = import.meta.env as Record<string, string | undefined>

export const BRAND_EN = env.VITE_BUSINESS_NAME || 'J.J Signature'
export const BRAND_TA = BRAND_EN
export const BRAND_SUBTITLE = 'Billing & Operations'
// One canonical logo location. Replace this file with the supplied client logo.
export const BRAND_LOGO = env.VITE_BUSINESS_LOGO || '/jj-signature-logo.png'


export const BRAND_PRIMARY_PHONE_DISPLAY = env.VITE_BUSINESS_PHONE || '+91 6379048966'
export const BRAND_PRIMARY_PHONE_E164 = '916379048966'
export const BRAND_SECONDARY_PHONE_DISPLAY = BRAND_PRIMARY_PHONE_DISPLAY
export const BRAND_SECONDARY_PHONE_E164 = BRAND_PRIMARY_PHONE_E164
export const BRAND_THIRD_PHONE_DISPLAY = BRAND_PRIMARY_PHONE_DISPLAY
export const BRAND_THIRD_PHONE_E164 = BRAND_PRIMARY_PHONE_E164
export const BRAND_PHONE_DISPLAY = BRAND_PRIMARY_PHONE_DISPLAY
export const BRAND_PHONE_E164 = BRAND_PRIMARY_PHONE_E164
export const BRAND_WHATSAPP = BRAND_THIRD_PHONE_DISPLAY
export const WHATSAPP_NUM = BRAND_THIRD_PHONE_E164
export const BRAND_WHATSAPP_LINK = `https://wa.me/${BRAND_THIRD_PHONE_E164}`
export const BRAND_EMAIL = env.VITE_BUSINESS_EMAIL || 'safasignora@gmail.com'
export const BRAND_ADDRESS = env.VITE_BUSINESS_ADDRESS || '31 A, Blue Star Building, Madurai Road, Junction, Tirunelveli - 627001'
export const BRAND_LOCATION_LINK = '#'
