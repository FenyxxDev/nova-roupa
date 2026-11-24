# Roteiro de apresentação — 10 minutos

| Tempo | Responsável | Demonstração |
|---|---|---|
| 0:00–0:45 | Abertura | Problema do desperdício têxtil e proposta de marketplace circular. |
| 0:45–2:00 | Produto | `http://localhost:4200`: catálogo público, filtros e indicadores de impacto. |
| 2:00–3:30 | Vendedor | Login com `vendedor` / `vendedor-demo-123`, cadastro de lote, preço, fotos e localização. |
| 3:30–5:00 | Comprador | Login com `comprador` / `comprador-demo-123`, filtro de lote e envio de proposta. |
| 5:00–6:30 | Negociação | Vendedor abre propostas, responde com contraproposta e troca mensagens. |
| 6:30–7:30 | Aceite | Aceitar proposta; mostrar atualização do status e notificação SSE. |
| 7:30–8:15 | E-mail | Abrir Mailpit em `http://localhost:8025` e mostrar o e-mail de aceite. |
| 8:15–9:15 | Pós-negociação | Perfil, avaliação, reputação e histórico persistido. |
| 9:15–10:00 | Arquitetura | Mostrar diagrama, volume SQLite/fotos, testes e próximos passos. |

## Plano de contingência

Executar `docker compose up --build`, verificar `http://localhost:8080/actuator/health` e manter uma captura local das telas apenas após a equipe realizar a gravação oficial. A gravação de vídeo e a homologação final são atividades humanas; este roteiro deixa a execução reproduzível.
