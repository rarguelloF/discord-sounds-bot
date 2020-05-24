FROM node:14.3-slim

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY . /opt/app
WORKDIR /opt/app

RUN npm install

ENTRYPOINT [ "npm", "start" ]
