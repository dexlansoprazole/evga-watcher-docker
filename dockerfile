FROM node:lts-alpine

WORKDIR /evga-watcher

COPY . .

RUN apk add --no-cache --virtual .gyp g++ make py3-pip \
  && npm install \
  && apk del .gyp

ENV NODE_ENV=production
ENV DATA_PATH=/data

CMD ["node", "/evga-watcher/app.js"]