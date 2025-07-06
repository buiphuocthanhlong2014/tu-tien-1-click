import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Player, Item, EventLogEntry, YearlyEvent, EventChoice, ActiveQuest, Quest, Difficulty, Opponent, Tournament, RankEntry, Match, NPC, RelationshipStatus, SectChoice, ItemType, Gender, Pet, SecretRealm, Auction, NewQuestData } from './types';
import { GeminiService, REALMS, SECT_RANKS, CharacterCreationOptions, INITIAL_NPCS, generateShopStock, TECHNIQUES, TALENTS, generateAuctionItems, SECTS, LOCATIONS } from './services/geminiService';
import { EventLogPanel } from './components/StoryLog';
import { GameControls } from './components/PlayerInput';
import { GameOverlay } from './components/GameOverlay';
import { ItemInteractionModal } from './components/ItemInteractionModal';
import {
    MainMenu,
    CharacterCreationPanel,
    ApiKeySetupPanel,
    InstructionsPanel,
    UpdateLogPanel,
    GeniusRankingPanel,
    RelationshipPanel,
    MapPanel,
    PlayerInfoPanel,
    TournamentPanel,
    EventChoicePanel,
    ShopPanel,
    AuctionPanel,
    UpcomingEventsPanel,
    ConversationPanel,
    LocationImageDisplay
} from './components/AppComponents';

const SAVE_KEY = 'TUTIEN_SAVE_GAME';
const API_KEY_STORAGE_KEY = 'TUTIEN_API_KEY';
const TOURNAMENT_INTERVAL = 50;
const AUCTION_INTERVAL = 20;
const TOURNAMENT_FEE = 2000;
const SHOP_REFRESH_INTERVAL = 5; // in years

type AppView = 'main-menu' | 'character-creation' | 'playing' | 'instructions' | 'update-log' | 'api-key-setup';


const initialState: GameState = {
  player: null,
  year: 0,
  eventLog: [],
  isGameOver: false,
  isLoading: false,
  error: null,
  gameStarted: false,
  currentEvent: null,
  hasTraveledThisYear: false,
  difficulty: 'trung bình',
  tournament: null,
  geniusRanking: [],
  npcs: [],
  nsfwAllowed: false,
  activeSecretRealm: null,
  shopInventory: [],
  shopLastRefreshed: 0,
  isBreakthroughPending: false,
  auction: null,
  activeConversation: null,
};


function App() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isMapOpen, setMapOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(API_KEY_STORAGE_KEY));
  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('main-menu');
  const [localSaveExists, setLocalSaveExists] = useState(false);
  const [isRankingOpen, setRankingOpen] = useState(false);
  const [isRelationshipPanelOpen, setRelationshipPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{item: Item, isEquipped: boolean} | null>(null);
  const [isShopOpen, setShopOpen] = useState(false);
  const [isAuctionOpen, setAuctionOpen] = useState(false);

  const [locationImageCache, setLocationImageCache] = useState<Record<string, string>>({});
  const [currentLocationImage, setCurrentLocationImage] = useState<string>('');
  const [isLocationImageLoading, setLocationImageLoading] = useState<boolean>(false);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  });


  useEffect(() => {
    if (apiKey) {
      try {
        setGeminiService(new GeminiService(apiKey));
      } catch (e) {
        console.error("Failed to init Gemini Service:", e);
        setApiKey(null);
        alert("API Key không hợp lệ. Vui lòng kiểm tra lại.");
      }
    } else {
      setGeminiService(null);
    }
  }, [apiKey]);
  
  useEffect(() => {
    // Check if the auction panel should be open
    if (gameState.auction?.isActive) {
        setAuctionOpen(true);
    } else {
        setAuctionOpen(false);
    }
  }, [gameState.auction?.isActive]);

  useEffect(() => {
    const checkSave = () => {
      try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (!savedData) return false;
        // Basic check to see if it's a valid-looking save
        const parsed = JSON.parse(savedData);
        return !!parsed.player;
      } catch (e) {
        console.warn("Could not access localStorage. Private browsing or security settings may be preventing save/load functionality.");
        return false;
      }
    };
    setLocalSaveExists(checkSave());
  }, [currentView]);


  // Auto-save feature
  useEffect(() => {
    if (!gameState.gameStarted || gameState.isGameOver) {
      return;
    }

    const autoSaveInterval = setInterval(() => {
      try {
        const currentState = gameStateRef.current;
        if (currentState.player) {
          console.log(`[${new Date().toLocaleTimeString()}] Game auto-saved.`);
          localStorage.setItem(SAVE_KEY, JSON.stringify(currentState));
          setLocalSaveExists(true);
        }
      } catch (e) {
        console.error("Auto-save to localStorage failed:", e);
        // Potentially notify user that auto-save isn't working
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [gameState.gameStarted, gameState.isGameOver]);

    const generateAndSetLocationImage = useCallback(async (locationName: string) => {
        if (!geminiService || !gameState.player) return;
        
        if (locationImageCache[locationName]) {
            setCurrentLocationImage(locationImageCache[locationName]);
            return;
        }

        setLocationImageLoading(true);
        setCurrentLocationImage('');
        const locationDetails = LOCATIONS.find(l => l.name === locationName);
        if (locationDetails) {
            try {
                const imageUrl = await geminiService.generateLocationImage(locationName, locationDetails.description, gameState.player);
                if (imageUrl) {
                    setCurrentLocationImage(imageUrl);
                    setLocationImageCache(prevCache => ({...prevCache, [locationName]: imageUrl }));
                }
            } catch (e) {
                console.error("Image generation failed in App component:", e);
            }
        }
        setLocationImageLoading(false);
    }, [geminiService, gameState.player, locationImageCache]);

    useEffect(() => {
        if (geminiService && gameState.player?.currentLocation && currentView === 'playing') {
            generateAndSetLocationImage(gameState.player.currentLocation);
        }
    }, [geminiService, gameState.player?.currentLocation, currentView]);

  const calculateIntervalCountdown = (currentAge: number, interval: number, startAge: number): number => {
    const yearsSinceBase = currentAge - startAge;
    // If the current age is before or at the base age, the countdown is from the first event.
    if (yearsSinceBase <= 0) {
        return interval + yearsSinceBase;
    }
    const remainder = yearsSinceBase % interval;
    // Check for floating point issues when remainder is very close to 0
    if (Math.abs(remainder) < 0.001 || Math.abs(remainder - interval) < 0.001) {
        return 0; // It's this year
    }
    return interval - remainder;
  };

  const getRelationshipStatus = (points: number): RelationshipStatus => {
    if (points <= -75) return 'Tử địch';
    if (points <= -25) return 'Kẻ thù';
    if (points < 25) return 'Xa lạ';
    if (points < 50) return 'Người quen';
    if (points < 100) return 'Thân thiết';
    if (points < 200) return 'Tri kỷ';
    return 'Bạn đời';
  };

  const progressNpcs = (npcs: NPC[]): NPC[] => {
      return npcs.map(npc => {
          const currentNpcRealmIndex = REALMS.findIndex(r => r.name === npc.realm);
          // NPCs progress a bit slower/faster than player
          const progressionRate = (10 + Math.random() * 15) * (1 + currentNpcRealmIndex * 0.2) / 2;
          let newCultivation = npc.cultivation + progressionRate;
          let newRealm = npc.realm;

          if (currentNpcRealmIndex < REALMS.length - 1) {
              const nextRealm = REALMS[currentNpcRealmIndex + 1];
              if (newCultivation >= nextRealm.minCultivation) {
                  newRealm = nextRealm.name;
              }
          }
          return { ...npc, cultivation: Math.round(newCultivation), realm: newRealm };
      });
  };

  const handleSetApiKey = (newKey: string) => {
    localStorage.setItem(API_KEY_STORAGE_KEY, newKey);
    setApiKey(newKey);
    setCurrentView('main-menu');
  };

  const handleStartGame = useCallback(async (options: CharacterCreationOptions & { difficulty: Difficulty }) => {
    if (!geminiService) return;
    setGameState({ ...initialState, isLoading: true, difficulty: options.difficulty, nsfwAllowed: options.nsfwAllowed });
    try {
      const { player } = await geminiService.startNewGame(options);
      const newState: GameState = {
        ...initialState,
        difficulty: options.difficulty,
        gameStarted: true,
        player,
        year: player.age,
        eventLog: [{id: 0, year: player.age, text: `Hành trình của bạn bắt đầu tại <strong>${player.currentLocation}</strong>.`, isMajor: true}],
        npcs: JSON.parse(JSON.stringify(INITIAL_NPCS)),
        isLoading: false,
        nsfwAllowed: options.nsfwAllowed,
      };
      setGameState(newState);
      setCurrentView('playing');
    } catch (e) {
      const error = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
      setGameState({ ...initialState, error: `Không thể bắt đầu trò chơi: ${error}`, difficulty: 'trung bình' });
      setCurrentView('main-menu');
    }
  }, [geminiService]);
  
    const createBreakthroughEvent = (): YearlyEvent => ({
        description: `Linh khí trong cơ thể bạn đang sôi trào, báo hiệu sắp đột phá cảnh giới mới! Mây đen kéo đến, lôi kiếp sắp giáng xuống. Đây là thời khắc quyết định, thành công sẽ phi thăng, thất bại sẽ vạn kiếp bất phục. Bạn có muốn bắt đầu độ kiếp ngay bây giờ?`,
        choices: [
            { text: "Bắt đầu độ kiếp!", effects: { breakthroughAttempt: true } },
            { text: "Chưa phải lúc, ta cần chuẩn bị thêm.", effects: {} }
        ]
    });

  const createTournamentInvitationEvent = (): YearlyEvent => {
    return {
        description: `Trời đất rung chuyển, linh khí hội tụ! <strong>Đại Hội Thiên Kiêu</strong> lần thứ ${Math.floor((gameState.year + 0.5 - 16) / TOURNAMENT_INTERVAL) + 1} sắp bắt đầu. Đây là cơ hội ngàn năm có một để tranh tài với các thiên kiêu trong thiên hạ, giành lấy danh vọng và phần thưởng vô giá. Phí báo danh là ${TOURNAMENT_FEE} linh thạch. Bạn có muốn tham gia?`,
        choices: [
            { text: `Tham gia (Tốn ${TOURNAMENT_FEE} Linh Thạch)`, effects: { tournamentAction: 'join' } },
            { text: "Bỏ qua, an phận tu luyện", effects: { tournamentAction: 'decline' } }
        ]
    };
  };
  
    const createAuctionInvitationEvent = (): YearlyEvent => ({
        description: `Đấu giá hội 20 năm một lần tại <strong>Giao Lưu Phường</strong> sắp bắt đầu. Đây là cơ hội để sở hữu những bảo vật hiếm có. Bạn có muốn tham dự không?`,
        choices: [
            { text: "Tham dự", effects: { auctionAction: 'join' } },
            { text: "Bỏ qua", effects: { auctionAction: 'decline' } }
        ]
    });

  const generateTournamentOpponents = (player: Player, difficulty: Difficulty): Opponent[] => {
    const opponentNames = ["Lý Phù Trần", "Hàn Lập", "Vương Lâm", "Mạnh Hạo", "Tần Vũ", "Lâm Động", "Tiêu Viêm", "Diệp Phàm", "Thạch Hạo", "Đường Tam", "Cổ Nguyệt Phương Nguyên", "Bạch Tiểu Thuần", "Tô Minh", "La Phong", "Lâm Minh"];
    const opponentTitles = ["Kiếm Si", "Sát Thần", "Ma Quân", "Yêu孽", "Thiên Tài", "Cổ Đồng", "Trận Sư", "Đan Vương", "Phù Hoàng", "Thánh Thủ", "Chiến Tôn", "Huyết Sát", "Băng Đế", "Lôi Hoàng", "Dược Thần"];
    
    const difficultyMultiplier = { 'đơn giản': 0.8, 'trung bình': 1.0, 'khó': 1.2, 'ác mộng': 1.4 };
    const multiplier = difficultyMultiplier[difficulty];
    
    const opponents: Opponent[] = [];
    const usedNames = new Set();

    for (let i = 0; i < 15; i++) {
        let name, title;
        do { name = opponentNames[Math.floor(Math.random() * opponentNames.length)]; } while (usedNames.has(name));
        usedNames.add(name);
        title = opponentTitles[Math.floor(Math.random() * opponentTitles.length)];

        const baseStat = (player.stats.attack + player.stats.defense) / 2;
        const statVariation = (Math.random() - 0.2) * 5 * multiplier; // -1 to 4
        
        opponents.push({
            id: `opp-${i}`,
            name: name,
            title: title,
            realm: player.realm,
            stats: {
                attack: Math.round((baseStat + statVariation) * multiplier),
                defense: Math.round((baseStat - statVariation) * multiplier),
                health: 100
            }
        });
    }
    return opponents;
  }
  
  const createMatchEvent = (match: Match): YearlyEvent => {
    const opponent = (match.player1 as Player).name === gameState.player!.name ? match.player2 as Opponent : match.player1 as Opponent;
    return {
        description: `Đối thủ của bạn trong vòng này là <strong>${opponent.name} - "${opponent.title}"</strong>. Hắn cũng là một thiên tài của thế hệ này, không thể xem thường.`,
        choices: [{ text: "Bắt đầu chiến đấu!", effects: { tournamentAction: 'fight' } }]
    };
  }
  
  const handleNextYear = useCallback(async () => {
    if (!gameState.player || gameState.isLoading || gameState.currentEvent || !geminiService) return;
    
    let tempState = gameState;

    // 1. Pass time and apply passive effects
    if (!gameState.player) return;
    let p = { ...gameState.player };
    let newLogEntries: EventLogEntry[] = [];
    let activeSecretRealm = gameState.activeSecretRealm ? { ...gameState.activeSecretRealm } : null;

    p.health = Math.min(p.maxHealth, Math.round(p.health + p.maxHealth * 0.1));
    p.age += 0.5;

    const allTalents = Object.values(TALENTS).flat();
    const talentBonusPerYear = p.talents.reduce((acc, talentId) => {
        const talentInfo = allTalents.find(t => t.id === talentId);
        return acc + (talentInfo?.effects.cultivationBonus ?? 0);
    }, 0);
    const petBonus = p.pets.reduce((acc, pet) => acc + (pet.effects.cultivationBonusPerYear ?? 0), 0);
    const techniqueBonus = p.cultivationTechnique?.effects.cultivationBonus ?? 0;
    const basePassiveGain = 15;
    const totalPassiveGain = ((basePassiveGain + techniqueBonus + talentBonusPerYear + petBonus) / 2) * p.cultivationGainModifier;
    p.cultivation += totalPassiveGain;

    if (p.age % 1 === 0) {
        const currentRankDetails = SECT_RANKS.find(r => r.name === p.sectRank);
        if (currentRankDetails?.salary) {
            const salary = Math.round(currentRankDetails.salary * p.linhThachGainModifier);
            if (salary > 0) {
              p.linhThach += salary;
              newLogEntries.push({ id: gameState.eventLog.length + 6, year: p.age, text: `Bạn nhận được ${salary} linh thạch bổng lộc hàng năm từ chức vụ ${p.sectRank}.`, isMajor: false });
            }
        }
    }

    let isQuestOrRealmActive = false;
    if (activeSecretRealm) {
        isQuestOrRealmActive = true;
        activeSecretRealm.progress += 1;
        if (activeSecretRealm.progress >= activeSecretRealm.duration) {
            const linhThachReward = Math.round((activeSecretRealm.reward.linhThach ?? 0) * p.linhThachGainModifier);
            const cultivationReward = Math.round(((activeSecretRealm.reward.cultivation ?? 0) / 2) * p.cultivationGainModifier);
            p.linhThach += linhThachReward;
            p.cultivation += cultivationReward;
            if (activeSecretRealm.reward.item) p.inventory.push(activeSecretRealm.reward.item);
            newLogEntries.push({ id: gameState.eventLog.length, year: p.age, text: `**BÍ CẢNH KẾT THÚC: ${activeSecretRealm.name}!** Sau ${activeSecretRealm.duration / 2} năm thám hiểm, bạn nhận được phần thưởng hậu hĩnh!`, isMajor: true });
            activeSecretRealm = null;
        } else {
            newLogEntries.push({ id: gameState.eventLog.length, year: p.age, text: `Bạn tiếp tục thám hiểm **${activeSecretRealm.name}**. Tiến độ: ${activeSecretRealm.progress}/${activeSecretRealm.duration} lượt.`, isMajor: false });
        }
    } 
    else if (p.activeQuest && p.currentLocation === p.activeQuest.location) {
        isQuestOrRealmActive = true;
        let quest = { ...p.activeQuest };
        quest.progress += 1;
        p.activeQuest = quest;
        let questProgressText = `Bạn dành nửa năm tại ${p.currentLocation} để hoàn thành nhiệm vụ "${quest.title}". Tiến độ: ${quest.progress}/${quest.duration} lượt.`;
        const healthLost = quest.healthCostPerTurn ?? 0;
        if (healthLost > 0) {
            p.health -= healthLost;
            questProgressText += ` Bạn mất <strong>${healthLost}</strong> HP trong quá trình này.`;
        }
        newLogEntries.push({ id: gameState.eventLog.length, year: p.age, text: questProgressText, isMajor: false });
        if (quest.progress >= quest.duration) {
            const linhThachReward = Math.round((quest.reward.linhThach ?? 0) * p.linhThachGainModifier);
            const cultivationReward = Math.round(((quest.reward.cultivation ?? 0) / 2) * p.cultivationGainModifier);
            p.linhThach += linhThachReward;
            if (quest.reward.item) p.inventory.push(quest.reward.item);
            newLogEntries.push({ id: gameState.eventLog.length + 400, year: p.age, text: `**NHIỆM VỤ HOÀN THÀNH: ${quest.title}!** Bạn nhận được phần thưởng.`, isMajor: true });
            p.activeQuest = null;
        }
    }

    const updatedNpcs = progressNpcs(gameState.npcs);
    const { player: updatedPlayer, isGameOver: ageDeath } = sanitizeAndCheckPlayerState(p, newLogEntries, gameState.eventLog.length + 500);
    const newLog = [...newLogEntries.reverse(), ...gameState.eventLog];

    tempState = { ...gameState, player: updatedPlayer, year: updatedPlayer.age, eventLog: newLog, npcs: updatedNpcs, isGameOver: ageDeath, hasTraveledThisYear: false, activeSecretRealm };
    
    // 2. Check for breakthrough
    let breakthroughTriggered = false;
    if (tempState.player && !tempState.isBreakthroughPending) {
        if (tempState.player.cultivation >= tempState.player.cultivationForNextRealm) {
            breakthroughTriggered = true;
            tempState = {
                ...tempState,
                isBreakthroughPending: true,
                eventLog: [{ id: newLog.length, year: tempState.year, text: `Bạn cảm thấy tu vi đã đến điểm đột phá, có thể độ kiếp bất cứ lúc nào!`, isMajor: true }, ...tempState.eventLog]
            };
        }
    }
    
    setGameState(tempState);

    // 3. If questing/exploring, stop here
    if (isQuestOrRealmActive) {
        return;
    }

    // 4. Check for special events
    if (breakthroughTriggered || tempState.isBreakthroughPending) {
        setGameState(prev => ({...prev, currentEvent: createBreakthroughEvent()}));
        return;
    }
    
    const nextYear = tempState.year;
    const isTournamentYear = (nextYear > 16) && (Math.abs((nextYear - 16) % TOURNAMENT_INTERVAL) < 0.01);
    if (isTournamentYear) {
        setGameState(prev => ({...prev, currentEvent: createTournamentInvitationEvent()}));
        return;
    }
    
    const isAuctionYear = (nextYear > 16) && (Math.abs((nextYear - 16) % AUCTION_INTERVAL) < 0.01);
    if (isAuctionYear && !tempState.tournament) {
        setGameState(prev => ({...prev, currentEvent: createAuctionInvitationEvent()}));
        return;
    }

    // 5. Generate normal event
    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
        const event = await geminiService.getYearlyEventChoice(tempState.player, tempState.npcs, tempState.nsfwAllowed);
        setGameState(prev => ({ ...prev, isLoading: false, currentEvent: event }));
    } catch (e) {
        const error = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định khi tạo sự kiện.";
        setGameState(prev => ({ ...prev, isLoading: false, error }));
    }
  }, [gameState, geminiService]);
  
    const handleBreakthroughAttempt = () => {
        setGameState(prev => {
            if (!prev.player) return prev;
            let p = JSON.parse(JSON.stringify(prev.player));
            let newLogEntries: EventLogEntry[] = [];
            
            const currentRealmIndex = REALMS.findIndex(r => r.name === p.realm);
            const currentRealm = REALMS[currentRealmIndex];
            const nextRealm = REALMS[currentRealmIndex + 1];

            if (!nextRealm) { 
                return { ...prev, isBreakthroughPending: false, currentEvent: null };
            }

            const difficultyMods = { 'đơn giản': 15, 'trung bình': 0, 'khó': -15, 'ác mộng': -30 };
            const successChance = 70 + difficultyMods[prev.difficulty];
            const roll = Math.random() * 100;

            if (roll < successChance) {
                // SUCCESS
                const oldRealmName = p.realm;
                p.realm = nextRealm.name;
                p.cultivationForNextRealm = REALMS[currentRealmIndex + 2]?.minCultivation ?? p.cultivation;
                p.maxHealth += 50; p.stats.attack += 10; p.stats.defense += 10;
                p.health = p.maxHealth;
                newLogEntries.push({ id: prev.eventLog.length, year: p.age, text: `**ĐỘT PHÁ THÀNH CÔNG!** Lôi kiếp tan biến, bạn đã từ ${oldRealmName} tiến lên cảnh giới **${p.realm}**!`, isMajor: true });

                // Promotion logic
                const knownSectNames = Object.values(SECTS).map(s => s.name);
                if (knownSectNames.includes(p.sect)) {
                    const newRealmIndex = REALMS.findIndex(r => r.name === p.realm);
                    if (newRealmIndex === -1) return prev; // Should not happen
                    
                    const currentRankIndex = SECT_RANKS.findIndex(r => r.name === p.sectRank);
                    
                    const eligibleRank = [...SECT_RANKS].reverse().find(rank => {
                        const requiredRealmIndex = REALMS.findIndex(r => r.name === rank.realmRequired);
                        return requiredRealmIndex !== -1 && newRealmIndex >= requiredRealmIndex;
                    });
    
                    if (eligibleRank) {
                        const eligibleRankIndex = SECT_RANKS.findIndex(r => r.name === eligibleRank.name);
                        if (eligibleRankIndex > currentRankIndex) {
                            p.sectRank = eligibleRank.name;
                            newLogEntries.push({ id: prev.eventLog.length + 150, year: p.age, text: `**THĂNG CHỨC!** Do tu vi đột phá, bạn đã được thăng lên chức vụ **${p.sectRank}** trong tông môn!`, isMajor: true });
                            if (eligibleRank.name === 'Trưởng Lão') {
                                const sectTechnique = TECHNIQUES.find(t => t.name === 'Nguyên Khí Chân Quyết');
                                if (sectTechnique) {
                                    p.cultivationTechnique = sectTechnique;
                                    newLogEntries.push({ id: prev.eventLog.length + 160, year: p.age, text: `Do được thăng chức, bạn được tông môn ban thưởng công pháp: <strong>${sectTechnique.name}</strong>!`, isMajor: true });
                                }
                            }
                        }
                    }
                }
            } else {
                // FAILURE
                const cultivationLoss = (nextRealm.minCultivation - currentRealm.minCultivation) * 0.2;
                const healthLoss = p.maxHealth * 0.5;
                p.cultivation -= Math.round(cultivationLoss);
                p.health -= Math.round(healthLoss);
                newLogEntries.push({ id: prev.eventLog.length + 1, year: p.age, text: `**ĐỘT PHÁ THẤT BẠI!** Bạn không chống nổi lôi kiếp, tu vi bị thụt lùi, kinh mạch trọng thương.`, isMajor: true });
            }
            
            const { player: updatedPlayer, isGameOver } = sanitizeAndCheckPlayerState(p, newLogEntries, prev.eventLog.length + 500);
            
            const newLog = [...newLogEntries.reverse(), ...prev.eventLog];

            return {
                ...prev,
                player: updatedPlayer,
                eventLog: newLog,
                isGameOver,
                currentEvent: null,
                isBreakthroughPending: false,
            };
        });
    };

  const sanitizeAndCheckPlayerState = (player: Player, logBuffer: EventLogEntry[], idOffset: number): {player: Player, isGameOver: boolean} => {
    let p = {...player};
    let isGameOver = false;

    // Sanitize values to prevent NaN-related crashes
    if (!p.stats) p.stats = { attack: 5, defense: 5 };
    p.health = isNaN(p.health) ? 1 : p.health;
    p.maxHealth = isNaN(p.maxHealth) ? 100 : p.maxHealth;
    p.cultivation = isNaN(p.cultivation) ? 0 : p.cultivation;
    p.linhThach = isNaN(p.linhThach) ? 0 : p.linhThach;
    p.stats.attack = isNaN(p.stats.attack) ? 5 : p.stats.attack;
    p.stats.defense = isNaN(p.stats.defense) ? 5 : p.stats.defense;

    // Clamp health
    p.health = Math.min(p.maxHealth, p.health);

    const currentRealmDetails = REALMS.find(r => r.name === p.realm);
    if (currentRealmDetails) {
        if (p.age > currentRealmDetails.maxAge) {
            isGameOver = true;
            logBuffer.push({ id: idOffset, year: p.age, text: `**THỌ NGUYÊN ĐÃ CẠN!** Dù tu vi cao thâm, bạn vẫn không thể chống lại quy luật của thời gian. Thọ nguyên đã hết, thân tử đạo tiêu.`, isMajor: true });
        }
    } else {
        // Self-healing for invalid realm data
        logBuffer.push({ id: idOffset, year: p.age, text: `**LỖI DỮ LIỆU!** Cảnh giới của bạn không hợp lệ (${p.realm}), đã được thiết lập lại về Luyện Khí.`, isMajor: true });
        p.realm = REALMS[0].name;
        p.cultivation = 0;
        p.cultivationForNextRealm = REALMS[1].minCultivation;
    }
    
    // Self-healing for invalid sect rank data
    const sectExists = Object.values(SECTS).some(s => s.name === p.sect);
    const rankExists = SECT_RANKS.some(r => r.name === p.sectRank);
    if (sectExists && !rankExists) {
        logBuffer.push({ id: idOffset + 10, year: p.age, text: `**LỖI DỮ LIỆU!** Chức vụ của bạn không hợp lệ (${p.sectRank}), đã được thiết lập lại về Ngoại Môn Đệ Tử.`, isMajor: true });
        p.sectRank = SECT_RANKS[0].name;
    }
    
    if(p.health <= 0 && !isGameOver) {
        isGameOver = true;
        logBuffer.push({ id: idOffset + 200, year: p.age, text: `**TỬ VONG!** Sinh mệnh của bạn đã cạn kiệt. Hành trình tu tiên đã kết thúc.`, isMajor: true });
    }
    
    return { player: p, isGameOver };
  }
  
  const handleChoiceSelection = useCallback((choice: EventChoice) => {
    if (!gameState.player || !gameState.currentEvent) return;
    
    const safeChoiceEffects = choice.effects || {};

    if (safeChoiceEffects.breakthroughAttempt) {
        handleBreakthroughAttempt();
        return;
    }
    
    if (safeChoiceEffects.auctionAction) {
        const action = safeChoiceEffects.auctionAction;
        setGameState(prev => {
            if (!prev.player) return prev;
            let player = { ...prev.player };
            let newLog: EventLogEntry[] = [...prev.eventLog];
            let auction: Auction | null = null;
            const currentYear = prev.year + 0.5;
            
            if (action === 'decline') {
                newLog.unshift({ id: newLog.length, year: currentYear, text: "Bạn đã từ chối tham gia Đấu Giá Hội.", isMajor: false });
                return { ...prev, player: {...player, age: currentYear}, year: currentYear, eventLog: newLog, currentEvent: null, auction: null };
            }
            
            if (action === 'join') {
                newLog.unshift({ id: newLog.length, year: currentYear, text: `Bạn di chuyển đến <strong>Giao Lưu Phường</strong> để tham gia Đấu Giá Hội.`, isMajor: true });
                player.currentLocation = 'Giao Lưu Phường';
                
                const auctionItems = generateAuctionItems(player.realm);
                auction = {
                    year: currentYear,
                    isActive: true,
                    items: auctionItems,
                    currentItemIndex: 0,
                    log: ["Đấu giá hội bắt đầu! Vật phẩm đầu tiên được đưa lên!"]
                };
            }
            return { ...prev, player: {...player, age: currentYear}, year: currentYear, eventLog: newLog, currentEvent: null, auction };
        });
        return;
    }

    if (safeChoiceEffects.tournamentAction) {
        const action = safeChoiceEffects.tournamentAction;
        setGameState(prev => {
            if (!prev.player) return prev;
            let player = { ...prev.player };
            let newLog: EventLogEntry[] = [...prev.eventLog];
            let tournament = prev.tournament ? JSON.parse(JSON.stringify(prev.tournament)) : null;
            let newEvent: YearlyEvent | null = null;
            const currentYear = prev.year + 0.5;
            
            if (action === 'decline') {
                newLog.unshift({ id: newLog.length, year: currentYear, text: "Bạn đã từ chối tham gia Đại Hội Thiên Kiêu để tập trung tu luyện.", isMajor: false });
                return { ...prev, player: {...player, age: currentYear}, year: currentYear, eventLog: newLog, currentEvent: null };
            }
            
            if (action === 'join') {
                if (player.linhThach < TOURNAMENT_FEE) {
                    newLog.unshift({ id: newLog.length, year: currentYear, text: `Bạn không đủ ${TOURNAMENT_FEE} linh thạch để tham gia Đại Hội Thiên Kiêu.`, isMajor: true });
                     return { ...prev, player: {...player, age: currentYear}, year: currentYear, eventLog: newLog, currentEvent: null };
                }
                player.linhThach -= TOURNAMENT_FEE;
                newLog.unshift({ id: newLog.length, year: currentYear, text: `Bạn đã chi ${TOURNAMENT_FEE} linh thạch để ghi danh vào **Đại Hội Thiên Kiêu**.`, isMajor: true });

                const opponents = generateTournamentOpponents(player, prev.difficulty);
                // 8 participants: 1 player + 7 opponents. Always a power of 2.
                const allParticipants: (Player|Opponent)[] = [player, ...opponents.slice(0,7)]; 
                if (allParticipants.length % 2 !== 0) {
                     newLog.unshift({ id: newLog.length, year: currentYear, text: `Lỗi giải đấu: Số lượng người tham gia không hợp lệ.`, isMajor: true });
                     return { ...prev, player: {...player, age: currentYear}, year: currentYear, eventLog: newLog, currentEvent: null };
                }
                const shuffled = allParticipants.sort(() => 0.5 - Math.random());
                const round1: Match[] = [];
                for(let i=0; i < shuffled.length; i+=2) {
                    round1.push({player1: shuffled[i], player2: shuffled[i+1], winner: null});
                }
                tournament = { year: currentYear, isActive: true, currentRound: 1, bracket: [round1] };

                const playerMatch = round1.find(m => (m.player1 as Player).name === player.name || (m.player2 as Player).name === player.name);
                if (playerMatch) {
                   newEvent = createMatchEvent(playerMatch);
                } else {
                   // This case should ideally not be reached with the current logic.
                   newLog.unshift({ id: newLog.length, year: currentYear, text: `Lỗi khi tạo giải đấu.`, isMajor: true });
                   tournament = null;
                   newEvent = null;
                }
                return { ...prev, player: {...player, age: currentYear}, year: currentYear, eventLog: newLog, currentEvent: newEvent, tournament };
            }
            
            if (action === 'fight' && tournament) {
                const currentRoundMatches = tournament.bracket[tournament.currentRound - 1];
                if (!currentRoundMatches) { 
                    console.error("Tournament Error: Cannot find matches for current round.");
                    return { ...prev, tournament: null, currentEvent: null };
                }

                const playerMatch = currentRoundMatches.find(m => !m.winner && ((m.player1 as Player).name === player.name || (m.player2 as Player).name === player.name));
                
                if (!playerMatch) {
                    console.error("Tournament Error: Cannot find player's match.");
                    return { ...prev, tournament: null, currentEvent: null };
                }
                
                const opponent = (playerMatch.player1 as Player).name === player.name ? playerMatch.player2 as Opponent : playerMatch.player1 as Opponent;

                const playerDamage = Math.max(1, player.stats.attack - opponent.stats.defense) * (Math.random() * 0.4 + 0.8);
                const opponentDamage = Math.max(1, opponent.stats.attack - player.stats.defense) * (Math.random() * 0.4 + 0.8);
                const playerWon = playerDamage >= opponentDamage;
                
                newLog.unshift({ id: newLog.length, year: currentYear, text: `Trận đấu với **${opponent.name}** bắt đầu! Sau một hồi giao tranh kịch liệt, bạn đã **${playerWon ? 'chiến thắng' : 'thất bại'}**!`, isMajor: true });

                if (playerWon) {
                    playerMatch.winner = (playerMatch.player1 as Player).name === player.name ? 'player1' : 'player2';
                    const roundRewards = [{lt: 500, cv: 250}, {lt: 1250, cv: 600}, {lt: 7500, cv: 4000}];
                    const reward = roundRewards[tournament.currentRound - 1];
                    player.linhThach += Math.round(reward.lt * player.linhThachGainModifier);
                    player.cultivation += Math.round(reward.cv * player.cultivationGainModifier);
                    newLog.unshift({ id: newLog.length + 1, year: currentYear, text: `Bạn nhận được ${Math.round(reward.lt * player.linhThachGainModifier)} linh thạch và ${Math.round(reward.cv * player.cultivationGainModifier)} tu vi.`, isMajor: false });
                    
                    if (tournament.currentRound === 3) { 
                         newLog.unshift({ id: newLog.length + 2, year: currentYear, text: `**BẠN LÀ NHÀ VÔ ĐỊCH ĐẠI HỘI THIÊN KIÊU!** Tiếng tăm của bạn vang dội khắp nơi!`, isMajor: true });
                         const newRankEntry: RankEntry = {
                             rank: prev.geniusRanking.length + 1,
                             name: player.name,
                             realm: player.realm,
                             year: currentYear,
                             achievement: `Vô địch Đại Hội Thiên Kiêu lần thứ ${Math.floor((currentYear - 16) / TOURNAMENT_INTERVAL)+1}`
                         };
                         const newRanking = [newRankEntry, ...prev.geniusRanking];
                         return { ...prev, player, year: currentYear, eventLog: newLog, currentEvent: null, tournament: null, geniusRanking: newRanking }
                    } else {
                         currentRoundMatches.filter(m => m !== playerMatch).forEach(m => m.winner = Math.random() > 0.5 ? 'player1' : 'player2');
                         
                         const winners = currentRoundMatches.map(m => m.winner === 'player1' ? m.player1 : m.player2);
                         const nextRound: Match[] = [];
                         for(let i=0; i < winners.length; i+=2) {
                            if(winners[i+1]) { // This correctly handles byes by not creating a match for a lone winner
                                nextRound.push({player1: winners[i], player2: winners[i+1], winner: null});
                            }
                         }
                         tournament.bracket.push(nextRound);
                         tournament.currentRound++;
                         const nextPlayerMatch = nextRound.find(m => (m.player1 as Player).name === player.name || (m.player2 as Player).name === player.name);
                         newEvent = nextPlayerMatch ? createMatchEvent(nextPlayerMatch) : null;
                         if (!newEvent) {
                             newLog.unshift({ id: newLog.length + 3, year: currentYear, text: `Bạn không có đối thủ ở vòng tiếp theo, giải đấu đã kết thúc.`, isMajor: true });
                             tournament = null;
                         }
                    }
                } else {
                    newLog.unshift({ id: newLog.length + 4, year: currentYear, text: `Hành trình của bạn tại Đại Hội Thiên Kiêu đã kết thúc.`, isMajor: true });
                    tournament = null;
                }
            }
            return { ...prev, player, year: currentYear, eventLog: newLog, currentEvent: newEvent, tournament };
        });
        return;
    }
    
    // --- Normal Event Logic ---
    const originalEventDescription = gameState.currentEvent.description;
    const difficultyMultipliers = { 'đơn giản': 1.2, 'trung bình': 1.0, 'khó': 0.8, 'ác mộng': 0.6 };
    const multiplier = difficultyMultipliers[gameState.difficulty] ?? 1.0;

    setGameState(prev => {
        if (!prev.player || !prev.currentEvent) return prev;
        let p = { ...prev.player };
        let npcs = JSON.parse(JSON.stringify(prev.npcs));
        let activeSecretRealm = prev.activeSecretRealm;
        let newLogEntries: EventLogEntry[] = [];

        p.health = Math.min(p.maxHealth, Math.round(p.health + p.maxHealth * 0.1));
        p.age += 0.5;

        if (p.age % 1 === 0) {
            const currentRankDetails = SECT_RANKS.find(r => r.name === p.sectRank);
            if (currentRankDetails?.salary) {
                const salary = Math.round(currentRankDetails.salary * p.linhThachGainModifier);
                 if (salary > 0) {
                    p.linhThach += salary;
                    newLogEntries.push({ id: prev.eventLog.length + 5, year: p.age, text: `Bạn nhận được ${salary} linh thạch bổng lộc hàng năm từ chức vụ ${p.sectRank}.`, isMajor: false });
                }
            }
        }
        
        const allTalents = Object.values(TALENTS).flat();
        const talentBonusPerYear = p.talents.reduce((acc, id) => {
            const talentInfo = allTalents.find(t => t.id === id);
            return acc + (talentInfo?.effects.cultivationBonus ?? 0);
        }, 0);
        const petBonus = p.pets.reduce((acc, pet) => acc + (pet.effects.cultivationBonusPerYear ?? 0), 0);
        const techniqueBonus = p.cultivationTechnique?.effects.cultivationBonus ?? 0;
        const basePassiveGain = 15;
        const totalPassiveGain = ((basePassiveGain + techniqueBonus + talentBonusPerYear + petBonus) / 2) * p.cultivationGainModifier;
        p.cultivation += totalPassiveGain;


        const { successChance } = choice;
        let isSuccessful = true;
        let outcomeText = '';

        if (successChance !== undefined && successChance !== null) {
            const roll = Math.random() * 100;
            if (roll > successChance) {
                isSuccessful = false;
            }
            outcomeText = isSuccessful
                ? ` <span class="text-green-400">(Thành công!)</span>`
                : ` <span class="text-red-400">(Thất bại!)</span>`;
        }

        let eventText = `${originalEventDescription}<br>→ <i>${choice.text}</i>${outcomeText}`;

        if (isSuccessful) {
            const eventCultivation = Number(safeChoiceEffects.cultivationGained) || 0;
            p.cultivation += Math.round(((eventCultivation * multiplier) / 2) * p.cultivationGainModifier);

            const eventLinhThach = Number(safeChoiceEffects.linhThachChange) || 0;
            p.linhThach = Math.max(0, p.linhThach + Math.round(eventLinhThach * multiplier * p.linhThachGainModifier));

            p.health = Math.max(0, Math.min(p.maxHealth, p.health + (Number(safeChoiceEffects.healthChange) || 0)));
            
            if (safeChoiceEffects.newItem) {
                const newItemData = safeChoiceEffects.newItem;
                const newItem: Item = {
                    id: `${Date.now()}-${newItemData.name}`,
                    name: newItemData.name,
                    type: newItemData.type as ItemType,
                    description: newItemData.description,
                    effects: newItemData.effects || {},
                    technique: newItemData.technique,
                    cost: newItemData.cost ?? 0,
                };
                if(newItem.effects.cultivation) {
                    newItem.effects.cultivation = Math.round(newItem.effects.cultivation / 2);
                }
                p.inventory = [...p.inventory, newItem];
                eventText += ` (Nhận được <strong>${newItem.name}</strong>).`;
            }
            
            if (safeChoiceEffects.newPet) {
                const petData = safeChoiceEffects.newPet;
                const newPet: Pet = {
                    id: `${Date.now()}-${petData.name}`,
                    ...petData,
                };
                if (newPet.effects.cultivationBonusPerYear) {
                    newPet.effects.cultivationBonusPerYear = Math.round(newPet.effects.cultivationBonusPerYear / 2);
                }
                p.pets = [...p.pets, newPet];
                newLogEntries.push({ id: prev.eventLog.length + 4, year: p.age, text: `Bạn đã nhận được sủng vật mới: <strong>${newPet.name} (${newPet.species})</strong>!`, isMajor: true });
            }
            
            if (safeChoiceEffects.startSecretRealm && !p.activeQuest && !activeSecretRealm) {
                const realmData = safeChoiceEffects.startSecretRealm;
                activeSecretRealm = {
                    id: `${Date.now()}-${realmData.name}`,
                    ...realmData,
                    progress: 0,
                };
                newLogEntries.push({ id: prev.eventLog.length + 3, year: p.age, text: `**CƠ DUYÊN LỚN:** Bạn đã bắt đầu hành trình thám hiểm Bí Cảnh: <strong>${activeSecretRealm.name}</strong>!`, isMajor: true });
            }

            if (safeChoiceEffects.newQuest && !p.activeQuest && !activeSecretRealm) {
                const questData = safeChoiceEffects.newQuest;
                if (questData.reward.cultivation) {
                    questData.reward.cultivation = Math.round(questData.reward.cultivation / 2);
                }
                 // Robustness check for title
                const questTitle = questData.title && questData.title.trim() !== '' ? questData.title : 'Nhiệm vụ không tên';
                p.activeQuest = { 
                    ...questData, 
                    title: questTitle,
                    id: `quest-${Date.now()}-${Math.random()}`,
                    progress: 0
                };
                newLogEntries.push({ id: prev.eventLog.length + 300, year: p.age, text: `**Nhiệm vụ mới:** Bạn đã nhận nhiệm vụ "${questTitle}".`, isMajor: true });
            }
            
            if (safeChoiceEffects.relationshipChange) {
                const { npcId, points } = safeChoiceEffects.relationshipChange;
                const npcIndex = npcs.findIndex((n: NPC) => n.id === npcId);
                if (npcIndex !== -1) {
                    const npc = npcs[npcIndex];
                    npc.relationshipPoints += (points * 2);
                    npc.status = getRelationshipStatus(npc.relationshipPoints);
                    const logText = points > 0 
                        ? `Mối quan hệ của bạn với <strong>${npc.name}</strong> đã trở nên tốt hơn.`
                        : `Mối quan hệ của bạn với <strong>${npc.name}</strong> đã xấu đi.`;
                    newLogEntries.push({ id: prev.eventLog.length + 1, year: p.age, text: logText, isMajor: false });
                }
            }

            if (safeChoiceEffects.newSpouse) {
                const { npcId } = safeChoiceEffects.newSpouse;
                const npcIndex = npcs.findIndex((n: NPC) => n.id === npcId);
                if (npcIndex !== -1 && !p.spouseId) {
                    p.spouseId = npcId;
                    npcs[npcIndex].isLover = true;
                    npcs[npcIndex].status = 'Bạn đời';
                    newLogEntries.push({ id: prev.eventLog.length + 2, year: p.age, text: `Bạn và <strong>${npcs[npcIndex].name}</strong> đã chính thức trở thành đạo lữ, cùng nhau bước trên con đường tu tiên!`, isMajor: true });
                }
            }
            
            if (safeChoiceEffects.dualCultivation) {
                const currentRealmIndex = REALMS.findIndex(r => r.name === p.realm);
                const currentRealm = REALMS[currentRealmIndex];
                const nextRealm = REALMS[currentRealmIndex + 1];
                
                const cultivationNeeded = (nextRealm?.minCultivation ?? (currentRealm.minCultivation * 5)) - currentRealm.minCultivation;
                const dualCultivationBonus = Math.round((cultivationNeeded * 0.1 + 100) / 2 * p.cultivationGainModifier);
                
                p.cultivation += dualCultivationBonus;
                eventText += ` Cùng đạo lữ song tu, bạn nhận được ${dualCultivationBonus} tu vi, cảm giác như sắp đột phá!`;
            }
        } else {
            const healthPenalty = 5 + Math.floor(Math.random() * 10);
            p.health = Math.max(0, p.health - healthPenalty);
            newLogEntries.push({ id: prev.eventLog.length + 10, year: p.age, text: `Vận rủi đeo bám, bạn mất ${healthPenalty} HP.`, isMajor: false });
        }

        newLogEntries.push({ id: prev.eventLog.length, year: p.age, text: eventText, isMajor: false });

        const updatedNpcs = progressNpcs(npcs);

        const { player: updatedPlayer, isGameOver } = sanitizeAndCheckPlayerState(p, newLogEntries, prev.eventLog.length + 500);
        
        const newLog = [...newLogEntries.reverse(), ...prev.eventLog];

        return { ...prev, player: updatedPlayer, npcs: updatedNpcs, year: updatedPlayer.age, eventLog: newLog, currentEvent: null, isGameOver, hasTraveledThisYear: false, activeSecretRealm };
    });
  }, [gameState]);
  
  const handleTravel = useCallback((locationName: string) => {
    setMapOpen(false);
    if (!gameState.player || gameState.player.currentLocation === locationName || gameState.activeSecretRealm || gameState.auction?.isActive) return;
    setGameState(prev => {
      if (!prev.player) return prev;
      const player = { ...prev.player, currentLocation: locationName };
      const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã di chuyển đến <strong>${locationName}</strong>.`, isMajor: false, };
      return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog], hasTraveledThisYear: true, };
    });
  }, [gameState.player, gameState.activeSecretRealm, gameState.auction]);

  const handleSaveGame = () => {
    if (!gameState.player) {
      alert("Không có dữ liệu game để lưu!");
      return;
    }
    
    try {
        const dataStr = JSON.stringify(gameState, null, 2);
        localStorage.setItem(SAVE_KEY, dataStr);
        setLocalSaveExists(true);
        alert("Đã lưu game vào trình duyệt!");
        
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'tu_tien_save.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    } catch(e) {
        alert("Lưu game thất bại! Trình duyệt của bạn có thể đang chặn lưu trữ cục bộ.");
        console.error("Failed to save game:", e);
    }
  };
  
  const loadGameFromState = (loadedState: any) => {
    if (typeof loadedState !== 'object' || loadedState === null || !loadedState.player) {
        alert("Tệp lưu không hợp lệ hoặc bị hỏng.");
        return;
    }

    if(loadedState.player) {
        // --- MIGRATION LOGIC & ROBUSTNESS ---
        if (!loadedState.player.stats) { loadedState.player.stats = { attack: 5, defense: 5 }; }
        if (!loadedState.player.equipment) { loadedState.player.equipment = { weapon: null, armor: null, accessory: null }; }
        if (loadedState.player.gender === undefined) loadedState.player.gender = 'Nam';
        if (loadedState.player.activeQuest === undefined) loadedState.player.activeQuest = null;
        if (loadedState.difficulty === undefined) loadedState.difficulty = 'trung bình';
        if (loadedState.player.avatarUrl === undefined) loadedState.player.avatarUrl = '';
        if (loadedState.tournament === undefined) loadedState.tournament = null;
        if (loadedState.geniusRanking === undefined) loadedState.geniusRanking = [];
        if (loadedState.npcs === undefined) loadedState.npcs = JSON.parse(JSON.stringify(INITIAL_NPCS));
        if (loadedState.player.spouseId === undefined) loadedState.player.spouseId = null;
        if (loadedState.player.sect === undefined) loadedState.player.sect = "Tán Tu";
        if (loadedState.nsfwAllowed === undefined) loadedState.nsfwAllowed = false;
         if (loadedState.player.sectRank === undefined) {
            const currentRealmIndex = REALMS.findIndex(r => r.name === loadedState.player!.realm);
            const eligibleRank = [...SECT_RANKS].reverse().find(rank => {
                const requiredRealmIndex = REALMS.findIndex(r => r.name === rank.realmRequired);
                return currentRealmIndex >= requiredRealmIndex;
            });
            loadedState.player.sectRank = eligibleRank ? eligibleRank.name : SECT_RANKS[0].name;
        }
        if (loadedState.player.pets === undefined) loadedState.player.pets = [];
        if (loadedState.activeSecretRealm === undefined) loadedState.activeSecretRealm = null;
        if (loadedState.shopInventory === undefined) loadedState.shopInventory = [];
        if (loadedState.shopLastRefreshed === undefined) loadedState.shopLastRefreshed = 0;
        if (loadedState.player.family === undefined) loadedState.player.family = 'thương nhân';
        if (loadedState.player.linhThachGainModifier === undefined) loadedState.player.linhThachGainModifier = 1.0;
        if (loadedState.player.cultivationGainModifier === undefined) loadedState.player.cultivationGainModifier = 1.0;
        if (loadedState.player.talents === undefined) loadedState.player.talents = ['nguỵ'];
        if (loadedState.isBreakthroughPending === undefined) loadedState.isBreakthroughPending = false;
        if (loadedState.auction === undefined) loadedState.auction = null;
        if (loadedState.activeConversation === undefined) loadedState.activeConversation = null;


        // Final sanitization pass on load
        const { player: sanitizedPlayer } = sanitizeAndCheckPlayerState(loadedState.player, [], 0);
        loadedState.player = sanitizedPlayer;
    }
    setGameState(loadedState);
    setCurrentView('playing');
  }

  const handleContinueGame = () => {
      try {
          const savedGame = localStorage.getItem(SAVE_KEY);
          if(savedGame) {
              let loadedState = JSON.parse(savedGame);
              loadGameFromState(loadedState);
          } else {
              alert("Không tìm thấy game đã lưu trong trình duyệt.");
          }
      } catch(e) {
          alert("Lỗi khi tải game đã lưu. File có thể bị hỏng hoặc trình duyệt đang chặn truy cập.");
          localStorage.removeItem(SAVE_KEY);
          console.error("Failed to load game:", e);
      }
  }
  
  const handleLoadGameClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Không thể đọc tệp.");
        let loadedState: GameState = JSON.parse(text);
        if (loadedState.player && loadedState.gameStarted !== undefined) {
          loadGameFromState(loadedState);
        } else {
          alert("Tệp lưu không hợp lệ.");
        }
      } catch (err) {
        alert("Đã xảy ra lỗi khi tải tệp lưu. Tệp có thể bị hỏng hoặc không đúng định dạng.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleItemInteraction = (item: Item, isEquipped = false) => {
      setSelectedItem({ item, isEquipped });
  };

  const handleCloseItemModal = () => {
      setSelectedItem(null);
  };
    
  const handleOpenShop = () => {
    setGameState(prev => {
        if (!prev.player) return prev;
        const needsRefresh = prev.year >= prev.shopLastRefreshed + SHOP_REFRESH_INTERVAL || prev.shopInventory.length === 0;
        if (needsRefresh) {
            const newStock = generateShopStock(prev.player.realm);
            return {
                ...prev,
                shopInventory: newStock,
                shopLastRefreshed: Math.floor(prev.year),
            }
        }
        return prev;
    });
    setShopOpen(true);
  };
  
  const handleBuyItem = (item: Item) => {
    setGameState(prev => {
      if (!prev.player || !item.cost || prev.player.linhThach < item.cost) return prev;
      
      const player = { ...prev.player };
      player.linhThach -= item.cost;
      player.inventory.push({ ...item, id: `${Date.now()}-${item.name}` }); // Give it a unique ID

      const shopInventory = prev.shopInventory.filter(i => i.id !== item.id);
      
      const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã mua <strong>${item.name}</strong> với giá ${item.cost} linh thạch.`, isMajor: false };

      return { ...prev, player, shopInventory, eventLog: [newLogEntry, ...prev.eventLog] };
    });
  };

  const handleSellItem = (item: Item) => {
      setGameState(prev => {
        if (!prev.player) return prev;
        const player = { ...prev.player };
        
        const itemIndex = player.inventory.findIndex(i => i.id === item.id);
        if (itemIndex === -1) return prev;

        const sellPrice = Math.floor((item.cost ?? 10) * 0.4); // Sell for 40% of original price, or 4 if no price
        const finalSellPrice = Math.round(sellPrice * player.linhThachGainModifier);
        
        player.linhThach += finalSellPrice;
        player.inventory.splice(itemIndex, 1);

        const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã bán <strong>${item.name}</strong> và nhận được ${finalSellPrice} linh thạch.`, isMajor: false };

        return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog] };
      });
  };

  const handleEquipItem = (item: Item) => {
      setGameState(prev => {
          if (!prev.player || !['weapon', 'armor', 'accessory'].includes(item.type)) return prev;
          
          let player = JSON.parse(JSON.stringify(prev.player!));
          const itemType = item.type as 'weapon' | 'armor' | 'accessory';

          const itemIndex = player.inventory.findIndex((i: Item) => i.id === item.id);
          if (itemIndex === -1) return prev;
          player.inventory.splice(itemIndex, 1);
          
          const oldItem = player.equipment[itemType];
          if (oldItem) {
              player.inventory.push(oldItem);
              if (oldItem.effects.attack) player.stats.attack -= oldItem.effects.attack;
              if (oldItem.effects.defense) player.stats.defense -= oldItem.effects.defense;
          }

          player.equipment[itemType] = item;
          if (item.effects.attack) player.stats.attack += item.effects.attack;
          if (item.effects.defense) player.stats.defense += item.effects.defense;
          
          const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã trang bị <strong>${item.name}</strong>.`, isMajor: false };
          return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog] };
      });
  };

  const handleUnequipItem = (item: Item) => {
      setGameState(prev => {
          if (!prev.player || !['weapon', 'armor', 'accessory'].includes(item.type)) return prev;
          let player = JSON.parse(JSON.stringify(prev.player!));
          const itemType = item.type as 'weapon' | 'armor' | 'accessory';

          if (!player.equipment[itemType] || player.equipment[itemType]?.id !== item.id) return prev;


          player.equipment[itemType] = null;
          player.inventory.push(item);

          if (item.effects.attack) player.stats.attack -= item.effects.attack;
          if (item.effects.defense) player.stats.defense -= item.effects.defense;
          
          const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã gỡ trang bị <strong>${item.name}</strong>.`, isMajor: false };
          return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog] };
      });
  };

  const handleUseItem = (item: Item) => {
      setGameState(prev => {
          if (!prev.player || item.type !== 'consumable') return prev;
          let player = JSON.parse(JSON.stringify(prev.player!));
          
          const itemIndex = player.inventory.findIndex((i: Item) => i.id === item.id);
          if (itemIndex === -1) return prev;
          
          let logText = `Bạn đã sử dụng <strong>${item.name}</strong>.`;
          
          if (item.effects.health) {
              const healed = Math.min(player.maxHealth - player.health, item.effects.health);
              player.health += healed;
              logText += ` Phục hồi ${healed} sinh mệnh.`
          }
          if(item.effects.cultivation) {
              const cultivationGain = Math.round(item.effects.cultivation * player.cultivationGainModifier);
              player.cultivation += cultivationGain;
              logText += ` Nhận được ${cultivationGain} tu vi.`
          }
          
          player.inventory.splice(itemIndex, 1);
          
          let newLogEntries: EventLogEntry[] = [{ id: prev.eventLog.length, year: prev.year, text: logText, isMajor: false }];
          const { player: updatedPlayer, isGameOver } = sanitizeAndCheckPlayerState(player, newLogEntries, prev.eventLog.length + 500);

          return { ...prev, player: updatedPlayer, eventLog: [...newLogEntries, ...prev.eventLog], isGameOver };
      });
  };

  const handleLearnTechnique = (item: Item) => {
      setGameState(prev => {
          if (!prev.player || item.type !== 'techniqueScroll' || !item.technique) return prev;
          let player = JSON.parse(JSON.stringify(prev.player!));

          const itemIndex = player.inventory.findIndex((i: Item) => i.id === item.id);
          if (itemIndex === -1) return prev;

          const oldTechniqueName = player.cultivationTechnique?.name || 'không có';
          player.cultivationTechnique = item.technique;
          player.inventory.splice(itemIndex, 1);
          
          const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã học công pháp mới: <strong>${item.technique.name}</strong>, thay thế cho ${oldTechniqueName}.`, isMajor: true };
          
          return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog] };
      });
  };

  const handleDropItem = (item: Item) => {
      setGameState(prev => {
          if (!prev.player) return prev;
          let player = JSON.parse(JSON.stringify(prev.player!));

          const itemIndex = player.inventory.findIndex((i: Item) => i.id === item.id);
          if (itemIndex > -1) {
             player.inventory.splice(itemIndex, 1);
          } else {
            return prev;
          }
          
          const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã vứt bỏ <strong>${item.name}</strong>.`, isMajor: false };
          return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog] };
      });
  };
  
    const handlePlaceBid = useCallback(() => {
        setGameState(prev => {
            if (!prev.player || !prev.auction || prev.auction.items[prev.auction.currentItemIndex].status !== 'ongoing') return prev;
            
            let auction = JSON.parse(JSON.stringify(prev.auction!));
            let player = { ...prev.player };
            const currentAuctionItem = auction.items[auction.currentItemIndex];
            
            const playerBid = Math.ceil(currentAuctionItem.currentBid * 1.1);
            if (player.linhThach < playerBid) {
                auction.log.push("Bạn không đủ Linh Thạch để ra giá này.");
                return { ...prev, auction };
            }
            
            currentAuctionItem.currentBid = playerBid;
            currentAuctionItem.highestBidderId = 'player';
            currentAuctionItem.highestBidderName = player.name;
            auction.log.push(`Bạn ra giá ${playerBid} Linh Thạch.`);
            
            const npcShouldBid = Math.random() < 0.6;
            const npcCanAfford = currentAuctionItem.currentBid < (currentAuctionItem.item.cost ?? 50000) * 2;
            
            if (npcShouldBid && npcCanAfford) {
                const npcBid = Math.ceil(currentAuctionItem.currentBid * (1.05 + Math.random() * 0.15));
                const npcNames = ["Tu sĩ áo đen", "Lão giả bí ẩn", "Thiếu nữ váy trắng", "Đại gia phòng VIP"];
                const npcName = npcNames[Math.floor(Math.random() * npcNames.length)];
                
                currentAuctionItem.currentBid = npcBid;
                currentAuctionItem.highestBidderId = `npc_${Date.now()}`;
                currentAuctionItem.highestBidderName = npcName;
                auction.log.push(`${npcName} ra giá ${npcBid} Linh Thạch!`);
            }
            
            return { ...prev, auction };
        });
    }, []);

    const handlePassAuctionItem = useCallback(() => {
        setGameState(prev => {
            if (!prev.player || !prev.auction) return prev;
            
            let auction = JSON.parse(JSON.stringify(prev.auction!));
            let player = { ...prev.player };
            let newLogEntries: EventLogEntry[] = [...prev.eventLog];
            const currentAuctionItem = auction.items[auction.currentItemIndex];
            
            currentAuctionItem.status = currentAuctionItem.highestBidderId ? 'sold' : 'passed';
            
            if (currentAuctionItem.status === 'sold') {
                const message = `<strong>${currentAuctionItem.item.name}</strong> đã được bán cho <strong>${currentAuctionItem.highestBidderName}</strong> với giá ${currentAuctionItem.currentBid} Linh Thạch.`;
                newLogEntries.unshift({ id: newLogEntries.length, year: prev.year, text: message, isMajor: true });

                if (currentAuctionItem.highestBidderId === 'player') {
                    player.linhThach -= currentAuctionItem.currentBid;
                    player.inventory.push(currentAuctionItem.item);
                }
            } else {
                const message = `Không ai trả giá cho <strong>${currentAuctionItem.item.name}</strong>, vật phẩm đã bị lưu trữ.`;
                newLogEntries.unshift({ id: newLogEntries.length + 1, year: prev.year, text: message, isMajor: false });
            }
            
            auction.currentItemIndex++;
            if (auction.currentItemIndex >= auction.items.length) {
                auction.isActive = false;
                newLogEntries.unshift({ id: newLogEntries.length + 2, year: prev.year, text: "Đấu giá hội đã kết thúc.", isMajor: true });
            } else {
                auction.log = ["Vật phẩm tiếp theo đã được đưa lên!"];
            }

            return { ...prev, player, auction, eventLog: newLogEntries };
        });
    }, []);

    const handleUpdateNpcAvatar = (npcId: string, url: string) => {
        setGameState(prev => {
            if (!prev.npcs) return prev;
            const newNpcs = prev.npcs.map(npc => {
                if (npc.id === npcId) {
                    return { ...npc, avatarUrl: url };
                }
                return npc;
            });
            return { ...prev, npcs: newNpcs };
        });
    };

    const handleStartConversation = useCallback(async (npcId: string) => {
        if (!geminiService || !gameState.player) return;
        
        const npc = gameState.npcs.find(n => n.id === npcId);
        if (!npc) return;

        setRelationshipPanelOpen(false);
        setGameState(prev => ({ ...prev, isLoading: true, error: null }));
        
        try {
            const event = await geminiService.getNpcConversation(gameState.player, npc);
            setGameState(prev => ({
                ...prev,
                isLoading: false,
                activeConversation: { npcId, event },
            }));
        } catch (e) {
            const error = e instanceof Error ? e.message : "Không thể bắt đầu hội thoại.";
            setGameState(prev => ({ ...prev, isLoading: false, error }));
        }
    }, [geminiService, gameState.player, gameState.npcs]);

    const handleConversationResponse = useCallback((choice: EventChoice) => {
        setGameState(prev => {
            if (!prev.player || !prev.activeConversation) return prev;

            let npcs = JSON.parse(JSON.stringify(prev.npcs));
            let newLogEntries: EventLogEntry[] = [];
            const npc = npcs.find((n: NPC) => n.id === prev.activeConversation!.npcId);
            
            const safeEffects = choice.effects || {};

            if (safeEffects.relationshipChange && npc) {
                 const points = Number(safeEffects.relationshipChange.points) || 0;
                 npc.relationshipPoints += (points * 2);
                 npc.status = getRelationshipStatus(npc.relationshipPoints);

                 const logText = `Bạn gửi Truyền Âm Phù cho <strong>${npc.name}</strong>. Mối quan hệ của hai người đã trở nên tốt hơn.`;
                 newLogEntries.push({ id: prev.eventLog.length + 1, year: prev.year, text: logText, isMajor: false });
            }

            const newLog = [...newLogEntries.reverse(), ...prev.eventLog];
            return { ...prev, npcs, eventLog: newLog, activeConversation: null };
        });
    }, []);

  const renderContent = () => {
    const { player, year, tournament, currentEvent, isLoading, error, hasTraveledThisYear, eventLog, isGameOver, gameStarted, geniusRanking, npcs, activeSecretRealm, auction, shopLastRefreshed } = gameState;
    
    const nextTournamentIn = player ? calculateIntervalCountdown(player.age, TOURNAMENT_INTERVAL, 16) : TOURNAMENT_INTERVAL;
    const nextAuctionIn = player ? calculateIntervalCountdown(player.age, AUCTION_INTERVAL, 16) : AUCTION_INTERVAL;
    const nextShopRefreshIn = player ? Math.max(0, (shopLastRefreshed + SHOP_REFRESH_INTERVAL) - year) : 0;

    switch (currentView) {
      case 'character-creation':
        return <CharacterCreationPanel onStartGame={handleStartGame} onBack={() => setCurrentView('main-menu')} />;
      case 'playing':
        if (isGameOver || !gameStarted) {
          return <GameOverlay isGameOver={isGameOver} onStart={() => setCurrentView('character-creation')} isLoading={isLoading}/>
        }
        if (!player) return null; // Should not happen if gameStarted
        
        return (
          <div className="w-full h-full relative">
            <LocationImageDisplay imageUrl={currentLocationImage} isLoading={isLocationImageLoading} />
            <main className="w-full max-w-7xl h-full flex flex-col md:flex-row gap-6 mx-auto relative">
                <div className="flex flex-col basis-[35%] md:basis-[35%] min-h-0">
                  <PlayerInfoPanel player={player} npcs={npcs} onItemClick={handleItemInteraction} activeSecretRealm={activeSecretRealm} />
                   <UpcomingEventsPanel 
                        nextTournamentIn={nextTournamentIn}
                        nextAuctionIn={nextAuctionIn}
                        nextShopRefreshIn={nextShopRefreshIn}
                    />
                </div>
                <div className="flex flex-col min-h-0 basis-[65%] md:basis-[65%]">
                    {tournament?.isActive ? (
                        <TournamentPanel tournament={tournament} player={player} event={currentEvent} onSelectChoice={handleChoiceSelection} />
                    ) : (
                        <div className="panel-bg flex flex-col flex-grow min-h-0 p-6 gap-4">
                            <EventLogPanel eventLog={eventLog} />
                            {currentEvent ? ( <EventChoicePanel event={currentEvent} onSelectChoice={handleChoiceSelection} /> ) : (
                              <GameControls onNextYear={handleNextYear} onTravel={() => setMapOpen(true)} onOpenShop={handleOpenShop} isLoading={isLoading || !!gameState.activeConversation} error={error} disabled={!!currentEvent || !!auction?.isActive} hasTraveledThisYear={hasTraveledThisYear} player={player} activeSecretRealm={activeSecretRealm} />
                            )}
                        </div>
                    )}
                </div>
            </main>
          </div>
        );
      case 'instructions':
        return <InstructionsPanel onClose={() => setCurrentView('main-menu')} />;
      case 'update-log':
        return <UpdateLogPanel onClose={() => setCurrentView('main-menu')} />;
      case 'api-key-setup':
        return <ApiKeySetupPanel onSave={handleSetApiKey} onClose={() => setCurrentView('main-menu')} />;
      case 'main-menu':
      default:
        return <MainMenu onStart={() => setCurrentView('character-creation')} onContinue={handleContinueGame} onImport={handleLoadGameClick} onShowInstructions={() => setCurrentView('instructions')} onShowUpdateLog={() => setCurrentView('update-log')} onShowApiKeySetup={() => setCurrentView('api-key-setup')} hasLocalSave={localSaveExists} apiKeySet={!!apiKey}/>;
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 selection:bg-cyan-500 selection:text-black relative">
      <style>{`
          :root { --glow-color: hsl(180, 100%, 50%); }
          .font-serif { font-family: 'Noto Serif', serif; }
          .bg-glow { background: radial-gradient(ellipse at 50% 50%, rgba(20, 30, 60, 0.8) 0%, #060913 100%); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
          @keyframes fadeInFast { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in-fast { animation: fadeInFast 0.3s ease-out forwards; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 20px; }
          
          .panel-bg {
             background-color: rgba(15, 23, 42, 0.7);
             backdrop-filter: blur(12px);
             border-radius: 0.75rem;
             border: 1px solid rgba(56, 189, 248, 0.2);
             box-shadow: 0 0 40px rgba(56, 189, 248, 0.05);
          }
          
          .input-base {
            background-color: rgb(15 23 42 / 1);
            border: 1px solid rgb(55 65 81 / 1);
            border-radius: 0.375rem;
            padding: 0.5rem 0.75rem;
            color: white;
            transition: all 0.2s;
          }
          .input-base:focus {
            outline: none;
            border-color: var(--glow-color);
            box-shadow: 0 0 10px 0px var(--glow-color);
          }

          .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.375rem;
            font-weight: bold;
            transition: all 0.2s ease;
            border: 1px solid transparent;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            text-align: center;
          }
          .btn:disabled {
            background-image: none;
            background-color: #4b5563;
            color: #9ca3af;
            cursor: not-allowed;
            box-shadow: none;
          }
          .btn-primary { 
            background: linear-gradient(to right, #06b6d4, #3b82f6);
            color: white;
          }
          .btn-primary:hover:not(:disabled) {
             box-shadow: 0 0 15px 0px var(--glow-color);
          }
          .btn-secondary {
            background: linear-gradient(to right, #16a34a, #0d9488);
            color: white;
          }
           .btn-secondary:hover:not(:disabled) {
             box-shadow: 0 0 15px 0px #16a34a;
          }
          .btn-dark {
             background-color: rgba(55, 65, 81, 0.8);
             color: white;
          }
          .btn-dark:hover:not(:disabled) {
             background-color: rgba(75, 85, 99, 0.9);
          }
          .btn-warning {
             background-color: #ca8a04;
             color: white;
          }
           .btn-warning:hover:not(:disabled) {
             background-color: #d97706;
          }
           .btn-shop {
             background-color: #7c3aed;
             color: white;
          }
           .btn-shop:hover:not(:disabled) {
             background-color: #8b5cf6;
          }
          .btn-event {
             background-color: rgba(30, 41, 59, 0.8);
             border: 1px solid rgba(56, 189, 248, 0.3);
             color: #67e8f9;
          }
          .btn-event:hover:not(:disabled) {
             background-color: rgba(51, 65, 85, 1);
             border-color: var(--glow-color);
             color: white;
          }
           fieldset {
             border-width: 1px;
             border-style: solid;
             border-color: rgba(56, 189, 248, 0.2);
             border-radius: 0.5rem;
           }
           legend {
             padding-left: 0.5rem;
             padding-right: 0.5rem;
             font-family: 'Noto Serif', serif;
           }

      `}</style>
      <header className="w-full max-w-7xl mb-4 z-10">
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
            <div className="w-auto text-left">
                {(currentView === 'playing' || currentView === 'character-creation') && (
                    <button onClick={() => setCurrentView('main-menu')} className="btn btn-dark py-1 px-3 text-sm">Về Menu</button>
                )}
            </div>
            <div className="flex-grow text-center order-first w-full sm:order-none sm:w-auto">
                {currentView === 'playing' && gameState.player ? (
                    <>
                        <h1 className="text-4xl md:text-5xl font-bold text-cyan-300 tracking-wider font-serif">Tu tiên 1 click</h1>
                        <p className="text-gray-400 mt-1">Năm thứ {Math.floor(gameState.year - 15)} trên con đường tu luyện</p>
                    </>
                ) : <div className="h-[76px] sm:h-auto"></div>}
            </div>
            <div className="w-auto flex justify-end items-center gap-2 flex-wrap">
                {currentView === 'playing' && (
                    <>
                        <button onClick={() => setRelationshipPanelOpen(true)} className="btn bg-pink-600/80 hover:bg-pink-500/90 py-1 px-3 text-sm">Nhân Mạch</button>
                        <button onClick={() => setRankingOpen(true)} className="btn btn-warning py-1 px-3 text-sm">Xếp Hạng</button>
                        <button onClick={handleSaveGame} className="btn btn-secondary py-1 px-3 text-sm">Lưu</button>
                    </>
                )}
            </div>
        </div>
      </header>
      
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <div className="w-full flex-grow flex justify-center items-stretch min-h-0">
        {isMapOpen && gameState.player && <MapPanel currentLocation={gameState.player.currentLocation} onTravel={handleTravel} onClose={() => setMapOpen(false)} />}
        {isRankingOpen && <GeniusRankingPanel ranking={gameState.geniusRanking} onClose={() => setRankingOpen(false)} />}
        {isRelationshipPanelOpen && gameState.player && <RelationshipPanel npcs={gameState.npcs} player={gameState.player} onClose={() => setRelationshipPanelOpen(false)} onUpdateAvatar={handleUpdateNpcAvatar} onStartConversation={handleStartConversation} />}
        {isShopOpen && gameState.player && (
            <ShopPanel
                player={gameState.player}
                inventory={gameState.shopInventory}
                onClose={() => setShopOpen(false)}
                onBuy={handleBuyItem}
                onSell={handleSellItem}
            />
        )}
        {isAuctionOpen && gameState.player && gameState.auction && (
            <AuctionPanel
                player={gameState.player}
                auction={gameState.auction}
                onClose={() => setAuctionOpen(false)}
                onPlaceBid={handlePlaceBid}
                onPass={handlePassAuctionItem}
             />
        )}
        {gameState.activeConversation && (
            <ConversationPanel
                conversation={gameState.activeConversation}
                onClose={() => setGameState(prev => ({...prev, activeConversation: null}))}
                onSelectChoice={handleConversationResponse}
            />
        )}
        {selectedItem && (
            <ItemInteractionModal 
                item={selectedItem.item}
                isEquipped={selectedItem.isEquipped}
                onClose={handleCloseItemModal}
                onEquip={handleEquipItem}
                onUnequip={handleUnequipItem}
                onUse={handleUseItem}
                onLearn={handleLearnTechnique}
                onDrop={handleDropItem}
            />
        )}
        {renderContent()}
      </div>
    </div>
  );
}

export default App;