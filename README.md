# 🚀 Descomplica Override Suíte (V1 & V2)

Esta extensão unificada foi construída para a plataforma Aulas Descomplica, oferecendo diferentes modos de interceptação que auxiliam nos estudos através de _Auto-Select_ e detecção avançada de gabaritos diretos no front-end. O projeto agora funciona como uma **Suíte**, possuindo um menu interativo (Popup) e duas engines (códigos nucleares diferentes) que podem ser alternados em tempo de execução sem pesar no navegador.

---

<img width="419" height="572" alt="image" src="https://github.com/user-attachments/assets/1d1fef99-dc6b-486a-877a-8d88f536f8e7" />


## 💻 Como Instalar (Modo Desenvolvedor)

Siga estas instruções abaixo para instalar uma extensão local/não-oficial (_unpacked_) de forma nativa e segura baseada em seus navegadores Chromium:

### No Google Chrome / Brave / Edge:

1. Abra o navegador e acesse a página interna de extensões colando um dos links na barra de Endereçamento:
   - **Chrome:** `chrome://extensions/`
   - **Brave:** `brave://extensions/`
   - **Edge:** `edge://extensions/`
2. No canto **Superior Direito** da tela, localize e **Ligue a Chave** chamada **"Modo do desenvolvedor"** (_Developer mode_).
3. Isso fará aparecer uma nova barra de opções no topo esquerdo. Recorra ao botão e clique em **"Carregar sem compactação"** (_Load unpacked_).
4. Uma janela do seu Explorador de Arquivos local se abrirá. Navegue até o diretório exato que abraça tudo (diretório `complica-extension`) e confirme a seleção.
5. A Extensão vai nascer na sua lista de itens ativos. Fixe o ícone do Puzzle 🧩 no navegador para facilitar seu acesso a ela!

## 🖱️ Utilizando o Menu Interativo (Popup)

Ao abrir uma Lista de exercícios ou página do Descomplica, você pode clicar no ícone da nossa Extensão no seu menu superior direito!
Dentre as opções, ao ser selecionada o próprio `Service Worker` guardará a escolha nas bases de dados locais da instalação sem intervenção:
- **V2 - VueJS Observer:** Engatilha o modo avançado de Design Patterns com clicks e iluminação moderna responsiva de UX (vem por Padrão Ativado).
- **V1 - XHR Network:** Muda a "marcha" para a engine de escavação de respostas cruas API e logs profundos retrocompatível com a primeira versão desenvolvida de API Hook.
- **Desligar Extensão:** Precisa "estudar na raça" sem precisar desligar a extensão indo até opções de browser? Selecionar esse menu faz o JavaScript da plataforma simplesmente não ser interrompido e você joga limpo de acordo com as regras triviais como se fosse uma conta convencional (Recomendamos ao checar aprendizado bruto após leitura teórica de PDFs dos tutoriais)!

> **🚨 Aviso Importante ao Trocar de Versões:** As duas versões usam arquiteturas diferentes (V1 injeta na raíz antes do carregamento via mundo _ISOLATED_, e a V2 injeta no fechamento da documentação diretamente no _MAIN_ do site da Descomplica para agir no DOM já renderizado). Portanto, quando fizer uma seleção diferente no Popup Switcher, a mensagem subirá alertando que é **obrigatório atualizar a tela (F5)** atual do Descomplica de imediato para a troca do roteamento base se acomodar sem sobreposições ou quebras. 

## ⚙️ Os Motores (Architectures)

Temos dois motores disponíveis operando de formas distintas sobre o ecossistema Descomplica. Escolha pelo Popup Menu:

### 🌟 V2 - VueJS Observer (Recomendado)
A nova e brilhante versão _monkey-patching_. Ela opera diretamente no **Virtual DOM do VueJS** interceptando as funções de UI do Front-End da plataforma, sem gerar volume pesado no terminal nativo de rede (Tab _Network_), deixando as requisições HTTPS e GraphQL seguirem normalmente e hackeando apenas a renderização dos componentes na tela do estudante.

**Vantagens do Modo Atual:**
- **Invisível e Perfeito:** Injeta uma estilização CSS (Degradê Animado) suave.
- **Auto-Resposta Dinâmica:** Como um opcional apenas desse modo, após aplicar o destaque verde na interface de resposta certa nos questionários nativos (`DescoQuestions`), você pode optar por permitir a "Auto-Confirmação", fazendo a Extensão simular cliques contínuos pra você ("Responder" e "Próxima") engatando a marcha automática sobre as lições para otimização de tempo.
- **Design Pattern:** Utiliza arquitetura Limpa e Isolada (_Strategy Factory_) cobrindo nativamente e sem quebras visuais 4 tipos de cenários Descomplica: `DescoQuestions` (Exercícios da aula), `RevisionQuestion` (Listas de Revisão), `ObjectiveTrivia` (Fixações Extras) e `ClozeQuestion` (Questões Lacunares de múltiplas opões de seleção Dropdown).

### 🕰️ V1 - XHR Network (Legacy)
O projeto inicial mais antigo de Interceptação Fina de Requisições. Ele opera na etapa antes de qualquer interface, bloqueando e ouvindo o motor do _Fetch/XHR API_ para o sub-domínio das URLs do servidor Descomplica.

**Vantagens da V1:**
- Escaneia requisições GraphQl via Injeção Raw DOM antes do script interno agir, e emite log rico detalhado para os Consoles. Confiável se houver profundas mudanças estruturais na interface do VueJS para o qual as Tags da V2 percam total aderência no futuro!

---
