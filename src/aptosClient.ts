import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { GasStationClient, GasStationTransactionSubmitter } from '@aptos-labs/gas-station-client'

const network = Network.TESTNET

const gsClient = new GasStationClient({
  network,
  apiKey: import.meta.env.VITE_GEOMI_GS_KEY,
})

const transactionSubmitter = new GasStationTransactionSubmitter(gsClient)

export const aptos = new Aptos(new AptosConfig({
  network,
  fullnode: 'https://fullnode.testnet.aptoslabs.com/v1',
  indexer: 'https://indexer-testnet.staging.gcp.aptosdev.com/v1/graphql',
  pluginSettings: {
    TRANSACTION_SUBMITTER: transactionSubmitter,
  },
}))
