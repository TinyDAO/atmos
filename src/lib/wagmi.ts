import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID not set - wallet connect may not work')
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Atmos',
  projectId: projectId || 'YOUR_PROJECT_ID',
  chains: [mainnet],
})
