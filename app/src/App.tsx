import { useState } from 'react'
import { useWallet } from './wallet'
import Bike from './Bike'
import Home from './screens/Home'
import Send from './screens/Send'
import Earn from './screens/Earn'
import Bridge from './screens/Bridge'
import Loop from './screens/Loop'
import Menu from './screens/Menu'

export type Screen = 'home' | 'send' | 'earn' | 'bridge' | 'loop' | 'menu'

function Wordmark() {
  return (
    <div className="wordmark">
      <Bike width={34} />
      carry
    </div>
  )
}

export default function App() {
  const { ready, address, login } = useWallet()
  const [screen, setScreen] = useState<Screen>('home')

  if (!ready) {
    return (
      <div className="phone">
        <div className="topbar"><Wordmark /></div>
        <div className="screen"><div className="login-hero"><span className="spin" /></div></div>
      </div>
    )
  }

  if (!address) {
    return (
      <div className="phone">
        <div className="topbar"><Wordmark /></div>
        <div className="screen">
          <div className="login-hero">
            <h1>Pesos que rinden.</h1>
            <p>Wallet non-custodial de ARGt. El carry del peso, sin bancos y sin custodios. Tus llaves, tu plata.</p>
          </div>
          <div className="actions">
            <button className="btn primary wide" onClick={login}>Entrar <span>↗</span></button>
          </div>
          <div style={{ height: 26 }} />
        </div>
      </div>
    )
  }

  const S: Record<Screen, React.ReactNode> = {
    home: <Home go={setScreen} />,
    send: <Send back={() => setScreen('home')} />,
    earn: <Earn />,
    bridge: <Bridge back={() => setScreen('home')} />,
    loop: <Loop />,
    menu: <Menu />,
  }

  const navItems: { id: Screen; label: string }[] = [
    { id: 'home', label: 'Wallet' },
    { id: 'earn', label: 'Earn' },
    { id: 'loop', label: 'Loop' },
    { id: 'menu', label: 'Menú' },
  ]
  const active = screen === 'send' || screen === 'bridge' ? 'home' : screen

  return (
    <div className="phone">
      <div className="topbar">
        <Wordmark />
        <HealthPill />
      </div>
      {S[screen]}
      <nav className="nav">
        {navItems.map((n) => (
          <button key={n.id} className={active === n.id ? 'active' : ''} onClick={() => setScreen(n.id)}>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function HealthPill() {
  const { address } = useWallet()
  // pill estilo "PTS 300k" de Payy, acá muestra el APY real del carry
  return <CarryPill key={address ?? 'anon'} />
}

import { useCarryRates } from './hooks'
function CarryPill() {
  const { data } = useCarryRates()
  const apy = data ? (data.supplyApy * 100).toFixed(1) : '…'
  return (
    <span className="pill" title="Supply APY live del market ARGt/USDC en Morpho (Arbitrum)">
      CARRY <b>{apy}%</b>
    </span>
  )
}
