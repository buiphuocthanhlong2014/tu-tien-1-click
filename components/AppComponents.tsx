import React, { useState } from 'react';
import { GameState, Player, Item, EventLogEntry, YearlyEvent, EventChoice, ActiveQuest, Quest, Difficulty, Opponent, Tournament, RankEntry, Match, NPC, RelationshipStatus, SectChoice, ItemType, Gender, SecretRealm } from '../types';
import { GeminiService, REALMS, LOCATIONS, CharacterCreationOptions, SECTS } from '../services/geminiService';
import { ImageDisplay } from './ImageDisplay';

type TalentChoice = 'thiên' | 'song' | 'tam' | 'tứ' | 'nguỵ';
type FamilyChoice = 'thương nhân' | 'võ gia' | 'suy tàn';

// --- Reusable Panel Component ---
export const InfoPanel: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; }> = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
        <div className="panel-bg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-serif text-cyan-300 text-center mb-6">{title}</h2>
            <div className="text-gray-300 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-3">{children}</div>
            <button onClick={onClose} className="mt-6 w-full bg-gray-700/80 text-white py-2 rounded-md hover:bg-gray-600/80 transition-colors">Đóng</button>
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
      <div className="text-center bg-gray-900/60 backdrop-blur-md p-10 rounded-xl shadow-2xl shadow-cyan-500/20 border border-cyan-500/20 max-w-md animate-fade-in">
        <h1 className="text-6xl font-bold text-cyan-300 mb-2 font-serif">Tu tiên 1 click</h1>
        <p className="text-gray-400 text-lg mb-8">Rèn luyện con đường đến sự bất tử</p>
        <div className="space-y-3 flex flex-col items-center">
            <button onClick={onStart} disabled={!apiKeySet} className="btn btn-primary w-64">Bắt đầu trò chơi</button>
            <button onClick={onContinue} disabled={!hasLocalSave || !apiKeySet} className="btn btn-secondary w-64">Chơi tiếp</button>
            <button onClick={onImport} disabled={!apiKeySet} className="btn btn-secondary w-64">Nhập file</button>
            <div className="pt-4 w-full">
              <button onClick={onShowInstructions} className="btn btn-dark w-64">Hướng dẫn</button>
              <button onClick={onShowUpdateLog} className="btn btn-dark w-64 mt-2">Cập nhật</button>
              <button onClick={onShowApiKeySetup} className="btn btn-warning w-64 mt-2">Thiết lập API Key</button>
            </div>
            {!apiKeySet && <p className="text-yellow-400 text-xs pt-2">Vui lòng thiết lập API Key để bắt đầu!</p>}
        </div>
      </div>
    </div>
);

export const CharacterCreationPanel: React.FC<{ onStartGame: (options: CharacterCreationOptions & { difficulty: Difficulty }) => void; onBack: () => void; }> = ({ onStartGame, onBack }) => {
    const [name, setName] = useState('');
    const [gender, setGender] = useState<Gender>('Nam');
    const [difficulty, setDifficulty] = useState<Difficulty>('trung bình');
    const [talent, setTalent] = useState<TalentChoice>('tam');
    const [family, setFamily] = useState<FamilyChoice>('thương nhân');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [sect, setSect] = useState<SectChoice>('thiên kiếm');
    const [nsfwAllowed, setNsfwAllowed] = useState(false);

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
        onStartGame({ name: name || 'Vô Danh', gender, difficulty, talent, family, avatarUrl, sect, nsfwAllowed });
    };

    return (
        <div className="w-full max-w-5xl mx-auto panel-bg p-8 animate-fade-in">
            <h2 className="text-4xl font-serif text-cyan-300 text-center mb-6">Tạo Nhân Vật</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                 <div>
                    <label htmlFor="char-name" className="block text-lg font-semibold text-yellow-300 mb-2">Tên Nhân Vật</label>
                    <input id="char-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" className="w-full input-base"/>
                </div>
                 <div>
                    <label htmlFor="char-avatar" className="block text-lg font-semibold text-yellow-300 mb-2">URL Ảnh Đại Diện</label>
                    <input id="char-avatar" type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Dán URL hình ảnh (tùy chọn)" className="w-full input-base"/>
                </div>
            </div>

             <div className="mb-6">
                <h3 className="text-lg text-center font-semibold text-yellow-300 mb-2">Giới Tính</h3>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                   <OptionCard title="Nam" description="Nhân vật nam" isSelected={gender === 'Nam'} onClick={() => setGender('Nam')} />
                   <OptionCard title="Nữ" description="Nhân vật nữ" isSelected={gender === 'Nữ'} onClick={() => setGender('Nữ')} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <fieldset className="border-2 border-cyan-500/20 rounded-lg p-4 space-y-4">
                    <legend className="px-2 text-lg font-semibold text-yellow-300">Nền Tảng</legend>
                     <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Độ Khó</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <OptionCard title="Đơn giản" description="Tài nguyên x1.2" isSelected={difficulty === 'đơn giản'} onClick={() => setDifficulty('đơn giản')} />
                            <OptionCard title="Trung bình" description="Trải nghiệm gốc" isSelected={difficulty === 'trung bình'} onClick={() => setDifficulty('trung bình')} />
                            <OptionCard title="Khó" description="Tài nguyên x0.8" isSelected={difficulty === 'khó'} onClick={() => setDifficulty('khó')} />
                            <OptionCard title="Ác mộng" description="Tài nguyên x0.6" isSelected={difficulty === 'ác mộng'} onClick={() => setDifficulty('ác mộng')} />
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Gia Tộc</h3>
                        <div className="grid grid-cols-1 gap-2">
                           <OptionCard title="Thương Nhân" description="+500 Linh thạch" isSelected={family === 'thương nhân'} onClick={() => setFamily('thương nhân')} />
                           <OptionCard title="Võ Gia" description="+10% HP tối đa" isSelected={family === 'võ gia'} onClick={() => setFamily('võ gia')} />
                           <OptionCard title="Suy Tàn" description="Công pháp mạnh hơn" isSelected={family === 'suy tàn'} onClick={() => setFamily('suy tàn')} />
                        </div>
                    </div>
                     <div className="pt-2">
                        <h3 className="font-semibold text-gray-300 mb-2">Tùy chọn khác</h3>
                        <label className="flex items-center space-x-3 cursor-pointer p-2 bg-gray-800/60 rounded-lg hover:bg-gray-700/70">
                            <input type="checkbox" checked={nsfwAllowed} onChange={(e) => setNsfwAllowed(e.target.checked)} className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-500"/>
                            <span className="text-gray-300">Bật nội dung 18+</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 px-2">Lưu ý: Nội dung do AI tạo ra. Tùy chọn này có thể tạo ra các chủ đề và mô tả trưởng thành hơn.</p>
                    </div>
                </fieldset>

                <fieldset className="md:col-span-2 border-2 border-cyan-500/20 rounded-lg p-4 space-y-4">
                     <legend className="px-2 text-lg font-semibold text-yellow-300">Tu Luyện</legend>
                     <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Thiên Phú (Linh Căn)</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            <OptionCard title="Thiên" description="+20 TV/năm" isSelected={talent === 'thiên'} onClick={() => setTalent('thiên')} />
                            <OptionCard title="Song" description="+15 TV/năm" isSelected={talent === 'song'} onClick={() => setTalent('song')} />
                            <OptionCard title="Tam" description="+10 TV/năm" isSelected={talent === 'tam'} onClick={() => setTalent('tam')} />
                            <OptionCard title="Tứ" description="+5 TV/năm" isSelected={talent === 'tứ'} onClick={() => setTalent('tứ')} />
                            <OptionCard title="Nguỵ" description="+0 TV/năm" isSelected={talent === 'nguỵ'} onClick={() => setTalent('nguỵ')} />
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Chọn Tông Môn</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(Object.keys(SECTS) as SectChoice[]).map(sectKey => (
                                <OptionCard 
                                    key={sectKey}
                                    title={SECTS[sectKey].name} 
                                    description={SECTS[sectKey].description}
                                    isSelected={sect === sectKey} 
                                    onClick={() => setSect(sectKey)} />
                            ))}
                        </div>
                    </div>
                </fieldset>
            </div>


            <div className="mt-8 flex justify-between">
                <button onClick={onBack} className="btn btn-dark py-3 px-6">Quay lại</button>
                <button onClick={handleStart} className="btn btn-primary py-3 px-8">Bắt Đầu Tu Luyện</button>
            </div>
        </div>
    );
};


export const ApiKeySetupPanel: React.FC<{ onSave: (key: string) => void; onClose: () => void; }> = ({ onSave, onClose }) => {
    const [key, setKey] = useState('');
    return (
        <InfoPanel title="Thiết lập API Key" onClose={onClose}>
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
    <InfoPanel title="Hướng dẫn" onClose={onClose}>
        <h3 className="text-xl font-semibold text-yellow-300">Mục Tiêu</h3>
        <p>Bắt đầu từ một tu sĩ Luyện Khí, mục tiêu của bạn là tu luyện để đột phá qua các cảnh giới cao hơn, trở thành một tồn tại bất tử.</p>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Tương Tác Vật Phẩm</h3>
        <p>Trong tab "Hành Trang" ở bảng nhân vật, bạn có thể tương tác với các vật phẩm của mình:</p>
        <ul className="list-disc pl-5 space-y-1">
            <li><strong>Trang bị:</strong> Nhấp vào vũ khí, giáp, hoặc phụ kiện trong túi đồ để trang bị. Chỉ số của bạn sẽ được cập nhật.</li>
            <li><strong>Sử dụng:</strong> Nhấp vào đan dược hoặc các vật phẩm tiêu thụ khác để sử dụng hiệu ứng của chúng.</li>
            <li><strong>Học Công Pháp:</strong> Nếu tìm thấy bí tịch, hãy nhấp vào nó để học một công pháp mới.</li>
        </ul>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Hệ Thống NPC và Mối Quan Hệ</h3>
        <p>Thế giới tu tiên không chỉ có mình bạn. Bạn sẽ gặp gỡ những thiên tài khác (NPC) trên con đường của mình. Tương tác với họ thông qua các sự kiện sẽ hình thành nên các mối quan hệ: bạn bè, kẻ thù, hoặc thậm chí là đạo lữ. Hãy quản lý các mối quan hệ của bạn trong bảng "Nhân Mạch".</p>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Thọ Nguyên</h3>
        <p>Mỗi cảnh giới có một giới hạn tuổi thọ. Hãy chú ý đột phá trước khi thọ nguyên cạn kiệt, nếu không bạn sẽ thân tử đạo tiêu!</p>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Đại Hội Thiên Kiêu</h3>
        <p>Cứ 50 năm một lần, Đại Hội Thiên Kiêu được tổ chức. Đây là cơ hội để bạn tỉ thí với các thiên tài khác, giành lấy danh vọng và những phần thưởng vô cùng giá trị. Phí tham gia là 2000 linh thạch.</p>
    </InfoPanel>
);

export const UpdateLogPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
     <InfoPanel title="Nhật Ký Cập Nhật" onClose={onClose}>
        <h3 className="text-xl font-semibold text-yellow-300">Phiên bản 9.0.0 - "Bí Cảnh & Đồng Hành"</h3>
        <ul className="list-disc pl-5 space-y-2">
            <li><strong>Hệ thống Bí Cảnh:</strong> Thêm các sự kiện hiếm về "Bí Cảnh". Đây là những cuộc phiêu lưu lớn, kéo dài nhiều năm với phần thưởng hậu hĩnh. Giao diện sẽ thay đổi để phù hợp khi bạn đang thám hiểm.</li>
            <li><strong>Hệ thống Sủng Vật:</strong> Giờ đây bạn có thể nhận được sủng vật đồng hành qua các cơ duyên. Sủng vật sẽ mang lại các hiệu ứng có lợi (như tăng tu vi mỗi năm) và được hiển thị trong bảng "Nhân Mạch".</li>
            <li><strong>Vật Phẩm Mới:</strong> AI được khuyến khích tạo ra các loại đan dược mạnh hơn và trang bị đa dạng hơn.</li>
            <li><strong>Sửa lỗi hiển thị:</strong> Đã sửa lỗi và đảm bảo Chức Vụ Tông Môn được hiển thị rõ ràng trong bảng thông tin nhân vật.</li>
        </ul>
        <h3 className="text-xl font-semibold text-yellow-300 mt-4">Phiên bản 8.0.0 - "Tông Môn Trật Tự"</h3>
        <ul className="list-disc pl-5 space-y-2">
            <li><strong>Hệ thống Chức Vụ:</strong> Thêm hệ thống chức vụ tông môn (Ngoại môn, Nội môn, Trưởng lão, v.v.). Chức vụ sẽ tự động được thăng cấp khi bạn đột phá cảnh giới.</li>
            <li><strong>Hệ thống Bổng Lộc:</strong> Mỗi năm bạn sẽ nhận được bổng lộc (linh thạch) dựa trên chức vụ hiện tại.</li>
        </ul>
    </InfoPanel>
);

export const GeniusRankingPanel: React.FC<{ ranking: RankEntry[], onClose: () => void }> = ({ ranking, onClose }) => (
    <InfoPanel title="Bảng Xếp Hạng Thiên Kiêu" onClose={onClose}>
        {ranking.length === 0 ? (
            <p>Chưa có ai được ghi danh trên Bảng Xếp Hạng Thiên Kiêu. Hãy trở thành nhà vô địch đầu tiên!</p>
        ) : (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-yellow-400/30">
                        <th className="p-2 text-yellow-300">Thứ Hạng</th>
                        <th className="p-2 text-yellow-300">Tên</th>
                        <th className="p-2 text-yellow-300">Thành Tựu</th>
                    </tr>
                </thead>
                <tbody>
                    {ranking.map(entry => (
                        <tr key={entry.rank} className="border-b border-gray-700">
                            <td className="p-2 font-bold">{entry.rank}</td>
                            <td className="p-2">{entry.name}</td>
                            <td className="p-2 text-sm">{entry.achievement} (Năm {entry.year - 15})</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </InfoPanel>
);

export const RelationshipPanel: React.FC<{ npcs: NPC[], player: Player, onClose: () => void }> = ({ npcs, player, onClose }) => (
    <InfoPanel title="Nhân Mạch" onClose={onClose}>
        {npcs.length === 0 && player.pets.length === 0 ? (
            <p>Bạn chưa có mối quan hệ hay đồng hành nào đáng chú ý.</p>
        ) : (
            <>
                {npcs.length > 0 && (
                    <div className="space-y-4">
                        {npcs.map(npc => (
                            <div key={npc.id} className="p-3 bg-gray-800/60 rounded-lg border border-cyan-400/20">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xl font-semibold text-yellow-300">{npc.name} <span className="text-base font-normal text-gray-400">({npc.gender})</span></h4>
                                    {player.spouseId === npc.id && <span className="px-2 py-1 text-xs rounded-full bg-pink-500/80 text-white shadow-md shadow-pink-500/30">Bạn Đời</span>}
                                </div>
                                <p className="text-sm italic text-gray-400 mb-2">"{npc.description}"</p>
                                <p><span className="font-semibold text-gray-300">Cảnh giới:</span> {npc.realm}</p>
                                <p><span className="font-semibold text-gray-300">Mối quan hệ:</span> <span className={npc.isLover ? 'text-pink-400' : npc.relationshipPoints > 25 ? 'text-green-400' : npc.relationshipPoints < -25 ? 'text-red-400' : 'text-gray-300'}>{npc.status}</span> ({npc.relationshipPoints})</p>
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
                                    {pet.effects.cultivationBonusPerYear && <p className="text-sm text-green-400">+ {pet.effects.cultivationBonusPerYear} Tu vi mỗi năm</p>}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </>
        )}
    </InfoPanel>
);

// --- Icon Components ---
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>;
const CoinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-.567-.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.766 1.324 2.242.28.182.566.324.876.434v1.698a2.5 2.5 0 001.676-.662C11.398 11.766 12 11.009 12 10c0-.99-.602-1.766-1.324-2.242A4.535 4.535 0 0010 7.092V5z" clipRule="evenodd" /></svg>;
const SwordIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6.598 4.002l-1.03-4.002m-1.03 4.002l1.03-4.002m1.164 2.002H9.25M15 21h-3.25m-.836-5.002l-3.21-3.21m3.21 3.21l3.21-3.21m0 0l-3.21-3.21m3.21 3.21L21 12.75M4 11.25l1.03 4.002m1.03-4.002L4 11.25m0 0l-1.03-4.002M4 11.25h2.5m-2.5 0l-1.03-4.002m9.402-1.164A2.5 2.5 0 0013 5.5a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5c0-.17-.017-.336-.05-.495l1.101 1.101m-1.101-1.101L13 8m2.5-2.5l-1.101 1.101" /></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- Main Game Components ---
export const QuestTracker: React.FC<{ quest: ActiveQuest }> = ({ quest }) => {
    const progressPercentage = quest.duration > 0 ? (quest.progress / quest.duration) * 100 : 0;
    return (
        <div className="p-3 bg-gray-900/60 rounded-lg border border-yellow-500/30">
            <h4 className="text-yellow-300 font-semibold text-center font-serif">Nhiệm Vụ</h4>
            <p className="text-lg text-white font-bold text-center">{quest.title}</p>
            <p className="text-sm text-gray-400 italic text-center mb-2">"{quest.description}"</p>
            <div className="text-sm">
                <p><strong>Tiến độ:</strong> {quest.progress} / {quest.duration} năm</p>
                <div className="w-full bg-gray-700/80 rounded-full h-3 my-1 border border-yellow-500/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
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
                <p><strong>Tiến độ:</strong> {realm.progress} / {realm.duration} năm</p>
                <div className="w-full bg-gray-700/80 rounded-full h-3 my-1 border border-purple-500/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
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
            <div className="grid grid-cols-2 gap-4">
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
    <div className={`flex items-center space-x-3 bg-white/5 p-2 rounded-lg ${className}`}>
        <div className="text-cyan-300">{icon}</div>
        <div className="flex-grow">
            <div className="text-sm text-gray-400">{label}</div>
            <div className="text-lg font-bold text-white">{value}</div>
        </div>
    </div>
);

const StatusBar: React.FC<{ player: Player }> = ({ player }) => {
    const healthPercentage = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 100;
    const cultivationPercentage = player.cultivationForNextRealm > 0 ? (player.cultivation / player.cultivationForNextRealm) * 100 : 100;

    return (
         <div className="space-y-1">
             <div className="flex items-center space-x-2 text-red-300">
                <HeartIcon />
                <div className="w-full bg-gray-900/80 rounded-full h-4 border border-red-500/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-orange-400 h-full rounded-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-red-900" style={{ width: `${healthPercentage}%` }}>{player.health}/{player.maxHealth}</div>
                </div>
             </div>
             <div className="flex items-center space-x-2 text-yellow-300">
                <CoinIcon />
                <span className="font-bold text-md">{player.linhThach}</span>
             </div>
             <div>
                <div className="w-full bg-gray-900/80 rounded-full h-4 my-1 border border-cyan-500/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500 flex items-center justify-center text-xs font-bold text-indigo-900" style={{ width: `${cultivationPercentage}%` }}>{Math.floor(cultivationPercentage)}%</div>
                </div>
                <p className="text-xs text-center text-cyan-200">{player.cultivation} / {player.cultivationForNextRealm} Tu vi</p>
             </div>
        </div>
    );
};

const CharacterSheet: React.FC<{ player: Player; npcs: NPC[]; activeSecretRealm: SecretRealm | null; }> = ({ player, npcs, activeSecretRealm }) => {
    const currentRealmDetails = REALMS.find(r => r.name === player.realm);
    const yearsLeft = currentRealmDetails ? currentRealmDetails.maxAge - player.age : Infinity;
    const spouse = player.spouseId ? npcs.find(n => n.id === player.spouseId) : null;
    const yearsLeftColor = yearsLeft < 10 ? 'text-red-400 animate-pulse' : yearsLeft < 50 ? 'text-yellow-400' : 'text-gray-400';

    return (
        <div className="space-y-4 text-lg">
             <div className="grid grid-cols-2 gap-3">
                <StatDisplay icon={<SwordIcon />} label="Công" value={player.stats.attack} />
                <StatDisplay icon={<ShieldIcon />} label="Thủ" value={player.stats.defense} />
            </div>

            <div className="space-y-2 text-base">
                <p><span className="font-semibold text-gray-400">Tông Môn:</span> {player.sect} (<span className="text-amber-300">{player.sectRank}</span>)</p>
                <p><span className="font-semibold text-gray-400">Vị trí:</span> {player.currentLocation}</p>
                <p><span className="font-semibold text-gray-400">Tuổi:</span> {player.age} <span className={`text-sm ${yearsLeftColor}`}>({yearsLeft < Infinity ? `còn ${yearsLeft} năm` : 'vô hạn'})</span></p>
                 {spouse && <p><span className="font-semibold text-gray-400">Đạo Lữ:</span> <span className="text-pink-400">{spouse.name}</span></p>}
                
                <div className="pt-2">
                    <p className="font-semibold text-gray-400">Thiên phú:</p>
                    <p className="text-sm text-purple-300" title={`+${player.talentCultivationBonus} tu vi mỗi năm`}>{player.talent}</p>
                </div>
                 {player.cultivationTechnique && ( 
                 <div>
                    <p className="font-semibold text-gray-400">Công Pháp:</p>
                    <p className="text-sm text-green-300" title={player.cultivationTechnique.description}>{player.cultivationTechnique.name} ({player.cultivationTechnique.rank})</p>
                </div>)}
            </div>
            <div className="min-h-[124px]">
                {activeSecretRealm ? <SecretRealmTracker realm={activeSecretRealm} /> : (player.activeQuest && <QuestTracker quest={player.activeQuest} />)}
            </div>
        </div>
    );
};

const ItemButton: React.FC<{ item: Item | null; label: string; onClick: (item: Item) => void }> = ({ item, label, onClick }) => (
    <div className="flex items-center justify-between p-2 bg-black/20 rounded-md">
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
                    <button key={item.id} onClick={() => onItemClick(item)} className="w-full text-left p-2 rounded-md bg-gray-800/60 hover:bg-gray-700/80 transition-colors block">
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

    const TabButton: React.FC<{label: string; name: 'info' | 'inventory'}> = ({label, name}) => (
         <button onClick={() => setActiveTab(name)} className={`flex-1 pb-2 font-semibold transition-colors duration-300 border-b-2 ${activeTab === name ? 'text-cyan-300 border-cyan-400' : 'text-gray-500 border-transparent hover:text-cyan-400'}`}>
            {label}
        </button>
    )

    return (
        <div className="panel-bg flex flex-col flex-grow min-h-0">
            <div className="p-4 space-y-3">
                <div className="flex flex-row gap-4 items-center">
                    <div className="relative w-16 h-16 shrink-0">
                        <ImageDisplay imageUrl={player.avatarUrl} isLoading={false} />
                    </div>
                    <div className="flex-grow min-w-0">
                        <h2 className="text-xl text-yellow-300 font-serif truncate" title={player.name}>{player.name}</h2>
                        <p className="text-sm text-cyan-200">{player.realm} <span className="text-gray-400">({player.gender})</span></p>
                    </div>
                </div>
                <StatusBar player={player}/>
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex border-b border-white/10 mx-4">
                    <TabButton label="Thông Tin" name="info"/>
                    <TabButton label="Hành Trang" name="inventory"/>
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
          </button>
        ))}
      </div>
    </div>
);

export const TournamentPanel: React.FC<{ tournament: Tournament; player: Player; event: YearlyEvent | null; onSelectChoice: (choice: EventChoice) => void; }> = ({ tournament, player, event, onSelectChoice }) => {
    const roundNames = ["Vòng 1/16", "Tứ kết", "Bán kết", "Chung kết"];
    
    const renderName = (p: Player | Opponent) => {
        if ('title' in p) return `${p.name} - ${p.title}`;
        return p.name;
    }

    return (
        <div className="panel-bg flex flex-col flex-grow min-h-0 p-6 animate-fade-in">
            <h2 className="text-4xl font-serif text-yellow-300 text-center mb-4">Đại Hội Thiên Kiêu - Năm {tournament.year - 15}</h2>
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