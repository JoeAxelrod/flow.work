FROM node:20

# Install PostgreSQL client for db:init script
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY nest-cli.json ./
COPY tsconfig.json ./
COPY schema.sql ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production

CMD ["node","dist/main.js"]
