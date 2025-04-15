import './style.css'
import './components/sleep-chart'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <sleep-chart class="w-full h-screen"></sleep-chart>
`
