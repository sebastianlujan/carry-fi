import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useWallet } from '../wallet'
import { CHAINS, CHAIN_IDS } from '../chain/registry'
import { IconCopy } from '../Icons'

export default function Receive({ back }: { back: () => void }) {
  const { address } = useWallet()
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    // QR en tinta sobre lima — contraste alto, escaneable y on-brand
    QRCode.toDataURL(address, {
      width: 560,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#141414', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [address])

  function copy() {
    if (!address) return
    void navigator.clipboard.writeText(address)
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="screen">
      <button className="back" onClick={back}>← Wallet</button>
      <div className="title">Recibir ARGt</div>
      <div className="sub" style={{ marginTop: 6 }}>
        Tu dirección es la misma en {CHAIN_IDS.map((id) => CHAINS[id].name).join(', ')}.
      </div>

      <div className="qr-wrap">
        <div className="qr-card">
          {qr ? (
            <img src={qr} alt={`QR de tu dirección ${address ?? ''}`} className="qr-img" />
          ) : (
            <div className="qr-img qr-loading"><span className="spin" /></div>
          )}
        </div>
      </div>

      <button className="addr-chip" onClick={copy}>
        <span className="mono addr-full">{address ?? ''}</span>
        <span className="chip" style={{ flexShrink: 0 }}><IconCopy /> {copied ? '✓' : 'Copiar'}</span>
      </button>

      <div className="banner">Compartí el QR o copiá la dirección completa con el botón.</div>

      <div className="actions">
        <button className="btn primary wide" onClick={copy}>{copied ? 'Copiada ✓' : 'Copiar dirección'}</button>
      </div>
    </div>
  )
}
