FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock* package-lock.json* ./

FROM base AS dependencies

RUN if [ -f yarn.lock ]; then yarn install; \
  elif [ -f package-lock.json ]; then npm install; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS build

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install PM2 globally
RUN npm install -g pm2

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/ecosystem.config.js ./ecosystem.config.js

RUN mkdir -p /app/logs

EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]

