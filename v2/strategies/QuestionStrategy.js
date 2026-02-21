class QuestionStrategy {
    type() {
        return StrategyType.QUESTION;
    }

    execute(vm) {
        if (typeof vm.getAlternativeClass !== 'function' || vm.__isOverridden) return;

        console.log("[Extensão] Estratégia 'QUESTION' ativada! Sobrescrevendo...");

        // Guarda escopo Real do Strategy
        const self = this;

        vm.getAlternativeClass = function (e) {
            if (!e) return "";

            // --- LÓGICA CUSTOMIZADA AQUI ---
            if (e.correct) {
                // Bloqueia o loop infinito de getter. Ativa as sub-rotinas agendadas uma vez por questão.
                if (vm.__lastCorrectId !== e.id) {
                    vm.__lastCorrectId = e.id;
                    setTimeout(() => self.handleSelectAlternative(), 100);
                }

                return "question__alternative--correct-animated";
            }

            // --- MANTER COMPORTAMENTO ORIGINAL ---
            if (this.currentAlternativeId === e.id) {
                return "question__alternative--selected";
            }

            if (this.currentQuestionReply) {
                if (!e.correct && this.isUserAnswer(e)) {
                    return "question__alternative--incorrect";
                }
                if (e.correct) {
                    return "question__alternative--correct";
                }

                this.currentAlternativeId = 0;
                return "question__alternative--disabled";
            }

            return "";
        };

        vm.__isOverridden = true;
        if (vm.$forceUpdate) vm.$forceUpdate();
    }

    handleSelectAlternative() {
        const correctEl = document.querySelector('.question__alternative--correct-animated');
        if (correctEl) correctEl.click();

        // Roteamento para a flag de Auto-Responder (Se ativada no popup)
        const isAutoModeParam = document.documentElement.dataset.descoAutoConfirm;
        if (isAutoModeParam === 'true') {
            setTimeout(() => this.handleSubmitAnswer(), 250);
        }
    }

    handleSubmitAnswer() {
        const submitBtn = document.querySelector('.btn-primary.button--wide--enabled');

        if (submitBtn) {
            submitBtn.click();
            // Após enviar, espera o painel dizer se acertou e clica na 'Próxima' (que herda '.btn-primary...)
            setTimeout(() => this.handleNextQuestion(), 700);
        }
    }

    // --- Métodos Auxiliares de Auto-Avanço (Executados via Timeout) ---
    handleNextQuestion() {
        const nextBtn = document.querySelector('.btn-primary.button--wide--enabled');
        if (nextBtn) {
            nextBtn.click();
        }
    }
}
