import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Header = ({ cameraActive, onBack }) => (
  <header className="bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between">
    {cameraActive ? (
      <button onClick={onBack} className="flex items-center text-white">
        <ArrowLeft size={24} className="mr-2" />
        <span>Indietro</span>
      </button>
    ) : (
      <h1 className="text-xl font-bold">ArtScanner</h1>
    )}
  </header>
);

export default Header;