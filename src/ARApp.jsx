import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';

const ARApp = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [cloudVisionResponse, setCloudVisionResponse] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');

  const videoRef = useRef(null);

  // Funzione per aggiungere messaggi di debug
  const addDebugMessage = (message) => {
    setDebugInfo((prev) => [...prev, { time: new Date().toLocaleTimeString(), message }]);
    console.log(`[DEBUG] ${message}`);
  };

  // Funzione per ottenere i dettagli dell'opera da Wikipedia in italiano
  const fetchArtworkDetails = async (title) => {
    const url = `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Errore nella richiesta a Wikipedia");
      }
      const data = await response.json();
      return data; // contiene campi come title, extract, thumbnail, ecc.
    } catch (error) {
      console.error("Errore nel recuperare i dettagli dell'opera:", error);
      return null;
    }
  };

  // Verifica se la MediaDevices API è supportata
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addDebugMessage('MediaDevices API non supportato in questo browser');
      setCameraError('La tua fotocamera non è supportata da questo browser');
    } else {
      addDebugMessage('MediaDevices API disponibile');
    }
  }, []);

  // Avvia la camera (con constraint per la fotocamera posteriore)
  const startCamera = async () => {
    setLoading(true);
    setCameraError(null);
    addDebugMessage('Tentativo di accesso alla fotocamera...');
    
    try {
      if (!videoRef.current) {
        throw new Error('Riferimento video non disponibile');
      }
      
      const constraints = { video: { facingMode: 'environment' } };
      addDebugMessage(`Richiesta stream con constraints: ${JSON.stringify(constraints)}`);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream.getVideoTracks().length === 0) {
        throw new Error('Nessuna traccia video disponibile nello stream');
      }
      
      addDebugMessage(`Stream ottenuto con ${stream.getVideoTracks().length} tracce video`);
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = () => {
        addDebugMessage(`Video metadata caricato: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
      };
      
      videoRef.current.onplaying = () => {
        addDebugMessage('Video in riproduzione');
        setCameraActive(true);
        setLoading(false);
      };
      
      await videoRef.current.play();
      addDebugMessage('Play video avviato');
      
    } catch (error) {
      addDebugMessage(`Errore nell'avvio della fotocamera: ${error.message}`);
      setCameraError(`Errore: ${error.message}`);
      setLoading(false);
    }
  };

  // Cattura un frame dal video e lo invia a Google Cloud Vision
  const captureFrameAndSendToAPI = async () => {
    if (!videoRef.current) {
      addDebugMessage("Impossibile catturare il frame: videoRef non disponibile");
      return;
    }
    addDebugMessage("Cattura frame in corso...");
    const video = videoRef.current;
    
    // Crea un canvas offscreen per catturare il frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Converte il canvas in una stringa base64
    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64Image = dataUrl.split(',')[1];
    
    // Sostituisci con la tua API key di Google Cloud Vision
    const apiKey = 'YOUR_API_KEY_HERE';
    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: "LABEL_DETECTION", maxResults: 5 },
            { type: "LANDMARK_DETECTION", maxResults: 5 }
          ]
        }
      ]
    };

    try {
      addDebugMessage("Invio frame a Google Cloud Vision...");
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );
      const data = await response.json();
      setCloudVisionResponse(data);
      // Attendi l'elaborazione della risposta
      await processVisionResponse(data);
      setModalOpen(true);
      addDebugMessage("Risposta da Cloud Vision ricevuta");
    } catch (error) {
      addDebugMessage(`Errore in Cloud Vision: ${error.message}`);
    }
  };

  // Funzione per analizzare la risposta e determinare se si tratta di un monumento o di un'opera d'arte
  const processVisionResponse = async (data) => {
    const responseData = data.responses && data.responses[0];
    let message = 'Nessuna rilevazione significativa';
    if (responseData) {
      // Se è presente il landmarkAnnotations, consideriamo che si tratti di un monumento
      if (responseData.landmarkAnnotations && responseData.landmarkAnnotations.length > 0) {
        const landmark = responseData.landmarkAnnotations[0];
        message = `Monumento rilevato: ${landmark.description}`;
      } 
      // Altrimenti controlla le etichette per opere d'arte
      else if (responseData.labelAnnotations && responseData.labelAnnotations.length > 0) {
        // Definisci alcune etichette generiche da escludere
        const genericLabels = ['art', 'painting', 'sculpture', 'picture', 'canvas'];
        // Filtra le etichette non generiche per ottenere un titolo specifico
        const specificLabels = responseData.labelAnnotations.filter(label =>
          !genericLabels.includes(label.description.toLowerCase())
        );
        if (specificLabels.length > 0) {
          const artworkTitle = specificLabels[0].description;
          message = `Opera d'arte riconosciuta: ${artworkTitle}`;
          // Prova a ottenere dettagli da Wikipedia (in italiano)
          const artworkDetails = await fetchArtworkDetails(artworkTitle);
          if (artworkDetails && artworkDetails.extract) {
            message += `\nDettagli: ${artworkDetails.extract}`;
          }
        } else {
          message = `Etichette rilevate: ${responseData.labelAnnotations.map(label => label.description).join(', ')}`;
        }
      }
    }
    setDetectionMessage(message);
    addDebugMessage(`Messaggio rilevazione: ${message}`);
  };

  // Ferma la camera e resetta lo stream
  const resetCamera = () => {
    setCameraActive(false);
    addDebugMessage("Reset della camera in corso...");
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      addDebugMessage("Stream camera fermato");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between">
        {cameraActive ? (
          <button onClick={resetCamera} className="flex items-center text-white">
            <ArrowLeft size={24} className="mr-2" />
            <span>Indietro</span>
          </button>
        ) : (
          <h1 className="text-xl font-bold">ArtScanner</h1>
        )}
      </header>

      {/* Video di background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-contain bg-black"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
      </div>

      {/* Corpo principale */}
      <main className="flex-1 relative overflow-hidden">
        {cameraActive ? (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-20">
            <button
              onClick={captureFrameAndSendToAPI}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium"
            >
              Cattura Frame
            </button>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center">
            <button
              onClick={startCamera}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium"
              disabled={loading}
            >
              {loading ? "Caricamento..." : "Avvia Camera"}
            </button>
            {cameraError && <p className="mt-4 text-red-500">{cameraError}</p>}
          </div>
        )}

        {/* Modale per mostrare la risposta di Cloud Vision */}
        {modalOpen && cloudVisionResponse && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div 
              className="absolute inset-0 bg-black opacity-50" 
              onClick={() => setModalOpen(false)}
            ></div>
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full relative z-10">
              <div className="flex justify-between items-center border-b p-4">
                <h3 className="text-lg font-bold">Risposta Cloud Vision</h3>
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-80">
                <p className="mb-2 font-semibold text-sm">{detectionMessage}</p>
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(cloudVisionResponse, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Pannello Debug */}
        <div className="absolute bottom-2 left-2 right-2 bg-white bg-opacity-90 rounded p-2 z-40 max-h-32 overflow-auto">
          <h3 className="font-bold mb-1 text-sm">Debug Info:</h3>
          <div className="text-xs">
            {debugInfo.slice(-10).map((item, index) => (
              <div key={index}>
                <span className="text-gray-500">{item.time}</span>: {item.message}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ARApp;