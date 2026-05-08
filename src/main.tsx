import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'
import { Network } from '@aptos-labs/ts-sdk'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import './index.css'
import App from './App.tsx'

const wallets = [new PetraWallet()]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      dappConfig={{ network: Network.TESTNET }}
      onError={(error) => console.error('Wallet error:', error)}
    >
      <App />
    </AptosWalletAdapterProvider>
  </StrictMode>,
)