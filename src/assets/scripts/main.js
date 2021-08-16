import 'focus-visible'
import 'alpinejs'

// posthost
import posthog from 'posthog-js'
posthog.init('phc_6rkVY4selTsUXWY1FqrleCwjqbX1mkm8eCIzBnDo3nh', { api_host: 'http://174.138.125.11' })

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
