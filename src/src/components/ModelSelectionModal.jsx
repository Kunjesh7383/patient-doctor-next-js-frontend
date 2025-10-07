import React, { useState, useEffect } from 'react';

const models = [
  { id: 'ollama', name: 'Ollama' },
  { id: 'groq', name: 'Groq' },
];

const ModelSelectionModal = ({ isOpen, onClose, onConfirm }) => {
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedModel(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (selectedModel) {
      const chosenModel = models.find(m => m.id === selectedModel);
      onConfirm(chosenModel);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">Select a Model</h2>
        <p className="text-gray-600 mb-6">Choose one of the available models to proceed.</p>

        <div className="space-y-4">
          {models.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`flex cursor-pointer items-center space-x-4 rounded-lg border-2 p-4 transition-all
                  ${isSelected
                    ? 'border-[#bface3] bg-[#bface3]/20 ring-2 ring-[#bface3]/40'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 
                    ${isSelected ? 'border-[#bface3] bg-[#bface3]' : 'border-gray-400'}`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className={`font-semibold ${isSelected ? 'text-[#bface3]' : 'text-gray-700'}`}>
                  {model.name}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedModel}
          className="my-3 w-full rounded-lg bg-[#bface3] py-3 text-lg font-semibold text-white transition hover:bg-[#a99bd4] disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
};

export default ModelSelectionModal;
