FROM node:16.13.1

WORKDIR /usr

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN mkdir data
RUN mkdir transpiled
RUN npm install
RUN tsc

CMD ["node", "transpiled/boofle.js"]