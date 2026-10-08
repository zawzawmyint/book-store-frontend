export function initializeDeliveryBrowserData() {
  try {
    if (localStorage.getItem('book-store-browser-data') === 'delivery-v1') return
    localStorage.removeItem('book-store-cart')
    for (const name of Object.keys(sessionStorage))
      if (name.startsWith('book-store-checkout:')) sessionStorage.removeItem(name)
    localStorage.setItem('book-store-browser-data', 'delivery-v1')
  } catch {
    /* In-memory state remains usable when storage is unavailable. */
  }
}
