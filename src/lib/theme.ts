import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const storageKey = 'book-store-theme'
const changeEvent = 'book-store-theme-change'

function normalizeTheme(value: string | null | undefined): Theme {
  return value === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  // These colors also paint the blank canvas before the application CSS loads.
  root.style.backgroundColor = theme === 'dark' ? '#131c18' : '#f7f5f0'
  root.style.color = theme === 'dark' ? '#edf1e9' : '#26342e'
}

export function initializeTheme() {
  let theme: Theme = 'dark'
  try {
    theme = normalizeTheme(localStorage.getItem(storageKey))
  } catch {
    // Browser storage may be unavailable; the current page remains usable.
  }
  applyTheme(theme)
}

function getTheme(): Theme {
  return normalizeTheme(document.documentElement.dataset.theme)
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return
    // Ignore sessionStorage events; reading localStorage itself can throw.
    try {
      if (event.storageArea && event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    applyTheme(normalizeTheme(event.newValue))
    onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(changeEvent, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(changeEvent, onChange)
  }
}

function toggleTheme() {
  const theme = getTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(theme)
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // Keep the selection in memory for this page when persistence is blocked.
  }
  window.dispatchEvent(new Event(changeEvent))
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme)
  return { theme, toggleTheme }
}
