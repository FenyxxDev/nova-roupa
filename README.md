# Nova Roupa

Marketplace circular para reaproveitamento de retalhos têxteis, com SPA Angular e API Spring Boot.

## Subida em um comando

```bash
docker compose up --build
```

Acesse o frontend em <http://localhost:4200>, a API em <http://localhost:8080>, Swagger em <http://localhost:8080/swagger-ui.html> e Mailpit em <http://localhost:8025>.

## Credenciais de demonstração

No perfil local `dev`:

| Usuário | Senha | Papel |
|---|---|---|
| `vendedor` | `vendedor-demo-123` | VENDEDOR |
| `comprador` | `comprador-demo-123` | COMPRADOR |
| `admin` | `admin-demo-123` | ADMIN |

## Desenvolvimento local

```bash
# API
mvn spring-boot:run

# SPA
cd frontend
npm ci
npm start
```

A API usa SQLite em `extensao.db` e fotos em `./data/uploads` no perfil `dev`. Para produção, configure `SPRING_PROFILES_ACTIVE=prod`, `SPRING_DATASOURCE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` e `PHOTO_STORAGE_DIR`.

## APIs principais

- `GET /api/lotes`: catálogo paginado.
- `POST /api/lotes`: publica lote autenticado.
- `POST /api/lotes/{id}/fotos`: upload multipart persistente.
- `GET /api/lotes/meus`, `PUT /api/lotes/{id}`, `PATCH /api/lotes/{id}/encerrar`: gestão própria.
- `POST /api/propostas`, `POST /api/propostas/{id}/contrapropostas`, `PATCH /api/propostas/{id}/status`.
- `GET/POST /api/propostas/{id}/mensagens`: histórico de mensagens entre participantes.
- `GET /api/notificacoes/stream`: SSE em tempo real.
- `GET /api/notificacoes/minhas`, `PATCH /api/notificacoes/{id}/lida`: feed persistente.
- `POST /api/avaliacoes`, `GET /api/avaliacoes/minhas`: avaliações e reputação.

Consulte o [roteiro de apresentação](docs/ROTEIRO_APRESENTACAO.md) e a [arquitetura](docs/ARQUITETURA.md).

## Qualidade

```bash
mvn test
npm --prefix frontend run build
```
