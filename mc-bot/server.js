const express = require('express')
const cors = require('cors')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const collectBlock = require('mineflayer-collectblock').plugin
const pvp = require('mineflayer-pvp').plugin

// ----- ESTADO GLOBAL -----
let bot = null
let patrulhando = false
let coletando = false
let seguindo = false
let defesaAtiva = true
let tarefaAtual = 'ocioso'

// ----- MOVIMENTOS -----
function movimentosOtimizados() {
  const m = new Movements(bot)
  m.allowSwimming = true
  return m
}

// ----- CRIA E GERENCIA O BOT (com reconexão) -----
function criarBot() {
  bot = mineflayer.createBot({ host: 'localhost', port: 25565, username: 'Brocoz' })
  bot.loadPlugin(pathfinder)
  bot.loadPlugin(collectBlock)
  bot.loadPlugin(pvp)

  bot.once('spawn', () => {
    console.log('Brocoz nasceu! Viewer em http://localhost:3007')
    bot.chat('Cheguei! Aguardando comandos do painel.')
    mineflayerViewer(bot, { port: 3007, firstPerson: false })
    bot.mcData = require('minecraft-data')(bot.version)
    bot.pathfinder.setMovements(movimentosOtimizados())
    tarefaAtual = 'ocioso'
  })

  // ----- DEFESA: revida em quem bate -----
  bot.on('entityHurt', (entidade) => {
    if (!defesaAtiva || !bot.entity) return
    if (entidade !== bot.entity) return
    const agressor = Object.values(bot.entities)
      .filter(e => e !== bot.entity && (e.type === 'mob' || e.type === 'player') && e.position)
      .filter(e => bot.entity.position.distanceTo(e.position) < 4)
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))[0]
    if (agressor) {
      console.log('Apanhei! Revidando em:', agressor.name || agressor.username || 'desconhecido')
      tarefaAtual = 'revidando'
      bot.pvp.attack(agressor)
    }
  })

  bot.on('stoppedAttacking', () => {
    if (tarefaAtual === 'revidando') tarefaAtual = 'ocioso'
  })

  bot.on('path_update', (r) => {
    if (r.status === 'noPath') console.log('⚠ Pathfinder: nenhum caminho até o destino.')
  })

  bot.on('end', (motivo) => {
    console.log('Desconectou:', motivo, '— reconectando em 5s...')
    patrulhando = false; coletando = false; seguindo = false
    tarefaAtual = 'offline'
    setTimeout(criarBot, 5000)
  })

  bot.on('kicked', (m) => console.log('Expulso:', m))
  bot.on('error', (e) => console.log('Erro:', e.message))
}

// ----- ESTADO PRA API -----
function estadoDoBot() {
  if (!bot || !bot.entity) return { online: false, tarefa: tarefaAtual }
  const p = bot.entity.position
  return {
    online: true,
    nome: bot.username,
    vida: Math.round(bot.health),
    fome: Math.round(bot.food),
    posicao: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) },
    tarefa: tarefaAtual,
    defesaAtiva: defesaAtiva,
    inventario: bot.inventory.items().map(it => ({ nome: it.name, quantidade: it.count }))
  }
}

// ----- TAREFA: PATRULHA -----
let loopAtivo = false

async function iniciarPatrulha() {
  if (!bot || !bot.entity) { console.log('Bot ainda não está pronto.'); return }
  coletando = false; seguindo = false
  if (loopAtivo) {
    patrulhando = false
    bot.pathfinder.setGoal(null)
    await new Promise(r => setTimeout(r, 500))
  }
  patrulhando = true; loopAtivo = true
  tarefaAtual = 'patrulhando'
  bot.pathfinder.setMovements(movimentosOtimizados())

  const inicio = bot.entity.position.clone()
  let pontos = [
    new goals.GoalXZ(Math.floor(inicio.x) + 12, Math.floor(inicio.z)),
    new goals.GoalXZ(Math.floor(inicio.x) - 12, Math.floor(inicio.z))
  ]
  let i = 0, falhas = 0
  while (patrulhando && bot && bot.entity) {
    try {
      await bot.pathfinder.goto(pontos[i])
      i = (i + 1) % pontos.length
      falhas = 0
    } catch (err) {
      if (!patrulhando) break
      falhas++
      console.log(`Recalculando (falha ${falhas}):`, err.message)
      await new Promise(r => setTimeout(r, 1000))
      if (falhas >= 3 && bot.entity) {
        const a = bot.entity.position
        pontos = [
          new goals.GoalXZ(Math.floor(a.x) + 12, Math.floor(a.z)),
          new goals.GoalXZ(Math.floor(a.x) - 12, Math.floor(a.z))
        ]
        falhas = 0
      }
    }
  }
  loopAtivo = false
}

function pararPatrulha() {
  patrulhando = false
  if (bot && bot.pathfinder) bot.pathfinder.setGoal(null)
  tarefaAtual = 'ocioso'
}

// ----- TAREFA: COLETAR MADEIRA -----
async function iniciarColeta() {
  if (!bot || !bot.entity) { console.log('Bot não está pronto.'); return }
  patrulhando = false; seguindo = false
  bot.pathfinder.setGoal(null)
  await new Promise(r => setTimeout(r, 300))
  coletando = true
  tarefaAtual = 'coletando madeira'
  console.log('Modo coletar madeira ativado.')

  const tiposLog = Object.keys(bot.mcData.blocksByName)
    .filter(nome => nome.endsWith('_log'))
    .map(nome => bot.mcData.blocksByName[nome].id)

  while (coletando && bot && bot.entity) {
    const tronco = bot.findBlock({ matching: tiposLog, maxDistance: 64 })
    if (!tronco) {
      console.log('Nenhuma árvore por perto. Esperando...')
      await new Promise(r => setTimeout(r, 3000))
      continue
    }
    try {
      await bot.collectBlock.collect(tronco, { movements: movimentosOtimizados() })
      console.log('Tronco coletado!')
    } catch (err) {
      if (!coletando) break
      console.log('Erro ao coletar:', err.message)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

function pararColeta() {
  coletando = false
  if (bot && bot.collectBlock) bot.collectBlock.cancelTask()
  if (bot && bot.pathfinder) bot.pathfinder.setGoal(null)
  tarefaAtual = 'ocioso'
}

// ----- TAREFA: SEGUIR JOGADOR -----
async function iniciarSeguir() {
  if (!bot || !bot.entity) { console.log('Bot não está pronto.'); return }
  patrulhando = false; coletando = false
  bot.pathfinder.setGoal(null)
  await new Promise(r => setTimeout(r, 300))
  seguindo = true
  tarefaAtual = 'seguindo jogador'
  bot.pathfinder.setMovements(movimentosOtimizados())
  console.log('Modo seguir ativado.')

  while (seguindo && bot && bot.entity) {
    const alvo = Object.values(bot.players)
      .filter(p => p.entity && p.username !== bot.username)
      .map(p => p.entity)
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))[0]
    if (alvo) {
      bot.pathfinder.setGoal(new goals.GoalFollow(alvo, 2), true)
    } else {
      bot.pathfinder.setGoal(null)
    }
    await new Promise(r => setTimeout(r, 1000))
  }
}

function pararSeguir() {
  seguindo = false
  if (bot && bot.pathfinder) bot.pathfinder.setGoal(null)
  tarefaAtual = 'ocioso'
}

// ----- DEFESA: parar de bater -----
function pararDeBater() {
  if (bot && bot.pvp) bot.pvp.stop()
  if (tarefaAtual === 'revidando') tarefaAtual = 'ocioso'
}

// ----- A API WEB -----
const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/state', (req, res) => res.json(estadoDoBot()))
app.post('/api/patrol/start', (req, res) => { iniciarPatrulha(); res.json({ ok: true, mensagem: 'Patrulha iniciada' }) })
app.post('/api/patrol/stop', (req, res) => { pararPatrulha(); res.json({ ok: true, mensagem: 'Patrulha parada' }) })
app.post('/api/collect/start', (req, res) => { iniciarColeta(); res.json({ ok: true, mensagem: 'Coletando madeira' }) })
app.post('/api/collect/stop', (req, res) => { pararColeta(); res.json({ ok: true, mensagem: 'Parou de coletar' }) })
app.post('/api/follow/start', (req, res) => { iniciarSeguir(); res.json({ ok: true, mensagem: 'Seguindo jogador' }) })
app.post('/api/follow/stop', (req, res) => { pararSeguir(); res.json({ ok: true, mensagem: 'Parou de seguir' }) })
app.post('/api/defense/on', (req, res) => { defesaAtiva = true; res.json({ ok: true, mensagem: 'Defesa ligada' }) })
app.post('/api/defense/off', (req, res) => { defesaAtiva = false; pararDeBater(); res.json({ ok: true, mensagem: 'Defesa desligada' }) })
app.post('/api/combat/stop', (req, res) => { pararDeBater(); res.json({ ok: true, mensagem: 'Parou de bater' }) })

app.listen(3000, () => console.log('API ouvindo em http://localhost:3000'))

criarBot()