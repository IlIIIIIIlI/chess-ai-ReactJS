import React, { useState, useCallback } from "react";

const BurgerMenu = ({ onReset, onSetGameMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleAction = useCallback((action) => {
    action();
    setIsOpen(false);
  }, []);

  return (
    <div
      style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000 }}
    >
      <button
        onClick={toggleMenu}
        style={{
          background: "none",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
        }}
      >
        ☰
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: "0",
            top: "100%",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <button onClick={() => handleAction(onReset)}>New Game</button>
          <button
            onClick={() => handleAction(() => onSetGameMode("playerFirst"))}
          >
            Player First
          </button>
          <button
            onClick={() => handleAction(() => onSetGameMode("computerFirst"))}
          >
            Computer First
          </button>
          <button
            onClick={() =>
              handleAction(() => onSetGameMode("computerVsComputer"))
            }
          >
            Computer vs Computer
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(BurgerMenu);
