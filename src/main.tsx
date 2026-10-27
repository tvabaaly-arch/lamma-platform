import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { apiMode } from './lib/api'
import { startSync } from './lib/sync'

const root = ReactDOM.createRoot(document.getElementById('root')!)

function Offline({ retry }: { retry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-cream-50 p-6 text-center text-green">
      <div className="max-w-sm">
        <p className="font-display text-2xl font-semibold">تعذر الاتصال بخادم لمّة</p>
        <p className="mt-1 text-sm text-ink/60" dir="ltr">Can’t reach the LAMMA server.</p>
        <button onClick={retry} className="mt-6 rounded-full bg-green px-6 py-3 text-cream-50">إعادة المحاولة · Retry</button>
      </div>
    </div>
  )
}

async function start() {
  if (apiMode) {
    try {
      await startSync()
    } catch (e) {
      console.error(e)
      root.render(<Offline retry={() => { void start() }} />)
      return
    }
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void start()
