FROM node:lts-alpine

WORKDIR /evga-watcher

COPY . .

RUN npm install

ENV NODE_ENV=production
ENV DATA_PATH=/data

CMD ["node", "/evga-watcher/app.js"]