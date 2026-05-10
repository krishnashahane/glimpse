import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from './Sidebar'
import { RightPanel } from './RightPanel'
import { ComposeModal } from './ComposeModal'
import { useUIStore } from '@/stores/ui'

export function AppLayout() {
  const composeOpen = useUIStore((s) => s.composeOpen)

  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar />

      <main className="flex-1 min-w-0 border-x border-border-dim">
        <Outlet />
      </main>

      <RightPanel />

      {composeOpen && <ComposeModal />}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#16162A',
            color: '#E8E8F0',
            border: '1px solid #2A2A45',
            fontSize: '13px',
          },
        }}
      />
    </div>
  )
}
