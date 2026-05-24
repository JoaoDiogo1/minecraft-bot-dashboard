# Imagem base: Node 22 (que o mineflayer exige)
FROM node:22-slim

# Ferramentas de build pro canvas (prismarine-viewer precisa)
RUN apt-get update && apt-get install -y \
    build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia os arquivos de dependências primeiro (otimização de cache)
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Portas: 3000 (API) e 3007 (viewer)
EXPOSE 3000 3007

# Comando que roda quando o container inicia
CMD ["node", "server.js"]
