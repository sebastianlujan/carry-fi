import { useState } from 'react'
import { useWallet } from './wallet'
import Bike from './Bike'
import { IconWallet, IconChart, IconDots, IconActivity } from './Icons'
import NetworkPicker from './NetworkPicker'
import { useCarryRates } from './hooks'
import { IconTrend } from './Icons'
import Home from './screens/Home'
import Send from './screens/Send'
import Earn from './screens/Earn'
import Bridge from './screens/Bridge'
import Loop from './screens/Loop'
import Menu from './screens/Menu'
import Receive from './screens/Receive'
import Activity from './screens/Activity'

export type Screen = 'home' | 'send' | 'receive' | 'earn' | 'bridge' | 'loop' | 'menu' | 'activity'

function Wordmark() {
  return (
    <div className="wordmark">
      <Bike width={34} />
      CarryFi
    </div>
  )
}


function ApyPill() {
  const { data } = useCarryRates()
  const apy = data ? (data.supplyApy * 100).toFixed(1) : '…'
  return (
    <span className="pill apy" title="Supply APY live del market ARGt/USDC en Morpho">
      <span className="apy-word">CARRY</span> <b>{apy}%</b> <IconTrend />
    </span>
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
            <Bike width={110} spin />
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
    receive: <Receive back={() => setScreen('home')} />,
    activity: <Activity back={() => setScreen('home')} />,
    earn: <Earn />,
    bridge: <Bridge back={() => setScreen('home')} />,
    loop: <Loop />,
    menu: <Menu />,
  }

  const navItems: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Wallet', icon: <IconWallet /> },
    { id: 'loop', label: 'Carry', icon: <Bike width={26} /> },
    { id: 'earn', label: 'Posición', icon: <IconChart /> },
    { id: 'activity', label: 'Actividad', icon: <IconActivity /> },
  ]
  const active = ['send','bridge','receive'].includes(screen) ? 'home' : screen

  return (
    <div className="phone">
      <div className="topbar">
        <Wordmark />
        <div className="topbar-right">
          <ApyPill />
          <NetworkPicker />
          <button className="more-btn" onClick={() => setScreen('menu')} aria-label="Más"><IconDots /></button>
        </div>
      </div>
      {S[screen]}
      <nav className="nav">
        {navItems.map((n) => (
          <button key={n.id} className={active === n.id ? 'active' : ''} onClick={() => setScreen(n.id)}>
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
