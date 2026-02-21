class StrategyFactory {
    constructor() {
        this.strategies = [
            new QuestionStrategy(),
            new RevisionQuestionStrategy(),
            new ObjectiveTriviaStrategy(),
            new ClozeQuestionStrategy()
        ];
    }

    getStrategyByTag(tag) {
        if (!tag) {
            return null;
        }

        // Retorna a estratégia compatível baseada na tag do componente Vue
        return this.strategies.find(s => s.type() === tag) || null;
    }
}
