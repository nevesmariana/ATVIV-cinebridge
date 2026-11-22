# Imagem base indicada pelo professor
FROM node:18-alpine

# Pacotes extras do Alpine: openssl (o Prisma precisa) e wget (health check, etapa 6)
RUN apk add --no-cache openssl wget

# Diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia só os arquivos de dependências e instala
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante do código-fonte
COPY . .

# Gera o Prisma Client. A URL é só um valor falso para o comando rodar;
# a URL real vai chegar pelo docker-compose depois.
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

# Porta do serviço
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]