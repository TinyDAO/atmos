import { useEffect, useRef } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'
import { useTranslation } from '../../hooks/useTranslation'
import { usePoints } from '../../hooks/usePoints'

const CONNECT_MESSAGE_PREFIX = 'Connect to Weather App\nTimestamp: '

export function WalletConnectButton() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const { points } = usePoints(isConnected ? address : undefined)
  const { signMessageAsync } = useSignMessage()
  const connectAttempted = useRef<string | null>(null)

  useEffect(() => {
    if (!isConnected || !address) {
      connectAttempted.current = null
      return
    }
    if (connectAttempted.current === address) return
    connectAttempted.current = address

    const message = CONNECT_MESSAGE_PREFIX + new Date().toISOString()
    signMessageAsync({ message })
      .then((signature) =>
        fetch('/api/auth/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, signature, message }),
        }),
      )
      .catch((err) => {
        console.error(err)
        connectAttempted.current = null
      })
  }, [address, isConnected, signMessageAsync])

  return (
    <ConnectButton.Custom>
      {({ account, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = ready && account

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
            className="flex items-center gap-1"
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                type="button"
                className="px-2 py-1.5 rounded-full text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-100/60 dark:hover:bg-violet-900/30 transition-all"
              >
                {t('header.connectWallet')}
              </button>
            ) : (
              <>
                {points != null && (
                  <span
                    className="px-2 py-1 rounded-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
                    title={t('header.points')}
                  >
                    {points} {t('header.points')}
                  </span>
                )}
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="px-2 py-1.5 rounded-full text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-all"
                >
                  {account?.displayName ?? account?.address?.slice(0, 6) + '...'}
                </button>
              </>
            )}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
