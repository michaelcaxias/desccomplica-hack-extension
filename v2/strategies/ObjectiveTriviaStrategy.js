class ObjectiveTriviaStrategy {
    type() {
        return StrategyType.OBJECTIVE_TRIVIA;
    }

    execute(vm) {
        if (typeof vm.getAlternativeClass !== 'function' || vm.__isOverridden) return;

        console.log("[Extensão] Estratégia 'OBJECTIVE TRIVIA' ativada! Sobrescrevendo...");

        vm.getAlternativeClass = function (e) {
            if (!e) return "";

            // --- LÓGICA CUSTOMIZADA AQUI ---
            if (e.correct) {
                return "question__alternative--correct-animated";
            }

            // --- MANTER COMPORTAMENTO ORIGINAL ---
            // Verifica o id da alternativa clicada na variável usada por este contexto
            if (this.exerciseAlternativeId === e.id) {
                return "question__alternative--selected";
            }

            // A variável currentQuestionReply do Trivia é acessada como uma chamada de função `()`
            if (this.currentQuestionReply && typeof this.currentQuestionReply === 'function' && this.currentQuestionReply()) {
                if (!e.correct && this.isUserAnswer(e)) {
                    return "question__alternative--incorrect";
                }
                if (e.correct) {
                    return "question__alternative--correct";
                }

                this.exerciseAlternativeId = 0;
                return "question__alternative--disabled";
            }

            return "";
        };

        vm.__isOverridden = true;
        if (vm.$forceUpdate) vm.$forceUpdate();
    }
}
