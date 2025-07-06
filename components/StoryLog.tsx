import React, { useRef, useEffect } from 'react';
import { EventLogEntry } from '../types';

interface EventLogPanelProps {
  eventLog: EventLogEntry[];
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({ eventLog }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom (most recent) on new event
     logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  return (
    <div className="flex-grow min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20 rounded-lg border border-gray-700/50">
          {eventLog.map((entry) => (
            <div key={entry.id} className="animate-slide-up">
              <p className={`text-sm ${entry.isMajor ? 'text-cyan-400 font-semibold' : 'text-gray-400'}`}>Năm {entry.year}</p>
              <p className={`leading-relaxed ${entry.isMajor ? 'text-lg text-yellow-300' : 'text-gray-200'}`}
                  dangerouslySetInnerHTML={{ __html: entry.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            </div>
          )).reverse()}
        <div ref={logEndRef} />
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};