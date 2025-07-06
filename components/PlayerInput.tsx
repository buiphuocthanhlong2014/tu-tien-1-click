import React from 'react';
import { Player, SecretRealm } from '../types';

interface GameControlsProps {
  onNextYear: () => void;
  onTravel: () => void;
  onOpenShop: () => void;
  isLoading: boolean;
  error: string | null;
  disabled: boolean;
  hasTraveledThisYear: boolean;
  player: Player | null;
  activeSecretRealm: SecretRealm | null;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNextYear, onTravel, onOpenShop, isLoading, error, disabled, hasTraveledThisYear, player, activeSecretRealm }) => {
  let nextYearButtonText = 'Trải qua nửa năm';
  if (activeSecretRealm) {
    nextYearButtonText = `Thám Hiểm (${activeSecretRealm.progress + 1}/${activeSecretRealm.duration} lượt)`;
  } else if (player?.activeQuest && player.currentLocation === player.activeQuest.location) {
    const quest = player.activeQuest;
    nextYearButtonText = `Làm nhiệm vụ (${quest.progress + 1}/${quest.duration} lượt)`;
  }

  const canVisitShop = player?.currentLocation === 'Thành Trấn';

  return (
    <div className="pt-4 border-t border-gray-700/50">
       {error && <p className="text-red-400 text-sm mb-2 text-center animate-pulse">{error}</p>}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onTravel}
          disabled={isLoading || disabled || hasTraveledThisYear || !!activeSecretRealm}
          className="btn btn-warning w-full sm:w-auto"
        >
          Di Chuyển
        </button>
        {canVisitShop && (
             <button
                onClick={onOpenShop}
                disabled={isLoading || disabled || !!activeSecretRealm}
                className="btn btn-shop w-full sm:w-auto"
                >
                Cửa Hàng
            </button>
        )}
        <button
          onClick={onNextYear}
          disabled={isLoading || disabled}
          className="btn btn-primary w-full sm:w-auto flex-grow max-w-xs text-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Kiến tạo...
            </div>
          ) : (
            nextYearButtonText
          )}
        </button>
      </div>
    </div>
  );
};