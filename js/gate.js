;(function () {
  var PASSWORD = '02147'
  var KEY = 'hanzi_gate_ok'
  var SESSION_HOURS = 12

  function alreadyOk() {
    try {
      var raw = sessionStorage.getItem(KEY)
      if (!raw) return false
      var data = JSON.parse(raw)
      if (!data || !data.ok) return false
      if (Date.now() - (data.at || 0) > SESSION_HOURS * 3600 * 1000) {
        sessionStorage.removeItem(KEY)
        return false
      }
      return true
    } catch (e) {
      return false
    }
  }

  function markOk() {
    sessionStorage.setItem(KEY, JSON.stringify({ ok: true, at: Date.now() }))
  }

  function unlock() {
    document.documentElement.classList.add('gate-ok')
    var mask = document.getElementById('gate-mask')
    if (mask) mask.hidden = true
  }

  function fail(msg) {
    var err = document.getElementById('gate-err')
    if (err) err.textContent = msg || '密码不对，再试一次'
  }

  function tryUnlock() {
    var input = document.getElementById('gate-input')
    var val = (input && input.value ? input.value : '').trim()
    if (val === PASSWORD) {
      markOk()
      unlock()
      return
    }
    fail('密码不对，再试一次')
    if (input) {
      input.value = ''
      input.focus()
    }
  }

  function boot() {
    if (alreadyOk()) {
      unlock()
      return
    }
    var mask = document.getElementById('gate-mask')
    if (mask) mask.hidden = false
    var btn = document.getElementById('gate-btn')
    var input = document.getElementById('gate-input')
    if (btn) btn.addEventListener('click', tryUnlock)
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') tryUnlock()
      })
      setTimeout(function () { input.focus() }, 50)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
