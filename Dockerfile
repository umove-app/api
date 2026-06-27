# Development stage
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Prune dev dependencies so the production image only carries runtime deps,
# while keeping native modules (e.g. bcrypt) already built in this stage.
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Reuse the build stage's pruned node_modules (native modules already compiled)
# and the compiled output, including migrations and the seeder.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Railway sets PORT at runtime; the app reads process.env.PORT.
EXPOSE 4000

# On boot: run pending migrations, run the idempotent seed, then start the app.
# Defined as an npm script so the release steps stay in one place.
CMD ["npm", "run", "start:prod:release"]
