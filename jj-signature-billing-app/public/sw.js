const CACHE_NAME = 'jj-signature-shell-v2'
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/jj-signature-logo.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return

  // Do not intercept Vite module-preload and other browser asset requests.
  // Serving them through a service worker can cause Chromium preload-world
  // mismatch warnings after a deployment.
  if (event.request.destination && event.request.destination !== 'document') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then(cached => cached || new Response('', { status: 503, statusText: 'Offline' })))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
      .catch(() => new Response('', { status: 503, statusText: 'Offline' }))
  )
})
