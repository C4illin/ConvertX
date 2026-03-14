# Verificação do INSTRUCOES_FORK.md e Plano de Execução

## 1. Verificação do documento

### Consistência com o código atual

O arquivo **INSTRUCOES_FORK.md** foi confrontado com o repositório ConvertX. Resultado:

| Aspecto | Documento | Código | Status |
|--------|-----------|--------|--------|
| Stack | Elysia, Bun | `src/index.tsx` usa Elysia, Bun | ✅ |
| handleConvert | Acoplado a UI/job/db | `src/converters/main.ts` usa `db`, `jobId`, dirs por user | ✅ |
| Assinatura handleConvert | fileNames, dirs, convertTo, converter, jobId | `handleConvert(fileNames, userUploadsDir, userOutputDir, convertTo, converterName, jobId)` | ✅ |
| Núcleo de conversão | mainConverter / conversores por engine | `mainConverter()` interno + `properties[].converter` | ✅ |
| Upload | multipart em dir user/job | `upload.tsx`: `Bun.write(userUploadsDir + sanitize(name), file)` | ✅ |
| Convert | chama handleConvert com body | `convert.tsx`: body.convert_to, file_names, jobId, user | ✅ |
| Health | existe algo básico | `healthcheck.tsx`: GET /healthcheck → `{ status: "ok" }` | ✅ (expandir) |
| Conversores DOCX→TXT | calibre, libreoffice, markitdown | `calibre`, `libreoffice`, `markitdown` em `main.ts` | ✅ |

**Conclusão:** O documento está alinhado com o código. A estratégia de extrair uma função pura de conversão e adicionar uma camada `src/api/` sem alterar agressivamente o fluxo web é viável e coerente com a estrutura atual.

### Pontos de atenção

1. **mainConverter não é exportado** — a extração pode reutilizar a mesma lógica (normalizeFiletype, properties, escolha de conversor) ou exportar/refatorar `mainConverter` com cuidado para não quebrar a UI.
2. **Cookie jobId** — em `handleConvert`, `jobId` só é usado para `query.run(jobId.value, ...)`. Uma função pura não deve receber jobId nem escrever em `file_names`.
3. **Rotas Elysia** — O app monta plugins por `.use(user).use(root).use(upload)...`. O modo service-only pode ser um branch no bootstrap: `if (SERVICE_MODE) app.use(apiRoutes); else { ... use(convert) ... }`.
4. **JWT / user** — Todas as rotas atuais passam por `userService` e auth. As rotas em `/api/*` devem usar apenas o middleware de token (Bearer), sem JWT de usuário.

---

## 2. Plano de execução

Resumo do plano em **fases e épicos**, seguindo a ordem recomendada no próprio INSTRUCOES_FORK.md (e o checklist técnico).

---

### Fase 0 — Preparação (antes de codar)

| # | Tarefa | Entregável |
|---|--------|------------|
| 0.1 | Criar fork (se ainda for o repo original) e branch `feat/service-mode-api` | Branch de trabalho |
| 0.2 | Documentar hash/tag do upstream usado | README ou doc interno |
| 0.3 | Mapear fluxo atual: upload → convert → output (onde está cada passo no código) | Doc “conversion flow map” |

**Arquivos a inspecionar:** `src/index.tsx`, `src/pages/upload.tsx`, `src/pages/convert.tsx`, `src/converters/main.ts` (já feito na verificação acima).

---

### Fase 1 — Desacoplamento (Epic B)

| # | Tarefa | Entregável |
|---|--------|------------|
| 1.1 | Extrair função backend pura de conversão (ex.: `convertSingleFile`) em `src/service/convertSingleFile.ts` | Função sem cookie/user/job/db |
| 1.2 | Criar `src/service/extractText.ts` com `resolveTextExtractor(inputType, preferredConverter?)` e `extractTextFromFile(...)` | Camada “extração de texto” reutilizável |

**Critério:** Uma chamada tipo `convertSingleFile({ inputPath, outputDir, target: 'txt', preferredConverter: 'calibre' })` deve converter e retornar `outputPath`, `converterUsed`, `target`, `durationMs`, sem tocar em SQLite nem em cookies.

---

### Fase 2 — Modo service-only (Epic C)

| # | Tarefa | Entregável |
|---|--------|------------|
| 2.1 | Introduzir `SERVICE_MODE=true|false` e no bootstrap (ex.: `src/index.tsx`) montar só health + API quando true | App sobe sem UI |
| 2.2 | Criar `src/api/auth.ts`: middleware que exige `Authorization: Bearer <SERVICE_TOKEN>` em `/api/*`; exceção para `/healthz` | Auth M2M |

**Variáveis:** `SERVICE_MODE`, `SERVICE_TOKEN`.

---

### Fase 3 — API de extração (Epic D)

| # | Tarefa | Entregável |
|---|--------|------------|
| 3.1 | GET `/healthz`: ok, service, serviceMode, converters (libreoffice, calibre, pandoc, markitdown) | Health confiável |
| 3.2 | POST `/api/extract-text`: multipart `file`, opcionais (filename, mimeType, preferredConverter, formatHint); temp dir → extração → normalização → JSON | MVP consumível pelo n8n |
| 3.3 | Módulo `src/api/utils/text.ts`: trim, newline, NUL, whitespace, limites; warnings quando texto vazio ou fallback | Texto estável para RAG |

**Contrato:** Conforme especificação de endpoints no INSTRUCOES_FORK.md (respostas 200/400/401/413/500 com `ok`, `error.code`, `error.message`).

---

### Fase 4 — Robustez (Epic E)

| # | Tarefa | Entregável |
|---|--------|------------|
| 4.1 | Temp por request: `/tmp/convertx-service/<requestId>/input|output`, sanitização de nome, cleanup em `finally`, log de falha de cleanup | Zero sujeira por request |
| 4.2 | Env: `MAX_UPLOAD_MB`, `REQUEST_TIMEOUT_MS`, `MAX_CONCURRENT_CONVERSIONS`; rejeitar tipos não suportados e payload grande; erros padronizados (PAYLOAD_TOO_LARGE, UNSUPPORTED_INPUT, CONVERSION_TIMEOUT) | Comportamento previsível |

---

### Fase 5 — Docker e operação (Epic F)

| # | Tarefa | Entregável |
|---|--------|------------|
| 5.1 | Dockerfile (ou adaptar o existente): modo service-only no start, conversores presentes, porta única | Imagem `convertx-service` |
| 5.2 | Compose exemplo: bind 127.0.0.1:3010:3000, env SERVICE_MODE, SERVICE_TOKEN, MAX_UPLOAD_MB, REQUEST_TIMEOUT_MS | Deploy repetível |

---

### Fase 6 — Integração e testes (Epics G e H)

| # | Tarefa | Entregável |
|---|--------|------------|
| 6.1 | Documentar no n8n: HTTP Request POST `/api/extract-text`, Bearer token, multipart, mapping `$json.text` | Handoff para automação |
| 6.2 | Testes: DOCX simples/acentos/tabela; arquivo inválido; extensão falsa; timeout; concorrência 2–5; cleanup após sucesso/falha; health sem auth; 401 sem token | Suíte mínima de confiança |

---

## 3. Ordem recomendada (build order)

1. **Extrair/consolidar** função backend de conversão (Fase 1).  
2. **Criar** `/api/extract-text` (Fase 3.2), usando essa função e temp dir simples.  
3. **Adicionar** auth + health (Fases 2 e 3.1) e cleanup/limites (Fase 4).  
4. **Dockerizar** modo service-only (Fase 5).  
5. **Integrar** no n8n e validar com DOCX reais (Fase 6).  
6. **Depois** considerar `/api/convert` genérico e `/api/formats` (conforme Sprint 3 do documento).

---

## 4. Definição de pronto (MVP)

O fork estará pronto para uso no n8n quando:

- [ ] POST `/api/extract-text` aceitar DOCX e devolver texto confiável.
- [ ] Token interno obrigatório em `/api/*`.
- [ ] Limpeza de temporários garantida.
- [ ] GET `/healthz` exposto.
- [ ] Container sobe sem UI (`SERVICE_MODE=true`).
- [ ] Um único HTTP Request no n8n consome o serviço e usa `$json.text`.

---

## 5. Artefatos já presentes no INSTRUCOES_FORK.md

O próprio documento já inclui os três artefatos pedidos:

1. **Checklist técnico por tarefa** — EPICs A a H com checklists e entregáveis.  
2. **ADR curta** — ADR-001 (Fork do ConvertX como serviço interno de extração de texto).  
3. **Especificação de endpoints** — GET `/healthz`, GET `/api/formats`, POST `/api/extract-text`, POST `/api/convert` (pós-MVP), com payloads e exemplos cURL/n8n.

Este arquivo (**PLANO_FORK_SERVICO.md**) serve como **verificação + plano de execução** em uma única visão, para seguir fase a fase sem perder o fio do INSTRUCOES_FORK.md.
