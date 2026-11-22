FROM node:18-alpine

RUN apk add --no-cache wget

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["npm", "start"]