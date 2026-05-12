import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useEffect, useState, useCallback } from 'react'
import { AccountAddress } from '@aptos-labs/ts-sdk'
import './App.css'
import { aptos } from './aptosClient'


type SendResult = { hash: string; gasless: boolean }

type SignResult = { signature: string; address: string }

function App() {
  const { connect, disconnect, account, connected, wallets, signMessage, signAndSubmitTransaction } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [signResult, setSignResult] = useState<SignResult | null>(null)
  const [signError, setSignError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [sendRecipient, setSendRecipient] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

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

  const handleSendApt = useCallback(async () => {
    if (!account?.address) return

    const trimmedRecipient = sendRecipient.trim()
    if (!AccountAddress.isValid({ input: trimmedRecipient })) {
      setSendError('Некорректный адрес получателя. Ожидается формат 0x + 64 hex символа.')
      return
    }

    const trimmedAmount = sendAmount.trim()
    const amount = parseFloat(trimmedAmount)
    if (isNaN(amount) || amount <= 0) {
      setSendError('Введите корректную сумму (больше 0)')
      return
    }
    if (balance !== null && amount > balance) {
      setSendError(
        `Недостаточно APT. Доступно: ${balance.toFixed(8)} APT. ` +
        `Gasless покрывает только комиссию сети — токены для перевода должны быть на вашем счёте.`
      )
      return
    }

    const amountOctas = Math.floor(parseFloat(trimmedAmount) * 1e8).toString()
    if (isNaN(Number(amountOctas)) || Number(amountOctas) <= 0) {
      setSendError('Некорректная сумма')
      return
    }

    setSendLoading(true)
    setSendError(null)
    setSendResult(null)
    try {
      console.log('[transfer] recipient:', trimmedRecipient)
      console.log('[transfer] amountAPT:', trimmedAmount)
      console.log('[transfer] amountOctas (string):', amountOctas)
      const response = await signAndSubmitTransaction({
        data: {
          function: '0x1::aptos_account::transfer',
          functionArguments: [trimmedRecipient, amountOctas],
        },
        options: {
          withFeePayer: true,
          maxGasAmount: 200000,
        },
      })
      await aptos.waitForTransaction({ transactionHash: response.hash })
      setSendResult({ hash: response.hash, gasless: true })
      fetchBalance()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('insufficient balance') || msg.toLowerCase().includes('insufficient_balance')) {
        setSendError(
          `Недостаточно APT для перевода. Gasless покрывает только комиссию сети — ` +
          `сами токены должны быть на вашем счёте. Пополните баланс через фасет: ` +
          `https://aptoslabs.com/testnet-faucet`
        )
      } else {
        setSendError(msg)
      }
    } finally {
      setSendLoading(false)
    }
  }, [account?.address, sendAmount, sendRecipient, balance, signAndSubmitTransaction, fetchBalance])

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
            {balance === 0 && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.85em', color: '#888' }}>
                — нет APT.{' '}
                <a href="https://aptoslabs.com/testnet-faucet" target="_blank" rel="noreferrer">
                  Получить тестовый APT
                </a>
              </span>
            )}
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
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Отправить APT</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '480px' }}>
              <input
                placeholder="Адрес получателя (0x...)"
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                style={{ padding: '0.4rem', fontFamily: 'monospace' }}
              />
              <input
                placeholder="Сумма (APT)"
                type="number"
                min="0"
                step="0.00000001"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                style={{ padding: '0.4rem' }}
              />
              <button
                onClick={handleSendApt}
                disabled={sendLoading || !sendRecipient || !sendAmount}
                style={{ padding: '0.4rem 1rem' }}
              >
                {sendLoading ? 'Отправляем...' : '⚡ Отправить (Gasless)'}
              </button>
            </div>
            {sendResult && (
              <div style={{ marginTop: '0.75rem', color: 'green', wordBreak: 'break-all' }}>
                <p><strong>⚡ Sponsored transaction</strong></p>
                <p>Hash: {sendResult.hash}</p>
              </div>
            )}
            {sendError && (
              <p style={{ color: 'red', marginTop: '0.5rem' }}>{sendError}</p>
            )}
          </div>
          <button onClick={disconnect} style={{ marginTop: '1rem' }}>Disconnect</button>
        </div>
      )}
    </div>
  )
}

export default App