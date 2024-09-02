import React from "react";

const AIModelSelector = ({ aiModels, setAIModel, gameMode }) => {
  const handleModelChange = (color, model) => {
    setAIModel(color, model);
  };

  return (
    <div style={{ marginBottom: "10px" }}>
      {(gameMode === "playerFirst" || gameMode === "computerVsComputer") && (
        <div>
          <label htmlFor="black-ai-model">Black AI Model: </label>
          <select
            id="black-ai-model"
            value={aiModels.b}
            onChange={(e) => handleModelChange("b", e.target.value)}
          >
            <option value="minimax">Minimax</option>
            <option value="astar">A*</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
      )}
      {(gameMode === "computerFirst" || gameMode === "computerVsComputer") && (
        <div>
          <label htmlFor="white-ai-model">White AI Model: </label>
          <select
            id="white-ai-model"
            value={aiModels.w}
            onChange={(e) => handleModelChange("w", e.target.value)}
          >
            <option value="minimax">Minimax</option>
            <option value="astar">A*</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default AIModelSelector;
