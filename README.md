# Descomplica Extension — Documentação Completa

## 📌 Objetivo

Extensão de navegador (Manifest V3) que intercepta respostas de rede da plataforma Descomplica para identificar e destacar visualmente as alternativas corretas nas questões.

---

## 🏗️ Arquitetura

```
manifest.json       → Configuração da extensão (permissões, scripts, recursos)
content.js          → Injeta o injected.js no contexto da página
injected.js         → Lógica principal (interceptação, processamento, detecção, UI)
```

### Fluxo Geral

```
Página carrega
    │
    ├─ Intercepta fetch/XHR
    │     │
    │     ├─ URL contém "assertions-corrections"
    │     │     → processAssertions()
    │     │     → Decodifica Base64, reverte string, armazena ID no Set
    │     │
    │     └─ URL contém "graphql"
    │           → processGraphQL()
    │           → Extrai dados de questões e assertions
    │           → Armazena em assertionDataMap + questionGroups
    │
    └─ Usuário clica no botão 🔍
          → detectOnPage()
          → Identifica grupo da questão → Destaca alternativa correta
```

---

## 📡 Endpoints Interceptados

### 1. `assertions-corrections`

**URL contém:** `assertions-corrections`  
**Exemplo:** `https://pegasus-pepe-legal.paas.descomplica.com.br/undergrad/questions/assertions-corrections`

**Formato da resposta:**
```json
{
  "data": [
    { "id": "MzQxOTk2Mw", "correct": false },
    { "id": "NDQxOTk2Mw", "correct": true }
  ]
}
```

**Processamento (`processAssertions`):**
1. Filtra itens com `correct: true`
2. Decodifica o `id` de Base64 (`atob`)
3. Reverte a string resultante (`.split('').reverse().join('')`)
4. Armazena no `Set<string> correctAssertionIds`

> **Exemplo:** `"MzQxOTk2Mw"` → `atob` → `"3419963"` → reverse → `"3699143"` → armazena

---

### 2. GraphQL — Questão Individual

**URL contém:** `graphql`  
**Endpoint:** `https://dex-api-schema-stitching.prd.descomplica.io/graphql`

**Formato da resposta (questão individual):**
```json
{
  "data": {
    "questionById": {
      "contentsByQuestionIdList": [
        { "textByTextId": { "body": "<p>Texto da pergunta</p>" } }
      ],
      "assertionsByQuestionIdList": [
        {
          "id": 3699143,
          "position": 0,
          "contentsByAssertionIdList": [
            { "textByTextId": { "body": "<p>Texto da alternativa</p>" } }
          ]
        }
      ]
    }
  }
}
```

### 3. GraphQL — Lista de Revisão

**Mesmo endpoint GraphQL, mas com formato diferente:**

```json
{
  "data": {
    "allLists": {
      "nodes": [
        {
          "listItemsByListId": {
            "nodes": [
              {
                "questionByQuestionId": {
                  "contentsByQuestionId": {
                    "nodes": [
                      { "textByTextId": { "body": "<p>Texto da pergunta</p>" } }
                    ]
                  },
                  "assertionsByQuestionId": {
                    "nodes": [
                      {
                        "id": 2039689,
                        "position": 0,
                        "contentsByAssertionId": {
                          "nodes": [
                            { "textByTextId": { "body": "<p>Texto da alternativa</p>" } }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

**Diferenças nos nomes dos campos:**

| Questão Individual | Lista de Revisão |
|---|---|
| `assertionsByQuestionIdList` (array) | `assertionsByQuestionId.nodes` |
| `contentsByAssertionIdList` (array) | `contentsByAssertionId.nodes` |
| `contentsByQuestionIdList` (array) | `contentsByQuestionId.nodes` |

**Processamento (`processGraphQL` → `storeQuestion`):**
1. Detecta o formato (questão individual ou lista de revisão)
2. Para cada questão, extrai:
   - Texto da pergunta → `group.questionText`
   - Assertions com ID, position e texto → `group.assertions[]`
3. Armazena no `Map assertionDataMap` (por ID) e no `Array questionGroups` (agrupado)

**Helpers de normalização de formato:**
- `getAssertions(questionData)` — extrai array de assertions de qualquer formato
- `getQuestionText(questionData)` — extrai texto da pergunta de qualquer formato
- `getAssertionContents(assertion)` — extrai conteúdo da assertion de qualquer formato

---

## 🗄️ Estruturas de Dados em Memória

| Variável | Tipo | Descrição |
|---|---|---|
| `correctAssertionIds` | `Set<string>` | IDs corretos (decodificados e revertidos) |
| `assertionDataMap` | `Map<string, {text, position}>` | Texto e posição de cada assertion por ID |
| `questionGroups` | `Array<{assertions[], questionText}>` | Assertions agrupadas por questão, com texto da pergunta |

---

## 🔍 Estratégias de Detecção

A detecção é acionada pelo botão flutuante 🔍 e opera em **dois casos** independentes, dependendo dos elementos encontrados na página.

### Caso 1: Alternativas `.question__alternative`

Funciona em **duas fases**:

#### Fase 1: Identificação do Grupo (Scoring)

Cada `questionGroup` recebe uma pontuação baseada em 3 sinais para determinar qual questão está visível na tela:

| Sinal | Peso | Descrição |
|---|---|---|
| **Text Matches** | `×10` por match | Conta quantas assertions do grupo casam textualmente com alternativas visíveis no DOM |
| **Question Words** | até `50` pontos | Extrai palavras significativas (≥3 letras) do texto da pergunta (com strip de LaTeX), verifica a proporção que aparece no `document.body.innerText` |
| **IDs no DOM** | `+100` por match | Verifica se algum ID de assertion aparece no `outerHTML` dos elementos `.question__alternative` |

O grupo com **maior score** (> 0) é selecionado como a questão atual.

**Por que scoring e não match direto?**
- Textos curtos como "2" ou "-5" casam com múltiplas questões → necessário contexto
- LaTeX (`\vec{a}`, `\frac{x}{y}`) renderiza diferente no DOM vs. source → text match falha
- Múltiplas questões podem ter o mesmo número de alternativas (tipicamente 5)

#### Fase 2: Highlight da Resposta Correta

Após identificar o grupo, para cada assertion correta do grupo selecionado:

1. **Text Match (prioridade):** Compara o texto normalizado da assertion com o `innerText` de cada alternativa. Se casar, destaca e **para** (`break`) → evita duplicatas.

2. **Position Fallback:** Se o text match falhar (questões com LaTeX/MathJax), usa o `position` da assertion para indexar diretamente no array de `.question__alternative`.

**Highlight visual:**
```css
border: 3px solid #00e676;
background-color: rgba(0, 230, 118, 0.12);
box-shadow: 0 0 12px rgba(0, 230, 118, 0.3);
```

---

### Caso 2: Select `.selector`

Para perguntas que usam `<select class="selector">` ao invés de alternativas textuais.

**Estrutura do DOM:**
```html
<select class="selector">
  <option disabled value=""></option>
  <option value="3763131">pipes e semáforos.</option>
  <option value="3763132">temporizadores e arquivos abertos.</option>
</select>
```

**Estratégia:** O `value` de cada `<option>` é o **ID da assertion** diretamente. Compara com `correctAssertionIds.has(optValue)`.

**Ação ao detectar:**
1. Auto-seleciona a opção correta (`sel.value = optValue`)
2. Dispara evento `change` com `bubbles: true` (para que o framework Vue reaja)
3. Aplica highlight visual no `<select>`

---

## 🧹 Funções de Normalização de Texto

### `stripHtml(html)`
Remove tags HTML, retorna texto puro via DOM temporário:
```javascript
const stripHtml = (html) => {
    let tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};
```

### `normalize(str)`
Normaliza strings para comparação robusta:
```javascript
const normalize = (str) => str
    .normalize('NFC')                              // Normaliza acentos (NFC)
    .replace(/[\u00a0\u200b\u200c\u200d\u2060\ufeff]/g, ' ')  // Remove caracteres invisíveis
    .replace(/\s+/g, ' ')                          // Colapsa whitespace
    .trim();
```

**Cenários que resolve:**
- `\u00a0` (non-breaking space) → espaço normal
- `\u200b` (zero-width space) → espaço normal
- Quebras de linha e tabs → espaço único
- Unicode NFC vs NFD (ex: `ã` precomposto vs `a` + `~` combinado)

### `extractWords(str)`
Extrai palavras significativas para fuzzy matching de textos com LaTeX:
```javascript
const extractWords = (str) => {
    const cleaned = str
        .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ')  // Remove \vec{...}, \frac{...}, \lambda, etc.
        .replace(/[{}\\]/g, ' ');                     // Remove chaves restantes
    return (cleaned.match(/[a-zA-ZÀ-ÿ]{3,}/g) || []).map(w => w.toLowerCase());
};
```

**Exemplo:**
```
Input:  "O desenho a seguir representa \vec{a}, \vec{b}"
Output: ["desenho", "seguir", "representa"]
```

---

## 🎨 Interface (UI)

### Botão Flutuante
- **Posição:** `fixed`, bottom-right
- **Visual:** Círculo roxo com emoji 🔍
- **Hover:** Escala 1.1x + sombra mais intensa + tooltip "Detectar Resposta"
- **Badge:** Círculo vermelho com contagem de IDs corretos armazenados

### Toast Notifications

| Tipo | Cor | Mensagem |
|---|---|---|
| `success` | Verde | "Resposta(s) correta(s) encontrada(s)!" |
| `warn` | Laranja | "Nenhuma alternativa encontrada na página atual." |
| `info` | Azul | "Nenhuma correspondência encontrada na tela atual." |

**Comportamento:** Aparece com animação slide-up, desaparece após 3 segundos.

---

## 🌐 Interceptação de Rede

### Fetch API
```javascript
window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    // Clona response, parseia JSON, chama processAssertions/processGraphQL
    return response;
};
```

### XMLHttpRequest
```javascript
XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url; // Armazena URL para uso no load
    return originalOpen.apply(this, arguments);
};
XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('load', function () {
        // Parseia responseText, chama processAssertions/processGraphQL
    });
    return originalSend.apply(this, arguments);
};
```

Ambos interceptam transparentemente sem afetar o comportamento original da página.

---

## 📋 Cenários Suportados

| # | Cenário | Formato DOM | Estratégia de Match | Fonte de Dados |
|---|---|---|---|---|
| 1 | Questão objetiva com texto simples | `.question__alternative` | Text match (includes) | `questionById` GraphQL |
| 2 | Questão com LaTeX/MathJax | `.question__alternative` | Position fallback (via scoring) | `questionById` GraphQL |
| 3 | Questão com `<select>` | `select.selector > option` | ID direto (`option.value`) | `assertions-corrections` |
| 4 | Lista de revisão com texto simples | `.question__alternative` | Text match (includes) | `allLists` GraphQL |
| 5 | Lista de revisão com LaTeX | `.question__alternative` | Position fallback (via scoring) | `allLists` GraphQL |
| 6 | Múltiplas questões (mesmo nº de alternativas) | `.question__alternative` | Scoring desambigua | question-text word match |

---

## ⚠️ Edge Cases Tratados

| Problema | Solução |
|---|---|
| LaTeX source vs. texto renderizado (ex: `\vec{a}` vs `a⃗`) | Word-based matching no scoring + position fallback |
| Whitespace inconsistente (DOM vs. API) | `normalize()` com NFC + collapse whitespace |
| Caracteres Unicode invisíveis (`\u00a0`, `\u200b`, etc.) | Substituídos por espaço normal em `normalize()` |
| Texto curto causando falsos positivos (ex: "2", "-5") | Matching por grupo (não global) → só compara dentro do grupo identificado |
| Múltiplos grupos com mesmo nº de alternativas | Scoring multi-sinal seleciona o melhor grupo |
| Dois formatos GraphQL diferentes | Helpers `getAssertions()`, `getQuestionText()`, `getAssertionContents()` |
| Questões ainda não visíveis no carregamento | Detecção on-demand via botão (não automática) |
| Framework Vue em `<select>` | `dispatchEvent(new Event('change', { bubbles: true }))` após auto-select |

---

## 📁 Estrutura de Arquivos

```
complica/
├── manifest.json        # Manifest V3 da extensão
├── content.js           # Script de conteúdo (injeta injected.js)
├── injected.js          # Lógica principal
├── answers.js           # Script auxiliar de decodificação (standalone)
├── DOCUMENTATION.md     # Este arquivo
└── EXTENSION_OBJ.md     # Documentação original do objetivo
```
