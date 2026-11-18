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

Sem `SPRING_PROFILES_ACTIVE` a aplicação sobe no profile `dev`: SQLite em `extensao.db`, utilizadores de demonstração em memória e nenhuma dependência de rede (nem LDAP nem SMTP). Credenciais de desenvolvimento:

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

## Perfis de execução

A configuração é dividida por profile. `application.yml` contém apenas valores comuns e não define base de dados; cada profile acrescenta o seu ambiente.

| Profile | Objetivo | Autenticação | Base de dados |
|---|---|---|---|
| `dev` (padrão) | desenvolvimento local | contas mock em memória | SQLite em ficheiro (`extensao.db`) |
| `test` | testes automatizados | mock/JWT efémero | SQLite em memória |
| `prod` | implantação | exige `JWT_SECRET`; combine com `ldap` | `SPRING_DATASOURCE_URL` |
| `ldap` | diretório institucional | LDAP (`LDAP_URL`, `LDAP_BASE`, ...) | herdada do profile ativo |

```bash
# Desenvolvimento (padrão), sem LDAP nem SMTP
mvn spring-boot:run

# Perfil explícito
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run

# Testes automatizados
mvn --batch-mode clean verify -Dspring-boot.run.profiles=test

# Produção com autenticação LDAP
SPRING_PROFILES_ACTIVE=prod,ldap \
SPRING_DATASOURCE_URL=jdbc:sqlite:/data/nova-roupa.db \
JWT_SECRET="<pelo menos 32 bytes aleatórios>" \
CORS_ALLOWED_ORIGINS="https://app.exemplo.org" \
LDAP_URL="ldaps://directory.exemplo.org:636" \
java -jar target/nova-roupa-api-0.1.0-SNAPSHOT.jar
```

Em `prod` nenhum valor sensível tem predefinição: a aplicação falha ao arrancar se `SPRING_DATASOURCE_URL`, `JWT_SECRET` ou `CORS_ALLOWED_ORIGINS` estiverem em falta, e também `LDAP_URL` quando `ldap` estiver ativo. O `JWT_SECRET` precisa de pelo menos 32 bytes para HS256; em `dev`/`test` a chave é efémera (tokens deixam de valer ao reiniciar). Enquanto o projeto não adotar migrações (Flyway/Liquibase), o schema em `prod` é mantido pelo Hibernate através de `JPA_DDL_AUTO` (predefinição `update`).

## Variáveis de ambiente

| Variável | Predefinição | Utilização |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | Profiles ativos, separados por vírgula (ex.: `prod,ldap`) |
| `DATABASE_URL` | `jdbc:sqlite:extensao.db` | URL JDBC do SQLite no profile `dev` |
| `TEST_DATABASE_URL` | SQLite em memória | URL JDBC usada no profile `test` |
| `SPRING_DATASOURCE_URL` | sem predefinição | URL JDBC obrigatória no profile `prod` |
| `SPRING_DATASOURCE_DRIVER` | `org.sqlite.JDBC` | Driver JDBC no profile `prod` |
| `JPA_DDL_AUTO` | `update` | Estratégia de schema do Hibernate em `prod` (`validate` após adotar migrações) |
| `SERVER_PORT` | `8080` | Porta HTTP |
| `JWT_SECRET` | vazio | Obrigatório em `prod`; mínimo 32 bytes para HS256 |
| `JWT_EXPIRATION_MS` | `3600000` | Validade do JWT em milissegundos |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` (obrigatório em `prod`) | Lista separada por vírgulas de origens exatas autorizadas para `/api/**`; wildcard não é permitido |
| `MAIL_HOST` | `localhost` | Host do servidor SMTP |
| `MAIL_PORT` | `25` | Porta SMTP |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | vazio | Credenciais SMTP; forneça por ambiente/secret |
| `MAIL_SMTP_AUTH` | `false` | Ativa autenticação SMTP |
| `MAIL_SMTP_STARTTLS_ENABLE` | `false` | Ativa STARTTLS |
| `MAIL_FROM` | `no-reply@novaroupa.local` | Endereço remetente das notificações |
| `MAIL_HEALTH_ENABLED` | `false` | Inclui o estado SMTP na health check do Actuator |
| `LDAP_URL` | `ldap://localhost:389` (`dev`) | URL do diretório; obrigatória em `prod,ldap` |
| `LDAP_BASE` | `dc=example,dc=org` | Base DN do diretório |
| `LDAP_USER_DN_PATTERN` | `uid={0},ou=people` | Padrão DN do utilizador |
| `LDAP_GROUP_SEARCH_BASE` | `ou=groups` | Base de pesquisa de grupos |
| `LDAP_GROUP_SEARCH_FILTER` | `(member={0})` | Filtro de grupos |

Nunca publique segredos em `.env` versionados; injete-os pelo orquestrador ou por secrets do CI/CD.

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
