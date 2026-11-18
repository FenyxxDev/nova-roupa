# syntax=docker/dockerfile:1

# ---- Etapa 1: build do SPA Angular ----
# Angular 22 exige Node ^22.22.3 || ^24.15.0 || >=26, por isso a imagem base e node:22-alpine.
FROM node:22-alpine AS build
WORKDIR /app

# Copia primeiro os manifestos para aproveitar o cache de camadas do npm.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copia o restante codigo e gera o bundle de producao (saida em dist/frontend/browser).
COPY . .
RUN npm run build -- --configuration production

# ---- Etapa 2: runtime com Nginx ----
FROM nginx:stable-alpine AS runtime

# Configuracao do servidor: roteamento do SPA + proxy reverso para /api.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Apenas os artefatos estaticos vao para a imagem final.
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
