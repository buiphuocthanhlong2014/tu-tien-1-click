
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player, Item, EventLogEntry, YearlyEvent, EventChoice, ActiveQuest, Quest, Difficulty, Opponent, Tournament, RankEntry, Match, NPC, RelationshipStatus, SectChoice, ItemType, Gender, SecretRealm, Auction, AuctionItem } from '../types';
import { GeminiService, REALMS, LOCATIONS, CharacterCreationOptions, SECTS, TALENTS } from '../services/geminiService';
import { ImageDisplay } from './ImageDisplay';

type FamilyChoice = 'thương nhân' | 'võ gia' | 'suy tàn';

// --- Reusable Panel Component ---
export const InfoPanel: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; className?: string }> = ({ title, children, onClose, className = '' }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
        <div className={`panel-bg p-4 sm:p-6 w-full mx-2 sm:mx-4 ${className}`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl sm:text-3xl font-serif text-cyan-300 text-center mb-4 sm:mb-6">{title}</h2>
            <div className="text-gray-300 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2 sm:pr-3">{children}</div>
            <button onClick={onClose} className="mt-4 sm:mt-6 w-full bg-gray-700/80 text-white py-2 rounded-md hover:bg-gray-600/80 transition-colors">Đóng</button>
        </div>
    </div>
);


// --- New UI Components ---
export const MainMenu: React.FC<{
    onStart: () => void;
    onContinue: () => void;
    onImport: () => void;
    onShowInstructions: () => void;
    onShowUpdateLog: () => void;
    onShowApiKeySetup: () => void;
    hasLocalSave: boolean;
    apiKeySet: boolean;
}> = ({ onStart, onContinue, onImport, onShowInstructions, onShowUpdateLog, onShowApiKeySetup, hasLocalSave, apiKeySet }) => (
    <div className="flex-grow flex items-center justify-center w-full">
      <div className="text-center bg-gray-900/60 backdrop-blur-md p-6 sm:p-10 rounded-xl shadow-2xl shadow-cyan-500/20 border border-cyan-500/20 w-full max-w-md animate-fade-in">
        <h1 className="text-4xl sm:text-6xl font-bold text-cyan-300 mb-2 font-serif">Tu tiên 1 click</h1>
        <p className="text-gray-400 text-base sm:text-lg mb-8">Rèn luyện con đường đến sự bất tử</p>
        <div className="space-y-3 flex flex-col items-center">
            <button onClick={onStart} disabled={!apiKeySet} className="btn btn-primary w-full max-w-xs">Bắt đầu trò chơi</button>
            <button onClick={onContinue} disabled={!hasLocalSave || !apiKeySet} className="btn btn-secondary w-full max-w-xs">Chơi tiếp</button>
            <button onClick={onImport} disabled={!apiKeySet} className="btn btn-secondary w-full max-w-xs">Nhập file</button>
            <div className="pt-4 w-full">
              <button onClick={onShowInstructions} className="btn btn-dark w-full max-w-xs">Hướng dẫn</button>
              <button onClick={onShowUpdateLog} className="btn btn-dark w-full max-w-xs mt-2">Cập nhật</button>
              <button onClick={onShowApiKeySetup} className="btn btn-warning w-full max-w-xs mt-2">Thiết lập API Key</button>
            </div>
            {!apiKeySet && <p className="text-yellow-400 text-xs pt-2">Vui lòng thiết lập API Key để bắt đầu!</p>}
            <p className="text-gray-500 text-xs pt-4">game được làm ra bởi Tiểu Sếch, chơi free thoải mái, có donate thì mình cảm ơn</p>
        </div>
      </div>
    </div>
);

export const CharacterCreationPanel: React.FC<{ onStartGame: (options: CharacterCreationOptions & { difficulty: Difficulty }) => void; onBack: () => void; }> = ({ onStartGame, onBack }) => {
    const [name, setName] = useState('');
    const [gender, setGender] = useState<Gender>('Nam');
    const [difficulty, setDifficulty] = useState<Difficulty>('trung bình');
    const [talents, setTalents] = useState<{ [key: string]: string | null }>({
        [Object.keys(TALENTS)[0]]: 'tam'
    });
    const [family, setFamily] = useState<FamilyChoice>('thương nhân');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [sect, setSect] = useState<SectChoice>('thiên kiếm');
    const [nsfwAllowed, setNsfwAllowed] = useState(false);

    const handleTalentClick = (category: string, talentId: string) => {
        setTalents(prev => {
            const isMandatory = category.includes('(Bắt buộc)');
            const currentSelection = prev[category];
            let newSelection = isMandatory ? talentId : (currentSelection === talentId ? null : talentId);
            return { ...prev, [category]: newSelection };
        });
    };

    const handleRandomize = () => {
        const difficulties: Difficulty[] = ['đơn giản', 'trung bình', 'khó', 'ác mộng'];
        const families: FamilyChoice[] = ['thương nhân', 'võ gia', 'suy tàn'];
        const sects: SectChoice[] = ['thiên kiếm', 'vạn dược', 'huyền phù'];
        setDifficulty(difficulties[Math.floor(Math.random() * difficulties.length)]);
        setFamily(families[Math.floor(Math.random() * families.length)]);
        setSect(sects[Math.floor(Math.random() * sects.length)]);
        const newRandomTalents: { [key: string]: string | null } = {};
        Object.entries(TALENTS).forEach(([category, talentList]) => {
            const isMandatory = category.includes('(Bắt buộc)');
            newRandomTalents[category] = isMandatory || Math.random() > 0.5 
                ? talentList[Math.floor(Math.random() * talentList.length)].id 
                : null;
        });
        setTalents(newRandomTalents);
    };

    const OptionCard: React.FC<{ title: string; description: string; isSelected: boolean; onClick: () => void; className?: string }> = ({ title, description, isSelected, onClick, className = '' }) => (
        <button
            onClick={onClick}
            className={`p-3 text-left rounded-lg border-2 w-full transition-all duration-200 h-full ${isSelected ? 'bg-cyan-900/70 border-cyan-400 shadow-cyan-500/20 shadow-md' : 'bg-gray-800/60 border-gray-600 hover:bg-gray-700/70'} ${className}`}
        >
            <h4 className={`font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>{title}</h4>
            <p className="text-xs text-gray-400">{description}</p>
        </button>
    );

    const handleStart = () => {
        const selectedTalentIds = Object.values(talents).filter(Boolean) as string[];
        onStartGame({ name: name || 'Vô Danh', gender, difficulty, talents: selectedTalentIds, family, avatarUrl, sect, nsfwAllowed });
    };

    return (
        <div className="w-full max-w-7xl mx-auto panel-bg p-4 sm:p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-center items-center mb-6 gap-4">
                <h2 className="text-3xl sm:text-4xl font-serif text-cyan-300 text-center">Tạo Hóa Chi Lộ</h2>
                <button onClick={handleRandomize} className="btn btn-warning py-1 px-3 text-sm" title="Ngẫu nhiên hóa các lựa chọn lối chơi">Thiên Mệnh An Bài</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- IDENTITY & SECT COLUMN --- */}
                <div className="space-y-6">
                    <fieldset className="p-4">
                        <legend>Thân Phận</legend>
                        <div>
                            <label className="block text-lg font-semibold text-yellow-300 mb-2">Tên</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" className="w-full input-base"/>
                        </div>
                        <div>
                            <label className="block text-lg font-semibold text-yellow-300 mb-2 mt-4">Ảnh Đại Diện</label>
                            <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Dán URL hình ảnh (tùy chọn)" className="w-full input-base"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-300 mb-2 mt-4">Giới Tính</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <OptionCard title="Nam" description="Nhân vật nam" isSelected={gender === 'Nam'} onClick={() => setGender('Nam')} />
                                <OptionCard title="Nữ" description="Nhân vật nữ" isSelected={gender === 'Nữ'} onClick={() => setGender('Nữ')} />
                            </div>
                        </div>
                    </fieldset>
                    <fieldset className="p-4">
                        <legend>Tông Môn</legend>
                        <div className="grid grid-cols-1 gap-3">
                            {(Object.keys(SECTS) as SectChoice[]).map(sectKey => (
                                <OptionCard 
                                    key={sectKey}
                                    title={SECTS[sectKey].name} 
                                    description={SECTS[sectKey].description}
                                    isSelected={sect === sectKey} 
                                    onClick={() => setSect(sectKey)} />
                            ))}
                        </div>
                    </fieldset>
                </div>

                {/* --- GAMEPLAY COLUMN --- */}
                <div className="space-y-6">
                    <fieldset className="p-4">
                        <legend>Lối Chơi</legend>
                        <div>
                            <h3 className="font-semibold text-gray-300 mb-2">Độ Khó</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <OptionCard title="Đơn giản" description="Tài nguyên x1.2" isSelected={difficulty === 'đơn giản'} onClick={() => setDifficulty('đơn giản')} />
                                <OptionCard title="Trung bình" description="Trải nghiệm gốc" isSelected={difficulty === 'trung bình'} onClick={() => setDifficulty('trung bình')} />
                                <OptionCard title="Khó" description="Tài nguyên x0.8" isSelected={difficulty === 'khó'} onClick={() => setDifficulty('khó')} />
                                <OptionCard title="Ác mộng" description="Tài nguyên x0.6" isSelected={difficulty === 'ác mộng'} onClick={() => setDifficulty('ác mộng')} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="font-semibold text-gray-300 mb-2">Gia Tộc</h3>
                            <div className="grid grid-cols-1 gap-2">
                               <OptionCard title="Thương Nhân" description="+500 Linh thạch" isSelected={family === 'thương nhân'} onClick={() => setFamily('thương nhân')} />
                               <OptionCard title="Võ Gia" description="+10% HP tối đa" isSelected={family === 'võ gia'} onClick={() => setFamily('võ gia')} />
                               <OptionCard title="Suy Tàn" description="Công pháp mạnh hơn" isSelected={family === 'suy tàn'} onClick={() => setFamily('suy tàn')} />
                            </div>
                        </div>
                         <div className="pt-4">
                            <label className="flex items-center space-x-3 cursor-pointer p-2 bg-gray-800/60 rounded-lg hover:bg-gray-700/70">
                                <input type="checkbox" checked={nsfwAllowed} onChange={(e) => setNsfwAllowed(e.target.checked)} className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-500"/>
                                <span className="text-gray-300">Bật nội dung 18+</span>
                            </label>
                        </div>
                    </fieldset>
                </div>

                {/* --- TALENTS COLUMN --- */}
                <div className="space-y-4">
                     <fieldset className="p-4 h-full">
                        <legend>Thiên Phú</legend>
                        {Object.entries(TALENTS).map(([category, talentsInCategory]) => (
                            <div key={category} className="mb-4">
                                <h3 className="font-semibold text-gray-300 mb-2">{category}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {talentsInCategory.map(t => (
                                        <OptionCard
                                            key={t.id}
                                            title={t.name}
                                            description={t.description}
                                            isSelected={talents[category] === t.id}
                                            onClick={() => handleTalentClick(category, t.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </fieldset>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button onClick={onBack} className="btn btn-dark py-3 px-6 w-full sm:w-auto">Quay lại</button>
                <button onClick={handleStart} className="btn btn-primary py-3 px-8 text-lg w-full sm:w-auto">Bắt Đầu Tu Luyện</button>
            </div>
        </div>
    );
};


export const ApiKeySetupPanel: React.FC<{ onSave: (key: string) => void; onClose: () => void; }> = ({ onSave, onClose }) => {
    const [key, setKey] = useState('');
    return (
        <InfoPanel title="Thiết lập API Key" onClose={onClose} className="max-w-lg">
            <p>Để chơi, bạn cần cung cấp Google AI API Key. Key của bạn sẽ được lưu trữ an toàn trên trình duyệt này và không được gửi đi bất cứ đâu ngoài Google.</p>
            <p>Bạn có thể nhận key miễn phí tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Google AI Studio</a></p>
            <input 
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Dán API Key của bạn vào đây"
                className="w-full input-base mt-4"
            />
            <button onClick={() => onSave(key)} className="mt-4 w-full btn btn-secondary">Lưu và Đóng</button>
        </InfoPanel>
    );
};

export const InstructionsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <InfoPanel title="Hướng dẫn" onClose={onClose} className="max-w-2xl">
        <h3 className="text-xl font-semibold text-yellow-300">Mục Tiêu</h3>
        <p>Bắt đầu từ một tu sĩ Luyện Khí, mục tiêu của bạn là tu luyện để đột phá qua các cảnh giới cao hơn, trở thành một tồn tại bất tử.</p>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Đột Phá Cảnh Giới</h3>
        <p>Khi tu vi của bạn đạt đến giới hạn, bạn sẽ có cơ hội đối mặt với Lôi Kiếp để đột phá. Đây là một quá trình đầy rủi ro với tỷ lệ thành công nhất định. Thành công sẽ đưa bạn lên một tầm cao mới, nhưng thất bại sẽ khiến tu vi của bạn bị thụt lùi và bản thân bị trọng thương. Hãy chuẩn bị kỹ lưỡng!</p>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Đấu Giá Hội</h3>
        <p>Cứ 20 năm một lần, Đấu Giá Hội sẽ được tổ chức tại Giao Lưu Phường. Đây là nơi bạn có thể tìm thấy những vật phẩm cực kỳ quý hiếm không có ở cửa hàng thông thường. Hãy chuẩn bị linh thạch và cạnh tranh với các tu sĩ khác để sở hữu chúng.</p>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Thọ Nguyên & Đại Hội</h3>
        <p>Mỗi cảnh giới có một giới hạn tuổi thọ (thọ nguyên). Hãy chú ý đột phá trước khi thọ nguyên cạn kiệt! Ngoài ra, Đại Hội Thiên Kiêu diễn ra mỗi 50 năm là cơ hội để bạn khẳng định tên tuổi và giành phần thưởng lớn.</p>
    </InfoPanel>
);

export const UpdateLogPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
     <InfoPanel title="Nhật Ký Cập Nhật" onClose={onClose} className="max-w-2xl">
        <h3 className="text-xl font-semibold text-yellow-300">Phiên bản 16.0.0 - "Tối Ưu & Sửa Lỗi"</h3>
        <ul className="list-disc pl-5 space-y-2">
             <li><strong>Sửa lỗi quan trọng:</strong> Khắc phục lỗi khiến bộ đếm thời gian làm mới cửa hàng và các sự kiện khác có thể hiển thị số âm.</li>
             <li><strong>Tối Ưu Hóa Giao Diện Di Động:</strong>
                <ul className="list-disc pl-5">
                    <li>- Giao diện người dùng đã được tối ưu hóa toàn diện để đảm bảo trải nghiệm mượt mà và trực quan trên các thiết bị di động.</li>
                    <li>- Các màn hình chính, tạo nhân vật, bản đồ, cửa hàng và các bảng thông tin khác đã được điều chỉnh để hiển thị tốt trên màn hình nhỏ.</li>
                    <li>- Cải thiện bố cục và khả năng tương tác trên các thiết bị cảm ứng.</li>
                </ul>
             </li>
        </ul>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Phiên bản 15.0.0 - "Truyền Âm Phù"</h3>
        <ul className="list-disc pl-5 space-y-2">
             <li><strong>Hệ thống Truyền Âm Phù:</strong> Thêm tính năng cho phép người chơi và các NPC thân thiết ({'>'}100 hảo cảm) chủ động liên lạc với nhau qua tin nhắn.</li>
             <li><strong>Tương tác mới:</strong> Trong bảng "Nhân Mạch", bạn có thể chủ động "Gửi Truyền Âm" để bắt đầu hội thoại, tăng cường mối quan hệ.</li>
             <li><strong>Sự kiện ngẫu nhiên mới:</strong> Các NPC thân thiết giờ đây có thể ngẫu nhiên gửi tin nhắn cho bạn, tạo ra các sự kiện đời thường và cơ hội phát triển tình cảm.</li>
        </ul>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Phiên bản 14.0.0 - "Nhân Duyên & Giao Diện"</h3>
        <ul className="list-disc pl-5 space-y-2">
             <li><strong>NPC Chi Tiết Hơn:</strong> 4 NPC ban đầu đã được viết lại với cốt truyện và tính cách sâu sắc hơn.</li>
             <li><strong>Thêm 4 NPC Mới:</strong> Thế giới tu tiên chào đón 4 thiên kiêu mới (3 nữ, 1 nam), mỗi người một vẻ, mang đến những mối quan hệ và cơ duyên mới.</li>
             <li><strong>Tối Ưu Giao Diện:</strong>
                <ul className="list-disc pl-5">
                    <li>- <strong>Tạo Nhân Vật:</strong> Màn hình tạo nhân vật được thiết kế lại hoàn toàn, khoa học và đẹp mắt hơn.</li>
                    <li>- <strong>Nhân Mạch:</strong> Giao diện quản lý mối quan hệ được nâng cấp thành dạng thẻ bài hiện đại, có ảnh đại diện và thanh trạng thái, giúp theo dõi trực quan hơn.</li>
                    <li>- <strong>Bảng Thông Tin:</strong> Tối ưu hóa bảng thông tin nhân vật trong game, giúp dễ đọc và theo dõi các chỉ số hơn.</li>
                </ul>
             </li>
        </ul>
    </InfoPanel>
);

export const GeniusRankingPanel: React.FC<{ ranking: RankEntry[], onClose: () => void }> = ({ ranking, onClose }) => (
    <InfoPanel title="Bảng Xếp Hạng Thiên Kiêu" onClose={onClose} className="max-w-2xl">
        {ranking.length === 0 ? (
            <p>Chưa có ai được ghi danh trên Bảng Xếp Hạng Thiên Kiêu. Hãy trở thành nhà vô địch đầu tiên!</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[400px]">
                    <thead>
                        <tr className="border-b border-yellow-400/30">
                            <th className="p-2 text-yellow-300">Hạng</th>
                            <th className="p-2 text-yellow-300">Tên</th>
                            <th className="p-2 text-yellow-300">Thành Tựu</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranking.map(entry => (
                            <tr key={entry.rank} className="border-b border-gray-700">
                                <td className="p-2 font-bold">{entry.rank}</td>
                                <td className="p-2">{entry.name}</td>
                                <td className="p-2 text-sm">{entry.achievement} (Năm {Math.floor(entry.year - 15)})</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </InfoPanel>
);

const RelationshipProgressBar: React.FC<{ points: number }> = ({ points }) => {
    const min = -100; // Tử Địch
    const max = 250; // Max for visual representation, capped at Bạn Đời
    const normalizedPoints = Math.max(min, Math.min(points, max));
    const percentage = ((normalizedPoints - min) / (max - min)) * 100;

    let colorClass = 'bg-gray-400'; // Xa lạ
    if (points >= 200) colorClass = 'bg-rose-500'; // Bạn đời
    else if (points >= 100) colorClass = 'bg-sky-400'; // Tri kỷ
    else if (points >= 75) colorClass = 'bg-green-500'; // Thân thiết
    else if (points >= 25) colorClass = 'bg-teal-400'; // Bạn bè
    else if (points <= -75) colorClass = 'bg-purple-600'; // Tử địch
    else if (points <= -25) colorClass = 'bg-red-500'; // Kẻ thù

    return (
        <div className="w-full bg-slate-700 rounded-full h-2">
            <div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export const RelationshipPanel: React.FC<{ npcs: NPC[], player: Player, onClose: () => void, onUpdateAvatar: (npcId: string, url: string) => void, onStartConversation: (npcId: string) => void }> = ({ npcs, player, onClose, onUpdateAvatar, onStartConversation }) => {
    const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
    const [tempAvatarUrl, setTempAvatarUrl] = useState('');

    const handleEditStart = (npc: NPC) => {
        setEditingNpcId(npc.id);
        setTempAvatarUrl(npc.avatarUrl || '');
    };

    const handleSave = () => {
        if (editingNpcId) {
            onUpdateAvatar(editingNpcId, tempAvatarUrl);
            setEditingNpcId(null);
        }
    };

    const handleCancel = () => {
        setEditingNpcId(null);
    };
    
    const getStatusColor = (status: RelationshipStatus, isLover: boolean) => {
        if (isLover) return 'text-rose-400';
        switch(status) {
            case 'Tử địch': return 'text-purple-400';
            case 'Kẻ thù': return 'text-red-400';
            case 'Bạn bè': return 'text-teal-400';
            case 'Thân thiết': return 'text-green-400';
            case 'Tri kỷ':
            case 'Bạn đời': return 'text-sky-400';
            default: return 'text-gray-400';
        }
    }

    return (
        <InfoPanel title="Nhân Mạch" onClose={onClose} className="max-w-4xl">
            {npcs.length === 0 && player.pets.length === 0 ? (
                <p>Bạn chưa có mối quan hệ hay đồng hành nào đáng chú ý.</p>
            ) : (
                <>
                    {npcs.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {npcs.map(npc => (
                                <div key={npc.id} className="flex items-start gap-4 p-4 bg-slate-800/60 rounded-lg border border-cyan-400/20">
                                    <div className="w-20 h-20 shrink-0">
                                        {editingNpcId === npc.id ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 rounded-lg p-1 gap-1">
                                                <input
                                                    type="text"
                                                    value={tempAvatarUrl}
                                                    onChange={(e) => setTempAvatarUrl(e.target.value)}
                                                    className="w-full text-xs p-1 rounded bg-gray-700 border border-gray-500 text-white"
                                                    placeholder="URL ảnh"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                                />
                                                <div className="flex gap-1">
                                                    <button onClick={handleSave} className="text-xs px-2 py-0.5 bg-green-600 hover:bg-green-500 rounded text-white">Lưu</button>
                                                    <button onClick={handleCancel} className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-500 rounded text-white">Hủy</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative group w-full h-full">
                                                <ImageDisplay imageUrl={npc.avatarUrl || ''} isLoading={false} altText={npc.name} />
                                                <button onClick={() => handleEditStart(npc)} className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Chỉnh sửa ảnh của ${npc.name}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                               <h4 className="text-xl font-semibold text-yellow-300">{npc.name}</h4>
                                               <p className="text-sm text-cyan-400 mb-1">{npc.realm} ({npc.gender})</p>
                                            </div>
                                            <span className={`font-bold ${getStatusColor(npc.status, npc.isLover)}`}>{player.spouseId === npc.id ? 'Bạn Đời' : npc.status}</span>
                                        </div>
                                        <RelationshipProgressBar points={npc.relationshipPoints} />
                                        <p className="text-xs italic text-gray-500 mt-2 h-16 overflow-y-auto custom-scrollbar pr-2">"{npc.description}"</p>
                                         {npc.relationshipPoints >= 100 && (
                                            <button onClick={() => onStartConversation(npc.id)} className="mt-2 text-xs py-1 px-3 bg-cyan-600/50 hover:bg-cyan-500/60 border border-cyan-400/30 rounded-full text-cyan-200 transition-colors">
                                                Gửi Truyền Âm
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                     {player.pets.length > 0 && (
                        <>
                            <h3 className="text-2xl font-serif text-cyan-300 mt-6 border-t border-cyan-400/20 pt-4">Sủng Vật</h3>
                            <div className="space-y-4">
                                {player.pets.map(pet => (
                                    <div key={pet.id} className="p-3 bg-gray-800/60 rounded-lg border border-cyan-400/20">
                                        <h4 className="text-xl font-semibold text-yellow-300">{pet.name} <span className="text-base font-normal text-gray-400">({pet.species})</span></h4>
                                        <p className="text-sm italic text-gray-400 mb-2">"{pet.description}"</p>
                                        {pet.effects.cultivationBonusPerYear && <p className="text-sm text-green-400">+ {pet.effects.cultivationBonusPerYear * 2} Tu vi mỗi năm</p>}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </InfoPanel>
    );
};

// --- Icon Components ---
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>;
const CoinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-.567-.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.766 1.324 2.242.28.182.566.324.876.434v1.698a2.5 2.5 0 001.676-.662C11.398 11.766 12 11.009 12 10c0-.99-.602-1.766-1.324-2.242A4.535 4.535 0 0010 7.092V5z" clipRule="evenodd" /></svg>;
const SwordIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6.598 4.002l-1.03-4.002m-1.03 4.002l1.03-4.002m1.164 2.002H9.25M15 21h-3.25m-.836-5.002l-3.21-3.21m3.21 3.21l3.21-3.21m0 0l-3.21-3.21m3.21 3.21L21 12.75M4 11.25l1.03 4.002m1.03-4.002L4 11.25m0 0l-1.03-4.002M4 11.25h2.5m-2.5 0l-1.03-4.002m9.402-1.164A2.5 2.5 0 0013 5.5a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5c0-.17-.017-.336-.05-.495l1.101 1.101m-1.101-1.101L13 8m2.5-2.5l-1.101 1.101" /></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const BagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;

// --- Main Game Components ---
export const UpcomingEventsPanel: React.FC<{
    nextTournamentIn: number;
    nextAuctionIn: number;
    nextShopRefreshIn: number;
}> = ({ nextTournamentIn, nextAuctionIn, nextShopRefreshIn }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="panel-bg p-3 mt-4 text-sm shrink-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left font-serif text-cyan-300"
                aria-expanded={isOpen}
            >
                <h4 className="text-lg">Sự Kiện Sắp Tới</h4>
                <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="space-y-1 text-gray-300 animate-fade-in-fast mt-2">
                    <div className="flex justify-between">
                        <span>Đại Hội Thiên Kiêu:</span>
                        <span className="font-bold text-amber-300">{Math.ceil(nextTournamentIn)} năm</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Đấu Giá Hội:</span>
                        <span className="font-bold text-yellow-300">{Math.ceil(nextAuctionIn)} năm</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Làm mới Cửa Hàng:</span>
                        <span className="font-bold text-purple-300">{Math.ceil(nextShopRefreshIn)} năm</span>
                    </div>
                </div>
            )}
        </div>
    );
};


export const QuestTracker: React.FC<{ quest: ActiveQuest }> = ({ quest }) => {
    const progressPercentage = quest.duration > 0 ? (quest.progress / quest.duration) * 100 : 0;
    return (
        <div className="p-3 bg-gray-900/60 rounded-lg border border-yellow-500/30">
            <h4 className="text-yellow-300 font-semibold text-center font-serif">Nhiệm Vụ</h4>
            <p className="text-lg text-white font-bold text-center">{quest.title}</p>
            <p className="text-sm text-gray-400 italic text-center mb-2">"{quest.description}"</p>
            <div className="text-sm">
                <p><strong>Tiến độ:</strong> {quest.progress} / {quest.duration} lượt</p>
                <div className="w-full bg-gray-700/80 rounded-full h-3 my-1 border border-yellow-500/30 overflow-hidden">
                    <div className="bg-yellow-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p><strong>Phần thưởng:</strong> {quest.reward.linhThach ?? 0} Linh Thạch</p>
            </div>
        </div>
    );
};

export const SecretRealmTracker: React.FC<{ realm: SecretRealm }> = ({ realm }) => {
    const progressPercentage = realm.duration > 0 ? (realm.progress / realm.duration) * 100 : 0;
    return (
        <div className="p-3 bg-gray-900/60 rounded-lg border border-purple-500/30">
            <h4 className="text-purple-300 font-semibold text-center font-serif">Bí Cảnh</h4>
            <p className="text-lg text-white font-bold text-center">{realm.name}</p>
            <p className="text-sm text-gray-400 italic text-center mb-2">"{realm.description}"</p>
            <div className="text-sm">
                <p><strong>Tiến độ:</strong> {realm.progress} / {realm.duration} lượt</p>
                <div className="w-full bg-gray-700/80 rounded-full h-3 my-1 border border-purple-500/30 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p><strong>Phần thưởng khi hoàn thành:</strong> {realm.reward.cultivation ?? 0} Tu vi, {realm.reward.linhThach ?? 0} Linh Thạch</p>
            </div>
        </div>
    );
};

export const MapPanel: React.FC<{ currentLocation: string; onTravel: (location: string) => void; onClose: () => void; }> = ({ currentLocation, onTravel, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
        <div className="panel-bg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-serif text-cyan-300 text-center mb-6">Bản Đồ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LOCATIONS.map(location => (
                    <button 
                        key={location.id}
                        onClick={() => onTravel(location.name)}
                        disabled={currentLocation === location.name}
                        className="p-4 bg-gray-800/60 rounded-md hover:bg-gray-700/70 border-2 border-transparent hover:border-cyan-400/50 disabled:bg-cyan-900/50 disabled:cursor-not-allowed disabled:text-cyan-200 transition-all duration-200 text-center"
                    >
                        <h3 className="text-xl font-semibold text-yellow-300">{location.name}</h3>
                        <p className="text-gray-400 text-sm">{location.description}</p>
                    </button>
                ))}
            </div>
             <button onClick={onClose} className="mt-6 w-full btn btn-dark">Đóng</button>
        </div>
    </div>
);

const StatDisplay: React.FC<{ icon: React.ReactNode; label: string; value: string | number; className?: string; }> = ({ icon, label, value, className = '' }) => (
    <div className={`flex items-center space-x-2 bg-slate-800/50 p-2 rounded-lg flex-grow ${className}`}>
        <div className="text-cyan-300">{icon}</div>
        <div>
            <div className="text-xs text-gray-400">{label}</div>
            <div className="text-md font-bold text-white">{value}</div>
        </div>
    </div>
);

const StatusBar: React.FC<{ player: Player }> = ({ player }) => {
    const healthPercentage = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 100;
    const cultivationPercentage = player.cultivationForNextRealm > 0 ? (player.cultivation / player.cultivationForNextRealm) * 100 : 100;

    return (
         <div className="space-y-2">
             <div title="Sinh mệnh">
                <div className="w-full bg-slate-900 rounded-full h-5 border border-red-500/30 overflow-hidden flex items-center">
                    <div className="bg-red-500 h-full transition-all duration-500 flex items-center justify-end px-2" style={{ width: `${healthPercentage}%` }}>
                       <HeartIcon />
                    </div>
                </div>
                 <p className="text-xs text-center text-red-200 mt-1">{player.health} / {player.maxHealth}</p>
             </div>
             <div title="Tu vi">
                <div className="w-full bg-slate-900 rounded-full h-2.5 border border-cyan-500/30 overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${cultivationPercentage}%` }}></div>
                </div>
                <p className="text-xs text-center text-cyan-200 mt-1">{Math.floor(player.cultivation)} / {player.cultivationForNextRealm} (cảnh giới kế)</p>
             </div>
        </div>
    );
};

const CharacterSheet: React.FC<{ player: Player; npcs: NPC[]; activeSecretRealm: SecretRealm | null; }> = ({ player, npcs, activeSecretRealm }) => {
    const currentRealmDetails = REALMS.find(r => r.name === player.realm);
    const yearsLeft = currentRealmDetails ? currentRealmDetails.maxAge - player.age : Infinity;
    const spouse = player.spouseId ? npcs.find(n => n.id === player.spouseId) : null;
    const yearsLeftColor = yearsLeft < 10 ? 'text-red-400 animate-pulse' : yearsLeft < 50 ? 'text-yellow-400' : 'text-gray-400';
    
    const allTalentsFlat = Object.values(TALENTS).flat();
    const playerTalentNames = player.talents.map(id => allTalentsFlat.find(t => t.id === id)?.name).filter(Boolean);

    return (
        <div className="space-y-4 text-sm">
             <div className="flex flex-wrap gap-2">
                <StatDisplay icon={<SwordIcon />} label="Công" value={player.stats.attack} />
                <StatDisplay icon={<ShieldIcon />} label="Thủ" value={player.stats.defense} />
                <StatDisplay icon={<CoinIcon />} label="Linh Thạch" value={player.linhThach} />
            </div>

            <div className="space-y-2 text-base">
                <p><span className="font-semibold text-gray-400">Tông Môn:</span> {player.sect} - <span className="text-amber-300">{player.sectRank}</span></p>
                <p><span className="font-semibold text-gray-400">Vị trí:</span> {player.currentLocation}</p>
                <p><span className="font-semibold text-gray-400">Tuổi:</span> {player.age} <span className={`text-xs ${yearsLeftColor}`}>({yearsLeft < Infinity ? `còn ${Math.ceil(yearsLeft)} năm` : 'vô hạn'})</span></p>
                 {spouse && <p><span className="font-semibold text-gray-400">Đạo Lữ:</span> <span className="text-pink-400">{spouse.name}</span></p>}
                
                <div className="pt-2">
                    <p className="font-semibold text-gray-400">Thiên phú:</p>
                    <p className="text-xs text-purple-300">{playerTalentNames.join(' | ')}</p>
                </div>
                 {player.cultivationTechnique && ( 
                 <div>
                    <p className="font-semibold text-gray-400">Công Pháp:</p>
                    <p className="text-xs text-green-300" title={player.cultivationTechnique.description}>{player.cultivationTechnique.name} ({player.cultivationTechnique.rank})</p>
                </div>)}
            </div>
            <div className="min-h-[124px] pt-2">
                {activeSecretRealm ? <SecretRealmTracker realm={activeSecretRealm} /> : (player.activeQuest && <QuestTracker quest={player.activeQuest} />)}
            </div>
        </div>
    );
};

const ItemButton: React.FC<{ item: Item | null; label: string; onClick: (item: Item) => void }> = ({ item, label, onClick }) => (
    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-md">
        <span className="text-gray-400 font-semibold">{label}:</span>
        {item ? (
            <button onClick={() => onClick(item)} className="text-left text-green-300 hover:text-green-200 hover:underline truncate ml-2 flex-1">
                {item.name}
            </button>
        ) : (
            <span className="text-gray-500 italic ml-2">Không có</span>
        )}
    </div>
);

const InventoryDisplay: React.FC<{ player: Player; onItemClick: (item: Item) => void; }> = ({ player, onItemClick }) => (
    <div className="space-y-3">
        <div>
            <h4 className="text-gray-400 font-semibold pt-2">Túi đồ ({player.inventory.length})</h4>
            <div className="space-y-1 text-sm mt-2 pr-1">
                {player.inventory.length > 0 ? player.inventory.map(item => (
                    <button key={item.id} onClick={() => onItemClick(item)} className="w-full text-left p-2 rounded-md bg-slate-800/50 hover:bg-slate-700 transition-colors block">
                        <p className="text-gray-300 font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.type.replace(/([A-Z])/g, ' $1')}</p>
                    </button>
                )) : <p className="text-gray-500 italic mt-2">Trống</p>}
            </div>
        </div>
    </div>
);


export const PlayerInfoPanel: React.FC<{ player: Player; npcs: NPC[]; onItemClick: (item: Item, isEquipped: boolean) => void; activeSecretRealm: SecretRealm | null; }> = ({ player, npcs, onItemClick, activeSecretRealm }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'inventory'>('info');

    const TabButton: React.FC<{label: string; name: 'info' | 'inventory'; icon: React.ReactNode}> = ({label, name, icon}) => (
         <button onClick={() => setActiveTab(name)} className={`flex-1 flex items-center justify-center gap-2 py-2 font-semibold transition-all duration-300 border-b-4 ${activeTab === name ? 'text-cyan-300 border-cyan-400' : 'text-gray-500 border-transparent hover:text-cyan-400 hover:border-cyan-400/50'}`}>
            {icon}
            <span>{label}</span>
        </button>
    )

    return (
        <div className="panel-bg flex flex-col flex-grow min-h-0">
            <div className="p-4 space-y-3">
                <div className="flex flex-row gap-4 items-center">
                    <div className="relative w-20 h-20 shrink-0">
                        <ImageDisplay imageUrl={player.avatarUrl} isLoading={false} altText={player.name} />
                    </div>
                    <div className="flex-grow min-w-0">
                        <h2 className="text-2xl text-yellow-300 font-serif truncate" title={player.name}>{player.name}</h2>
                        <p className="text-md text-cyan-200">{player.realm} <span className="text-gray-400">({player.gender})</span></p>
                    </div>
                </div>
                <StatusBar player={player}/>
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex border-b border-white/10 mx-4">
                    <TabButton label="Thông Tin" name="info" icon={<InfoIcon />}/>
                    <TabButton label="Hành Trang" name="inventory" icon={<BagIcon />} />
                </div>
                <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                    {activeTab === 'info' ? <CharacterSheet player={player} npcs={npcs} activeSecretRealm={activeSecretRealm} /> : (
                         <div>
                             <h4 className="text-gray-400 font-semibold mb-2">Trang bị</h4>
                             <div className="space-y-2">
                                 <ItemButton item={player.equipment.weapon} label="Vũ khí" onClick={(item) => onItemClick(item, true)} />
                                 <ItemButton item={player.equipment.armor} label="Giáp" onClick={(item) => onItemClick(item, true)} />
                                 <ItemButton item={player.equipment.accessory} label="Phụ kiện" onClick={(item) => onItemClick(item, true)} />
                             </div>
                             <InventoryDisplay player={player} onItemClick={(item) => onItemClick(item, false)} />
                         </div>
                    )}
                </div>
            </div>
        </div>
    )
}


export const EventChoicePanel: React.FC<{ event: YearlyEvent, onSelectChoice: (choice: EventChoice) => void }> = ({ event, onSelectChoice }) => (
    <div className="pt-4 border-t border-gray-700/50 animate-fade-in">
      <p className="text-gray-300 mb-4 text-center italic" dangerouslySetInnerHTML={{ __html: event.description }} />
      <div className="grid grid-cols-1 gap-3">
        {event.choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => onSelectChoice(choice)}
            className="w-full btn btn-event"
          >
            {choice.text}
            {choice.successChance !== undefined && (
                <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                    {choice.successChance}% Thành Công
                </span>
            )}
          </button>
        ))}
      </div>
    </div>
);

export const ConversationPanel: React.FC<{
    conversation: { npcId: string; event: YearlyEvent },
    onClose: () => void,
    onSelectChoice: (choice: EventChoice) => void
}> = ({ conversation, onClose, onSelectChoice }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in-fast" onClick={onClose}>
            <div className="panel-bg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-serif text-cyan-300 mb-4 text-center">Truyền Âm Phù</h3>
                <div className="pt-4 border-t border-gray-700/50">
                    <p className="text-gray-300 mb-4 text-center italic" dangerouslySetInnerHTML={{ __html: conversation.event.description }} />
                    <div className="grid grid-cols-1 gap-3">
                        {conversation.event.choices.map((choice, index) => (
                            <button
                                key={index}
                                onClick={() => onSelectChoice(choice)}
                                className="w-full btn btn-event"
                            >
                                {choice.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TournamentPanel: React.FC<{ tournament: Tournament; player: Player; event: YearlyEvent | null; onSelectChoice: (choice: EventChoice) => void; }> = ({ tournament, player, event, onSelectChoice }) => {
    const roundNames = ["Tứ kết", "Bán kết", "Chung kết"];
    
    const renderName = (p: Player | Opponent) => {
        if ('title' in p) return `${p.name} - ${p.title}`;
        return p.name;
    }

    return (
        <div className="panel-bg flex flex-col flex-grow min-h-0 p-6 animate-fade-in">
            <h2 className="text-4xl font-serif text-yellow-300 text-center mb-4">Đại Hội Thiên Kiêu - Năm {Math.floor(tournament.year - 15)}</h2>
            <div className="flex-grow flex md:flex-row flex-col gap-4">
                {/* Bracket */}
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                    {tournament.bracket.map((round, roundIndex) => (
                        <div key={roundIndex}>
                            <h3 className="text-lg text-yellow-200 font-semibold mb-2">{roundNames[roundIndex]}</h3>
                            <div className="space-y-2">
                                {round.map((match, matchIndex) => {
                                    const p1Won = match.winner === 'player1';
                                    const p2Won = match.winner === 'player2';
                                    return (
                                        <div key={matchIndex} className="bg-gray-800/50 p-2 rounded-md text-sm flex justify-between items-center">
                                            <div>
                                                <p className={p1Won ? 'font-bold text-green-400' : p2Won ? 'text-gray-500 line-through' : ''}>{renderName(match.player1)}</p>
                                                <p className={p2Won ? 'font-bold text-green-400' : p1Won ? 'text-gray-500 line-through' : ''}>{renderName(match.player2)}</p>
                                            </div>
                                            {match.winner && <span className="text-xs font-bold text-green-400">✓</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Current Match Event */}
                <div className="flex-1 flex flex-col justify-center items-center md:border-l-2 border-yellow-500/20 md:pl-4">
                    {event && <EventChoicePanel event={event} onSelectChoice={onSelectChoice} />}
                </div>
            </div>
        </div>
    );
};

export const ShopPanel: React.FC<{
    player: Player;
    inventory: Item[];
    onClose: () => void;
    onBuy: (item: Item) => void;
    onSell: (item: Item) => void;
}> = ({ player, inventory, onClose, onBuy, onSell }) => {
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const playerItemsToSell = player.inventory.filter(item => {
        const equippedIds = Object.values(player.equipment).filter(Boolean).map(i => i!.id);
        return !equippedIds.includes(item.id);
    });

    const TabButton: React.FC<{label: string; name: 'buy' | 'sell'}> = ({label, name}) => (
         <button onClick={() => setActiveTab(name)} className={`flex-1 py-2 text-lg font-semibold transition-colors duration-300 border-b-4 ${activeTab === name ? 'text-cyan-300 border-cyan-400' : 'text-gray-500 border-transparent hover:text-cyan-400 hover:border-cyan-400/30'}`}>
            {label}
        </button>
    );

    const ItemRow: React.FC<{item: Item, isBuying: boolean}> = ({ item, isBuying }) => {
        const canAfford = isBuying && item.cost ? player.linhThach >= item.cost : true;
        const sellPrice = Math.floor((item.cost ?? 10) * 0.4);
        
        return (
            <div className="flex items-center p-3 bg-gray-800/60 rounded-lg border border-cyan-400/10 flex-wrap sm:flex-nowrap">
                <div className="flex-grow mb-2 sm:mb-0">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-gray-400 italic">"{item.description}"</p>
                </div>
                <div className="text-right ml-0 sm:ml-4 shrink-0 w-full sm:w-auto">
                    <p className="font-bold text-yellow-300">
                         {isBuying ? item.cost : sellPrice} Linh Thạch
                    </p>
                    <button 
                        onClick={() => isBuying ? onBuy(item) : onSell(item)}
                        disabled={!canAfford}
                        className={`mt-1 text-sm py-1 px-3 rounded-md transition-colors w-full sm:w-auto ${isBuying ? 'btn-secondary' : 'btn-warning'} disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                       {isBuying ? 'Mua' : 'Bán'}
                    </button>
                </div>
            </div>
        )
    };

    return (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="panel-bg p-0 max-w-3xl w-full mx-4 flex flex-col" style={{height: '90vh'}} onClick={(e) => e.stopPropagation()}>
                <div className="p-4 sm:p-6">
                     <h2 className="text-3xl sm:text-4xl font-serif text-cyan-300 text-center">Cửa Hàng Thành Trấn</h2>
                     <p className="text-center text-yellow-300">Linh Thạch: {player.linhThach}</p>
                </div>
                <div className="flex border-b border-white/10 px-4 sm:px-6">
                    <TabButton label="Mua" name="buy"/>
                    <TabButton label="Bán" name="sell"/>
                </div>
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-3">
                        {activeTab === 'buy' && (
                            inventory.length > 0
                                ? inventory.map(item => <ItemRow key={item.id} item={item} isBuying={true} />)
                                : <p className="text-center text-gray-500 italic">Cửa hàng hiện không có gì để bán.</p>
                        )}
                        {activeTab === 'sell' && (
                           playerItemsToSell.length > 0 
                                ? playerItemsToSell.map(item => <ItemRow key={item.id} item={item} isBuying={false} />)
                                : <p className="text-center text-gray-500 italic">Túi đồ của bạn trống rỗng.</p>
                        )}
                    </div>
                </div>
                <div className="p-4 sm:p-6 border-t border-white/10">
                    <button onClick={onClose} className="w-full btn btn-dark">Rời khỏi</button>
                </div>
            </div>
        </div>
    );
};

export const AuctionPanel: React.FC<{
    player: Player;
    auction: Auction;
    onClose: () => void;
    onPlaceBid: () => void;
    onPass: () => void;
}> = ({ player, auction, onClose, onPlaceBid, onPass }) => {
    const currentAuctionItem = auction.items[auction.currentItemIndex];
    const logEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [auction.log]);

    if (!currentAuctionItem) return null;

    const renderItemEffects = (item: Item) => {
        const effects = [];
        if (item.effects.attack) effects.push(`Công: +${item.effects.attack}`);
        if (item.effects.defense) effects.push(`Thủ: +${item.effects.defense}`);
        if (item.effects.health) effects.push(`Hồi phục: +${item.effects.health} HP`);
        if (item.effects.cultivation) effects.push(`Tu vi: +${item.effects.cultivation}`);
        if (item.technique) effects.push(`Học được: "${item.technique.name}"`);
        if (effects.length === 0) return null;
        return (
            <div className="mt-2 text-sm space-y-1 text-green-300">
                {effects.map((e, i) => <p key={i}>{e}</p>)}
            </div>
        );
    };

    const nextBid = Math.ceil(currentAuctionItem.currentBid * 1.1);
    const canAfford = player.linhThach >= nextBid;
    
    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="panel-bg max-w-4xl w-full mx-2 flex flex-col" style={{height: '90vh'}} onClick={(e) => e.stopPropagation()}>
                <div className="p-4 text-center border-b-2 border-yellow-500/30">
                     <h2 className="text-3xl md:text-4xl font-serif text-yellow-300">Đấu Giá Hội</h2>
                     <p className="text-base md:text-lg text-cyan-200">Năm {Math.floor(auction.year - 15)}</p>
                     <p className="text-yellow-200 mt-1">Linh thạch: {player.linhThach}</p>
                </div>
                
                <div className="flex-grow grid md:grid-cols-2 grid-cols-1 min-h-0">
                    {/* Item Info */}
                    <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-cyan-400/20 flex flex-col">
                        <h3 className="text-xl md:text-2xl text-cyan-300 font-semibold">Vật phẩm {auction.currentItemIndex + 1} / {auction.items.length}</h3>
                        <div className="mt-4 p-4 rounded-lg bg-black/20 flex-grow">
                            <h4 className="text-2xl md:text-3xl font-serif text-yellow-300">{currentAuctionItem.item.name}</h4>
                            <p className="italic text-gray-400 mt-1 mb-3">"{currentAuctionItem.item.description}"</p>
                            {renderItemEffects(currentAuctionItem.item)}
                        </div>
                    </div>
                    
                    {/* Bidding Area */}
                    <div className="p-4 md:p-6 flex flex-col">
                        <div className="flex-grow space-y-4">
                            <div>
                                <p className="text-gray-400">Giá khởi điểm</p>
                                <p className="text-2xl text-white">{currentAuctionItem.startingBid} Linh Thạch</p>
                            </div>
                             <div>
                                <p className="text-gray-400">Giá hiện tại</p>
                                <p className="text-3xl md:text-4xl font-bold text-yellow-300">{currentAuctionItem.currentBid} Linh Thạch</p>
                                <p className="text-sm text-cyan-200">
                                    {currentAuctionItem.highestBidderName ? `Giữ giá: ${currentAuctionItem.highestBidderName}` : 'Chưa có ai ra giá'}
                                </p>
                            </div>
                            <div className="h-32 bg-black/30 rounded-lg p-2 overflow-y-auto custom-scrollbar flex flex-col-reverse">
                                <div ref={logEndRef} />
                                <div className="space-y-1 text-sm">
                                    {auction.log.slice().reverse().map((msg, i) => <p key={i}>{msg}</p>)}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-cyan-400/20 space-y-2">
                           <button onClick={onPlaceBid} disabled={!canAfford} className="w-full btn btn-primary text-lg">Ra giá ({nextBid})</button>
                           <button onClick={onPass} className="w-full btn btn-dark">Bỏ qua vật phẩm này</button>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};