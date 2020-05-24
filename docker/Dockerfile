FROM node:14.3-alpine

ENV NODE_ENV=production

RUN apk add --update --no-cache \
  build-base \
  python3 \
  ffmpeg

COPY . /opt/app
WORKDIR /opt/app

RUN npm install

ENTRYPOINT [ "npm", "start" ]
