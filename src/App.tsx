import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { useEffect, useState, useCallback } from 'react'
import './App.css'

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }))

type SignResult = { signature: string; address: string }

function App() {
  const { connect, disconnect, account, connected, wallets, signMessage } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [signResult, setSignResult] = useState<SignResult | null>(null)
  const [signError, setSignError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)

  const fetchBalance = useCallback(async () => {
    if (!account?.address) return
    setLoadingBalance(true)
    try {
      const octas = await aptos.getAccountAPTAmount({ accountAddress: account.address })
      setBalance(octas / 1e8)
    } catch {
      setBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }, [account?.address])

  useEffect(() => {
    setBalance(null)
    fetchBalance()
  }, [fetchBalance])

  const handleSignMessage = useCallback(async () => {
    setSignResult(null)
    setSignError(null)
    setSigning(true)
    try {
      const response = await signMessage({
        message: 'Hello Aptos',
        nonce: String(Date.now()),
      })
      setSignResult({
        signature: response.signature.toString(),
        address: response.address.toString(),
      })
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Подпись отклонена')
    } finally {
      setSigning(false)
    }
  }, [signMessage])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Aptos dApp</h1>

      {!connected ? (
        <div>
          <p>Подключи кошелёк:</p>
          {wallets?.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => connect(wallet.name)}
              style={{ marginRight: '0.5rem' }}
            >
              Connect {wallet.name}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p><strong>Адрес:</strong> {account?.address?.toString()}</p>
          <p>
            <strong>Баланс:</strong>{' '}
            {loadingBalance
              ? 'Загрузка...'
              : balance !== null
              ? `${balance.toFixed(8)} APT`
              : 'Ошибка загрузки'}
            {' '}
            <button onClick={fetchBalance} disabled={loadingBalance}>
              Refresh
            </button>
          </p>
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleSignMessage} disabled={signing}>
              {signing ? 'Подписываем...' : 'Sign Message'}
            </button>
            {signResult && (
              <div style={{ marginTop: '0.5rem', wordBreak: 'break-all' }}>
                <p><strong>Подпись:</strong> {signResult.signature}</p>
                <p><strong>Подписавший:</strong> {signResult.address}</p>
              </div>
            )}
            {signError && (
              <p style={{ color: 'red', marginTop: '0.5rem' }}>{signError}</p>
            )}
          </div>
          <button onClick={disconnect} style={{ marginTop: '1rem' }}>Disconnect</button>
        </div>
      )}
    </div>
  )
}

export default App