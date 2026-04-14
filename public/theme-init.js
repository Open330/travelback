(function () {
  try {
    var d = document.documentElement
    var isDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    var mode = isDark ? 'dark' : 'light'
    if (!d.getAttribute('data-mode')) d.setAttribute('data-mode', mode)
    if (!d.getAttribute('data-mapstyle')) d.setAttribute('data-mapstyle', isDark ? 'dark' : 'voyager')
  } catch {
    // Ignore early theme bootstrap failures and let React recover
  }
})()
