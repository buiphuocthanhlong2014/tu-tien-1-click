
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Player, Item, EventLogEntry, YearlyEvent, EventChoice, ActiveQuest, Quest, Difficulty, Opponent, Tournament, RankEntry, Match, NPC, RelationshipStatus, SectChoice, ItemType, Gender, Pet, SecretRealm } from './types';
import { GeminiService, REALMS, SECT_RANKS, CharacterCreationOptions, INITIAL_NPCS } from './services/geminiService';
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
    EventChoicePanel
} from './components/AppComponents';

const SAVE_KEY = 'TUTIEN_SAVE_GAME';
const API_KEY_STORAGE_KEY = 'TUTIEN_API_KEY';
const TOURNAMENT_INTERVAL = 50;
const TOURNAMENT_FEE = 2000;

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
    setLocalSaveExists(!!localStorage.getItem(SAVE_KEY));
  }, [gameState]);

  const getRelationshipStatus = (points: number): RelationshipStatus => {
    if (points <= -75) return 'Tử địch';
    if (points <= -25) return 'Kẻ thù';
    if (points < 25) return 'Xa lạ';
    if (points < 50) return 'Người quen';
    if (points < 75) return 'Bạn bè';
    if (points < 100) return 'Thân thiết';
    return 'Tri kỷ';
  };

  const progressNpcs = (npcs: NPC[]): NPC[] => {
      return npcs.map(npc => {
          const currentNpcRealmIndex = REALMS.findIndex(r => r.name === npc.realm);
          // NPCs progress a bit slower/faster than player
          const progressionRate = (10 + Math.random() * 15) * (1 + currentNpcRealmIndex * 0.2);
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
  
  const createTournamentInvitationEvent = (): YearlyEvent => {
    return {
        description: `Trời đất rung chuyển, linh khí hội tụ! <strong>Đại Hội Thiên Kiêu</strong> lần thứ ${(gameState.year + 1 - 16) / TOURNAMENT_INTERVAL} sắp bắt đầu. Đây là cơ hội ngàn năm có một để tranh tài với các thiên kiêu trong thiên hạ, giành lấy danh vọng và phần thưởng vô giá. Phí báo danh là ${TOURNAMENT_FEE} linh thạch. Bạn có muốn tham gia?`,
        choices: [
            { text: `Tham gia (Tốn ${TOURNAMENT_FEE} Linh Thạch)`, effects: { tournamentAction: 'join' } },
            { text: "Bỏ qua, an phận tu luyện", effects: { tournamentAction: 'decline' } }
        ]
    };
  };

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
    
    // --- Secret Realm Logic ---
    if (gameState.activeSecretRealm) {
        setGameState(prev => {
            if (!prev.player || !prev.activeSecretRealm) return prev;

            let p = { ...prev.player };
            let realm = { ...prev.activeSecretRealm, progress: prev.activeSecretRealm.progress + 1 };
            let newLogEntries: EventLogEntry[] = [];
            let activeSecretRealm: SecretRealm | null = realm;
            
            p.age += 1;
            
            const petBonus = p.pets.reduce((acc, pet) => acc + (pet.effects.cultivationBonusPerYear ?? 0), 0);
            const techniqueBonus = p.cultivationTechnique?.effects.cultivationBonus ?? 0;
            const talentBonus = p.talentCultivationBonus ?? 0;
            p.cultivation += 15 + techniqueBonus + talentBonus + petBonus;

            if (realm.progress >= realm.duration) {
                // Realm finished
                activeSecretRealm = null;
                p.linhThach += realm.reward.linhThach ?? 0;
                p.cultivation += realm.reward.cultivation ?? 0;
                if (realm.reward.item) p.inventory.push(realm.reward.item);
                newLogEntries.push({ id: prev.eventLog.length, year: p.age, text: `**BÍ CẢNH KẾT THÚC: ${realm.name}!** Sau ${realm.duration} năm thám hiểm, bạn nhận được phần thưởng hậu hĩnh!`, isMajor: true });
            } else {
                newLogEntries.push({ id: prev.eventLog.length, year: p.age, text: `Bạn tiếp tục thám hiểm **${realm.name}**. Tiến độ: ${realm.progress}/${realm.duration} năm.`, isMajor: false });
            }
            
            const updatedNpcs = progressNpcs(prev.npcs);
            const { player: updatedPlayer, log: breakthroughLog, isGameOver: ageDeath } = checkPlayerState(p, newLogEntries, prev.eventLog.length + 500);
            const newLog = [...breakthroughLog.reverse(), ...prev.eventLog];

            return { ...prev, player: updatedPlayer, year: updatedPlayer.age, eventLog: newLog, npcs: updatedNpcs, isGameOver: ageDeath, hasTraveledThisYear: false, activeSecretRealm };
        });
        return;
    }

    const nextYear = gameState.year + 1;
    const isTournamentYear = (nextYear - 16) % TOURNAMENT_INTERVAL === 0 && nextYear > 16;
    
    if (isTournamentYear) {
        setGameState(prev => ({...prev, currentEvent: createTournamentInvitationEvent()}));
        return;
    }

    if (gameState.player.activeQuest && gameState.player.currentLocation === gameState.player.activeQuest.location) {
        setGameState(prev => {
            if (!prev.player || !prev.player.activeQuest) return prev;
            
            let p = { ...prev.player };
            const quest = p.activeQuest;
            let newLogEntries: EventLogEntry[] = [];

            p.age += 1;

            const currentRankDetails = SECT_RANKS.find(r => r.name === p.sectRank);
            if (currentRankDetails && currentRankDetails.salary > 0) {
                p.linhThach += currentRankDetails.salary;
                newLogEntries.push({ id: prev.eventLog.length + 6, year: p.age, text: `Bạn nhận được ${currentRankDetails.salary} linh thạch bổng lộc hàng năm từ chức vụ ${p.sectRank}.`, isMajor: false });
            }

            p.activeQuest = { ...quest, progress: quest.progress + 1 };
            
            const petBonus = p.pets.reduce((acc, pet) => acc + (pet.effects.cultivationBonusPerYear ?? 0), 0);
            const techniqueBonus = p.cultivationTechnique?.effects.cultivationBonus ?? 0;
            const talentBonus = p.talentCultivationBonus ?? 0;
            p.cultivation += 15 + techniqueBonus + talentBonus + petBonus;

            let questYearText = `Bạn đã dành một năm tại ${p.currentLocation} để hoàn thành nhiệm vụ "${quest.title}". Tiến độ: ${p.activeQuest.progress}/${quest.duration} năm.`;
            newLogEntries.push({ id: prev.eventLog.length, year: p.age, text: questYearText, isMajor: false });
            
            if (p.activeQuest.progress >= quest.duration) {
                p.linhThach += quest.reward.linhThach ?? 0;
                p.cultivation += quest.reward.cultivation ?? 0;
                if (quest.reward.item) p.inventory.push(quest.reward.item);
                newLogEntries.push({ id: prev.eventLog.length + 400, year: p.age, text: `**NHIỆM VỤ HOÀN THÀNH: ${quest.title}!** Bạn nhận được ${quest.reward.linhThach ?? 0} linh thạch.`, isMajor: true });
                p.activeQuest = null;
            }
            
            const updatedNpcs = progressNpcs(prev.npcs);

            const { player: updatedPlayer, log: breakthroughLog, isGameOver: ageDeath } = checkPlayerState(p, newLogEntries, prev.eventLog.length + 500);
            
            const newLog = [...breakthroughLog.reverse(), ...prev.eventLog];
            return { ...prev, player: updatedPlayer, year: updatedPlayer.age, eventLog: newLog, npcs: updatedNpcs, isGameOver: ageDeath, hasTraveledThisYear: false };
        });
        return;
    }

    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
        const event = await geminiService.getYearlyEventChoice(gameState.player, gameState.npcs, gameState.nsfwAllowed);
        setGameState(prev => ({ ...prev, isLoading: false, currentEvent: event }));
    } catch (e) {
        const error = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định khi tạo sự kiện.";
        setGameState(prev => ({ ...prev, isLoading: false, error }));
    }
  }, [gameState, geminiService]);
  
  const checkPlayerState = (player: Player, logBuffer: EventLogEntry[], idOffset: number): {player: Player, log: EventLogEntry[], isGameOver: boolean} => {
    let p = {...player};
    let isGameOver = false;

    // 1. Check for death by age
    const currentRealmDetails = REALMS.find(r => r.name === p.realm);
    if (currentRealmDetails && p.age > currentRealmDetails.maxAge) {
        isGameOver = true;
        logBuffer.push({ id: idOffset, year: p.age, text: `**THỌ NGUYÊN ĐÃ CẠN!** Dù tu vi cao thâm, bạn vẫn không thể chống lại quy luật của thời gian. Thọ nguyên đã hết, thân tử đạo tiêu.`, isMajor: true });
    }
    
    // 2. Check for realm breakthrough
    const currentRealmIndex = REALMS.findIndex(r => r.name === p.realm);
    if (!isGameOver && currentRealmIndex !== -1 && currentRealmIndex < REALMS.length - 1) {
        const nextRealm = REALMS[currentRealmIndex + 1];
        if (p.cultivation >= nextRealm.minCultivation) {
            p.realm = nextRealm.name;
            p.cultivationForNextRealm = REALMS[currentRealmIndex + 2]?.minCultivation ?? p.cultivation;
            p.maxHealth += 50; p.stats.attack += 10; p.stats.defense += 10;
            logBuffer.push({ id: idOffset + 100, year: p.age, text: `**ĐỘT PHÁ!** Bạn đã tiến lên cảnh giới **${p.realm}**! Sức mạnh tăng vọt, thọ nguyên kéo dài!`, isMajor: true });
        
            // Check for promotion
            const newRealmIndex = REALMS.findIndex(r => r.name === p.realm);
            const currentRankIndex = SECT_RANKS.findIndex(r => r.name === p.sectRank);

            const eligibleRank = [...SECT_RANKS].reverse().find(rank => {
                const requiredRealmIndex = REALMS.findIndex(r => r.name === rank.realmRequired);
                return newRealmIndex >= requiredRealmIndex;
            });

            if (eligibleRank) {
                const eligibleRankIndex = SECT_RANKS.findIndex(r => r.name === eligibleRank.name);
                if (eligibleRankIndex > currentRankIndex) {
                    p.sectRank = eligibleRank.name;
                    logBuffer.push({ id: idOffset + 150, year: p.age, text: `**THĂNG CHỨC!** Do tu vi đột phá, bạn đã được thăng lên chức vụ **${p.sectRank}** trong tông môn!`, isMajor: true });
                }
            }
        }
    }
    
    // 3. Heal player
    p.health = Math.min(p.maxHealth, p.health);

    // 4. Check for death by health (e.g. from event)
    if(p.health <= 0 && !isGameOver) {
        isGameOver = true;
        logBuffer.push({ id: idOffset + 200, year: p.age, text: `**TẨU HỎA NHẬP MA!** Sinh mệnh của bạn đã cạn kiệt. Hành trình tu tiên đã kết thúc.`, isMajor: true });
    }
    
    return { player: p, log: logBuffer, isGameOver };
  }
  
  const handleChoiceSelection = useCallback((choice: EventChoice) => {
    if (!gameState.player || !gameState.currentEvent) return;
    
    // --- Tournament Logic ---
    if (choice.effects.tournamentAction) {
        const action = choice.effects.tournamentAction;
        setGameState(prev => {
            if (!prev.player) return prev;
            let player = { ...prev.player };
            let newLog: EventLogEntry[] = [...prev.eventLog];
            let tournament = prev.tournament ? JSON.parse(JSON.stringify(prev.tournament)) : null;
            let newEvent: YearlyEvent | null = null;
            
            if (action === 'decline') {
                newLog.unshift({ id: newLog.length, year: prev.year, text: "Bạn đã từ chối tham gia Đại Hội Thiên Kiêu để tập trung tu luyện.", isMajor: false });
                return { ...prev, eventLog: newLog, currentEvent: null };
            }
            
            if (action === 'join') {
                if (player.linhThach < TOURNAMENT_FEE) {
                    newLog.unshift({ id: newLog.length, year: prev.year, text: `Bạn không đủ ${TOURNAMENT_FEE} linh thạch để tham gia Đại Hội Thiên Kiêu.`, isMajor: true });
                     return { ...prev, eventLog: newLog, currentEvent: null };
                }
                player.linhThach -= TOURNAMENT_FEE;
                newLog.unshift({ id: newLog.length, year: prev.year, text: `Bạn đã chi ${TOURNAMENT_FEE} linh thạch để ghi danh vào **Đại Hội Thiên Kiêu**.`, isMajor: true });

                const opponents = generateTournamentOpponents(player, prev.difficulty);
                const allParticipants: (Player|Opponent)[] = [player, ...opponents.slice(0,7)]; // Round of 8 for simplicity now
                // TODO: Expand to 16. For now, 8 participants.
                const shuffled = allParticipants.sort(() => 0.5 - Math.random());
                const round1: Match[] = [];
                for(let i=0; i < shuffled.length; i+=2) {
                    round1.push({player1: shuffled[i], player2: shuffled[i+1], winner: null});
                }
                tournament = { year: prev.year + 1, isActive: true, currentRound: 1, bracket: [round1] };

                const playerMatch = round1.find(m => (m.player1 as Player).name === player.name || (m.player2 as Player).name === player.name);
                if (playerMatch) {
                   newEvent = createMatchEvent(playerMatch);
                } else {
                    // This case shouldn't happen
                   tournament = null;
                   newEvent = null;
                }
            }
            
            if (action === 'fight' && tournament) {
                const currentRoundMatches = tournament.bracket[tournament.currentRound - 1];
                const playerMatch = currentRoundMatches.find(m => !m.winner && ((m.player1 as Player).name === player.name || (m.player2 as Player).name === player.name))!;
                
                const opponent = (playerMatch.player1 as Player).name === player.name ? playerMatch.player2 as Opponent : playerMatch.player1 as Opponent;

                // Simple fight logic
                const playerDamage = Math.max(1, player.stats.attack - opponent.stats.defense) * (Math.random() * 0.4 + 0.8);
                const opponentDamage = Math.max(1, opponent.stats.attack - player.stats.defense) * (Math.random() * 0.4 + 0.8);
                const playerWon = playerDamage >= opponentDamage;
                
                newLog.unshift({ id: newLog.length, year: prev.year, text: `Trận đấu với **${opponent.name}** bắt đầu! Sau một hồi giao tranh kịch liệt, bạn đã **${playerWon ? 'chiến thắng' : 'thất bại'}**!`, isMajor: true });

                if (playerWon) {
                    playerMatch.winner = (playerMatch.player1 as Player).name === player.name ? 'player1' : 'player2';
                    const roundRewards = [{lt: 1000, cv: 500}, {lt: 2500, cv: 1200}, {lt: 5000, cv: 3000}, {lt: 15000, cv: 8000}];
                    const reward = roundRewards[tournament.currentRound - 1];
                    player.linhThach += reward.lt;
                    player.cultivation += reward.cv;
                    newLog.unshift({ id: newLog.length, year: prev.year, text: `Bạn nhận được ${reward.lt} linh thạch và ${reward.cv} tu vi.`, isMajor: false });
                    
                    if (tournament.currentRound === 2) { // Final for 4-person tourney. For 8 it is 3, for 16 it's 4. Let's make it 4 participants now, 2 rounds
                         newLog.unshift({ id: newLog.length, year: prev.year, text: `**BẠN LÀ NHÀ VÔ ĐỊCH ĐẠI HỘI THIÊN KIÊU!** Tiếng tăm của bạn vang dội khắp nơi!`, isMajor: true });
                         const newRankEntry: RankEntry = {
                             rank: prev.geniusRanking.length + 1,
                             name: player.name,
                             realm: player.realm,
                             year: prev.year + 1,
                             achievement: `Vô địch Đại Hội Thiên Kiêu lần thứ ${(prev.year + 1 - 16) / TOURNAMENT_INTERVAL}`
                         };
                         const newRanking = [newRankEntry, ...prev.geniusRanking];
                         return { ...prev, player, eventLog: newLog, currentEvent: null, tournament: null, geniusRanking: newRanking }
                    } else {
                         // Simulate other matches
                         currentRoundMatches.filter(m => m !== playerMatch).forEach(m => m.winner = Math.random() > 0.5 ? 'player1' : 'player2');
                         
                         const winners = currentRoundMatches.map(m => m.winner === 'player1' ? m.player1 : m.player2);
                         const nextRound: Match[] = [];
                         for(let i=0; i < winners.length; i+=2) {
                            nextRound.push({player1: winners[i], player2: winners[i+1], winner: null});
                         }
                         tournament.bracket.push(nextRound);
                         tournament.currentRound++;
                         const nextPlayerMatch = nextRound.find(m => (m.player1 as Player).name === player.name || (m.player2 as Player).name === player.name);
                         newEvent = nextPlayerMatch ? createMatchEvent(nextPlayerMatch) : null;
                    }
                } else { // Player lost
                    newLog.unshift({ id: newLog.length, year: prev.year, text: `Hành trình của bạn tại Đại Hội Thiên Kiêu đã kết thúc.`, isMajor: true });
                    tournament = null;
                }
            }
            return { ...prev, player, eventLog: newLog, currentEvent: newEvent, tournament };
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

        p.age += 1;

        const currentRankDetails = SECT_RANKS.find(r => r.name === p.sectRank);
        if (currentRankDetails && currentRankDetails.salary > 0) {
            p.linhThach += currentRankDetails.salary;
            newLogEntries.push({ id: prev.eventLog.length + 5, year: p.age, text: `Bạn nhận được ${currentRankDetails.salary} linh thạch bổng lộc hàng năm từ chức vụ ${p.sectRank}.`, isMajor: false });
        }
        
        const petBonus = p.pets.reduce((acc, pet) => acc + (pet.effects.cultivationBonusPerYear ?? 0), 0);
        const eventCultivation = choice.effects.cultivationGained ?? 0;
        const techniqueBonus = p.cultivationTechnique?.effects.cultivationBonus ?? 0;
        const talentBonus = p.talentCultivationBonus ?? 0;
        p.cultivation += Math.round(eventCultivation * multiplier) + techniqueBonus + talentBonus + petBonus;

        const eventLinhThach = choice.effects.linhThachChange ?? 0;
        p.linhThach = Math.max(0, p.linhThach + Math.round(eventLinhThach * multiplier));

        p.health = Math.max(0, Math.min(p.maxHealth, p.health + (choice.effects.healthChange ?? 0)));
        
        let eventText = `${originalEventDescription}<br>→ <i>${choice.text}</i>`;
        
        if (choice.effects.newItem) {
            const newItemData = choice.effects.newItem as any;
            const newItem: Item = {
                id: `${Date.now()}-${newItemData.name}`,
                name: newItemData.name,
                type: newItemData.type,
                description: newItemData.description,
                effects: newItemData.effects || {},
                technique: newItemData.technique,
            };
            p.inventory = [...p.inventory, newItem];
            eventText += ` (Nhận được <strong>${newItem.name}</strong>).`;
        }
        
        if (choice.effects.newPet) {
            const petData = choice.effects.newPet;
            const newPet: Pet = {
                id: `${Date.now()}-${petData.name}`,
                ...petData,
            };
            p.pets = [...p.pets, newPet];
            newLogEntries.push({ id: prev.eventLog.length + 4, year: p.age, text: `Bạn đã nhận được sủng vật mới: <strong>${newPet.name} (${newPet.species})</strong>!`, isMajor: true });
        }
        
        if (choice.effects.startSecretRealm && !p.activeQuest && !activeSecretRealm) {
            const realmData = choice.effects.startSecretRealm;
            activeSecretRealm = {
                id: `${Date.now()}-${realmData.name}`,
                ...realmData,
                progress: 0,
            };
            newLogEntries.push({ id: prev.eventLog.length + 3, year: p.age, text: `**CƠ DUYÊN LỚN:** Bạn đã bắt đầu hành trình thám hiểm Bí Cảnh: <strong>${activeSecretRealm.name}</strong>!`, isMajor: true });
        }

        if (choice.effects.newQuest && !p.activeQuest && !activeSecretRealm) {
            const quest = choice.effects.newQuest;
            p.activeQuest = { ...quest, progress: 0 };
            newLogEntries.push({ id: prev.eventLog.length + 300, year: p.age, text: `**Nhiệm vụ mới:** Bạn đã nhận nhiệm vụ "${quest.title}".`, isMajor: true });
        }
        
        if (choice.effects.relationshipChange) {
            const { npcId, points } = choice.effects.relationshipChange;
            const npcIndex = npcs.findIndex(n => n.id === npcId);
            if (npcIndex !== -1) {
                const npc = npcs[npcIndex];
                npc.relationshipPoints += points;
                if (!npc.isLover) {
                    npc.status = getRelationshipStatus(npc.relationshipPoints);
                }
                const logText = points > 0 
                    ? `Mối quan hệ của bạn với <strong>${npc.name}</strong> đã trở nên tốt hơn.`
                    : `Mối quan hệ của bạn với <strong>${npc.name}</strong> đã xấu đi.`;
                newLogEntries.push({ id: prev.eventLog.length + 1, year: p.age, text: logText, isMajor: false });
            }
        }

        if (choice.effects.newSpouse) {
            const { npcId } = choice.effects.newSpouse;
             const npcIndex = npcs.findIndex(n => n.id === npcId);
             if (npcIndex !== -1 && !p.spouseId) {
                 p.spouseId = npcId;
                 npcs[npcIndex].isLover = true;
                 npcs[npcIndex].status = 'Bạn đời';
                 newLogEntries.push({ id: prev.eventLog.length + 2, year: p.age, text: `Bạn và <strong>${npcs[npcIndex].name}</strong> đã chính thức trở thành đạo lữ, cùng nhau bước trên con đường tu tiên!`, isMajor: true });
             }
        }

        newLogEntries.push({ id: prev.eventLog.length, year: p.age, text: eventText, isMajor: false });

        const updatedNpcs = progressNpcs(npcs);

        const { player: updatedPlayer, log: postEventLog, isGameOver } = checkPlayerState(p, newLogEntries, prev.eventLog.length + 500);
        
        const newLog = [...postEventLog.reverse(), ...prev.eventLog];

        return { ...prev, player: updatedPlayer, npcs: updatedNpcs, year: updatedPlayer.age, eventLog: newLog, currentEvent: null, isGameOver, hasTraveledThisYear: false, activeSecretRealm };
    });
  }, [gameState]);
  
  const handleTravel = useCallback((locationName: string) => {
    setMapOpen(false);
    if (!gameState.player || gameState.player.currentLocation === locationName || gameState.activeSecretRealm) return;
    setGameState(prev => {
      if (!prev.player) return prev;
      const player = { ...prev.player, currentLocation: locationName };
      const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã di chuyển đến <strong>${locationName}</strong>.`, isMajor: false, };
      return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog], hasTraveledThisYear: true, };
    });
  }, [gameState.player, gameState.activeSecretRealm]);

  const handleSaveGame = () => {
    if (!gameState.player) {
      alert("Không có dữ liệu game để lưu!");
      return;
    }
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
  };
  
  const loadGameFromState = (loadedState: GameState) => {
    if(loadedState.player) {
        if(loadedState.player.gender === undefined) loadedState.player.gender = 'Nam';
        if(loadedState.player.activeQuest === undefined) loadedState.player.activeQuest = null;
        if(loadedState.difficulty === undefined) loadedState.difficulty = 'trung bình';
        if(loadedState.player.talent === undefined) {
            loadedState.player.talent = 'Nguỵ Linh Căn';
            loadedState.player.talentCultivationBonus = 0;
        }
        if (loadedState.player.avatarUrl === undefined) loadedState.player.avatarUrl = '';
        if (loadedState.player.activeQuest && loadedState.player.activeQuest.duration === undefined) {
            alert("Tệp lưu của bạn chứa một nhiệm vụ từ phiên bản cũ. Nhiệm vụ đó đã được hủy bỏ.");
            loadedState.player.activeQuest = null;
        }
        if (loadedState.tournament === undefined) loadedState.tournament = null;
        if (loadedState.geniusRanking === undefined) loadedState.geniusRanking = [];
        if (loadedState.npcs === undefined) {
            loadedState.npcs = JSON.parse(JSON.stringify(INITIAL_NPCS));
        }
        if (loadedState.player.spouseId === undefined) {
            loadedState.player.spouseId = null;
        }
        if (loadedState.player.sect === undefined) {
            loadedState.player.sect = "Tán Tu";
        }
        if (loadedState.nsfwAllowed === undefined) {
            loadedState.nsfwAllowed = false;
        }
         if (loadedState.player.sectRank === undefined) {
            const currentRealmIndex = REALMS.findIndex(r => r.name === loadedState.player!.realm);
            const eligibleRank = [...SECT_RANKS].reverse().find(rank => {
                const requiredRealmIndex = REALMS.findIndex(r => r.name === rank.realmRequired);
                return currentRealmIndex >= requiredRealmIndex;
            });
            loadedState.player.sectRank = eligibleRank ? eligibleRank.name : SECT_RANKS[0].name;
        }
        if (loadedState.player.pets === undefined) {
            loadedState.player.pets = [];
        }
        if (loadedState.activeSecretRealm === undefined) {
            loadedState.activeSecretRealm = null;
        }
    }
    setGameState(loadedState);
    setCurrentView('playing');
  }

  const handleContinueGame = () => {
      const savedGame = localStorage.getItem(SAVE_KEY);
      if(savedGame) {
          try {
              let loadedState = JSON.parse(savedGame);
              loadGameFromState(loadedState);
          } catch(e) {
              alert("Lỗi khi tải game đã lưu. File có thể bị hỏng.");
              localStorage.removeItem(SAVE_KEY);
          }
      } else {
          alert("Không tìm thấy game đã lưu trong trình duyệt.");
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

  const handleEquipItem = (item: Item) => {
      setGameState(prev => {
          if (!prev.player || item.type === 'consumable' || item.type === 'techniqueScroll') return prev;
          
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
          if (!prev.player || item.type === 'consumable' || item.type === 'techniqueScroll') return prev;
          let player = JSON.parse(JSON.stringify(prev.player!));
          const itemType = item.type as 'weapon' | 'armor' | 'accessory';

          if (player.equipment[itemType]?.id !== item.id) return prev;

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
              player.cultivation += item.effects.cultivation;
              logText += ` Nhận được ${item.effects.cultivation} tu vi.`
          }
          
          player.inventory.splice(itemIndex, 1);
          
          const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: logText, isMajor: false };
          const { player: updatedPlayer, log: postEventLog, isGameOver } = checkPlayerState(player, [newLogEntry], prev.eventLog.length + 500);

          return { ...prev, player: updatedPlayer, eventLog: [...postEventLog.reverse(), ...prev.eventLog], isGameOver };
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
            // It might be an equipped item, but we don't allow dropping equipped items
            return prev;
          }
          
          const newLogEntry: EventLogEntry = { id: prev.eventLog.length, year: prev.year, text: `Bạn đã vứt bỏ <strong>${item.name}</strong>.`, isMajor: false };
          return { ...prev, player, eventLog: [newLogEntry, ...prev.eventLog] };
      });
  };

  const renderContent = () => {
    const { player, tournament, currentEvent, isLoading, error, hasTraveledThisYear, eventLog, isGameOver, gameStarted, geniusRanking, npcs, activeSecretRealm } = gameState;
    const nextTournamentIn = player ? TOURNAMENT_INTERVAL - (player.age - 16) % TOURNAMENT_INTERVAL : 0;
    
    switch (currentView) {
      case 'character-creation':
        return <CharacterCreationPanel onStartGame={handleStartGame} onBack={() => setCurrentView('main-menu')} />;
      case 'playing':
        if (isGameOver || !gameStarted) {
          return <GameOverlay isGameOver={isGameOver} onStart={() => setCurrentView('character-creation')} isLoading={isLoading}/>
        }
        if (!player) return null; // Should not happen if gameStarted
        
        return (
          <main className="w-full max-w-7xl h-full flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 flex flex-col">
              <PlayerInfoPanel player={player} npcs={npcs} onItemClick={handleItemInteraction} activeSecretRealm={activeSecretRealm} />
               {nextTournamentIn > 0 && 
                <div className="panel-bg text-center p-2 mt-4 text-amber-300 shrink-0">
                    Đại Hội Thiên Kiêu sau {nextTournamentIn} năm
                </div>
               }
            </div>
            <div className="md:w-2/3 flex flex-col min-h-0">
                {tournament?.isActive ? (
                    <TournamentPanel tournament={tournament} player={player} event={currentEvent} onSelectChoice={handleChoiceSelection} />
                ) : (
                    <div className="panel-bg flex flex-col flex-grow min-h-0 p-6 gap-4">
                        <EventLogPanel eventLog={eventLog} />
                        {currentEvent ? ( <EventChoicePanel event={currentEvent} onSelectChoice={handleChoiceSelection} /> ) : (
                          <GameControls onNextYear={handleNextYear} onTravel={() => setMapOpen(true)} isLoading={isLoading} error={error} disabled={!!currentEvent || !!activeSecretRealm} hasTraveledThisYear={hasTraveledThisYear} player={player} activeSecretRealm={activeSecretRealm} />
                        )}
                    </div>
                )}
            </div>
          </main>
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
      <header className="w-full max-w-7xl text-center mb-4 z-10">
        <div className="flex justify-between items-center">
            <div className="w-[200px] text-left">
                {(currentView === 'playing' || currentView === 'character-creation') && (
                    <button onClick={() => setCurrentView('main-menu')} className="btn btn-dark py-1 px-3 text-sm">Về Menu</button>
                )}
            </div>
            <div className="flex-grow">
                {currentView === 'playing' && gameState.player ? (
                    <>
                        <h1 className="text-4xl md:text-5xl font-bold text-cyan-300 tracking-wider font-serif">Tu tiên 1 click</h1>
                        <p className="text-gray-400 mt-1">Năm thứ {gameState.year - 15} trên con đường tu luyện</p>
                    </>
                ) : <div className="h-[76px]"></div>}
            </div>
            <div className="w-auto flex justify-end items-center gap-2">
                {currentView === 'playing' && (
                    <>
                        <button onClick={() => setRelationshipPanelOpen(true)} className="btn bg-pink-600/80 hover:bg-pink-500/90 py-1 px-3 text-sm whitespace-nowrap">Nhân Mạch</button>
                        <button onClick={() => setRankingOpen(true)} className="btn btn-warning py-1 px-3 text-sm whitespace-nowrap">Xếp Hạng</button>
                        <button onClick={handleSaveGame} className="btn btn-secondary py-1 px-3 text-sm whitespace-nowrap">Lưu</button>
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </>
                )}
            </div>
        </div>
      </header>

      <div className="w-full flex-grow flex justify-center items-stretch z-10 min-h-0">
        {isMapOpen && gameState.player && <MapPanel currentLocation={gameState.player.currentLocation} onTravel={handleTravel} onClose={() => setMapOpen(false)} />}
        {isRankingOpen && <GeniusRankingPanel ranking={gameState.geniusRanking} onClose={() => setRankingOpen(false)} />}
        {isRelationshipPanelOpen && gameState.player && <RelationshipPanel npcs={gameState.npcs} player={gameState.player} onClose={() => setRelationshipPanelOpen(false)} />}
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