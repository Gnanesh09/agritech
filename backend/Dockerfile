FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
RUN bunx prisma generate
CMD ["bun", "run", "server.ts"]