import React, { useState, useEffect } from 'react';

const CameraFeed = ({ videoRef, cameraActive }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if the device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i;
      
      setIsMobile(mobileRegex.test(userAgent));
    };
    
    checkMobile();
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-contain bg-black"
        style={{ 
          display: cameraActive ? 'block' : 'none',
          transform: isMobile ? 'none' : 'scaleX(-1)' // Applica la trasformazione solo su desktop
        }}
      />
    </div>
  );
};

export default CameraFeed;