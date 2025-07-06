
import React, { useState, useEffect } from 'react';

interface ImageDisplayProps {
  imageUrl: string;
  isLoading: boolean;
  altText?: string;
}

const Spinner: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
    <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, isLoading, altText }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false); // Reset error state when image URL changes
  }, [imageUrl]);

  const getInitials = (text: string = '') => {
    if (!text) return '?';
    const words = text.trim().split(' ');
    if (words.length > 1) {
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return text.charAt(0).toUpperCase();
  }

  return (
    <div className="relative w-full h-full bg-black rounded-full shadow-2xl overflow-hidden border-4 border-cyan-500/50 transition-all duration-500 flex items-center justify-center text-center">
      {imageUrl && !hasError ? (
        <img
          key={imageUrl} 
          src={imageUrl}
          alt={altText || "Chân dung nhân vật"}
          className="w-full h-full object-cover animate-fade-in"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-serif text-3xl text-cyan-300 select-none">{getInitials(altText)}</span>
      )}
      {isLoading && <Spinner />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-full pointer-events-none"></div>
       <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-in-out;
        }
      `}</style>
    </div>
  );
};
