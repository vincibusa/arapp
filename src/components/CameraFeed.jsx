import React from 'react';

const CameraFeed = ({ videoRef, cameraActive }) => (
  <div className="absolute inset-0 z-0">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 h-full w-full object-contain bg-black"
      style={{ 
        display: cameraActive ? 'block' : 'none',
        transform: 'scaleX(-1)' // Specchia il video sull'asse x
      }}
    />
  </div>
);

export default CameraFeed;