import React from 'react';
import { X } from 'lucide-react';

const ModalResponse = ({
  detectionMessage,
  cloudVisionResponse,
  wikiResponse,
  manualTitle,
  candidates,
  onManualChange,
  onManualSearch,
  onCandidateSelect,
  onClose
}) => (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
    <div 
      className="absolute inset-0 bg-black opacity-50" 
      onClick={onClose}
    ></div>
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full relative z-10">
      <div className="flex justify-between items-center border-b p-4">
        <h3 className="text-lg font-bold">Risposta Cloud Vision</h3>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
          <X size={24} />
        </button>
      </div>
      <div className="p-4 overflow-auto max-h-80">
        <p className="mb-2 font-semibold text-sm whitespace-pre-line">
          {detectionMessage}
        </p>
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(cloudVisionResponse, null, 2)}
        </pre>
        {wikiResponse && (
          <div className="mt-4">
            <h4 className="font-bold text-sm">Risposta Wikipedia:</h4>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(wikiResponse, null, 2)}
            </pre>
          </div>
        )}
        {/* Se sono presenti candidate, mostra l'elenco per la scelta */}
        {candidates && candidates.length > 0 && (
          <div className="mt-4">
            <h4 className="font-bold text-sm">Seleziona la descrizione da cercare:</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {candidates.map((candidate, index) => (
                <button
                  key={index}
                  onClick={() => onCandidateSelect(candidate)}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
                >
                  {candidate.mapped}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Fallback manuale */}
        {(!candidates || candidates.length === 0) && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Inserisci il titolo dell'opera"
              value={manualTitle}
              onChange={onManualChange}
              className="border p-1 w-full mb-2 text-sm"
            />
            <button
              onClick={onManualSearch}
              className="bg-indigo-600 text-white px-4 py-2 rounded text-sm"
            >
              Cerca
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ModalResponse;