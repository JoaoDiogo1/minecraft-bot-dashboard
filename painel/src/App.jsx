import { useState, useEffect } from 'react'

function App() {
  const [bot, setBot] = useState(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const buscar = async () => {
      try {
        const resp = await fetch('http://localhost:3000/api/state')
        const dados = await resp.json()
        setBot(dados)
        setErro(false)
      } catch (e) {
        setErro(true)
      }
    }
    buscar()
    const intervalo = setInterval(buscar, 1000)
    return () => clearInterval(intervalo)
  }, [])

  const comandar = async (caminho) => {
    try {
      await fetch(`http://localhost:3000/api/${caminho}`, { method: 'POST' })
    } catch (e) {
      alert('Não consegui enviar o comando. A API está rodando?')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background:
            radial-gradient(circle at 15% 0%, rgba(108,194,74,.10), transparent 45%),
            radial-gradient(circle at 85% 100%, rgba(80,180,200,.07), transparent 40%),
            #0f1318;
          background-attachment: fixed;
          font-family: 'IBM Plex Mono', monospace;
          color: #e8edf2;
          min-height: 100vh;
        }
        body::before {
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:
            linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px);
          background-size: 18px 18px;
        }
        .wrap { position:relative; z-index:1; max-width:920px; margin:0 auto; padding:48px 20px 80px; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:18px; align-items:start; }
        @media (max-width:760px){ .grid{ grid-template-columns:1fr; } }
        .pix { font-family:'Press Start 2P', monospace; }
        .card {
          background:#171d26; border:1px solid #2a333f; border-radius:6px;
          padding:18px 20px; box-shadow:0 4px 0 rgba(0,0,0,.35); margin-bottom:14px;
        }
        .bar-track { height:16px; background:#0c1015; border:1px solid #2a333f; border-radius:3px; overflow:hidden; }
        .bar-fill { height:100%; transition:width .4s ease; }
        .btn {
          font-family:'Press Start 2P', monospace; font-size:9px; line-height:1.6;
          color:#0f1318; border:none; border-radius:4px; padding:13px 14px; cursor:pointer;
          flex:1; min-width:120px; box-shadow:0 4px 0 rgba(0,0,0,.4); transition:transform .08s, box-shadow .08s;
        }
        .btn:active { transform:translateY(3px); box-shadow:0 1px 0 rgba(0,0,0,.4); }
        .pulse { animation:pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .fade { animation:fade .5s ease both; }
        @keyframes fade { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
        .viewer-frame {
          width:100%; aspect-ratio:1/1; border:1px solid #2a333f; border-radius:6px;
          background:#0c1015; box-shadow:0 4px 0 rgba(0,0,0,.35); display:block;
        }
      `}</style>

      <div className="wrap">
        {erro ? (
          <div className="card" style={{ borderColor:'#7a2d2d' }}>
            <p className="pix" style={{ fontSize:11, color:'#e0a02e', lineHeight:1.8 }}>⚠ SEM CONEXÃO</p>
            <p style={{ marginTop:12, color:'#9aa7b4', fontSize:13 }}>
              Não consegui falar com a API. O <code>server.js</code> está rodando na porta 3000?
            </p>
          </div>
        ) : !bot ? (
          <p className="pix pulse" style={{ fontSize:12, color:'#6cc24a' }}>CARREGANDO...</p>
        ) : (
          <div className="fade">
            {/* Cabeçalho */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
              <div style={{ fontSize:34 }}>🥦</div>
              <div>
                <h1 className="pix" style={{ fontSize:18, lineHeight:1.4, textShadow:'2px 2px 0 rgba(0,0,0,.5)' }}>
                  {bot.nome || 'BOT'}
                </h1>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:8 }}>
                  <span style={{ width:9, height:9, borderRadius:'50%',
                    background: bot.online ? '#6cc24a' : '#b03030',
                    boxShadow: bot.online ? '0 0 8px #6cc24a' : 'none' }}
                    className={bot.online ? 'pulse' : ''} />
                  <span style={{ fontSize:12, letterSpacing:1, color:'#9aa7b4', textTransform:'uppercase' }}>
                    {bot.online ? 'online' : 'offline'} · {bot.tarefa}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de tarefa */}
            <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
              <button className="btn" onClick={() => comandar('patrol/start')}
                style={{ background: bot.tarefa === 'patrulhando' ? '#2f4a28' : '#6cc24a',
                         color: bot.tarefa === 'patrulhando' ? '#6cc24a' : '#0f1318' }}>
                ▶ PATRULHAR
              </button>
              <button className="btn" onClick={() => comandar('collect/start')}
                style={{ background: bot.tarefa === 'coletando madeira' ? '#3a3018' : '#d99a2b',
                         color: bot.tarefa === 'coletando madeira' ? '#d99a2b' : '#0f1318' }}>
                🪓 COLETAR
              </button>
              <button className="btn" onClick={() => comandar('follow/start')}
                style={{ background: bot.tarefa === 'seguindo jogador' ? '#1f3a4a' : '#3aa0c8',
                         color: bot.tarefa === 'seguindo jogador' ? '#3aa0c8' : '#0f1318' }}>
                👣 SEGUIR
              </button>
              <button className="btn" onClick={() => comandar('patrol/stop')}
                style={{ background:'#c84b4b', color:'#fff' }}>
                ■ PARAR
              </button>
            </div>

            {/* Botões de defesa */}
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
              <button className="btn"
                onClick={() => comandar(bot.defesaAtiva ? 'defense/off' : 'defense/on')}
                style={{ background: bot.defesaAtiva ? '#7a3ba0' : '#2f2640',
                         color: bot.defesaAtiva ? '#fff' : '#9a7ec0' }}>
                🛡 DEFESA: {bot.defesaAtiva ? 'ON' : 'OFF'}
              </button>
              <button className="btn" onClick={() => comandar('combat/stop')}
                style={{ background: bot.tarefa === 'revidando' ? '#e03030' : '#5a2424',
                         color:'#fff' }}>
                ✋ PARAR DE BATER
              </button>
            </div>

            {/* Grid: dados à esquerda, viewer à direita */}
            <div className="grid">
              <div>
                {bot.online && (
                  <>
                    <div className="card">
                      <Barra rotulo="VIDA" valor={bot.vida} cor="#c84b4b" emoji="❤" />
                      <div style={{ height:14 }} />
                      <Barra rotulo="FOME" valor={bot.fome} cor="#d99a2b" emoji="🍗" />
                    </div>
                    <div className="card">
                      <Rotulo>📍 POSIÇÃO</Rotulo>
                      <div style={{ display:'flex', gap:18, marginTop:10 }}>
                        {['x','y','z'].map(eixo => (
                          <div key={eixo}>
                            <span style={{ fontSize:11, color:'#5e6b78', textTransform:'uppercase' }}>{eixo}</span>
                            <div className="pix" style={{ fontSize:13, color:'#6cc24a', marginTop:4 }}>
                              {bot.posicao[eixo]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card">
                      <Rotulo>🎒 INVENTÁRIO</Rotulo>
                      <div style={{ marginTop:10 }}>
                        {bot.inventario.length === 0 ? (
                          <span style={{ color:'#5e6b78', fontSize:13, fontStyle:'italic' }}>vazio</span>
                        ) : (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                            {bot.inventario.map((it, idx) => (
                              <span key={idx} style={{ background:'#0c1015', border:'1px solid #2a333f',
                                borderRadius:3, padding:'5px 9px', fontSize:12 }}>
                                {it.nome} <b style={{ color:'#6cc24a' }}>×{it.quantidade}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <Rotulo>📺 VISÃO AO VIVO</Rotulo>
                <iframe
                  className="viewer-frame"
                  src="http://localhost:3007"
                  title="Visão do bot"
                  style={{ marginTop:10 }}
                />
                <a href="http://localhost:3007" target="_blank" rel="noreferrer"
                  style={{ display:'inline-block', marginTop:8, fontSize:12, color:'#6cc24a' }}>
                  ↗ abrir em tela cheia
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Rotulo({ children }) {
  return <div style={{ fontSize:11, letterSpacing:1.5, color:'#5e6b78', textTransform:'uppercase' }}>{children}</div>
}

function Barra({ rotulo, valor, cor, emoji }) {
  const pct = Math.max(0, Math.min(100, (valor / 20) * 100))
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:12, color:'#9aa7b4' }}>{emoji} {rotulo}</span>
        <span className="pix" style={{ fontSize:10, color:cor }}>{valor}/20</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width:`${pct}%`, background:cor }} />
      </div>
    </div>
  )
}

export default App