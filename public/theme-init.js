(function () {
  try {
    var d = document.documentElement
    var stored = null
    try { stored = localStorage.getItem('travelback-theme') } catch {}
    var mode
    if (stored === 'dark' || stored === 'light') {
      mode = stored
    } else {
      var isDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
      mode = isDark ? 'dark' : 'light'
    }
    if (!d.getAttribute('data-mode')) d.setAttribute('data-mode', mode)
    if (!d.getAttribute('data-mapstyle')) d.setAttribute('data-mapstyle', mode === 'dark' ? 'dark' : 'voyager')
  } catch {
    // Ignore early theme bootstrap failures and let React recover
  }
})()
