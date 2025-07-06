export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'techniqueScroll' | 'material';

export interface CultivationTechnique {
  name: string;
  rank: 'Phàm phẩm' | 'Linh phẩm' | 'Tiên phẩm';
  description: string;
  effects: {
    cultivationBonus: number;
  };
}

export interface Realm {
  name: string;
  minCultivation: number;
  maxAge: number; // Thọ nguyên tối đa cho cảnh giới này
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  effects: {
    attack?: number;
    defense?: number;
    health?: number;
    cultivation?: number;
  };
  cost?: number;
  technique?: CultivationTechnique;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    location: string; // Tên địa điểm để hoàn thành
    difficulty: 'đơn giản' | 'trung bình' | 'khó';
    duration: number; // in turns
    reward: {
        linhThach?: number;
        cultivation?: number;
        item?: Item;
    };
    healthCostPerTurn?: number;
}

export type NewQuestData = Omit<Quest, 'id'>;

export interface ActiveQuest extends Quest {
    progress: number; // turns progressed
}

export interface Opponent {
    id: string;
    name: string;
    title: string;
    realm: string;
    stats: {
        attack: number;
        defense: number;
        health: number;
    };
}

export interface Match {
    player1: Player | Opponent;
    player2: Player | Opponent;
    winner: 'player1' | 'player2' | null;
}

export interface Tournament {
    year: number;
    isActive: boolean;
    currentRound: number; // 1 = Tứ kết, 2 = Bán kết, 3 = Chung kết
    bracket: Match[][]; // Mảng các vòng đấu, mỗi vòng là một mảng các trận đấu
}

export interface RankEntry {
    rank: number;
    name: string;
    realm: string;
    year: number;
    achievement: string;
}

export type Gender = 'Nam' | 'Nữ';
export type RelationshipStatus = 'Tử địch' | 'Kẻ thù' | 'Xa lạ' | 'Người quen' | 'Bạn bè' | 'Thân thiết' | 'Tri kỷ' | 'Bạn đời';
export type SectChoice = 'thiên kiếm' | 'vạn dược' | 'huyền phù';

export interface NPC {
    id: string;
    name: string;
    gender: Gender;
    description: string;
    realm: string;
    cultivation: number;
    relationshipPoints: number;
    status: RelationshipStatus;
    isLover: boolean;
    avatarUrl?: string;
}

export interface Pet {
    id: string;
    name: string;
    species: string;
    description: string;
    effects: {
        cultivationBonusPerYear?: number;
    };
}

export interface SecretRealm {
    id: string;
    name:string;
    description: string;
    duration: number; // in turns
    progress: number; // turns progressed
    reward: {
        linhThach?: number;
        cultivation?: number;
        item?: Item;
    };
}


export interface Player {
  name:string;
  gender: Gender;
  age: number;
  health: number;
  maxHealth: number;
  realm: string;
  cultivation: number;
  cultivationForNextRealm: number;
  stats: {
    attack: number;
    defense: number;
  };
  inventory: Item[];
  equipment: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  linhThach: number;
  cultivationTechnique: CultivationTechnique | null;
  currentLocation: string;
  activeQuest: ActiveQuest | null;
  talents: string[]; // IDs of selected talents
  avatarUrl: string;
  spouseId: string | null;
  sect: string;
  family: string;
  sectRank: string;
  pets: Pet[];
  linhThachGainModifier: number;
  cultivationGainModifier: number;
}

export interface EventLogEntry {
  id: number;
  year: number;
  text: string;
  isMajor: boolean;
}

export interface EventChoice {
    text: string;
    successChance?: number; // Optional success chance percentage (0-100)
    effects: {
        cultivationGained?: number;
        healthChange?: number;
        linhThachChange?: number;
        newItem?: {
            name: string;
            type: ItemType;
            description: string;
            effects?: {
                attack?: number;
                defense?: number;
                health?: number;
                cultivation?: number;
            };
            technique?: CultivationTechnique;
            cost?: number;
        };
        newQuest?: NewQuestData;
        tournamentAction?: 'join' | 'decline' | 'fight';
        auctionAction?: 'join' | 'decline';
        relationshipChange?: {
            npcId: string;
            points: number;
        };
        newSpouse?: {
            npcId: string;
        };
        newPet?: {
            name: string;
            species: string;
            description: string;
            effects: {
                cultivationBonusPerYear?: number;
            };
        };
        startSecretRealm?: Omit<SecretRealm, 'id' | 'progress'>;
        dualCultivation?: boolean;
        breakthroughAttempt?: boolean;
    }
}

export interface YearlyEvent {
    description: string;
    choices: EventChoice[];
}

export type Difficulty = 'đơn giản' | 'trung bình' | 'khó' | 'ác mộng';

export interface AuctionItem {
    item: Item;
    startingBid: number;
    currentBid: number;
    highestBidderId: 'player' | string | null; // string for NPC id
    highestBidderName: string | null;
    status: 'ongoing' | 'sold' | 'passed';
}

export interface Auction {
    year: number;
    isActive: boolean;
    items: AuctionItem[];
    currentItemIndex: number;
    log: string[];
}


export interface GameState {
  player: Player | null;
  year: number;
  eventLog: EventLogEntry[];
  isGameOver: boolean;
  isLoading: boolean;
  error: string | null;
  gameStarted: boolean;
  currentEvent: YearlyEvent | null;
  hasTraveledThisYear: boolean;
  difficulty: Difficulty;
  tournament: Tournament | null;
  geniusRanking: RankEntry[];
  npcs: NPC[];
  nsfwAllowed: boolean;
  activeSecretRealm: SecretRealm | null;
  shopInventory: Item[];
  shopLastRefreshed: number;
  isBreakthroughPending: boolean;
  auction: Auction | null;
  activeConversation: { npcId: string; event: YearlyEvent } | null;
}