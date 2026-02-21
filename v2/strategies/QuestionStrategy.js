class QuestionStrategy {
    type() {
        return StrategyType.QUESTION;
    }

    execute(vm) {
        if (typeof vm.getAlternativeClass !== 'function' || vm.__isOverridden) return;

        console.log("[Extensão] Estratégia 'QUESTION' ativada! Sobrescrevendo...");

        vm.getAlternativeClass = function (e) {
            if (!e) return "";

            // --- LÓGICA CUSTOMIZADA AQUI ---
            if (e.correct) {
                setTimeout(() => {
                    const correctEl = document.querySelector('.question__alternative--correct-animated');
                    if (correctEl) correctEl.click();
                }, 100);

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
}
