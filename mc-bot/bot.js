const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'Brocoz'
})

bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  console.log('Brocoz nasceu! Abra http://localhost:3007 no navegador.')
  bot.chat('Cheguei! Vou começar a patrulhar.')

  mineflayerViewer(bot, { port: 3007, firstPerson: false })

  // 1) Desenha o rastro do caminho percorrido (linha visível no navegador)
  const rastro = [bot.entity.position.clone()]
  bot.on('move', () => {
    const ultimo = rastro[rastro.length - 1]
    if (ultimo.distanceTo(bot.entity.position) > 0.5) {
      rastro.push(bot.entity.position.clone())
      if (rastro.length > 50) rastro.shift()      // mantém só os últimos 50 pontos
      bot.viewer.drawLine('rastro', rastro)
    }
  })

  // 2) Mostra a posição no terminal a cada 2s (números mudando = está andando)
  setInterval(() => {
    const p = bot.entity.position
    console.log(`Brocoz em x:${p.x.toFixed(1)} y:${p.y.toFixed(1)} z:${p.z.toFixed(1)}`)
  }, 2000)

  bot.pathfinder.setMovements(new Movements(bot))
  patrulhar()
})

// Patrulha contínua e mais robusta
async function patrulhar() {
  const inicio = bot.entity.position.clone()
  const x = Math.floor(inicio.x)
  const y = Math.floor(inicio.y)
  const z = Math.floor(inicio.z)

  // Distância maior + tolerância pequena = trajetos mais longos e visíveis
  const pontos = [
    new goals.GoalNear(x + 12, y, z, 1),
    new goals.GoalNear(x - 12, y, z, 1)
  ]

  let i = 0
  while (true) {
    try {
      await bot.pathfinder.goto(pontos[i])
      i = (i + 1) % pontos.length   // alterna entre os dois pontos
      // sem pausa: emenda direto no próximo trajeto
    } catch (err) {
      console.log('Recalculando rota:', err.message)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

bot.on('end', () => console.log('Brocoz desconectou.'))
bot.on('error', (err) => console.log('Erro:', err))