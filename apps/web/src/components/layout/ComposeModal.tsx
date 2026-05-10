import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PostEditor } from '@/components/post/PostEditor'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

export function ComposeModal() {
  const { composeOpen, setComposeOpen } = useUIStore()
  const user = useAuthStore((s) => s.user)

  return (
    <AnimatePresence>
      {composeOpen && (
        <Dialog.Root open={composeOpen} onOpenChange={setComposeOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.15 }}
                className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
              >
                <div className="bg-surface border border-border-dim rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim">
                    <h2 className="text-sm font-semibold text-text-1">New Post</h2>
                    <Dialog.Close asChild>
                      <button className="p-1.5 rounded-lg text-text-3 hover:bg-elevated hover:text-text-1 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="p-4">
                    <PostEditor
                      onSuccess={() => setComposeOpen(false)}
                      placeholder="Share a thought, link, or story…"
                    />
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  )
}
