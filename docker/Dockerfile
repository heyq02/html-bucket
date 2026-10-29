FROM node:24-bookworm-slim

WORKDIR /home

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm prune --omit=dev

RUN mkdir -p /home/storage \
  && chmod +x /home/docker/start.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV PAGE_STORE_ROOT=/home/storage
ENV PUBLIC_BASE_URL=http://localhost:3000

EXPOSE 3000

ENTRYPOINT ["/home/docker/start.sh"]
