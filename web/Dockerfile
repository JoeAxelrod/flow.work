FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY next.config.js ./

COPY app ./app

CMD ["npm","run","dev"]
