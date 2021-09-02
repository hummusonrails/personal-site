import 'focus-visible'
import 'alpinejs'
require('newrelic');


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
