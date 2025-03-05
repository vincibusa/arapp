import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import CameraFeed from './components/CameraFeed';
import ModalResponse from './components/ModalResponse';

const ARApp = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');
  const [cloudVisionResponse, setCloudVisionResponse] = useState(null);
  const [candidates, setCandidates] = useState([]);
  // Se vuoi supportare un input manuale per il titolo
  const [manualTitle, setManualTitle] = useState('');

  const videoRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('La tua fotocamera non è supportata da questo browser');
    }
  }, []);

  const startCamera = async () => {
    setLoading(true);
    setCameraError(null);
    try {
      if (!videoRef.current) {
        throw new Error('Riferimento video non disponibile');
      }
      const constraints = { video: { facingMode: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = async () => {
        await videoRef.current.play();
        setCameraActive(true);
        setLoading(false);
      };
    } catch (error) {
      setCameraError(`Errore: ${error.message}`);
      setLoading(false);
    }
  };

  const captureFrameAndSendToGemini = async () => {
    if (!videoRef.current) {
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64Image = dataUrl.split(',')[1];

    const apiKey = 'AIzaSyAnKBOKHUdOYgQqNuKpe0Zl7basyIDG3DM'; // Sostituisci con la tua chiave API Gemini
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Costruisci il payload secondo il formato richiesto da Gemini 2.0 Flash
    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Analizza questa immagine e fornisci informazioni dettagliate."
          }
        ]
      }]
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      // Salva la risposta completa per la visualizzazione nella modale
      setCloudVisionResponse(data);
      // Se sono presenti candidate, estrai il testo generato dalla prima candidate
      if (data?.candidates && data.candidates.length > 0) {
        setDetectionMessage(data.candidates[0].content.parts[0].text);
        setCandidates(data.candidates);
      } else {
        setDetectionMessage("Nessuna informazione disponibile");
        setCandidates([]);
      }
      setModalOpen(true);
    } catch (error) {
      setDetectionMessage(`Errore nell'analisi: ${error.message}`);
      setModalOpen(true);
    }
  };

  const resetCamera = () => {
    setCameraActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header cameraActive={cameraActive} onBack={resetCamera} />
      <CameraFeed videoRef={videoRef} cameraActive={cameraActive} />
      <main className="flex-1 relative overflow-hidden">
        {cameraActive ? (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-20">
            <button onClick={captureFrameAndSendToGemini} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium">
              Cattura Frame
            </button>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center">
            <button onClick={startCamera} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium" disabled={loading}>
              {loading ? "Caricamento..." : "Avvia Camera"}
            </button>
            {cameraError && <p className="mt-4 text-red-500">{cameraError}</p>}
          </div>
        )}
        {modalOpen && (
          <ModalResponse
            detectionMessage={detectionMessage}
            cloudVisionResponse={cloudVisionResponse}
            wikiResponse={null}  // Se non hai una risposta Wikipedia, puoi passare null
            manualTitle={manualTitle}
            candidates={candidates}
            onManualChange={(e) => setManualTitle(e.target.value)}
            onManualSearch={() => console.log("Ricerca manuale:", manualTitle)}
            onCandidateSelect={(candidate) => {
              // Se l'utente seleziona una candidate, aggiorna il testo visualizzato
              setDetectionMessage(candidate.content.parts[0].text);
            }}
            onClose={() => setModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default ARApp;