import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import CameraFeed from './components/CameraFeed';
import ModalResponse from './components/ModalResponse';


// Funzione di mapping per tradurre/forzare titoli
const mapTitle = (title) => {
  const mapping = {
    "Colosseum": "Colosseo",
    "The Colosseum": "Colosseo",
    "Mona Lisa": "La Gioconda",
    "The Mona Lisa": "La Gioconda",
    "Gioconda": "La Gioconda"
  };
  return mapping[title] || title;
};

const ARApp = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [cloudVisionResponse, setCloudVisionResponse] = useState(null);
  const [wikiResponse, setWikiResponse] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [candidates, setCandidates] = useState([]);

  const videoRef = useRef(null);

  const addDebugMessage = (message) => {
    setDebugInfo(prev => [...prev, { time: new Date().toLocaleTimeString(), message }]);
    console.log(`[DEBUG] ${message}`);
  };

  const fetchArtworkDetails = async (title) => {
    const url = `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Errore nella richiesta a Wikipedia");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Errore nel recuperare i dettagli dell'opera:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addDebugMessage('MediaDevices API non supportato in questo browser');
      setCameraError('La tua fotocamera non è supportata da questo browser');
    } else {
      addDebugMessage('MediaDevices API disponibile');
    }
  }, []);

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

  const captureFrameAndSendToAPI = async () => {
    if (!videoRef.current) {
      addDebugMessage("Impossibile catturare il frame: videoRef non disponibile");
      return;
    }
    addDebugMessage("Cattura frame in corso...");
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64Image = dataUrl.split(',')[1];

    const apiKey = 'AIzaSyAuGHvL8Mb83n-pmWLaBJ55L92AVl4kA3s';
    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: "WEB_DETECTION", maxResults: 5 },
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
      await processVisionResponse(data);
      setModalOpen(true);
      addDebugMessage("Risposta da Cloud Vision ricevuta");
    } catch (error) {
      addDebugMessage(`Errore in Cloud Vision: ${error.message}`);
    }
  };

  // Qui, nel ramo webDetection, invece di cercare automaticamente,
  // raccogliamo le candidate e lasciamo che l'utente scelga
  const processVisionResponse = async (data) => {
    setWikiResponse(null);
    setShowManualInput(false);
    setCandidates([]); // reset candidate list
    const responseData = data.responses && data.responses[0];
    let message = 'Nessuna rilevazione significativa';

    if (responseData) {
      if (
        responseData.webDetection &&
        responseData.webDetection.webEntities &&
        responseData.webDetection.webEntities.length > 0
      ) {
        const candidateList = responseData.webDetection.webEntities
          .filter(entity => entity.description)
          .map(entity => ({
            original: entity.description,
            mapped: mapTitle(entity.description)
          }));
        if (candidateList.length > 0) {
          setCandidates(candidateList);
          message = "Seleziona una descrizione da cercare:";
        } else {
          message = 'Web Detection ha trovato webEntities, ma nessuna description utile.';
          setShowManualInput(true);
        }
      } else if (responseData.landmarkAnnotations && responseData.landmarkAnnotations.length > 0) {
        const landmark = responseData.landmarkAnnotations[0];
        const italianTitle = mapTitle(landmark.description);
        message = `Monumento rilevato: ${landmark.description} (${italianTitle})`;
        const monumentDetails = await fetchArtworkDetails(italianTitle);
        if (monumentDetails && monumentDetails.extract) {
          message += `\nDettagli: ${monumentDetails.extract}`;
          setWikiResponse(monumentDetails);
        }
      } else if (responseData.labelAnnotations && responseData.labelAnnotations.length > 0) {
        const genericLabels = ['art', 'painting', 'sculpture', 'picture', 'canvas'];
        const specificLabels = responseData.labelAnnotations.filter(label =>
          !genericLabels.includes(label.description.toLowerCase())
        );
        if (specificLabels.length > 0) {
          const recognizedTitle = specificLabels[0].description;
          const finalTitle = mapTitle(recognizedTitle);
          message = `Opera d'arte riconosciuta: ${recognizedTitle}`;
          const artworkDetails = await fetchArtworkDetails(finalTitle);
          if (artworkDetails && artworkDetails.extract) {
            message += `\nDettagli: ${artworkDetails.extract}`;
            setWikiResponse(artworkDetails);
          }
        } else {
          const allLabels = responseData.labelAnnotations.map(label => label.description).join(', ');
          message = `Etichette rilevate: ${allLabels}\nSe stai inquadrando un'opera d'arte non identificata, inserisci manualmente il titolo:`;
          setShowManualInput(true);
        }
      } else {
        message = 'Nessun risultato da Landmark, Label o Web Detection.';
        setShowManualInput(true);
      }
    }
    setDetectionMessage(message);
    addDebugMessage(`Messaggio rilevazione: ${message}`);
  };

  // Funzione per gestire la scelta di un candidato dall'elenco
  const handleCandidateSelect = async (candidate) => {
    addDebugMessage(`Ricerca per candidato: ${candidate.mapped}`);
    const wikiDetails = await fetchArtworkDetails(candidate.mapped);
    let newMessage = detectionMessage;
    if (wikiDetails && wikiDetails.extract) {
      newMessage += `\nDettagli: ${wikiDetails.extract}`;
      setWikiResponse(wikiDetails);
    } else {
      newMessage += `\nNessun risultato specifico su Wikipedia per "${candidate.mapped}".`;
      setShowManualInput(true);
    }
    setDetectionMessage(newMessage);
    setCandidates([]); // pulisci la lista candidate dopo la scelta
  };

  const handleManualSearch = async () => {
    if (!manualTitle) return;
    addDebugMessage(`Ricerca manuale per: ${manualTitle}`);
    const details = await fetchArtworkDetails(manualTitle);
    if (details && details.extract) {
      const newMessage = `${detectionMessage}\nRisultato ricerca manuale: ${details.extract}`;
      setDetectionMessage(newMessage);
      setWikiResponse(details);
    } else {
      const newMessage = `${detectionMessage}\nNessun risultato trovato per "${manualTitle}" su Wikipedia.`;
      setDetectionMessage(newMessage);
    }
  };

  const resetCamera = () => {
    setCameraActive(false);
    addDebugMessage("Reset della camera in corso...");
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      addDebugMessage("Stream camera fermato");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header cameraActive={cameraActive} onBack={resetCamera} />
      <CameraFeed videoRef={videoRef} cameraActive={cameraActive} />
      <main className="flex-1 relative overflow-hidden">
        {cameraActive ? (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-20">
            <button onClick={captureFrameAndSendToAPI} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium">
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
        {modalOpen && cloudVisionResponse && (
          <ModalResponse
            detectionMessage={detectionMessage}
            cloudVisionResponse={cloudVisionResponse}
            wikiResponse={wikiResponse}
            manualTitle={manualTitle}
            candidates={candidates}
            onManualChange={(e) => setManualTitle(e.target.value)}
            onManualSearch={handleManualSearch}
            onCandidateSelect={handleCandidateSelect}
            onClose={() => setModalOpen(false)}
          />
        )}
      
      </main>
    </div>
  );
};

export default ARApp;