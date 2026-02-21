class ClozeQuestionStrategy {
    type() {
        return StrategyType.CLOZE_QUESTION;
    }

    execute(vm) {
        if (vm.__isOverridden || vm.replyState == "correct") return;

        console.log("[Extensão] Estratégia 'CLOZE QUESTION' ativada! Preenchendo select...");

        // Aguarda a renderização dos componentes internos
        setTimeout(() => {
            // Verifica se o modelo do Vue contém a lista de alternativas e injeta-o direto na UI
            if (vm.question && Array.isArray(vm.question.alternatives)) {
                // Filtra as propriedades e encontra qual é o ID da resposta verdadeira
                const correctAlt = vm.question.alternatives.find(alt => alt.correct);

                if (correctAlt) {
                    // Preenche o campo select visualmente manipulando o DOM para garantir a alteração visual
                    if (vm.$el) {
                        const selectElement = vm.$el.querySelector('select');
                        if (selectElement && selectElement.value !== String(correctAlt.id)) {
                            selectElement.value = correctAlt.id;
                            // Envia um Evento que notifica aos listeners do Vue (como o v-model) que a opção mudou
                            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        // Aplica o Box-Shadow de degradê e o tom em toda a caixa (já que não há o `li` aqui)
                        vm.$el.classList.add('question__alternative--correct-animated');
                    }

                    // Emite o gatilho principal de evento que a própria documentação apontou em ($listeners: select: ƒ) apontando o id coreto para os dados do pai
                    vm.$emit('select', correctAlt.id);
                }
            }
        }, 300); // 300ms de preempção garantam que o HTML carregou totalmente as caixas e IDs

        vm.__isOverridden = true;
    }
}
