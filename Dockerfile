FROM node:18-alpine
RUN npm install -g pnpm

WORKDIR /usr/src

COPY ./package.json ./
COPY ./pnpm-lock.yaml ./
RUN pnpm install

COPY . ./
CMD [ "node", "./dist/bin/toolkit-iterate.js" ]