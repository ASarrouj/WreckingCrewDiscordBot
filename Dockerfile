FROM node:16.13.1

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
COPY setLogin.sh ./
RUN chmod +x setLogin.sh

RUN ./setLogin.sh
RUN mkdir data
RUN mkdir transpiled
RUN npm install
RUN tsc

CMD ["node", "transpiled/boofle.js"]