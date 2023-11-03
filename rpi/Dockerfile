FROM node:20-alpine

WORKDIR /app/

COPY package.* /app/

RUN npm i --omit=dev
# RUN npm install --no-save serialport@7 && npm install --no-save serialport

COPY index.js /app/
COPY acc.js /app/
COPY public /app/public

CMD ["node", "/app/index.js"]
