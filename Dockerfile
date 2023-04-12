FROM node:18.15.0-alpine3.17 as builder

WORKDIR /app

COPY package* ./

RUN npm install

COPY . .

RUN npm run build


FROM node:18.15.0-alpine3.17 as app

WORKDIR /app

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/package* ./

RUN npm install --only=production

EXPOSE 3000

CMD ["node", "/app/dist/index.js"]
