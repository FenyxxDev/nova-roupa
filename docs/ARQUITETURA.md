# Arquitetura do Nova Roupa

## C4 — containers

```mermaid
C4Container
    title Nova Roupa — visão de containers
    Person(avaliador, "Comprador / vendedor", "Usa a plataforma")
    Container(spa, "SPA Angular", "Angular 22 + Nginx", "Catálogo, lotes, propostas, mensagens e perfil")
    Container(api, "API", "Spring Boot 3.3 / Java 21", "REST, SSE, autenticação JWT, regras de negócio")
    ContainerDb(db, "SQLite", "Banco relacional", "Usuários, lotes, propostas, avaliações, mensagens e notificações")
    Container(storage, "Volume de fotos", "Filesystem persistente", "Imagens multipart dos lotes")
    System_Ext(mailpit, "Mailpit/SMTP", "Entrega de e-mails de aceite")
    Rel(avaliador, spa, "HTTPS/HTTP")
    Rel(spa, api, "REST + SSE /api")
    Rel(api, db, "JPA/JDBC")
    Rel(api, storage, "Arquivos")
    Rel(api, mailpit, "SMTP")
```

## Modelo de dados

```mermaid
erDiagram
  USUARIOS ||--o{ LOTES_RETALHO : anuncia
  LOTES_RETALHO ||--o{ PROPOSTAS_NEGOCIACAO : recebe
  USUARIOS ||--o{ PROPOSTAS_NEGOCIACAO : envia
  PROPOSTAS_NEGOCIACAO ||--o{ PROPOSTAS_NEGOCIACAO : origina
  PROPOSTAS_NEGOCIACAO ||--o{ AVALIACOES_PARCEIRO : gera
  PROPOSTAS_NEGOCIACAO ||--o{ MENSAGENS_NEGOCIACAO : possui
  USUARIOS ||--o{ MENSAGENS_NEGOCIACAO : escreve
  USUARIOS ||--o{ NOTIFICACOES : recebe
```

## Portas e volumes

| Serviço | Porta | Finalidade |
|---|---:|---|
| Frontend/Nginx | 4200 | SPA e proxy `/api` |
| API | 8080 | REST, Swagger e Actuator |
| Mailpit UI | 8025 | Caixa de entrada local |
| Mailpit SMTP | 1025 | SMTP local |
| SQLite/fotos | volume `nova-roupa-data` | Persistência |
