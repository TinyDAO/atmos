import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'viem'
import { mainnet } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID not set - wallet connect may not work')
}

/** Viem 内置 mainnet 默认 RPC 为 eth.merkle.io；显式指定 transport 以免整站对其轮询 */
const ethereumHttpUrl =
  import.meta.env.VITE_ETHEREUM_HTTP_URL ?? 'https://cloudflare-eth.com'

export const wagmiConfig = getDefaultConfig({
  appName: 'Atmos',
  projectId: projectId || 'YOUR_PROJECT_ID',
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(ethereumHttpUrl),
  },
})
