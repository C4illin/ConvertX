 Objetivo

 Transformar o ConvertX em um serviço backend interno, sem necessidade de UI, para suportar principalmente:

 - DOCX -> TXT
 - DOCX -> texto bruto JSON
 - PDF -> texto
 - XLSX -> texto/CSV
 - ODT -> texto
 - HTML/MD -> texto
 - PPT -> TXT
 - PPTX -> TXT
 - DOC -> TXT
 - XLS -> TXT

 O uso principal será:
 - n8n baixa arquivo do Nextcloud
 - n8n envia arquivo ao serviço
 - serviço devolve texto limpo
 - n8n indexa no Supabase

 ────────────────────────────────────────────────────────────────────────────────

 Decisão arquitetural

 Não fazer

 - scraping da UI do ConvertX
 - automação de login/session/cookies
 - usar endpoints web atuais como API informal
 - expor interface pública para clientes

 Fazer

 Criar um fork com API interna dedicada, separada da UI.

 ### Estratégia recomendada

 Adicionar uma camada nova de rotas, por exemplo:

 - POST /api/extract-text
 - POST /api/convert
 - GET /healthz

 Com autenticação simples por token interno.

 ────────────────────────────────────────────────────────────────────────────────

 Estado atual observado

 Pelo container investigado:

 - o projeto já tem motores funcionais:
 - LibreOffice
 - calibre
 - pandoc
 - markitdown
 - o projeto já faz conversões reais
 - logs confirmam conversão bem-sucedida de docx -> txt
 - há código compilado indicando:
 - src/converters/main
 - handleConvert(...)
 - conversores separados por engine
 - a aplicação atual é UI-first
 - existem rotas web, mas não uma API limpa/documentada para integração M2M

 Conclusão:
 a parte difícil da conversão já existe.
 O trabalho principal é expor isso de forma limpa, previsível e segura.

 ────────────────────────────────────────────────────────────────────────────────

 Meta funcional do fork

 MVP

 Entregar um serviço que aceite upload de arquivo e retorne texto extraído.

 ### Endpoint principal

 POST /api/extract-text

 ### Input

 Multipart upload:
 - file: arquivo
 - opcional:
 - filename
 - mimeType
 - preferredConverter
 - formatHint

 ### Output

 ```json
   {
   "ok": true,
   "filename": "contrato.docx",
   "detectedInputType": "docx",
   "converter": "calibre",
   "text": "texto extraído...",
   "meta": {
   "chars": 12345,
   "warnings": [],
   "durationMs": 842
   }
   }
 ```

 V2

 Adicionar endpoint de conversão genérica:

 POST /api/convert

 Input:
 - arquivo
 - target=txt|pdf|html|md

 Output:
 - binário convertido
 ou
 - JSON com downloadUrl temporária

 V3

 Adicionar modos assíncronos para arquivos grandes:
 - POST /api/jobs
 - GET /api/jobs/:id
 - GET /api/jobs/:id/result

 ────────────────────────────────────────────────────────────────────────────────

 Proposta de design técnico

 1. Criar modo “service-only”

 Adicionar variável de ambiente:

 - SERVICE_MODE=true

 ### Comportamento

 Quando SERVICE_MODE=true:
 - não montar UI
 - não depender de login visual
 - subir apenas:
 - healthcheck
 - rotas de API
 - middlewares essenciais

 ### Benefícios

 - superfície menor
 - menos complexidade
 - mais fácil de operar
 - menos risco de endpoints web desnecessários

 ────────────────────────────────────────────────────────────────────────────────

 2. Criar namespace /api

 Separar totalmente das rotas existentes de UI.

 ### Rotas sugeridas

 - GET /healthz
 - GET /api/healthz
 - POST /api/extract-text
 - POST /api/convert
 - opcional:
 - GET /api/formats
 - GET /api/converters

 ────────────────────────────────────────────────────────────────────────────────

 3. Criar camada de autenticação interna

 Como é serviço de infraestrutura, não precisa auth de usuário final.

 ### Recomendado

 Auth por header estático:

 - Authorization: Bearer <SERVICE_TOKEN>

 ou
 - X-API-Key: <SERVICE_TOKEN>

 ### Variável

 - SERVICE_TOKEN=...

 ### Regra

 - se SERVICE_MODE=true, bloquear todas as rotas /api/* sem token válido
 - exceção:
 - /healthz

 ### Se rodar só em rede interna

 Pode até começar sem auth em ambiente fechado, mas eu recomendo token desde o início.

 ────────────────────────────────────────────────────────────────────────────────

 Arquivos/áreas prováveis para alterar no fork

 Baseado no que encontrei no container:

 Áreas principais

 - src/index.tsx
 - src/converters/main.ts
 - src/converters/*.ts
 - src/helpers/*
 - páginas/rotas web em src/pages/*

 Novo código a criar

 ### Novo diretório sugerido

 - src/api/

 ### Arquivos sugeridos

 - src/api/auth.ts
 - src/api/health.ts
 - src/api/extractText.ts
 - src/api/convert.ts
 - src/api/utils/files.ts
 - src/api/utils/text.ts
 - src/api/utils/cleanup.ts

 ────────────────────────────────────────────────────────────────────────────────

 Implementação recomendada por etapas

 Etapa 1 — mapear a entrada do app atual

 Objetivo: entender o mínimo necessário para chamar a conversão sem UI.

 ### Tarefa DEV

 Inspecionar:
 - como src/pages/upload.tsx salva upload
 - como src/pages/convert.tsx chama handleConvert
 - assinatura real de handleConvert(...)
 - formato esperado de:
 - upload dir
 - output dir
 - converter name
 - target format

 ### Entregável

 Documento curto:
 - fluxo atual de upload → conversão → output
 - dependências implícitas do sistema de jobs

 ────────────────────────────────────────────────────────────────────────────────

 Etapa 2 — isolar a lógica reutilizável

 Objetivo: desacoplar conversão da camada web.

 ### Se handleConvert estiver muito acoplado

 Criar função nova, por exemplo:

 ```ts
   convertSingleFile({
   inputPath,
   outputDir,
   target,
   preferredConverter,
   options
   })
 ```

 Retornando algo como:

 ```ts
   {
   outputPath: string,
   converterUsed: string,
   target: string
   }
 ```

 ### Ideal

 Essa função deve:
 - não depender de cookie
 - não depender de user id
 - não depender de job id da UI
 - não depender de db/history

 ### Entregável

 Uma função reutilizável de backend puro.

 ────────────────────────────────────────────────────────────────────────────────

 Etapa 3 — implementar POST /api/extract-text

 Objetivo: MVP útil para n8n.

 ### Fluxo interno

 1. receber multipart com arquivo
 2. salvar em diretório temporário
 3. detectar tipo:
 - por extensão
 - e/ou MIME
 4. escolher rota de extração

 ### Regras sugeridas por tipo

 - docx
 - tentar calibre -> txt
 - fallback libreoffice -> txt
 - fallback markitdown se fizer sentido
 - odt
 - libreoffice
 - pdf
 - se houver extrator apropriado, usar
 - senão deixar fora do MVP
 - txt, md, csv
 - leitura direta
 - html
 - converter para texto via sanitização

 ### Pós-processamento de texto

 Aplicar normalização:
 - trim
 - normalizar CRLF/LF
 - remover excesso de linhas vazias
 - opcional:
 - remover caracteres nulos
 - normalizar unicode
 - colapsar whitespace sem destruir parágrafos

 ### Output

 Sempre JSON:

 ```json
   {
   "ok": true,
   "text": "...",
   "converter": "calibre",
   "detectedInputType": "docx",
   "meta": {
   "chars": 1234,
   "durationMs": 820,
   "tempFilesCleaned": true
   }
   }
 ```

 ### Erros

 Padrão:

 ```json
   {
   "ok": false,
   "error": {
   "code": "UNSUPPORTED_INPUT",
   "message": "Unsupported input type: xlsm"
   }
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 Etapa 4 — implementar escolha de conversor

 Objetivo: não depender de um único backend.

 ### Ordem recomendada para DOCX->TXT

 1. calibre
 2. libreoffice
 3. pandoc ou markitdown se útil

 ### Por quê

 Você já viu nos logs que o ConvertX converteu DOCX→TXT usando calibre com sucesso.

 ### Interface sugerida

 Criar um resolvedor:

 ```ts
   resolveTextExtractor(inputType, preferredConverter?)
 ```

 Retorna:
 - função de conversão
 - nome do conversor

 ### Benefício

 No futuro, trocar backend sem mexer na API.

 ────────────────────────────────────────────────────────────────────────────────

 Etapa 5 — implementar storage temporário robusto

 Objetivo: evitar vazamento de arquivos e sujeira em disco.

 ### Recomendação

 Estrutura temporária por request:
 - /tmp/convertx-service/<request-id>/input
 - /tmp/convertx-service/<request-id>/output

 ### Regras

 - gerar requestId UUID
 - limpar sempre no finally
 - logar falha de cleanup sem quebrar resposta principal
 - adicionar TTL cleanup defensivo por cron se quiser

 ### Importante

 Nunca confiar no nome do arquivo bruto do usuário para compor path.

 ────────────────────────────────────────────────────────────────────────────────

 Etapa 6 — health e observabilidade

 ### Endpoint

 GET /healthz

 Retorno:

 ```json
   {
   "ok": true,
   "service": "convertx-service",
   "serviceMode": true,
   "converters": {
   "libreoffice": true,
   "calibre": true,
   "pandoc": true
   }
   }
 ```

 ### Também recomendado

 GET /api/formats
 Retorna:
 - entradas suportadas para extração
 - conversores disponíveis

 ### Logging

 Log por request:
 - requestId
 - filename
 - detected input type
 - converter escolhido
 - duration
 - sucesso/falha

 Sem logar conteúdo do documento.

 ────────────────────────────────────────────────────────────────────────────────

 Contrato recomendado para o n8n

 Chamada HTTP Request

 POST /api/extract-text

 ### Headers

 - Authorization: Bearer <SERVICE_TOKEN>

 ### Body

 Multipart:
 - file: binário do Nextcloud

 ### Resposta esperada no n8n

 ```json
   {
   "ok": true,
   "text": "..."
   }
 ```

 ### Integração no workflow

 Branch DOCX fica:

 1. Nextcloud download
 2. HTTP Request -> convertx-service /api/extract-text
 3. Set data = {{$json.text}}
 4. Update Data RAG
 5. Move para processados

 ────────────────────────────────────────────────────────────────────────────────

 Segurança

 Requisitos mínimos

 - rodar em rede interna
 - autenticação por token
 - limite de tamanho de upload
 - tipos aceitos explicitamente
 - sanitização de nome de arquivo
 - limpeza garantida de temporários
 - timeout por conversão

 Recomendado

 - MAX_UPLOAD_MB
 - REQUEST_TIMEOUT_MS
 - ALLOWED_INPUT_TYPES=docx,txt,md ,pdf,...

 Não fazer

 - expor sem auth na internet
 - aceitar qualquer formato indiscriminadamente
 - armazenar documentos convertidos por padrão

 ────────────────────────────────────────────────────────────────────────────────

 Performance e concorrência

 MVP

 Processamento síncrono por request está ok.

 Limites recomendados

 - 1 request = 1 temp dir
 - limite de concorrência configurável
 - timeouts por engine

 ### Variáveis sugeridas

 - MAX_CONCURRENT_CONVERSIONS=2 ou 4
 - REQUEST_TIMEOUT_MS=60000

 Se ficar pesado depois

 Migrar para fila/job assíncrono.

 ────────────────────────────────────────────────────────────────────────────────

 Plano de entrega para DEV

 Sprint 1 — API mínima funcional

 ### Objetivo

 Subir POST /api/extract-text para DOCX.

 ### Itens

 - fork do projeto
 - SERVICE_MODE=true
 - GET /healthz
 - POST /api/extract-text
 - token auth
 - temp storage
 - DOCX -> TXT via calibre/libreoffice
 - retorno JSON com texto
 - logs básicos

 ### Critério de aceite

 - enviar DOCX e receber texto limpo
 - n8n consegue consumir
 - sem UI necessária

 ────────────────────────────────────────────────────────────────────────────────

 Sprint 2 — endurecimento

 ### Itens

 - fallback entre conversores
 - suporte a TXT/MD/HTML direto
 - timeouts
 - limites de upload
 - limpeza robusta
 - testes automatizados
 - imagem Docker própria do fork

 ### Critério de aceite

 - falha controlada
 - zero lixo de temp após requests
 - respostas padronizadas de erro

 ────────────────────────────────────────────────────────────────────────────────

 Sprint 3 — extensões úteis

 ### Itens

 - POST /api/convert
 - GET /api/formats
 - suporte a PDF/XLSX conforme prioridade
 - métricas e logs melhores
 - docs internas para integração com n8n

 ────────────────────────────────────────────────────────────────────────────────

 Testes que DEV precisa cobrir

 Testes funcionais

 ### DOCX simples

 - texto corrido
 - múltiplos parágrafos
 - heading + lista

 ### DOCX médio

 - tabela
 - quebra de página
 - caracteres acentuados
 - unicode

 ### Casos de erro

 - arquivo inválido
 - ZIP corrompido
 - extensão falsa
 - arquivo muito grande
 - timeout de conversão

 Testes de contrato

 - resposta JSON sempre válida
 - ok=true/false
 - text presente quando sucesso
 - error.code presente quando falha

 Testes de operação

 - cleanup de temp
 - concorrência de 2-5 requests
 - comportamento com conversor ausente

 ────────────────────────────────────────────────────────────────────────────────

 Docker/Deploy do fork

 Recomendação

 Imagem própria, por exemplo:
 - ghcr.io/<org>/convertx-service

 Execução

 Sem UI e com modo serviço:
 - SERVICE_MODE=true
 - SERVICE_TOKEN=...

 ### Exemplo de compose conceitual

 ```yaml
   services:
   convertx-service:
   image: ghcr.io/<org>/convertx-service:latest
   restart: unless-stopped
   ports:
   - "127.0.0.1:3010:3000"
   environment:
   - SERVICE_MODE=true
   - SERVICE_TOKEN=supersecret
   - MAX_UPLOAD_MB=50
   - REQUEST_TIMEOUT_MS=60000
   volumes:
   - ./data:/app/data
 ```

 ### Observação

 Se não precisar persistência, pode usar volume temporário.
 Mas algum diretório de trabalho é útil para debug inicial.

 ────────────────────────────────────────────────────────────────────────────────

 Riscos e mitigação

 Risco 1 — handleConvert muito acoplado à UI/job/db

 ### Mitigação

 Extrair função backend pura de conversão.

 Risco 2 — output TXT ruim em alguns DOCX

 ### Mitigação

 Implementar fallback entre calibre/libreoffice/markitdown.

 Risco 3 — vazar arquivos temporários

 ### Mitigação

 try/finally + cleanup periódico defensivo.

 Risco 4 — serviço virar gargalo

 ### Mitigação

 limite de concorrência + timeout + futura fila assíncrona.

 Risco 5 — quebra com updates upstream

 ### Mitigação

 manter mudanças isoladas em src/api/* e em poucos pontos do bootstrap.

 ────────────────────────────────────────────────────────────────────────────────

 Recomendação de abordagem de código

 Evitar

 Modificar agressivamente o fluxo web já existente.

 Preferir

 Adicionar uma camada nova, quase orthogonal:
 - src/api/*
 - boot condicional no src/index.tsx

 Assim o fork:
 - continua próximo do upstream
 - fica mais fácil de manter
 - reduz conflito de merge

 ────────────────────────────────────────────────────────────────────────────────

 Definição de pronto

 O fork estará “pronto” para uso no n8n quando:

 - POST /api/extract-text aceitar DOCX
 - devolver texto confiável
 - exigir token interno
 - limpar temporários
 - expor GET /healthz
 - rodar em container sem UI
 - ser consumível pelo workflow com um único HTTP Request

 ────────────────────────────────────────────────────────────────────────────────

 Minha recomendação final ao time DEV

 Build order

 1. extrair/consolidar função backend de conversão
 2. criar /api/extract-text
 3. adicionar auth + cleanup
 4. dockerizar modo service-only
 5. integrar no n8n
 6. só depois pensar em /api/convert genérico

 Porque o caso de uso real hoje é:
 DOCX -> texto para RAG
 e não um conversor universal completo.

 Se quiser, no próximo passo eu posso transformar isso em um artefato mais operacional para o time, por exemplo:
 - checklist técnico por tarefa
 - ADR curta
 - ou especificação de endpoints com payloads exatos.


 faça os 3


 Perfeito. Vou te entregar os 3 artefatos:

 1. checklist técnico por tarefa
 2. ADR curta
 3. especificação de endpoints com payloads exatos

 ────────────────────────────────────────────────────────────────────────────────

 1) CHECKLIST TÉCNICO POR TAREFA

 Projeto: Fork do ConvertX para modo service-only interno

 Objetivo do MVP

 Entregar um serviço interno que faça:

 - DOCX -> texto
 - consumível por n8n via HTTP
 - sem UI
 - sem login humano
 - com token interno
 - com cleanup de arquivos temporários

 ────────────────────────────────────────────────────────────────────────────────

 EPIC A — Preparação do fork

 ### Tarefa A1 — Criar fork e baseline

 Checklist
 - Criar fork do repositório C4illin/ConvertX
 - Definir nome do fork/produto interno
 - sugestão: convertx-service
 - Criar branch inicial:
 - feat/service-mode-api
 - Documentar hash/tag upstream base usada no fork
 - Confirmar build local do projeto original
 - Confirmar que a imagem Docker do fork sobe igual ao upstream

 Entregável
 - fork funcional
 - branch de trabalho criada
 - README interno inicial

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa A2 — Mapear fluxo atual de conversão

 Checklist
 - Inspecionar src/index.tsx
 - Inspecionar src/pages/upload*
 - Inspecionar src/pages/convert*
 - Inspecionar src/converters/main*
 - Localizar assinatura real de handleConvert(...)
 - Identificar dependências com:
 - user/session
 - jobId
 - sqlite/history
 - diretórios uploads/output
 - Mapear onde ocorre a seleção de conversor
 - Mapear onde o output final é salvo
 - Mapear tratamento de erro atual

 Entregável
 - documento curto: “conversion flow map”
 - diagrama simples do fluxo atual

 ────────────────────────────────────────────────────────────────────────────────

 EPIC B — Desacoplamento da lógica de conversão

 ### Tarefa B1 — Extrair função backend pura

 Objetivo
 Criar função reutilizável sem dependência da UI.

 Checklist
 - Criar módulo novo, ex:
 - src/service/convertSingleFile.ts
 - Definir interface de entrada:
 ```ts
   type ConvertSingleFileInput = {
   inputPath: string
   outputDir: string
   target: string
   preferredConverter?: string
   options?: Record<string, unknown>
   }
 ```

 - Definir interface de saída:
 ```ts
   type ConvertSingleFileResult = {
   outputPath: string
   converterUsed: string
   target: string
   durationMs: number
   }
 ```

 - Reusar lógica de conversão existente
 - Remover dependência de:
 - cookie
 - user id
 - job id
 - páginas web
 - Garantir que a função lance erro padronizado em falha

 Entregável
 - função backend pura testável

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa B2 — Extrair estratégia de “texto”

 Objetivo
 Criar uma camada que escolha o melhor conversor para extrair texto.

 Checklist
 - Criar módulo:
 - src/service/extractText.ts
 - Implementar detecção de tipo por:
 - extensão
 - MIME opcional
 - Criar resolver de conversor:
 ```ts
   resolveTextExtractor(inputType, preferredConverter?)
 ```

 - Ordem inicial para DOCX:
 - calibre
 - libreoffice
 - markitdown/pandoc se aplicável
 - Definir retorno:
 ```ts
   type ExtractTextResult = {
   text: string
   detectedInputType: string
   converterUsed: string
   durationMs: number
   warnings?: string[]
   }
 ```

 Entregável
 - função extractTextFromFile(...)

 ────────────────────────────────────────────────────────────────────────────────

 EPIC C — Modo service-only

 ### Tarefa C1 — Criar flag de execução

 Checklist
 - Adicionar env var:
 - SERVICE_MODE=true|false
 - No bootstrap (src/index.tsx), separar:
 - rotas web/UI
 - rotas de serviço/API
 - Quando SERVICE_MODE=true:
 - não montar páginas UI
 - não montar login/register/history/results
 - montar apenas health + API
 - Manter compatibilidade com modo original se necessário

 Entregável
 - app sobe em modo só-serviço

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa C2 — Criar autenticação por token

 Checklist
 - Adicionar env:
 - SERVICE_TOKEN
 - Criar middleware:
 - src/api/auth.ts
 - Ler header:
 - Authorization: Bearer <token>
 - Permitir /healthz sem auth
 - Bloquear /api/* sem token válido
 - Padronizar erro 401:
 ```json
   {
   "ok": false,
   "error": {
   "code": "UNAUTHORIZED",
   "message": "Invalid or missing service token"
   }
   }
 ```

 Entregável
 - autenticação M2M funcionando

 ────────────────────────────────────────────────────────────────────────────────

 EPIC D — API de extração

 ### Tarefa D1 — Healthcheck

 Checklist
 - Criar GET /healthz
 - Criar GET /api/healthz opcional
 - Retornar:
 - status do serviço
 - SERVICE_MODE
 - disponibilidade de conversores
 - Verificar presença real de:
 - libreoffice
 - calibre
 - pandoc
 - markitdown se existir

 Entregável
 - health confiável para monitoramento e n8n

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa D2 — Endpoint POST /api/extract-text

 Checklist
 - Criar rota:
 - POST /api/extract-text
 - Aceitar multipart form-data
 - Campo obrigatório:
 - file
 - Campos opcionais:
 - preferredConverter
 - filename
 - mimeType
 - formatHint
 - Validar tamanho do upload
 - Persistir em diretório temporário
 - Executar extração
 - Ler arquivo convertido TXT se o backend converter para TXT
 - Normalizar o texto
 - Devolver JSON

 Entregável
 - endpoint consumível pelo n8n

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa D3 — Normalização de texto

 Checklist
 - Criar módulo:
 - src/api/utils/text.ts
 - Aplicar:
 - trim
 - normalização de newline
 - remoção de NUL bytes
 - colapso de whitespace horizontal excessivo
 - preservação de parágrafos
 - limite opcional de tamanho
 - Adicionar warnings quando:
 - texto vier vazio
 - conversão tiver fallback
 - arquivo parecer corrompido

 Entregável
 - texto mais estável para RAG

 ────────────────────────────────────────────────────────────────────────────────

 EPIC E — Arquivos temporários e robustez

 ### Tarefa E1 — Temp storage por request

 Checklist
 - Criar requestId UUID por request
 - Estrutura:
 - /tmp/convertx-service/<requestId>/input
 - /tmp/convertx-service/<requestId>/output
 - Sanitizar nome do arquivo
 - Nunca confiar em path do usuário
 - Sempre limpar em finally
 - Logar falha de cleanup sem quebrar a resposta

 Entregável
 - zero sujeira estrutural por request

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa E2 — Timeouts e limites

 Checklist
 - Adicionar env:
 - MAX_UPLOAD_MB
 - REQUEST_TIMEOUT_MS
 - MAX_CONCURRENT_CONVERSIONS
 - Aplicar timeout por processo de conversão
 - Aplicar limite de upload
 - Rejeitar tipos não suportados
 - Padronizar erro:
 - PAYLOAD_TOO_LARGE
 - UNSUPPORTED_INPUT
 - CONVERSION_TIMEOUT

 Entregável
 - serviço operacionalmente previsível

 ────────────────────────────────────────────────────────────────────────────────

 EPIC F — Docker e operação

 ### Tarefa F1 — Dockerfile / imagem do fork

 Checklist
 - Reutilizar imagem base do projeto ou adaptar a atual
 - Garantir que conversores necessários estejam presentes
 - Garantir modo service-only no start
 - Expor porta única
 - Configurar env defaults seguros

 Entregável
 - imagem convertx-service

 ────────────────────────────────────────────────────────────────────────────────

 ### Tarefa F2 — Compose de operação

 Checklist
 - Criar compose interno
 - Bind local de porta
 - ex: 127.0.0.1:3010:3000
 - Definir volume de dados se necessário
 - Definir restart policy
 - Definir token por env

 Entregável
 - deploy repetível

 ────────────────────────────────────────────────────────────────────────────────

 EPIC G — Integração com n8n

 ### Tarefa G1 — Contrato n8n

 Checklist
 - Documentar chamada HTTP Request no n8n
 - Exemplo com multipart binário
 - Exemplo de headers
 - Exemplo de resposta
 - Exemplo de mapping:
 - data = {{$json.text}}

 Entregável
 - handoff claro para o time de automação

 ────────────────────────────────────────────────────────────────────────────────

 EPIC H — Testes

 ### Tarefa H1 — Testes funcionais

 Checklist
 - DOCX simples
 - DOCX com acentos
 - DOCX com tabela
 - DOCX com listas
 - DOCX vazio
 - arquivo inválido/corrompido
 - extensão falsa
 - timeout forçado

 ### Tarefa H2 — Testes operacionais

 Checklist
 - concorrência 2-5 requests
 - cleanup após sucesso
 - cleanup após falha
 - auth inválida
 - healthcheck sem auth

 Entregável
 - suíte mínima de confiança

 ────────────────────────────────────────────────────────────────────────────────

 2) ADR CURTA

 ADR-001 — Fork do ConvertX como serviço interno de extração de texto

 ### Status

 Proposto

 ### Contexto

 O fluxo RAG atual depende de ingestão automática de arquivos do Nextcloud e precisa extrair texto de documentos, especialmente .docx, sem:

 - autenticação Google
 - UI humana
 - automação frágil de browser/login

 Foi validado que o ConvertX, rodando em container, já converte DOCX -> TXT com sucesso usando sua stack interna (ex.: calibre/LibreOffice). Porém, a aplicação
 atual é orientada a UI e não expõe uma API simples/documentada para integração máquina-a-máquina.

 ### Decisão

 Fazer um fork do ConvertX e adicionar um modo service-only, com rotas internas dedicadas para automação, iniciando com:

 - GET /healthz
 - POST /api/extract-text

 O serviço será protegido por token interno e consumido pelo n8n.

 ### Racional

 Essa abordagem:
 - reutiliza a stack de conversão já validada
 - evita desenvolver um conversor do zero
 - evita depender de Google
 - evita scraping da UI
 - reduz confusão operacional com clientes
 - mantém a extração como componente de infraestrutura isolado

 ### Alternativas consideradas

 #### 1. Google como backend de conversão

 Rejeitada por exigir autenticação e gerar complexidade externa indesejada.

 #### 2. LibreOffice no host, chamado diretamente

 Viável, mas mais chato de operar, versionar e encapsular do que reaproveitar o container já funcional.

 #### 3. ConvertX UI com automação/scraping

 Rejeitada por fragilidade e baixa mantenibilidade.

 #### 4. Serviço local custom do zero

 Viável, mas desnecessário dado que o ConvertX já resolve a parte difícil da conversão.

 ### Consequências positivas

 - integração limpa com n8n
 - backend interno sem UI
 - melhor separação de responsabilidades
 - facilidade de evolução para outros formatos

 ### Consequências negativas

 - custo de manutenção do fork
 - necessidade de isolar mudanças para facilitar merge com upstream
 - necessidade de lidar com cleanup, auth e limites operacionais

 ### Decisão operacional

 Implementar primeiro um MVP de DOCX -> texto via POST /api/extract-text, depois expandir se necessário.

 ────────────────────────────────────────────────────────────────────────────────

 3) ESPECIFICAÇÃO DE ENDPOINTS

 Base URL

 Interna, por exemplo:
 - http://convertx-service:3000
 ou
 - http://127.0.0.1:3010

 Autenticação

 Header obrigatório para /api/*:

 ```http
   Authorization: Bearer <SERVICE_TOKEN>
 ```

 ────────────────────────────────────────────────────────────────────────────────

 3.1 GET /healthz

 ### Objetivo

 Sonda simples para monitoramento e readiness.

 ### Auth

 Não obrigatória

 ### Request

 ```http
   GET /healthz
 ```

 ### Response 200

 ```json
   {
   "ok": true,
   "service": "convertx-service",
   "serviceMode": true,
   "version": "0.1.0",
   "converters": {
   "libreoffice": true,
   "calibre": true,
   "pandoc": true,
   "markitdown": false
   }
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 3.2 GET /api/formats

 ### Objetivo

 Listar formatos e conversores disponíveis.

 ### Auth

 Obrigatória

 ### Request

 ```http
   GET /api/formats
   Authorization: Bearer <SERVICE_TOKEN>
 ```

 ### Response 200

 ```json
   {
   "ok": true,
   "extractText": {
   "inputs": ["docx", "txt", "md", "html", "odt"],
   "preferredConverters": ["calibre", "libreoffice", "pandoc", "markitdown"]
   }
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 3.3 POST /api/extract-text

 ### Objetivo

 Receber um arquivo e retornar texto extraído.

 ### Auth

 Obrigatória

 ### Content-Type

 multipart/form-data

 ### Campos

 #### Obrigatório

 - file — binário do arquivo

 #### Opcionais

 - preferredConverter — string
 - exemplos: calibre, libreoffice
 - filename — string
 - mimeType — string
 - formatHint — string
 - ex.: docx

 ### Exemplo cURL

 ```bash
   curl -X POST http://127.0.0.1:3010/api/extract-text \
   -H "Authorization: Bearer SEU_TOKEN" \
   -F "file=@contrato.docx" \
   -F "preferredConverter=calibre"
 ```

 ### Response 200

 ```json
   {
   "ok": true,
   "filename": "contrato.docx",
   "detectedInputType": "docx",
   "converter": "calibre",
   "text": "Conteúdo extraído do documento...",
   "meta": {
   "chars": 18432,
   "durationMs": 913,
   "warnings": []
   }
   }
 ```

 ### Response 400 — arquivo ausente

 ```json
   {
   "ok": false,
   "error": {
   "code": "MISSING_FILE",
   "message": "Field 'file' is required"
   }
   }
 ```

 ### Response 400 — tipo não suportado

 ```json
   {
   "ok": false,
   "error": {
   "code": "UNSUPPORTED_INPUT",
   "message": "Unsupported input type: xlsm"
   }
   }
 ```

 ### Response 401 — auth inválida

 ```json
   {
   "ok": false,
   "error": {
   "code": "UNAUTHORIZED",
   "message": "Invalid or missing service token"
   }
   }
 ```

 ### Response 413 — arquivo grande

 ```json
   {
   "ok": false,
   "error": {
   "code": "PAYLOAD_TOO_LARGE",
   "message": "File exceeds maximum allowed size"
   }
   }
 ```

 ### Response 500 — falha de conversão

 ```json
   {
   "ok": false,
   "error": {
   "code": "CONVERSION_FAILED",
   "message": "Failed to extract text from file"
   }
   }
 ```

 ────────────────────────────────────────────────────────────────────────────────

 3.4 POST /api/convert

 ### Objetivo

 Conversão genérica de arquivo para formato alvo.

 ### Status

 Opcional / pós-MVP

 ### Auth

 Obrigatória

 ### Request

 Multipart:
 - file
 - target
 - preferredConverter opcional

 ### Exemplo

 ```bash
   curl -X POST http://127.0.0.1:3010/api/convert \
   -H "Authorization: Bearer SEU_TOKEN" \
   -F "file=@arquivo.docx" \
   -F "target=txt"
 ```

 ### Resposta possível

 #### modo JSON

 ```json
   {
   "ok": true,
   "filename": "arquivo.txt",
   "converter": "calibre",
   "contentBase64": "SGVsbG8uLi4="
   }
 ```

 #### ou modo binário

 retorno direto do arquivo convertido com:
 - Content-Type
 - Content-Disposition

 ### Recomendação

 Para o caso RAG, não priorizar este endpoint no MVP.
 Priorizar extract-text.

 ────────────────────────────────────────────────────────────────────────────────

 3.5 Especificação de integração com n8n

 ### Chamada

 No HTTP Request node:

 - Method: POST
 - URL: http://convertx-service:3000/api/extract-text
 - Auth header:
 ```text
   Authorization: Bearer {{$env.CONVERTX_SERVICE_TOKEN}}
 ```

 - Send Binary Data: true
 - Binary Property: data
 - Content type: multipart/form-data

 ### Resposta esperada

 ```json
   {
   "ok": true,
   "text": "..."
   }
 ```

 ### Mapping seguinte

 No Set:

 ```javascript
   {{ $json.text }}
 ```

 para o campo:
 - data

 ────────────────────────────────────────────────────────────────────────────────

 Recomendação final de execução

 Ordem

 1. MVP extract-text
 2. health + auth + cleanup
 3. integração n8n
 4. testes DOCX reais
 5. só depois:
 - formats
 - convert
 - outros formatos