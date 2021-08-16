import 'focus-visible'
import 'alpinejs'

// posthost
import posthog from 'posthog-js'
posthog.init('phc_2bu7rZOtIkQ20EKXz0YZ3gW3e3eztG90b9OsQyxUAl5', { api_host: 'https://app.posthog.com' })

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
