# Dev-only (05A §13). Producción: `vite build` sirve estáticos por Nginx, sin Docker.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
