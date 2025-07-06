import React from 'react';

interface GameOverlayProps {
  isGameOver: boolean;
  isLoading: boolean;
  onStart: () => void;
}

const Button: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 px-8 rounded-lg text-xl hover:from-cyan-400 hover:to-blue-500 focus:ring-4 focus:ring-cyan-400/50 focus:outline-none transition-all duration-300 transform hover:scale-105 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[250px] shadow-lg hover:shadow-cyan-500/30"
    >
        {disabled ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ) : (
            children
        )}
    </button>
);

export const GameOverlay: React.FC<GameOverlayProps> = ({ isGameOver, isLoading, onStart }) => {
  const title = isGameOver ? 'Luân Hồi Kết Thúc' : 'Tu tiên 1 click';
  const description = isGameOver
    ? "Huyền thoại của bạn đã kết thúc, nhưng Đạo là vĩnh cửu. Một hành trình mới có thể lại bắt đầu."
    : "Một thế giới của linh khí, yêu thú cổ đại và những sự thật ẩn giấu đang chờ đợi. Hãy thực hiện bước đầu tiên trên con đường tu luyện của bạn.";
  const buttonText = isGameOver ? 'Tu Luyện Lần Nữa' : 'Bắt Đầu Hành Trình';

  return (
    <div className="flex-grow flex items-center justify-center w-full">
      <div className="text-center bg-gray-900/60 backdrop-blur-md p-10 rounded-xl shadow-2xl shadow-cyan-500/20 border border-cyan-500/20 max-w-2xl animate-fade-in">
        <h2 className="text-5xl font-bold text-cyan-300 mb-4" style={{ fontFamily: "'Noto Serif', serif" }}>{title}</h2>
        <p className="text-gray-300 text-lg mb-8">{description}</p>
        <Button onClick={onStart} disabled={isLoading}>
            {buttonText}
        </Button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};