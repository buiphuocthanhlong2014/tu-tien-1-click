import { GoogleGenAI } from "@google/genai";
import { Player, Realm, Item, ItemType, CultivationTechnique, YearlyEvent, Quest, Difficulty, NPC, SectChoice, Gender, AuctionItem, NewQuestData } from '../types';

export const REALMS: Realm[] = [
    { name: 'Luyện Khí', minCultivation: 0, maxAge: 100 },
    { name: 'Trúc Cơ', minCultivation: 1000, maxAge: 200 },
    { name: 'Kết Đan', minCultivation: 5000, maxAge: 500 },
    { name: 'Nguyên Anh', minCultivation: 25000, maxAge: 1500 },
    { name: 'Hóa Thần', minCultivation: 100000, maxAge: 5000 },
    { name: 'Đại Thừa', minCultivation: 500000, maxAge: 10000 },
];

export const SECT_RANKS = [
    { name: 'Ngoại Môn Đệ Tử', realmRequired: 'Luyện Khí', salary: 25 },
    { name: 'Nội Môn Đệ Tử', realmRequired: 'Trúc Cơ', salary: 100 },
    { name: 'Trưởng Lão', realmRequired: 'Kết Đan', salary: 500 },
    { name: 'Phó Tông Chủ', realmRequired: 'Nguyên Anh', salary: 2500 },
    { name: 'Tông Chủ', realmRequired: 'Hóa Thần', salary: 10000 },
];

export const TECHNIQUES: CultivationTechnique[] = [
    { name: 'Nguyên Khí Chân Quyết', rank: 'Linh phẩm', description: 'Công pháp chính thống của tông môn, trung bình nhưng ổn định.', effects: { cultivationBonus: 6 } },
    { name: 'Linh Hỏa Quyết', rank: 'Linh phẩm', description: 'Hấp thụ hỏa linh khí, tu luyện nhanh nhưng bá đạo.', effects: { cultivationBonus: 8 } },
    { name: 'Huyền Băng Lục', rank: 'Linh phẩm', description: 'Hấp thụ thủy linh khí, tâm cảnh thanh minh, tu vi vững chắc.', effects: { cultivationBonus: 7.5 } },
    { name: 'Vạn Kiếm Quy Tông', rank: 'Tiên phẩm', description: 'Công pháp kiếm tu thượng thừa, nghe đồn có thể chém rách không gian.', effects: { cultivationBonus: 15 } }
];

export interface Talent {
    id: string;
    name: string;
    description: string;
    effects: {
        cultivationBonus?: number;
        maxHealthModifier?: number;
        attackBonus?: number;
        defenseBonus?: number;
        linhThachGainModifier?: number;
        cultivationGainModifier?: number;
    }
}

export interface TalentsByCategory {
    [category: string]: Talent[];
}

export const TALENTS: TalentsByCategory = {
    'Linh Căn (Bắt buộc)': [
        { id: 'thiên', name: 'Thiên Linh Căn', description: '+20 TV/lượt', effects: { cultivationBonus: 40 } },
        { id: 'song', name: 'Song Linh Căn', description: '+15 TV/lượt', effects: { cultivationBonus: 30 } },
        { id: 'tam', name: 'Tam Linh Căn', description: '+10 TV/lượt', effects: { cultivationBonus: 20 } },
        { id: 'tứ', name: 'Tứ Linh Căn', description: '+5 TV/lượt', effects: { cultivationBonus: 10 } },
        { id: 'nguỵ', name: 'Nguỵ Linh Căn', description: '+0 TV/lượt', effects: { cultivationBonus: 0 } },
    ],
    'Thể Chất (Tùy chọn)': [
        { id: 'long_toc', name: 'Dòng Máu Long Tộc', description: '+10% HP tối đa', effects: { maxHealthModifier: 0.1 } },
        { id: 'kiem_the', name: 'Kiếm Thể', description: '+10 Công khởi điểm', effects: { attackBonus: 10 } },
        { id: 'van_doc', name: 'Vạn Độc Bất Xâm', description: '+10 Thủ khởi điểm', effects: { defenseBonus: 10 } },
    ],
    'Vận Mệnh (Tùy chọn)': [
        { id: 'than_may_man', name: 'Thần May Mắn', description: '+10% Linh Thạch nhận được', effects: { linhThachGainModifier: 0.1 } },
        { id: 'van_rui', name: 'Kẻ Vận Rủi', description: 'Tu vi nhận -10%, +5 Công & Thủ', effects: { cultivationGainModifier: -0.1, attackBonus: 5, defenseBonus: 5 } },
    ]
};


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
    { id: 'cave', name: 'Hang Động', description: 'Một hang động tối tăm, ẩm ướt, có thể tìm thấy khoáng thạch quý hiếm.' },
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
        description: 'Đệ tử chân truyền của Thiên Kiếm Tông. Lạnh lùng như băng, kiếm pháp sắc bén vô tình, nhưng sâu trong nội tâm là một trái tim giữ vững chính nghĩa và một nỗi cô đơn không ai thấu.',
        realm: 'Trúc Cơ',
        cultivation: 1100,
        relationshipPoints: 0,
        status: 'Xa lạ',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/736x/a6/06/87/a606871c577037f94191bec853f7c223.jpg',
    },
    {
        id: 'npc_thach_nghi',
        name: 'Thạch Nghị',
        gender: 'Nam',
        description: 'Thiếu chủ của Thạch gia, một gia tộc luyện thể cổ xưa. Tính cách bá đạo, tự phụ, coi trời bằng vung. Mục tiêu duy nhất là trở thành kẻ mạnh nhất, vượt qua cái bóng của tổ phụ.',
        realm: 'Trúc Cơ',
        cultivation: 1250,
        relationshipPoints: -10,
        status: 'Xa lạ',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/736x/87/c1/67/87c167e93ead41b8a892b67f18544e3f.jpg',
    },
    {
        id: 'npc_tieu_y_tien',
        name: 'Tiêu Y Tiên',
        gender: 'Nữ',
        description: 'Tán tu bí ẩn, nổi danh với y thuật và độc thuật song tuyệt. Tính cách thất thường, lúc cứu người, lúc hại người, hành tung bất định, không ai biết được quá khứ của nàng.',
        realm: 'Kết Đan',
        cultivation: 5500,
        relationshipPoints: 5,
        status: 'Người quen',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/originals/a9/a7/a7/a9a7a7d432b508f6575971a24d5d85c8.jpg',
    },
    {
        id: 'npc_han_thien',
        name: 'Hàn Thiên',
        gender: 'Nam',
        description: 'Một tán tu có vẻ ngoài bình thường nhưng tâm tư sâu như biển. Hành sự cẩn trọng đến mức đáng sợ, dường như luôn tính trước ba bước. Che giấu một bí mật động trời.',
        realm: 'Trúc Cơ',
        cultivation: 1500,
        relationshipPoints: 0,
        status: 'Xa lạ',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/736x/67/6f/30/676f30d0725a3962639080b031b2a95c.jpg',
    },
    {
        id: 'npc_diep_thanh_ca',
        name: 'Diệp Thanh Ca',
        gender: 'Nữ',
        description: 'Tiểu sư muội được yêu quý nhất của Vạn Dược Cốc. Ngây thơ, trong sáng, có tài năng luyện đan hiếm có. Luôn mang theo mình một giỏ linh thảo và nụ cười ấm áp.',
        realm: 'Luyện Khí',
        cultivation: 800,
        relationshipPoints: 15,
        status: 'Người quen',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/736x/21/24/a7/2124a7731758c035b3d0d346757b01d3.jpg',
    },
    {
        id: 'npc_lieu_nhu_yen',
        name: 'Liễu Như Yên',
        gender: 'Nữ',
        description: 'Thánh nữ của Hợp Hoan Phái, vẻ đẹp yêu kiều, quyến rũ chết người. Mỗi lời nói, cử chỉ đều mang theo mị lực khó cưỡng. Nguy hiểm và đầy cám dỗ.',
        realm: 'Kết Đan',
        cultivation: 6000,
        relationshipPoints: -5,
        status: 'Xa lạ',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/originals/77/b1/d6/77b1d620579a7774785499092497645f.jpg',
    },
    {
        id: 'npc_moc_nguyet_anh',
        name: 'Mộc Nguyệt Anh',
        gender: 'Nữ',
        description: 'Nữ tu của Huyền Phù Môn, chuyên về trận pháp và phù lục. Trầm tính, ít nói, thích nghiên cứu các cổ tự và trận đồ hơn là giao tiếp với người khác.',
        realm: 'Trúc Cơ',
        cultivation: 1300,
        relationshipPoints: 0,
        status: 'Xa lạ',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/originals/a4/0c/ac/a40cac5a557d342398ef364e7828033c.jpg',
    },
    {
        id: 'npc_tuu_kiem_tien',
        name: 'Tửu Kiếm Tiên',
        gender: 'Nam',
        description: 'Lão già say xỉn bạn tình cờ gặp ở Thành Trấn, lưng đeo hồ lô rượu, tay cầm kiếm gỗ. Trông có vẻ lôi thôi nhưng đôi khi lại nói ra những lời đầy triết lý và kiếm ý sâu xa.',
        realm: 'Không rõ',
        cultivation: 99999,
        relationshipPoints: 0,
        status: 'Xa lạ',
        isLover: false,
        avatarUrl: 'https://i.pinimg.com/736x/d4/3b/b1/d43bb1342f1f4e1577c21950e7b8c7e0.jpg',
    }
];

export const SHOP_ITEMS_POOL: Omit<Item, 'id'>[] = [
    // --- Materials ---
    { name: 'Thiết Quặng', type: 'material', description: 'Quặng sắt thô, dùng để rèn trang bị.', cost: 15, effects: {} },
    { name: 'Linh Thạch Thô', type: 'material', description: 'Đá chứa linh khí chưa được tinh luyện, có thể dùng trong trận pháp.', cost: 40, effects: {} },
    { name: 'Huyền Thiết Quặng', type: 'material', description: 'Một loại khoáng thạch quý hiếm, cực kỳ cứng rắn.', cost: 120, effects: {} },
    { name: 'Yêu Đan (Hạ phẩm)', type: 'material', description: 'Nội đan của yêu thú cấp thấp, chứa đựng yêu lực.', cost: 200, effects: {} },
    // --- Consumables (Healing) ---
    { name: 'Hồi Phục Đan (Hạ phẩm)', type: 'consumable', description: 'Hồi phục 50 HP.', effects: { health: 50 }, cost: 20 },
    { name: 'Hồi Phục Đan (Hạ phẩm)', type: 'consumable', description: 'Hồi phục 50 HP.', effects: { health: 50 }, cost: 20 },
    { name: 'Hồi Phục Đan (Trung phẩm)', type: 'consumable', description: 'Hồi phục 200 HP.', effects: { health: 200 }, cost: 80 },
    { name: 'Hồi Phục Đan (Trung phẩm)', type: 'consumable', description: 'Hồi phục 200 HP.', effects: { health: 200 }, cost: 80 },
    { name: 'Bách Thảo Lộ', type: 'consumable', description: 'Tinh hoa trăm loại linh thảo, hồi phục 500 HP.', effects: { health: 500 }, cost: 250 },
    { name: 'Ngọc Tủy Cao', type: 'consumable', description: 'Cao dược quý hiếm, hồi phục 1500 HP.', effects: { health: 1500 }, cost: 800 },
    // --- Consumables (Cultivation) ---
    { name: 'Tụ Linh Đan', type: 'consumable', description: 'Tăng 50 Tu vi.', effects: { cultivation: 50 }, cost: 150 },
    { name: 'Trúc Cơ Đan', type: 'consumable', description: 'Hỗ trợ đột phá Trúc Cơ, tăng 250 Tu vi.', effects: { cultivation: 250 }, cost: 800 },
    { name: 'Ngưng Nguyên Đan', type: 'consumable', description: 'Tăng 1000 Tu vi.', effects: { cultivation: 1000 }, cost: 3500 },
    { name: 'Phá Anh Đan', type: 'consumable', description: 'Tăng 5000 Tu vi.', effects: { cultivation: 5000 }, cost: 18000 },
    // --- Weapons ---
    { name: 'Thiết Kiếm', type: 'weapon', description: 'Một thanh kiếm sắt bình thường.', effects: { attack: 8 }, cost: 50 },
    { name: 'Bạch Ngọc Kiếm', type: 'weapon', description: 'Kiếm làm từ bạch ngọc, vừa đẹp vừa sắc.', effects: { attack: 25 }, cost: 300 },
    { name: 'Huyền Thiết Trọng Kiếm', type: 'weapon', description: 'Cực kỳ nặng, uy lực kinh người.', effects: { attack: 80 }, cost: 2000 },
    { name: 'Tử Điện Đao', type: 'weapon', description: 'Lưỡi đao ẩn chứa lôi điện chi lực.', effects: { attack: 200 }, cost: 8000 },
    // --- Armor ---
    { name: 'Da Thú Giáp', type: 'armor', description: 'Giáp làm từ da yêu thú cấp thấp.', effects: { defense: 10 }, cost: 40 },
    { name: 'Thiết Giáp', type: 'armor', description: 'Một bộ giáp sắt chắc chắn.', effects: { defense: 30 }, cost: 250 },
    { name: 'Linh Tàm Bảo Giáp', type: 'armor', description: 'Dệt từ tơ linh tàm, nhẹ mà bền.', effects: { defense: 90 }, cost: 2200 },
    { name: 'Long Lân Giáp', type: 'armor', description: 'Chế từ vảy của một loại Giao Long.', effects: { defense: 220 }, cost: 9000 },
    // --- Technique Scrolls ---
    { name: 'Bí tịch: Linh Hỏa Quyết', type: 'techniqueScroll', description: 'Ghi lại công pháp Linh Hỏa Quyết. Đọc để học.', cost: 20000, technique: TECHNIQUES[1], effects: {} },
    { name: 'Bí tịch: Huyền Băng Lục', type: 'techniqueScroll', description: 'Ghi lại công pháp Huyền Băng Lục. Đọc để học.', cost: 18000, technique: TECHNIQUES[2], effects: {} },
];

export const AUCTION_ITEM_POOL: Omit<Item, 'id'>[] = [
    { name: 'Bí tịch: Vạn Kiếm Quy Tông', type: 'techniqueScroll', description: 'Công pháp kiếm tu thượng thừa, nghe đồn có thể chém rách không gian.', cost: 150000, technique: TECHNIQUES[3], effects: {} },
    { name: 'Phá Giới Đan', type: 'consumable', description: 'Đan dược cực phẩm, tăng mạnh tu vi, hỗ trợ phá cảnh giới.', effects: { cultivation: 20000 }, cost: 80000 },
    { name: 'Huyết Long Giáp', type: 'armor', description: 'Giáp được rèn từ vảy và máu của Huyết Long, phòng ngự vô song.', effects: { defense: 500 }, cost: 120000 },
    { name: 'Thí Thần Thương', type: 'weapon', description: 'Một cây thương cổ xưa ẩn chứa sát khí kinh thiên.', effects: { attack: 450 }, cost: 120000 },
    { name: 'Cửu Chuyển Hoàn Hồn Đan', type: 'consumable', description: 'Tiên đan trong truyền thuyết, có thể cải tử hồi sinh (hồi đầy HP và tăng tối đa HP).', effects: { health: 99999 }, cost: 200000 },
    { name: 'Không Gian Giới Chỉ', type: 'accessory', description: 'Một chiếc nhẫn chứa không gian riêng, tăng sức tấn công và phòng thủ.', effects: { attack: 50, defense: 50 }, cost: 90000 }
];

export function generateAuctionItems(playerRealm: string): AuctionItem[] {
    const realmIndex = REALMS.findIndex(r => r.name === playerRealm);
    const auctionItems: AuctionItem[] = [];
    const numItems = 3 + Math.floor(Math.random() * 2); // 3 to 4 items

    const availableItems = [...AUCTION_ITEM_POOL].filter(item => {
        if (realmIndex < 2 && item.cost! > 100000) return false;
        if (realmIndex < 3 && item.cost! > 160000) return false;
        return true;
    });

    while (auctionItems.length < numItems && availableItems.length > 0) {
        const itemProto = availableItems.splice(Math.floor(Math.random() * availableItems.length), 1)[0];
        const startingBid = Math.round((itemProto.cost ?? 50000) * 0.7);
        auctionItems.push({
            item: { ...itemProto, cost: itemProto.cost, id: `${Date.now()}-auction-${auctionItems.length}` },
            startingBid: startingBid,
            currentBid: startingBid,
            highestBidderId: null,
            highestBidderName: null,
            status: 'ongoing',
        });
    }
    return auctionItems;
}


export function generateShopStock(playerRealm: string): Item[] {
    const realmIndex = REALMS.findIndex(r => r.name === playerRealm);
    let stock: Item[] = [];
    const numItems = 8 + Math.floor(Math.random() * 5); // 8 to 12 items

    const availableItems = SHOP_ITEMS_POOL.filter(item => {
        const itemCost = item.cost ?? 0;
        if (realmIndex <= 1) return itemCost < 500; // Luyện Khí, Trúc Cơ
        if (realmIndex <= 2) return itemCost < 4000; // Kết Đan (allow mid-tier scrolls)
        if (realmIndex <= 3) return itemCost < 25000; // Nguyên Anh (allow high-tier scrolls)
        return true; // Hóa Thần trở lên
    });
    
    // Ensure at least 2 healing items
    const healingItems = availableItems.filter(item => item.type === 'consumable' && item.effects.health);
    for(let i=0; i<2 && healingItems.length > 0; i++) {
        const itemProto = healingItems[Math.floor(Math.random() * healingItems.length)];
        const finalCost = Math.round((itemProto.cost ?? 0) * 1.5);
        stock.push({ ...itemProto, cost: finalCost, id: `${Date.now()}-shop-${stock.length}` });
    }

    while (stock.length < numItems && availableItems.length > 0) {
        const itemProto = availableItems[Math.floor(Math.random() * availableItems.length)];
        // Add some variety, don't add the same item too many times
        if (stock.filter(i => i.name === itemProto.name).length < 2) {
             const finalCost = Math.round((itemProto.cost ?? 0) * 1.5);
             stock.push({ ...itemProto, cost: finalCost, id: `${Date.now()}-shop-${stock.length}` });
        }
    }

    return stock.sort((a,b) => (a.cost ?? 0) - (b.cost ?? 0));
}

export interface CharacterCreationOptions {
    name: string;
    gender: Gender;
    talents: string[];
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
        
        const allTalents = Object.values(TALENTS).flat();
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
                    cultivationBonus: 2.5,
                }
            },
            currentLocation: chosenSect.name,
            activeQuest: null,
            talents: options.talents,
            avatarUrl: options.avatarUrl,
            spouseId: null,
            sect: chosenSect.name,
            family: options.family,
            sectRank: SECT_RANKS[0].name,
            pets: [],
            linhThachGainModifier: 1.0,
            cultivationGainModifier: 1.0,
        };

        // Apply talent effects
        options.talents.forEach(talentId => {
            const talent = allTalents.find(t => t.id === talentId);
            if (talent) {
                const talentEffects = talent.effects;
                 if (talentEffects.maxHealthModifier) initialPlayer.maxHealth *= (1 + talentEffects.maxHealthModifier);
                 if (talentEffects.attackBonus) initialPlayer.stats.attack += talentEffects.attackBonus;
                 if (talentEffects.defenseBonus) initialPlayer.stats.defense += talentEffects.defenseBonus;
                 if (talentEffects.linhThachGainModifier) initialPlayer.linhThachGainModifier += talentEffects.linhThachGainModifier;
                 if (talentEffects.cultivationGainModifier) initialPlayer.cultivationGainModifier += talentEffects.cultivationGainModifier;
            }
        });
        initialPlayer.maxHealth = Math.round(initialPlayer.maxHealth);
        initialPlayer.health = initialPlayer.maxHealth;

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
                        cultivationBonus: 4,
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
                effects: { cultivationBonus: 3.5 },
            };
        }
        
        return { player: initialPlayer };
    };

    public async getYearlyEventChoice(player: Player, npcs: NPC[], nsfwAllowed: boolean): Promise<YearlyEvent> {
        const locationInfo = LOCATIONS.find(l => l.name === player.currentLocation)?.description ?? "một nơi vô định";
        const sectKey = Object.keys(SECTS).find(key => SECTS[key as SectChoice].name === player.sect) as SectChoice | undefined;
        const sectDescription = sectKey ? SECTS[sectKey].description : "một tông môn vô danh";

        const questContext = player.activeQuest 
            ? `Người chơi đang có nhiệm vụ: "${player.activeQuest.title}" (${player.activeQuest.description}). Nhiệm vụ này cần tổng cộng ${player.activeQuest.duration} lượt để hoàn thành, đã qua ${player.activeQuest.progress} lượt.`
            : "Người chơi hiện không có nhiệm vụ nào.";
            
        const npcContext = npcs.length > 0
            ? `Các NPC quan trọng trong đời bạn: ${npcs.map(n => `${n.name} (${n.gender}, ${n.status}: ${n.relationshipPoints} điểm)`).join(', ')}.`
            : "Hiện tại không có NPC quan trọng nào.";

        const nsfwContext = nsfwAllowed
            ? "LƯU Ý: Tùy chọn nội dung người lớn (18+) đang BẬT. Bạn có thể tạo ra các sự kiện có chủ đề trưởng thành hơn, bao gồm bạo lực, âm mưu đen tối, và các mối quan hệ phức tạp."
            : "LƯU Ý: Tùy chọn nội dung người lớn (18+) đang TẮT. Giữ cho tất cả các sự kiện phù hợp với mọi lứa tuổi, tập trung vào tu luyện, phiêu lưu và tình bạn trong sáng.";

        const validLocations = LOCATIONS.map(l => `'${l.name}'`).join(', ');
        
        const allTalentsFlat = Object.values(TALENTS).flat();
        const playerTalentNames = player.talents.map(id => allTalentsFlat.find(t => t.id === id)?.name).filter(Boolean).join(', ');

        const systemInstruction = `Bạn là người quản trò cho một trò chơi mô phỏng 'Tu Tiên'. Dựa vào trạng thái của người chơi, hãy tạo một sự kiện có 2-4 lựa chọn. Chỉ trả lời bằng một đối tượng JSON hợp lệ, không có markdown.
        - ${nsfwContext}
        - Người chơi là một đệ tử ${player.gender === 'Nữ' ? 'nữ' : 'nam'} của **${player.sect}** với chức vụ là **${player.sectRank}**. Đặc điểm của tông môn: ${sectDescription}.
        - Gia tộc người chơi: **${player.family}**.
        - Các thiên phú của người chơi: ${playerTalentNames || 'Không có'}.
        - ${questContext}
        - Vị trí hiện tại của người chơi là '${player.currentLocation}', nơi được mô tả là: '${locationInfo}'.
        - ${npcContext}
        - **LUẬT CHƠI QUAN TRỌNG**: Game có hệ thống Đại Hội Thiên Kiêu, Đấu Giá Hội và giới hạn tuổi. Bạn không cần tạo sự kiện cho chúng.
        
        QUY TẮC TẠO SỰ KIỆN:
        0.  **Sáng Tạo & Đa Dạng:** Hãy sáng tạo! Tạo ra những tình huống bất ngờ, những cơ duyên lạ lùng, những âm mưu phức tạp, hoặc những khoảnh khắc đời thường ý nghĩa. Khai thác sâu hơn vào bối cảnh của tông môn, gia tộc, và các mối quan hệ NPC. Đừng lặp lại các loại sự kiện quá thường xuyên.
        1.  **Sự kiện NPC:** Thỉnh thoảng (khoảng 30% cơ hội), tạo sự kiện liên quan đến một trong các NPC. Sự kiện có thể tương tác với NPC khác giới tính và tạo cơ hội phát triển tình cảm nếu hợp lý. **Giảm tần suất:** Nhân vật Tiêu Y Tiên là một người bí ẩn, hãy để cô ấy xuất hiện với tần suất thấp hơn đáng kể so với các NPC khác.
        2.  **Truyền Âm Phù (NPC chủ động):** Nếu một NPC có điểm hảo cảm >= 100 và chưa phải là đạo lữ, có 15% cơ hội tạo một sự kiện họ chủ động gửi tin nhắn cho bạn. 'description' nên là: 'Bạn nhận được truyền âm phù từ [NPC Name]: "[Nội dung tin nhắn]"'. Các lựa chọn là lời đáp lại của người chơi, có hiệu ứng tăng hảo cảm nhẹ.
        3.  **Tình Cảm Sâu Sắc:**
            - **Tỏ Tình:** Nếu một NPC có điểm hảo cảm > 200 và người chơi chưa có đạo lữ, bạn có thể tạo sự kiện NPC đó tỏ tình. Lựa chọn đồng ý PHẢI có hiệu ứng \`"newSpouse": { "npcId": "..." }\`.
            - **Song Tu (18+):** Nếu người chơi ĐÃ CÓ đạo lữ và tùy chọn 18+ đang BẬT, bạn có thể tạo ra các sự kiện lãng mạn, thân mật dẫn đến "Song Tu". Lựa chọn này NÊN có hiệu ứng \`"dualCultivation": true\` để thưởng một lượng lớn tu vi. Mô tả sự kiện có thể trưởng thành hơn.
        4.  **Lựa Chọn May Rủi:** Đối với các lựa chọn có kết quả không chắc chắn (ví dụ: đột phá mạo hiểm, trộm cắp, thuyết phục một nhân vật khó tính, khám phá một nơi nguy hiểm), bạn có thể tùy chọn thêm trường \`"successChance": <số_nguyên_từ_1_đến_100>\`. Ví dụ: \`"text": "Thử đột nhập vào kho tàng", "successChance": 40, "effects": { "newItem": ... }\`. **Hiệu ứng trong 'effects' chỉ áp dụng khi thành công.** Game sẽ tự xử lý hậu quả khi thất bại. Nếu bạn không cung cấp, lựa chọn được coi là thành công 100%.
        5.  **Xử lý Nhiệm vụ:** Nếu người chơi đang ở sai vị trí nhiệm vụ, tạo sự kiện nhắc nhở họ di chuyển đến ${player.activeQuest?.location ?? 'địa điểm nhiệm vụ'}.
        6.  **Nhận Nhiệm vụ mới:** Nếu người chơi đang ở trong tông môn của họ (${player.sect}) và không có nhiệm vụ, ưu tiên tạo sự kiện nhận nhiệm vụ mới.
            - **Yêu cầu Nhiệm vụ:** Mỗi đối tượng \`newQuest\` BẮT BUỘC phải có một trường \`title\` là một chuỗi văn bản ngắn gọn, hấp dẫn, không được để trống hoặc là "undefined". Ví dụ: "Thu Thập Huyết Tinh Thảo", "Diệt Trừ Lang Yêu". Ngoài ra, phải có \`description\`, \`location\`, \`difficulty\`, \`duration\`, \`reward\` và \`healthCostPerTurn\`.
            - **Vị trí & Thời gian:** Trường "location" cho nhiệm vụ mới PHẢI LÀ MỘT trong các địa điểm hợp lệ sau: ${validLocations}. Thời gian (\`duration\`) tính bằng LƯỢT (mỗi lượt là 6 tháng).
            - **Rủi ro & Tổn thất:** Bắt buộc thêm trường \`"healthCostPerTurn"\` vào mỗi nhiệm vụ. Đây là lượng HP người chơi mất MỖI LƯỢT làm nhiệm vụ. Chi phí này phải hợp lý: nhiệm vụ an toàn (giao hàng, đưa thư) mất 0-5 HP; nhiệm vụ thu thập (hái thuốc ở nơi nguy hiểm) mất 5-15 HP; nhiệm vụ chiến đấu (săn yêu thú, diệt trừ ma tu) mất 10-30 HP.
        7.  **Vật Phẩm Mới:** 'newItem' là một đối tượng. Nó có thể là trang bị, đan dược, bí tịch hoặc nguyên liệu. Khi tạo 'newItem', nếu đó là vật phẩm có thể mua bán, hãy tùy chọn thêm trường "cost" là giá trị cơ bản của nó bằng linh thạch.
            - \`type\`: 'weapon', 'armor', 'accessory', 'consumable', 'techniqueScroll', 'material'.
            - \`effects\`: Một đối tượng chứa \`attack\`, \`defense\`, \`health\`, \`cultivation\`. Chỉ áp dụng cho trang bị và đan dược. Đối với 'material', hãy để \`effects\` là một đối tượng trống.
            - \`technique\`: Một đối tượng \`CultivationTechnique\`. Chỉ áp dụng cho \`techniqueScroll\`.
            - **Hãy tạo ra các loại đan dược mạnh hơn và trang bị đa dạng hơn, đặc biệt khi người chơi ở cảnh giới cao. Lượng tu vi nhận được nên hợp lý, tránh cho quá nhiều.**
        8.  **Sủng Vật Mới:** 'newPet' là một đối tượng để ban thưởng sủng vật đồng hành.
            - \`name\`, \`species\`, \`description\`: Mô tả về sủng vật.
            - \`effects\`: Bắt buộc phải có \`cultivationBonusPerYear\` để tăng tu vi mỗi năm cho người chơi.
        9.  **Bí Cảnh:** 'startSecretRealm' là một đối tượng để bắt đầu một cuộc thám hiểm lớn.
            - Sự kiện này PHẢI hiếm.
            - \`name\`, \`description\`, \`duration\` (số lượt), \`reward\` (phần thưởng lớn khi hoàn thành).
        10. **KHÔNG SỬ DỤNG:** Tuyệt đối không tạo hiệu ứng "questProgress", "breakthroughAttempt", "auctionAction". Không tự tạo trường "id" cho các vật phẩm, nhiệm vụ, hoặc bí cảnh mới; hệ thống sẽ tự xử lý.

        CẤU TRÚC JSON:
        { 
          "description": "Mô tả sự kiện", 
          "choices": [ 
            { 
              "text": "Mô tả lựa chọn chắc chắn", 
              "effects": { "cultivationGained": 5, "healthChange": -5 } 
            },
            {
              "text": "Lựa chọn nhận nhiệm vụ",
              "effects": {
                 "newQuest": {
                   "title": "Thu Thập Thảo Dược",
                   "description": "Một trưởng lão cần bạn thu thập 10 cây Huyết Linh Chi.",
                   "location": "Rừng Rậm",
                   "difficulty": "đơn giản",
                   "duration": 2,
                   "healthCostPerTurn": 5,
                   "reward": { "linhThach": 100, "cultivation": 50 }
                 }
              }
            }
          ] 
        }
        - Các khóa trong 'effects' và 'successChance' là tùy chọn.`;

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
            const allTalents = Object.values(TALENTS).flat();
            const talentBonusPerYear = player.talents.reduce((acc, talentId) => {
                const talentInfo = allTalents.find(t => t.id === talentId);
                return acc + (talentInfo?.effects.cultivationBonus ?? 0);
            }, 0);
            
            return {
                description: "Nửa năm trôi qua trong tĩnh lặng khi bạn đang ở " + player.currentLocation + ". Bạn quyết định tập trung vào việc gì?",
                choices: [
                    {
                        text: "Chuyên tâm tu luyện.",
                        effects: {
                            cultivationGained: 6 + ((player.cultivationTechnique?.effects.cultivationBonus ?? 0) / 2) + (talentBonusPerYear / 2),
                        }
                    },
                    {
                        text: "Tịnh dưỡng, phục hồi.",
                        effects: {
                            healthChange: 10
                        }
                    }
                ]
            };
        }
    };

    public async getNpcConversation(player: Player, npc: NPC): Promise<YearlyEvent> {
        const systemInstruction = `Bạn là người quản trò (GM) cho một trò chơi mô phỏng 'Tu Tiên'. Người chơi đang chủ động gửi "Truyền Âm Phù" (tin nhắn) đến một NPC thân thiết. Hãy tạo ra một cuộc hội thoại ngắn.

        **Bối cảnh:**
        - Người gửi: ${player.name} (${player.gender}, ${player.realm})
        - Người nhận: ${npc.name} (${npc.gender}, ${npc.realm}), mô tả: "${npc.description}"
        - Mối quan hệ hiện tại: ${npc.status} (${npc.relationshipPoints} điểm)

        **Yêu cầu:**
        1.  Tạo một đoạn mô tả ngắn về việc NPC nhận được tin nhắn và phản hồi ban đầu. Đây là trường "description".
        2.  Tạo 2-3 lựa chọn ("choices") cho người chơi để đáp lại.
        3.  Mỗi lựa chọn phải có hiệu ứng "relationshipChange" để tăng một chút điểm hảo cảm (ví dụ: 3-10 điểm).
        4.  Chỉ trả lời bằng một đối tượng JSON hợp lệ, không markdown, theo cấu trúc bên dưới.

        **Cấu trúc JSON:**
        {
          "description": "NPC nhận được tin nhắn và nói gì đó...",
          "choices": [
            {
              "text": "Lời đáp lại 1 của người chơi (ví dụ: hỏi thăm sức khỏe)",
              "effects": { "relationshipChange": { "npcId": "${npc.id}", "points": 5 } }
            },
            {
              "text": "Lời đáp lại 2 của người chơi (ví dụ: rủ đi dạo)",
              "effects": { "relationshipChange": { "npcId": "${npc.id}", "points": 8 } }
            }
          ]
        }`;

        const prompt = `Tạo một cuộc hội thoại cho ${player.name} gửi đến ${npc.name}.`;

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: `${systemInstruction}\n\n${prompt}`,
                config: {
                    temperature: 0.9,
                    responseMimeType: "application/json",
                }
            });

            let jsonStr = response.text.trim();
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
                jsonStr = match[2].trim();
            }
            
            const parsedData = JSON.parse(jsonStr) as YearlyEvent;
            
            if (!parsedData.description || !parsedData.choices || parsedData.choices.length === 0) {
                throw new Error("Invalid conversation structure from AI.");
            }

            return parsedData;

        } catch (e) {
            console.error("Failed to generate conversation:", e);
            return {
                description: `Truyền âm phù của bạn đã được gửi đi, nhưng không có hồi âm. Có lẽ ${npc.name} đang bận.`,
                choices: [{ text: "Đóng", effects: {} }]
            };
        }
    }
}