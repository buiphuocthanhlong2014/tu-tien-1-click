import React from 'react';
import { Item } from '../types';

interface ItemInteractionModalProps {
    item: Item;
    onClose: () => void;
    onEquip?: (item: Item) => void;
    onUnequip?: (item: Item) => void;
    onUse?: (item: Item) => void;
    onLearn?: (item: Item) => void;
    onDrop: (item: Item) => void;
    isEquipped?: boolean;
}

export const ItemInteractionModal: React.FC<ItemInteractionModalProps> = ({ item, onClose, onEquip, onUnequip, onUse, onLearn, onDrop, isEquipped = false }) => {
    
    const renderEffects = () => {
        const effects = [];
        if (item.effects.attack) effects.push(`Công: +${item.effects.attack}`);
        if (item.effects.defense) effects.push(`Thủ: +${item.effects.defense}`);
        if (item.effects.health) effects.push(`Hồi phục: +${item.effects.health} HP`);
        if (item.effects.cultivation) effects.push(`Tu vi: +${item.effects.cultivation}`);
        if (item.technique) effects.push(`Học được: "${item.technique.name}"`);

        if (effects.length === 0) return null;
        
        return (
            <div className="mt-2 text-green-400 text-sm space-y-1">
                {effects.map((e, i) => <p key={i}>{e}</p>)}
            </div>
        );
    }

    const itemTypeDisplay = (type: string) => {
        return type.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in-fast" onClick={onClose}>
            <div className="panel-bg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-serif text-yellow-300">{item.name}</h3>
                <p className="text-sm text-cyan-400 mb-1">[{itemTypeDisplay(item.type)}]</p>
                <p className="text-gray-300 italic mb-4">"{item.description}"</p>
                {renderEffects()}
                
                <div className="mt-6 space-y-2">
                    {isEquipped && onUnequip && (
                        <button onClick={() => { onUnequip(item); onClose(); }} className="w-full btn btn-warning">Gỡ Trang Bị</button>
                    )}
                    {!isEquipped && onEquip && (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') && (
                        <button onClick={() => { onEquip(item); onClose(); }} className="w-full btn btn-primary">Trang Bị</button>
                    )}
                    {!isEquipped && onUse && item.type === 'consumable' && (
                         <button onClick={() => { onUse(item); onClose(); }} className="w-full btn btn-secondary">Sử Dụng</button>
                    )}
                    {!isEquipped && onLearn && item.type === 'techniqueScroll' && (
                         <button onClick={() => { onLearn(item); onClose(); }} className="w-full btn btn-secondary">Học</button>
                    )}
                    {!isEquipped && <button onClick={() => { onDrop(item); onClose(); }} className="w-full btn btn-dark">Vứt Bỏ</button>}
                </div>

                <button onClick={onClose} className="mt-4 w-full text-gray-400 hover:text-white transition py-1">Đóng</button>
            </div>
        </div>
    );
};
