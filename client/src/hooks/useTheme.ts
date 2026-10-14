import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const TRANSITION_MS = 300

// index.html sets the initial class before React loads, so read it back from the DOM
function initialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    const root = document.documentElement
    root.classList.add('theme-transition')
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
    window.setTimeout(() => root.classList.remove('theme-transition'), TRANSITION_MS)
  }

  return { theme, toggleTheme }
}
