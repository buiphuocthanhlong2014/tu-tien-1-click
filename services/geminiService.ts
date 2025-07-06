import { GoogleGenAI } from "@google/genai";
import { Player, Realm, Item, ItemType, CultivationTechnique, YearlyEvent, Quest, Difficulty, NPC, SectChoice, Gender } from '../types';

export const REALMS: Realm[] = [
    { name: 'Luyện Khí', minCultivation: 0, maxAge: 100 },
    { name: 'Trúc Cơ', minCultivation: 1000, maxAge: 200 },
    { name: 'Kết Đan', minCultivation: 5000, maxAge: 500 },
    { name: 'Nguyên Anh', minCultivation: 25000, maxAge: 1500 },
    { name: 'Hóa Thần', minCultivation: 100000, maxAge: 5000 },
    { name: 'Đại Thừa', minCultivation: 500000, maxAge: 10000 },
];

export const SECT_RANKS = [
    { name: 'Ngoại Môn Đệ Tử', realmRequired: 'Luyện Khí', salary: 50 },
    { name: 'Nội Môn Đệ Tử', realmRequired: 'Trúc Cơ', salary: 200 },
    { name: 'Trưởng Lão', realmRequired: 'Kết Đan', salary: 1000 },
    { name: 'Phó Tông Chủ', realmRequired: 'Nguyên Anh', salary: 5000 },
    { name: 'Tông Chủ', realmRequired: 'Hóa Thần', salary: 20000 },
];

interface SectBonus {
    attack?: number;
    defense?: number;
    maxHealth?: number;
    linhThach?: number;
    initialItems: {
        id: string;
        name: string;
        type: string;
        description: string;
        effects: {
            attack?: number;
            health?: number;
        };
    }[];
    startingTechniqueName?: string;
}

interface SectDetails {
    id: string;
    name: string;
    description: string;
    bonuses: SectBonus;
}


export const SECTS: Record<SectChoice, SectDetails> = {
    'thiên kiếm': {
        id: 'thien-kiem',
        name: 'Thiên Kiếm Tông',
        description: 'Nổi danh với kiếm pháp vô song. Đệ tử tập trung vào tấn công thuần túy, nhưng phòng thủ yếu hơn.',
        bonuses: {
            attack: 10,
            defense: -5,
            initialItems: [{ id: 'kiem_tan_thu', name: 'Kiếm Tân Thủ', type: 'weapon', description: 'Một thanh kiếm sắc bén cho người mới bắt đầu.', effects: { attack: 5 }}],
            startingTechniqueName: 'Thiên Kiếm Quyết',
        }
    },
    'vạn dược': {
        id: 'van-duoc',
        name: 'Vạn Dược Cốc',
        description: 'Các bậc thầy về luyện đan và chữa trị. Am hiểu sâu sắc về linh thảo, có lợi thế về sinh tồn.',
        bonuses: {
            maxHealth: 10,
            initialItems: [
                { id: 'hoi_mau_dan_1', name: 'Hồi Máu Đan', type: 'consumable', description: 'Phục hồi 30 sinh mệnh.', effects: { health: 30 }},
                { id: 'hoi_mau_dan_2', name: 'Hồi Máu Đan', type: 'consumable', description: 'Phục hồi 30 sinh mệnh.', effects: { health: 30 }}
            ],
        }
    },
    'huyền phù': {
        id: 'huyen-phu',
        name: 'Huyền Phù Môn',
        description: 'Sử dụng nghệ thuật Phù Chú bí truyền. Khởi đầu với tài chính dồi dào hơn để mua sắm vật tư.',
        bonuses: {
            linhThach: 150,
            initialItems: [
                { id: 'cong_kich_phu', name: 'Công Kích Phù', type: 'consumable', description: 'Tạo ra một quả cầu lửa gây sát thương.', effects: {}},
                { id: 'phong_ngu_phu', name: 'Phòng Ngự Phù', type: 'consumable', description: 'Tạo ra một lá chắn ánh sáng tạm thời.', effects: {}},
            ],
        }
    }
};

export const LOCATIONS = [
    { id: 'forest', name: 'Rừng Rậm', description: 'Một khu rừng cổ xưa đầy rẫy yêu thú và cơ duyên.' },
    { id: 'city', name: 'Thành Trấn', description: 'Một trung tâm buôn bán sầm uất, nơi có thể tìm thấy mọi thứ.' },
    { id: 'sea', name: 'Biển Cả', description: 'Vùng biển sâu thẳm ẩn chứa nhiều bí mật và kho báu.' },
    { id: 'thien-kiem', name: 'Thiên Kiếm Tông', description: 'Nơi các kiếm tu mài giũa kiếm ý của mình.' },
    { id: 'van-duoc', name: 'Vạn Dược Cốc', description: 'Không khí tràn ngập mùi thuốc, là thánh địa của các luyện đan sư.' },
    { id: 'huyen-phu', name: 'Huyền Phù Môn', description: 'Những ngọn núi lơ lửng được kết nối bằng các cây cầu ánh sáng.' },
    { id: 'giao_luu_phuong', name: 'Giao Lưu Phường', description: 'Một khu chợ trung lập nơi các tu sĩ từ các tông môn khác nhau tụ họp.' },
];

export const INITIAL_NPCS: NPC[] = [
    {
        id: 'npc_lam_van',
        name: 'Lam Vân',
        gender: 'Nữ',
        description: 'Một nữ tu lạnh lùng nhưng có trái tim ấm áp, thiên phú kiếm đạo kinh người.',
        realm: 'Luyện Khí',
        cultivation: 10,
        relationshipPoints: 0,
        status: 'Xa lạ',
        isLover: false,
    },
    {
        id: 'npc_thach_nghi',
        name: 'Thạch Nghị',
        gender: 'Nam',
        description: 'Hành sự bá đạo, luôn coi mình là trung tâm. Sẵn sàng làm mọi thứ để mạnh hơn.',
        realm: 'Luyện Khí',
        cultivation: 15,
        relationshipPoints: -5,
        status: 'Xa lạ',
        isLover: false,
    },
    {
        id: 'npc_tieu_y_tien',
        name: 'Tiêu Y Tiên',
        gender: 'Nữ',
        description: 'Tinh thông y thuật và dụng độc, tính cách thất thường, khó đoán.',
        realm: 'Luyện Khí',
        cultivation: 8,
        relationshipPoints: 5,
        status: 'Người quen',
        isLover: false,
    },
    {
        id: 'npc_han_thien',
        name: 'Hàn Thiên',
        gender: 'Nam',
        description: 'Một tán tu trầm mặc, ít nói nhưng tâm tư sâu sắc và hành sự cẩn trọng.',
        realm: 'Luyện Khí',
        cultivation: 12,
        relationshipPoints: 0,
        status: 'Xa lạ',
        isLover: false,
    }
];

export interface CharacterCreationOptions {
    name: string;
    gender: Gender;
    talent: 'thiên' | 'song' | 'tam' | 'tứ' | 'nguỵ';
    family: 'thương nhân' | 'võ gia' | 'suy tàn';
    avatarUrl: string;
    sect: SectChoice;
    nsfwAllowed: boolean;
}

export class GeminiService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("API Key is required to initialize GeminiService.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async startNewGame(options: CharacterCreationOptions): Promise<{ player: Player }> {
        
        const talentMap = {
            'thiên': { name: 'Thiên Linh Căn', bonus: 20 },
            'song': { name: 'Song Linh Căn', bonus: 15 },
            'tam': { name: 'Tam Linh Căn', bonus: 10 },
            'tứ': { name: 'Tứ Linh Căn', bonus: 5 },
            'nguỵ': { name: 'Nguỵ Linh Căn', bonus: 0 },
        };
    
        const selectedTalent = talentMap[options.talent];
        const chosenSect = SECTS[options.sect];

        let initialPlayer: Player = {
            name: options.name.trim() || 'Vô Danh',
            gender: options.gender,
            age: 16,
            health: 100,
            maxHealth: 100,
            realm: REALMS[0].name,
            cultivation: 0,
            cultivationForNextRealm: REALMS[1].minCultivation,
            stats: { attack: 5, defense: 5 },
            inventory: [],
            equipment: { weapon: null, armor: null, accessory: null },
            linhThach: 10,
            cultivationTechnique: {
                name: 'Dẫn Khí Quyết',
                rank: 'Phàm phẩm',
                description: 'Công pháp cơ bản để dẫn linh khí vào cơ thể.',
                effects: {
                    cultivationBonus: 5,
                }
            },
            currentLocation: chosenSect.name,
            activeQuest: null,
            talent: selectedTalent.name,
            talentCultivationBonus: selectedTalent.bonus,
            avatarUrl: options.avatarUrl,
            spouseId: null,
            sect: chosenSect.name,
            sectRank: SECT_RANKS[0].name,
            pets: [],
        };

        // Apply family bonus
        switch (options.family) {
            case 'thương nhân':
                initialPlayer.linhThach += 500;
                break;
            case 'võ gia':
                initialPlayer.maxHealth = Math.round(initialPlayer.maxHealth * 1.1);
                initialPlayer.health = initialPlayer.maxHealth;
                break;
            case 'suy tàn':
                initialPlayer.cultivationTechnique = {
                    name: 'Công Pháp Gia Truyền',
                    rank: 'Phàm phẩm',
                    description: 'Một công pháp cổ xưa từ gia tộc đã suy tàn, hiệu quả hơn bình thường.',
                    effects: {
                        cultivationBonus: 8,
                    }
                };
                break;
        }

        // Apply sect bonus
        const bonuses = chosenSect.bonuses;
        if (bonuses.attack) initialPlayer.stats.attack += bonuses.attack;
        if (bonuses.defense) initialPlayer.stats.defense += bonuses.defense;
        if (bonuses.maxHealth) {
            initialPlayer.maxHealth += bonuses.maxHealth;
            initialPlayer.health = initialPlayer.maxHealth;
        }
        if (bonuses.linhThach) initialPlayer.linhThach += bonuses.linhThach;
        if (bonuses.initialItems) {
            const itemsToAdd: Item[] = bonuses.initialItems.map((item, index) => ({
                ...item,
                id: `${item.id}_${Date.now()}_${index}`,
                effects: item.effects || {},
                type: item.type as ItemType,
                cost: 0,
            }));
            initialPlayer.inventory.push(...itemsToAdd);
            if (options.sect === 'thiên kiếm' && itemsToAdd[0].type === 'weapon') {
                initialPlayer.equipment.weapon = itemsToAdd[0];
                initialPlayer.inventory = initialPlayer.inventory.filter(i => i.id !== itemsToAdd[0].id);
            }
        }
        if (bonuses.startingTechniqueName === 'Thiên Kiếm Quyết') {
            initialPlayer.cultivationTechnique = {
                name: 'Thiên Kiếm Quyết',
                rank: 'Phàm phẩm',
                description: 'Công pháp nhập môn của Thiên Kiếm Tông, tăng cường sự sắc bén của linh khí.',
                effects: { cultivationBonus: 7 },
            };
        }
        
        return { player: initialPlayer };
    };

    public async getYearlyEventChoice(player: Player, npcs: NPC[], nsfwAllowed: boolean): Promise<YearlyEvent> {
        const locationInfo = LOCATIONS.find(l => l.name === player.currentLocation)?.description ?? "một nơi vô định";
        const sectKey = Object.keys(SECTS).find(key => SECTS[key as SectChoice].name === player.sect) as SectChoice | undefined;
        const sectDescription = sectKey ? SECTS[sectKey].description : "một tông môn vô danh";

        const questContext = player.activeQuest 
            ? `Người chơi đang có nhiệm vụ: "${player.activeQuest.title}" (${player.activeQuest.description}). Nhiệm vụ này yêu cầu ${player.activeQuest.duration} năm để hoàn thành.`
            : "Người chơi hiện không có nhiệm vụ nào.";
            
        const npcContext = npcs.length > 0
            ? `Các NPC quan trọng trong đời bạn: ${npcs.map(n => `${n.name} (${n.gender}, ${n.status}: ${n.relationshipPoints} điểm)`).join(', ')}.`
            : "Hiện tại không có NPC quan trọng nào.";

        const nsfwContext = nsfwAllowed
            ? "LƯU Ý: Tùy chọn nội dung người lớn (18+) đang BẬT. Bạn có thể tạo ra các sự kiện có chủ đề trưởng thành hơn, bao gồm bạo lực, âm mưu đen tối, và các mối quan hệ phức tạp."
            : "LƯU Ý: Tùy chọn nội dung người lớn (18+) đang TẮT. Giữ cho tất cả các sự kiện phù hợp với mọi lứa tuổi, tập trung vào tu luyện, phiêu lưu và tình bạn trong sáng.";

        const validLocations = LOCATIONS.map(l => `'${l.name}'`).join(', ');

        const systemInstruction = `Bạn là người quản trò cho một trò chơi mô phỏng 'Tu Tiên'. Dựa vào trạng thái và vị trí của người chơi, hãy tạo một sự kiện có 2-3 lựa chọn. Chỉ trả lời bằng một đối tượng JSON hợp lệ, không có markdown.
        - ${nsfwContext}
        - Người chơi là một đệ tử ${player.gender === 'Nữ' ? 'nữ' : 'nam'} của **${player.sect}** với chức vụ là **${player.sectRank}**. Đặc điểm của tông môn: ${sectDescription}.
        - ${questContext}
        - Vị trí hiện tại của người chơi là '${player.currentLocation}', nơi được mô tả là: '${locationInfo}'.
        - ${npcContext}
        - **LUẬT CHƠI QUAN TRỌNG**: Game có hệ thống Đại Hội Thiên Kiêu và giới hạn tuổi. Bạn không cần tạo sự kiện cho chúng.
        - **Cơ Duyên Lớn (Hiếm):** Thỉnh thoảng (tỉ lệ rất thấp, <5%), tạo ra các sự kiện trọng đại như khám phá Bí Cảnh hoặc nhận được Sủng Vật.
        
        QUY TẮC TẠO SỰ KIỆN:
        1.  **Sự kiện NPC (Ưu tiên):** Thỉnh thoảng (khoảng 30% cơ hội), tạo sự kiện liên quan đến một trong các NPC. Sự kiện có thể tương tác với NPC khác giới tính và tạo cơ hội phát triển tình cảm nếu hợp lý.
        2.  **Xử lý Nhiệm vụ:** Nếu người chơi đang ở sai vị trí nhiệm vụ, tạo sự kiện nhắc nhở họ di chuyển đến ${player.activeQuest?.location ?? 'địa điểm nhiệm vụ'}.
        3.  **Nhận Nhiệm vụ mới:** Nếu người chơi đang ở trong tông môn của họ (${player.sect}) và không có nhiệm vụ, ưu tiên tạo sự kiện nhận nhiệm vụ mới. **Trường "location" cho nhiệm vụ mới PHẢI LÀ MỘT trong các địa điểm hợp lệ sau: ${validLocations}.**
        4.  **Vật Phẩm Mới:** 'newItem' là một đối tượng. Nó có thể là trang bị, đan dược, hoặc bí tịch.
            - \`type\`: 'weapon', 'armor', 'accessory', 'consumable', 'techniqueScroll'.
            - \`effects\`: Một đối tượng chứa \`attack\`, \`defense\`, \`health\`, \`cultivation\`. Chỉ áp dụng cho trang bị và đan dược.
            - \`technique\`: Một đối tượng \`CultivationTechnique\`. Chỉ áp dụng cho \`techniqueScroll\`.
            - **Hãy tạo ra các loại đan dược mạnh hơn (ví dụ: tăng hàng trăm, hàng nghìn tu vi) và trang bị đa dạng hơn, đặc biệt khi người chơi ở cảnh giới cao.**
        5.  **Sủng Vật Mới:** 'newPet' là một đối tượng để ban thưởng sủng vật đồng hành.
            - \`name\`, \`species\`, \`description\`: Mô tả về sủng vật.
            - \`effects\`: Bắt buộc phải có \`cultivationBonusPerYear\` để tăng tu vi mỗi năm cho người chơi.
        6.  **Bí Cảnh:** 'startSecretRealm' là một đối tượng để bắt đầu một cuộc thám hiểm lớn.
            - Sự kiện này PHẢI hiếm.
            - \`name\`, \`description\`, \`duration\` (số năm), \`reward\` (phần thưởng lớn khi hoàn thành).
        7.  **KHÔNG SỬ DỤNG:** Tuyệt đối không tạo hiệu ứng "questProgress".

        CẤU TRÚC JSON:
        { 
          "description": "Mô tả sự kiện", 
          "choices": [ 
            { 
              "text": "Mô tả lựa chọn", 
              "effects": { 
                "cultivationGained": 10, "healthChange": -5, "linhThachChange": 20,
                "relationshipChange": { "npcId": "npc_lam_van", "points": 10 },
                "newItem": { "name": "Huyết Tinh Đan", "type": "consumable", "description": "Đan dược giúp tăng cường tu vi.", "effects": { "cultivation": 500 } },
                "newQuest": { "id": "q1", "title": "Săn Yêu Thú", "description": "Hạ gục Yêu Lang trong rừng.", "location": "Rừng Rậm", "difficulty": "đơn giản", "duration": 1, "reward": { "linhThach": 50 } }
              } 
            },
            {
              "text": "Nhận nuôi con tiểu thú bị thương này.",
              "effects": {
                "newPet": {
                  "name": "Tiểu Bạch", "species": "Linh Hồ", "description": "Một con hồ ly trắng tinh, có vẻ rất có linh tính.",
                  "effects": { "cultivationBonusPerYear": 20 }
                }
              }
            },
            {
              "text": "Tham gia thám hiểm Bí Cảnh cùng tông môn.",
              "effects": {
                "startSecretRealm": {
                  "name": "Vạn Cổ Yêu Động", "description": "Một bí cảnh cổ xưa vừa được trưởng lão phát hiện, nghe đồn chứa đựng cơ duyên đại thụ.",
                  "duration": 5,
                  "reward": { "cultivation": 10000, "linhThach": 5000 }
                }
              }
            }
          ] 
        }
        - Các khóa trong 'effects' là tùy chọn.`;

        const prompt = `Trạng thái người chơi: Giới tính=${player.gender}, Tuổi=${player.age}, Vị trí=${player.currentLocation}, Tông môn=${player.sect}, Chức vụ=${player.sectRank}, Cảnh giới=${player.realm}, Linh thạch=${player.linhThach}. Nhiệm vụ: ${player.activeQuest?.title ?? 'Không'}. Tạo một sự kiện.`;
        
        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: `${systemInstruction}\n\n${prompt}`,
                config: {
                    temperature: 1.0,
                    responseMimeType: "application/json",
                }
            });

            let jsonStr = response.text.trim();
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
                jsonStr = match[2].trim();
            }
            
            jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

            const parsedData = JSON.parse(jsonStr) as YearlyEvent;
            
            if (!parsedData.description || !parsedData.choices || parsedData.choices.length === 0) {
                throw new Error("Invalid event structure from AI.");
            }

            parsedData.choices.forEach((choice, index) => {
                if(!choice.text) {
                    choice.text = `Lựa chọn ${index + 1}`;
                }
            });

            return parsedData;
        } catch (e) {
            console.error("Failed to parse AI response into JSON or invalid structure:", e);
            return {
                description: "Một năm trôi qua trong tĩnh lặng khi bạn đang ở " + player.currentLocation + ". Bạn quyết định tập trung vào việc gì?",
                choices: [
                    {
                        text: "Chuyên tâm tu luyện.",
                        effects: {
                            cultivationGained: 25 + (player.cultivationTechnique?.effects.cultivationBonus ?? 0),
                        }
                    },
                    {
                        text: "Tịnh dưỡng, phục hồi.",
                        effects: {
                            healthChange: 20
                        }
                    }
                ]
            };
        }
    };
}