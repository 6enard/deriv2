import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { mapOpenContract } from '../lib/types'
import type { OpenContract } from '../lib/types'

export function useOpenContracts() {
  const { ws, account, refreshBalance } = useAuth()
  const { showToast } = useToast()
  const [openContracts, setOpenContracts] = useState<Record<number, OpenContract>>({})

  const handleContractUpdate = useCallback((raw: unknown) => {
    const contract = mapOpenContract(raw)
    setOpenContracts((prev) => {
      const next = { ...prev }
      if (contract.is_sold || contract.is_expired) {
        delete next[contract.contract_id]
        if (account) {
          supabase.from('trades').insert({
            deriv_account_id: account.account_id,
            contract_id: contract.contract_id,
            symbol: contract.symbol,
            display_name: contract.display_name,
            contract_type: contract.contract_type,
            stake: contract.buy_price,
            payout: contract.payout,
            profit: contract.profit,
            status: contract.status,
            purchase_price: contract.buy_price,
            sell_price: contract.sell_price,
            purchase_time: new Date(contract.purchase_time * 1000).toISOString(),
            sell_time: contract.sell_time ? new Date(contract.sell_time * 1000).toISOString() : null,
          }).then(({ error }) => {
            if (error) console.error('Failed to save trade:', error)
          })
        }
        if (contract.status === 'won') {
          showToast('success', `Trade won! Profit: ${contract.profit.toFixed(2)} ${account?.currency || ''}`)
        } else if (contract.status === 'lost') {
          showToast('error', `Trade lost. Loss: ${contract.profit.toFixed(2)} ${account?.currency || ''}`)
        } else if (contract.status === 'sold') {
          showToast('info', `Contract sold. P/L: ${contract.profit.toFixed(2)} ${account?.currency || ''}`)
        }
        refreshBalance()
      } else {
        next[contract.contract_id] = contract
      }
      return next
    })
  }, [account, showToast, refreshBalance])

  const subscribeToContract = useCallback((contractId: number) => {
    if (!ws) return
    ws.subscribe(
      { proposal_open_contract: 1, contract_id: contractId },
      (data: any) => {
        if (data.proposal_open_contract) {
          handleContractUpdate(data.proposal_open_contract)
        }
      },
    ).catch(() => {})
  }, [ws, handleContractUpdate])

  // Load existing open positions on mount / when ws changes
  useEffect(() => {
    if (!ws) return
    ws.send({ portfolio: 1 })
      .then((res) => {
        if (res.portfolio?.contracts) {
          res.portfolio.contracts.forEach((position: any) => {
            subscribeToContract(position.contract_id)
          })
        }
      })
      .catch(() => {})
  }, [ws, subscribeToContract])

  const sellContract = useCallback(async (contractId: number) => {
    if (!ws) return
    try {
      await ws.send({ sell: contractId, price: 0 })
      showToast('info', 'Selling contract...')
      refreshBalance()
    } catch {
      showToast('error', 'Failed to sell contract')
    }
  }, [ws, showToast, refreshBalance])

  const openContractList = Object.values(openContracts)

  return { openContracts, openContractList, handleContractUpdate, subscribeToContract, sellContract }
}
