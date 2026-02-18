# Descomplica Answer Helper aka "O Mago"

## Objetivo
Esta extensão tem como objetivo auxiliar na identificação das respostas corretas na plataforma Descomplica. Ela funciona interceptando requisições de rede para identificar quais são as alternativas corretas e, posteriormente, localizar essas alternativas no visual da página.

## Como Funciona

### 1. Intercepção de Gabarito (`assertions-corrections`)
A extensão monitora as requisições para o endpoint `assertions-corrections`.
-   **Payload de Resposta**: Contém uma lista de objetos com `id` (codificado) e um booleano `correct`.
-   **Processamento**:
    1.  Filtra apenas os itens onde `correct: true`.
    2.  Decodifica o `id` (Base64 -> String).
    3.  Inverte a string resultante para obter o ID real da asserção.
    4.  Armazena esses IDs na memória da extensão.

### 2. Intercepção de Questões (`graphql`)
A extensão também monitora as requisições para o endpoint GraphQL `dex-api-schema-stitching.prd.descomplica.io/graphql`.
-   **Payload de Resposta**: Contém os detalhes da questão carregada, incluindo o texto de todas as alternativas (`assertionsByQuestionIdList`).
-   **Cruzamento de Dados**:
    1.  Verifica os IDs das asserções retornadas no GraphQL.
    2.  Compara com os IDs armazenados (do passo 1).
    3.  Se houver correspondência, identifica o texto da resposta correta.

### 3. Identificação Visual
Após identificar o texto da resposta correta:
-   A extensão busca elementos na página com a classe `.question__alternative`.
-   Verifica se o conteúdo desses elementos corresponde ao texto da resposta identificada.
-   Loga no console (e futuramente pode destacar visualmente) a alternativa correta encontrada.
