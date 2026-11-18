# Nova Roupa API

API backend do projeto Nova Roupa para autenticação, publicação e pesquisa de lotes de retalhos, indicadores de impacto e avaliações de parceiros.

## Requisitos

- Java 21
- Maven 3.9+
- Docker Engine e Docker Compose v2 (opcional)

## Executar localmente

```bash
mvn spring-boot:run
```

A aplicação usa SQLite (`extensao.db`) e, por omissão, o profile `dev`, com utilizadores de demonstração em memória. Credenciais de desenvolvimento:

| Perfil | Utilizador | Palavra-passe |
|---|---|---|
| Administrador | `admin` | `admin-demo-123` |
| Vendedor | `vendedor` | `vendedor-demo-123` |
| Comprador | `comprador` | `comprador-demo-123` |

Estas credenciais são apenas para desenvolvimento local. Não use o profile `dev` nem estas credenciais em produção.

## Testes e cobertura

```bash
mvn --batch-mode clean verify
```

O build falha se a cobertura de linhas JaCoCo ficar abaixo de 80%. O relatório HTML é gerado em `target/site/jacoco/index.html`; os resultados JUnit ficam em `target/surefire-reports/`.

O workflow também executa o Quality Gate SonarQube em pushes e pull requests do próprio repositório. Configure `SONAR_TOKEN` como secret do repositório; `SONAR_HOST_URL` é opcional e assume `https://sonar.fchicout.dev` quando omitido. Pull requests de forks mantêm os testes e o gate JaCoCo, mas não recebem secrets do GitHub Actions.

## API e documentação

Com a aplicação em execução:

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>
- Health: <http://localhost:8080/actuator/health>

Principais endpoints:

| Método | Caminho | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Autentica e devolve JWT |
| `GET` | `/api/lotes` | Público | Pesquisa lotes; filtros: `tipoTecido`, `cor`, `pesoMin`, `pesoMax`, `localizacao`, `page`, `size` (máximo 100) |
| `POST` | `/api/lotes` | Vendedor/Admin | Publica um lote; o vendedor é derivado do JWT |
| `GET` | `/api/dashboard/impacto` | Público | Devolve indicadores socioambientais agregados |
| `POST` | `/api/avaliacoes` | Autenticado | Regista avaliação após negociação concluída, conforme as regras de domínio |

Para endpoints protegidos, envie `Authorization: Bearer <token>`. As respostas de validação usam HTTP 400; credenciais inválidas usam 401, limite de login 429 e acesso não autorizado 403.

## Configuração por ambiente

| Variável | Predefinição | Utilização |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | `dev` usa contas mock; `ldap` ativa autenticação LDAP |
| `DATABASE_URL` | `jdbc:sqlite:extensao.db` | URL JDBC do SQLite |
| `SERVER_PORT` | `8080` | Porta HTTP |
| `JWT_SECRET` | vazio | Obrigatório fora dos profiles `dev`/`test`; mínimo 32 bytes para HS256 |
| `JWT_EXPIRATION_MS` | `3600000` | Validade do JWT em milissegundos |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Lista separada por vírgulas de origens exatas autorizadas para `/api/**`; wildcard não é permitido |
| `MAIL_HOST` | `localhost` | Host do servidor SMTP |
| `MAIL_PORT` | `25` | Porta SMTP |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | vazio | Credenciais SMTP; forneça por ambiente/secret |
| `MAIL_SMTP_AUTH` | `false` | Ativa autenticação SMTP |
| `MAIL_SMTP_STARTTLS_ENABLE` | `false` | Ativa STARTTLS |
| `MAIL_FROM` | `no-reply@novaroupa.local` | Endereço remetente das notificações |
| `MAIL_HEALTH_ENABLED` | `false` | Inclui o estado SMTP na health check do Actuator |
| `LDAP_URL` | `ldap://localhost:389` | URL do diretório no profile `ldap` |
| `LDAP_BASE` | `dc=example,dc=org` | Base DN do diretório |
| `LDAP_USER_DN_PATTERN` | `uid={0},ou=people` | Padrão DN do utilizador |
| `LDAP_GROUP_SEARCH_BASE` | `ou=groups` | Base de pesquisa de grupos |
| `LDAP_GROUP_SEARCH_FILTER` | `(member={0})` | Filtro de grupos |

Em produção, use `SPRING_PROFILES_ACTIVE=ldap`, forneça um `JWT_SECRET` aleatório com pelo menos 32 bytes e configure as origens CORS e os parâmetros LDAP reais. Nunca publique segredos em `.env` versionados.

O CORS aceita somente as origens exatas definidas em `CORS_ALLOWED_ORIGINS` (sem `*`). O padrão local é `http://localhost:4200`; no ambiente de homologação, configure a lista com `http://localhost:4200,https://<dominio-de-homologacao>` usando o domínio real da implantação. O backend também envia `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY`. Descrições de lotes são tratadas como texto simples: marcações HTML e conteúdo de `script`/`style` são removidos antes da persistência.

Ao aceitar uma proposta, o backend publica um evento transacional e envia, após o commit, uma notificação assíncrona ao e-mail do comprador com valor, quantidade, local de retirada e contatos do vendedor. Configure as variáveis `MAIL_*` para usar um servidor SMTP; sem e-mail cadastrado para o comprador, o envio é ignorado e registrado no log.

O health indicator LDAP do Actuator fica desativado nos profiles `dev`/`test` e é ativado automaticamente no profile `ldap`, evitando que a ausência de um diretório local marque o backend de desenvolvimento como indisponível.

## Docker Compose

```bash
docker compose up --build
```

O Compose local inicia o backend no profile `dev`, publica a API em `http://localhost:8080` apenas no loopback do host (não fica acessível a outras máquinas da rede) e persiste a base de dados no volume `nova-roupa-data`. Para parar sem apagar os dados:

```bash
docker compose down
```

Para remover também os dados persistidos, execute `docker compose down -v`. O profile `dev` e as credenciais mock não são adequados a produção.
