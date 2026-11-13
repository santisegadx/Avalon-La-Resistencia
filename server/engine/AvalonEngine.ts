import crypto from 'crypto';
import {
  ALIGNMENT_DISTRIBUTION,
  Alignment,
  Player,
  PlayerVision,
  PublicRoomState,
  QUEST_TEAM_SIZES,
  QuestSlot,
  Role,
  RoomConfig,
  ServerSecretState,
} from '../../shared/types';

export interface EngineRoomInstance {
  publicState: PublicRoomState;
  secretState: ServerSecretState;
}

export interface ConfigValidationResult {
  valid: boolean;
  error?: string;
  goodCount: number;
  evilCount: number;
  requiredGood: number;
  requiredEvil: number;
}

export class AvalonEngine {
  /**
   * Barajado Fisher-Yates criptográficamente seguro.
   */
  public static fisherYatesShuffle<T>(items: readonly T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Crea el estado inicial de una sala en fase LOBBY.
   */
  public static createInitialRoom(
    code: string,
    name: string,
    hostPlayer: Player,
    hostToken: string
  ): EngineRoomInstance {
    const defaultConfig: RoomConfig = {
      maxPlayers: 5,
      optionalRoles: {
        perceval: false,
        morgana: false,
        mordred: false,
        oberon: false,
      },
      rules: {
        ladyOfTheLake: false,
        targetSelection: false,
      },
    };

    const publicState: PublicRoomState = {
      room: {
        code,
        name,
        hostId: hostPlayer.id,
        status: 'LOBBY',
        createdAt: Date.now(),
        config: defaultConfig,
      },
      players: [hostPlayer],
      gameState: {
        currentQuestNumber: 1,
        completedQuestsCount: 0,
        leaderIndex: 0,
        rejectionTrack: 0,
        ladyOfTheLakeHolderId: null,
        activeProposal: null,
        quests: this.buildQuestSlots(5),
        history: [],
        winner: null,
      },
    };

    const secretState: ServerSecretState = {
      playerTokens: {
        [hostToken]: hostPlayer.id,
      },
      assignments: {},
      currentTeamVoteBuffer: {},
      currentQuestCardBuffer: {},
      ladyInvestigationHistory: {},
    };

    return { publicState, secretState };
  }

  /**
   * Construye las 5 gestas con los tamaños oficiales y la regla de 2 fallos en G4 para 7+ jugadores.
   */
  public static buildQuestSlots(playerCount: number): QuestSlot[] {
    const clampedCount = Math.max(5, Math.min(10, playerCount));
    const sizes = QUEST_TEAM_SIZES[clampedCount];

    return sizes.map((teamSize, idx) => {
      const questIndex = idx + 1;
      return {
        index: questIndex,
        teamSize,
        requiresTwoFails: clampedCount >= 7 && questIndex === 4,
        status: 'PENDING',
        results: null,
      };
    });
  }

  /**
   * Valida que los roles opcionales seleccionados quepan dentro de la distribución
   * oficial de Bien y Mal para N jugadores (5 a 10).
   */
  public static validateRoomConfig(
    playerCount: number,
    config: RoomConfig
  ): ConfigValidationResult {
    const distribution = ALIGNMENT_DISTRIBUTION[playerCount];
    if (!distribution) {
      return {
        valid: false,
        error: `La cantidad de jugadores debe estar entre 5 y 10 (actual: ${playerCount}).`,
        goodCount: 0,
        evilCount: 0,
        requiredGood: 0,
        requiredEvil: 0,
      };
    }

    // Roles obligatorios: MERLIN (Bien) y ASSASSIN (Mal)
    let selectedGood = 1; // MERLIN
    let selectedEvil = 1; // ASSASSIN

    if (config.optionalRoles.perceval) selectedGood += 1;
    if (config.optionalRoles.morgana) selectedEvil += 1;
    if (config.optionalRoles.mordred) selectedEvil += 1;
    if (config.optionalRoles.oberon) selectedEvil += 1;

    if (selectedGood > distribution.good) {
      return {
        valid: false,
        error: `Demasiados roles especiales del Bien (${selectedGood}/${distribution.good}).`,
        goodCount: selectedGood,
        evilCount: selectedEvil,
        requiredGood: distribution.good,
        requiredEvil: distribution.evil,
      };
    }

    if (selectedEvil > distribution.evil) {
      return {
        valid: false,
        error: `Demasiados roles especiales del Mal (${selectedEvil}/${distribution.evil}) para ${playerCount} jugadores.`,
        goodCount: selectedGood,
        evilCount: selectedEvil,
        requiredGood: distribution.good,
        requiredEvil: distribution.evil,
      };
    }

    return {
      valid: true,
      goodCount: selectedGood,
      evilCount: selectedEvil,
      requiredGood: distribution.good,
      requiredEvil: distribution.evil,
    };
  }

  /**
   * Genera el mazo exacto de roles para N jugadores y la configuración elegida.
   */
  public static buildRoleDeck(playerCount: number, config: RoomConfig): Role[] {
    const validation = this.validateRoomConfig(playerCount, config);
    if (!validation.valid) {
      throw new Error(validation.error || 'Configuración de roles inválida.');
    }

    const deck: Role[] = ['MERLIN', 'ASSASSIN'];

    if (config.optionalRoles.perceval) deck.push('PERCEVAL');
    if (config.optionalRoles.morgana) deck.push('MORGANA');
    if (config.optionalRoles.mordred) deck.push('MORDRED');
    if (config.optionalRoles.oberon) deck.push('OBERON');

    const remainingGood = validation.requiredGood - validation.goodCount;
    const remainingEvil = validation.requiredEvil - validation.evilCount;

    for (let i = 0; i < remainingGood; i++) {
      deck.push('LOYAL_SERVANT');
    }
    for (let i = 0; i < remainingEvil; i++) {
      deck.push('MINION');
    }

    return this.fisherYatesShuffle(deck);
  }

  public static getAlignmentForRole(role: Role): Alignment {
    switch (role) {
      case 'MERLIN':
      case 'PERCEVAL':
      case 'LOYAL_SERVANT':
        return 'GOOD';
      case 'ASSASSIN':
      case 'MORGANA':
      case 'MORDRED':
      case 'OBERON':
      case 'MINION':
        return 'EVIL';
    }
  }

  /**
   * Inicia la partida desde LOBBY -> REVEAL_ROLES.
   * Asigna roles secretos, elige líder inicial aleatorio y entrega la Dama del Lago si está activa.
   */
  public static startGame(instance: EngineRoomInstance, requesterId: string): void {
    const { publicState, secretState } = instance;

    if (publicState.room.hostId !== requesterId) {
      throw new Error('Solo el anfitrión puede iniciar la partida.');
    }
    if (publicState.room.status !== 'LOBBY') {
      throw new Error('La partida ya ha comenzado.');
    }

    const players = publicState.players;
    const playerCount = players.length;
    if (playerCount < 5 || playerCount > 10) {
      throw new Error('Se requieren entre 5 y 10 jugadores para iniciar.');
    }

    // Reordenar seatIndex de forma limpia 0..N-1
    players.forEach((p, idx) => {
      p.seatIndex = idx;
      p.isReady = false;
      p.investigatedByLady = false;
    });

    const shuffledRoles = this.buildRoleDeck(playerCount, publicState.room.config);

    // Limpiar secretos anteriores y asignar nuevos
    secretState.assignments = {};
    secretState.currentTeamVoteBuffer = {};
    secretState.currentQuestCardBuffer = {};
    secretState.ladyInvestigationHistory = {};

    players.forEach((player, idx) => {
      const role = shuffledRoles[idx];
      secretState.assignments[player.id] = {
        role,
        alignment: this.getAlignmentForRole(role),
      };
      secretState.ladyInvestigationHistory[player.id] = [];
    });

    // Elegir Líder inicial al azar
    const initialLeaderIndex = crypto.randomInt(0, playerCount);

    // Si la Dama del Lago está activa, se entrega al jugador sentado a la derecha del Líder
    // (leaderIndex - 1 + N) % N y queda marcado como investigado para no recibirla dos veces.
    let ladyHolderId: string | null = null;
    if (publicState.room.config.rules.ladyOfTheLake) {
      const ladyHolderIndex = (initialLeaderIndex - 1 + playerCount) % playerCount;
      const ladyHolder = players[ladyHolderIndex];
      ladyHolder.investigatedByLady = true;
      ladyHolderId = ladyHolder.id;
    }

    publicState.room.status = 'REVEAL_ROLES';
    publicState.gameState = {
      currentQuestNumber: 1,
      completedQuestsCount: 0,
      leaderIndex: initialLeaderIndex,
      rejectionTrack: 0,
      ladyOfTheLakeHolderId: ladyHolderId,
      activeProposal: null,
      quests: this.buildQuestSlots(playerCount),
      history: [],
      winner: null,
    };
  }

  /**
   * Proyección Zero-Trust de visión nocturna para un único jugador.
   * Nunca expone información que su rol no debe conocer.
   */
  public static getPrivateVision(
    playerId: string,
    instance: EngineRoomInstance
  ): PlayerVision {
    const { publicState, secretState } = instance;
    const myAssignment = secretState.assignments[playerId];
    if (!myAssignment) {
      throw new Error('El jugador no tiene rol asignado en esta partida.');
    }

    const knownPlayers: PlayerVision['knownPlayers'] = [];

    for (const otherPlayer of publicState.players) {
      if (otherPlayer.id === playerId) continue;

      const otherAssignment = secretState.assignments[otherPlayer.id];
      if (!otherAssignment) continue;

      const otherRole = otherAssignment.role;

      switch (myAssignment.role) {
        case 'LOYAL_SERVANT':
          // No ve información de ningún otro jugador
          break;

        case 'MINION':
        case 'ASSASSIN':
        case 'MORGANA':
        case 'MORDRED':
          // Ven a todos sus compañeros del Mal EXCEPTO a OBERON
          if (otherAssignment.alignment === 'EVIL' && otherRole !== 'OBERON') {
            knownPlayers.push({
              playerId: otherPlayer.id,
              tag: 'EVIL_TEAMMATE',
            });
          }
          break;

        case 'OBERON':
          // Oberón no ve a nadie ni nadie lo ve
          break;

        case 'MERLIN':
          // Merlín ve a todo el Mal EXCEPTO a MORDRED
          if (otherAssignment.alignment === 'EVIL' && otherRole !== 'MORDRED') {
            knownPlayers.push({
              playerId: otherPlayer.id,
              tag: 'KNOWN_EVIL',
            });
          }
          break;

        case 'PERCEVAL':
          // Perceval ve a MERLIN y a MORGANA marcados con etiqueta ambigua POSSIBLE_MERLIN
          if (otherRole === 'MERLIN' || otherRole === 'MORGANA') {
            knownPlayers.push({
              playerId: otherPlayer.id,
              tag: 'POSSIBLE_MERLIN',
            });
          }
          break;
      }
    }

    return {
      myPlayerId: playerId,
      myRole: myAssignment.role,
      myAlignment: myAssignment.alignment,
      knownPlayers,
      ladyReveals: [...(secretState.ladyInvestigationHistory[playerId] || [])],
    };
  }

  /**
   * Confirma que un jugador ya revisó su rol. Cuando todos están listos, pasa a TEAM_SELECTION.
   */
  public static markPlayerReady(instance: EngineRoomInstance, playerId: string): void {
    const { publicState } = instance;
    if (publicState.room.status !== 'REVEAL_ROLES') {
      throw new Error('No estás en fase de revelación de roles.');
    }

    const player = publicState.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Jugador no encontrado en la sala.');
    }

    player.isReady = true;

    const allReady = publicState.players.every((p) => p.isReady);
    if (allReady) {
      this.enterTeamSelection(instance);
    }
  }

  /**
   * Prepara la fase TEAM_SELECTION activando la gesta correspondiente y creando
   * la propuesta vacía del Líder actual.
   */
  private static enterTeamSelection(instance: EngineRoomInstance): void {
    const { publicState } = instance;
    const { gameState, players, room } = publicState;

    const leader = players[gameState.leaderIndex];
    if (!leader) {
      throw new Error('Líder inválido.');
    }

    // Buscar si ya había una gesta ACTIVE (ej. tras un rechazo de equipo en la misma ronda)
    let targetQuest = gameState.quests.find((q) => q.status === 'ACTIVE');

    if (!targetQuest) {
      // Seleccionar por defecto la primera gesta PENDING en orden
      targetQuest = gameState.quests.find((q) => q.status === 'PENDING');
      if (!targetQuest) {
        throw new Error('No quedan gestas pendientes.');
      }
      targetQuest.status = 'ACTIVE';
    }

    gameState.currentQuestNumber = targetQuest.index;
    room.status = 'TEAM_SELECTION';
    gameState.activeProposal = {
      questIndex: targetQuest.index,
      leaderId: leader.id,
      teamIds: [],
      votesSubmittedIds: [],
      revealedVotes: null,
      questVotesSubmittedCount: 0,
    };
  }

  /**
   * Permite al Líder cambiar qué gesta PENDING desea jugar si `targetSelection` está habilitada.
   * Regla oficial: La Gesta 5 no puede seleccionarse hasta haber completado al menos 2 gestas previas.
   */
  public static selectQuestTarget(
    instance: EngineRoomInstance,
    playerId: string,
    questIndex: number
  ): void {
    const { publicState } = instance;
    const { gameState, players, room } = publicState;

    if (room.status !== 'TEAM_SELECTION') {
      throw new Error('Solo se puede elegir gesta objetivo durante la selección de equipo.');
    }
    if (!room.config.rules.targetSelection) {
      throw new Error('La regla de Elección del Objetivo no está activa en esta sala.');
    }

    const leader = players[gameState.leaderIndex];
    if (!leader || leader.id !== playerId) {
      throw new Error('Solo el Líder actual puede elegir la gesta objetivo.');
    }

    const targetQuest = gameState.quests.find((q) => q.index === questIndex);
    if (!targetQuest) {
      throw new Error('Gesta inválida.');
    }
    if (targetQuest.status === 'SUCCESS' || targetQuest.status === 'FAIL') {
      throw new Error('Esa gesta ya fue completada.');
    }

    const pendingOrActiveCount = gameState.quests.filter(
      (q) => q.status === 'PENDING' || q.status === 'ACTIVE'
    ).length;

    if (questIndex === 5 && pendingOrActiveCount > 3) {
      throw new Error(
        'La Gesta 5 no puede seleccionarse hasta haber completado al menos 2 gestas previas.'
      );
    }

    for (const q of gameState.quests) {
      if (q.status === 'ACTIVE') {
        q.status = 'PENDING';
      }
    }
    targetQuest.status = 'ACTIVE';
    gameState.currentQuestNumber = targetQuest.index;

    if (gameState.activeProposal) {
      gameState.activeProposal.questIndex = targetQuest.index;
      gameState.activeProposal.teamIds = [];
    }
  }

  /**
   * Actualiza en tiempo real la preselección del Líder para que la mesa vea a quién está marcando.
   */
  public static updateDraftTeam(
    instance: EngineRoomInstance,
    playerId: string,
    teamIds: string[]
  ): void {
    const { publicState } = instance;
    const { gameState, players, room } = publicState;

    if (room.status !== 'TEAM_SELECTION' || !gameState.activeProposal) {
      return;
    }

    const leader = players[gameState.leaderIndex];
    if (!leader || leader.id !== playerId) {
      return;
    }

    const activeQuest = gameState.quests.find((q) => q.index === gameState.currentQuestNumber);
    if (!activeQuest) return;

    const validPlayerIds = new Set(players.map((p) => p.id));
    const uniqueCleanIds = Array.from(new Set(teamIds)).filter((id) => validPlayerIds.has(id));

    if (uniqueCleanIds.length <= activeQuest.teamSize) {
      gameState.activeProposal.teamIds = uniqueCleanIds;
    }
  }

  /**
   * El Líder confirma el equipo propuesto y la partida avanza a TEAM_VOTE.
   */
  public static proposeTeam(
    instance: EngineRoomInstance,
    playerId: string,
    questIndex: number,
    teamIds: string[]
  ): void {
    const { publicState, secretState } = instance;
    const { gameState, players, room } = publicState;

    if (room.status !== 'TEAM_SELECTION') {
      throw new Error('No es momento de proponer equipo.');
    }

    const leader = players[gameState.leaderIndex];
    if (!leader || leader.id !== playerId) {
      throw new Error('Solo el Líder actual puede confirmar el equipo.');
    }

    if (questIndex !== gameState.currentQuestNumber) {
      throw new Error('La gesta propuesta no coincide con la gesta activa.');
    }

    const activeQuest = gameState.quests.find((q) => q.index === questIndex);
    if (!activeQuest || activeQuest.status !== 'ACTIVE') {
      throw new Error('Gesta activa no encontrada.');
    }

    const uniqueTeamIds = Array.from(new Set(teamIds));
    if (uniqueTeamIds.length !== activeQuest.teamSize) {
      throw new Error(
        `Debes seleccionar exactamente ${activeQuest.teamSize} jugadores para esta gesta.`
      );
    }

    const validPlayerIds = new Set(players.map((p) => p.id));
    for (const memberId of uniqueTeamIds) {
      if (!validPlayerIds.has(memberId)) {
        throw new Error('Uno de los jugadores seleccionados no pertenece a la sala.');
      }
    }

    secretState.currentTeamVoteBuffer = {};
    room.status = 'TEAM_VOTE';
    gameState.activeProposal = {
      questIndex,
      leaderId: leader.id,
      teamIds: uniqueTeamIds,
      votesSubmittedIds: [],
      revealedVotes: null,
      questVotesSubmittedCount: 0,
    };
  }

  /**
   * Registra el voto secreto (APPROVE / REJECT) de un jugador.
   * Cuando todos han votado, resuelve la votación y transiciona atómicamente.
   */
  public static submitTeamVote(
    instance: EngineRoomInstance,
    playerId: string,
    vote: 'APPROVE' | 'REJECT'
  ): void {
    const { publicState, secretState } = instance;
    const { gameState, players, room } = publicState;

    if (room.status !== 'TEAM_VOTE' || !gameState.activeProposal) {
      throw new Error('No hay una votación de equipo en curso.');
    }

    const playerExists = players.some((p) => p.id === playerId);
    if (!playerExists) {
      throw new Error('Jugador no válido en esta sala.');
    }

    if (vote !== 'APPROVE' && vote !== 'REJECT') {
      throw new Error('Voto inválido.');
    }

    secretState.currentTeamVoteBuffer[playerId] = vote;
    if (!gameState.activeProposal.votesSubmittedIds.includes(playerId)) {
      gameState.activeProposal.votesSubmittedIds.push(playerId);
    }

    if (gameState.activeProposal.votesSubmittedIds.length < players.length) {
      return;
    }

    const revealedVotes: Record<string, 'APPROVE' | 'REJECT'> = {};
    let approves = 0;
    let rejects = 0;

    for (const p of players) {
      const playerVote = secretState.currentTeamVoteBuffer[p.id];
      revealedVotes[p.id] = playerVote;
      if (playerVote === 'APPROVE') approves++;
      else rejects++;
    }

    const approved = approves > rejects;
    const attemptNumber = gameState.rejectionTrack + 1;

    gameState.activeProposal.revealedVotes = revealedVotes;
    secretState.currentTeamVoteBuffer = {};

    gameState.history.push({
      questIndex: gameState.activeProposal.questIndex,
      attemptNumber,
      leaderId: gameState.activeProposal.leaderId,
      teamIds: [...gameState.activeProposal.teamIds],
      votes: revealedVotes,
      approved,
      questOutcome: null,
    });

    if (approved) {
      gameState.rejectionTrack = 0;
      secretState.currentQuestCardBuffer = {};
      gameState.activeProposal.questVotesSubmittedCount = 0;
      room.status = 'QUEST_EXECUTION';
      return;
    }

    gameState.rejectionTrack += 1;

    if (gameState.rejectionTrack >= 5) {
      this.triggerGameOver(instance, 'EVIL', 'FIVE_REJECTIONS');
      return;
    }

    gameState.leaderIndex = (gameState.leaderIndex + 1) % players.length;
    this.enterTeamSelection(instance);
  }

  /**
   * Ejecución de la gesta: cada miembro del equipo aprobado juega SUCCESS o FAIL.
   * Seguridad estricta: Un jugador GOOD tiene prohibido jugar FAIL.
   */
  public static submitQuestCard(
    instance: EngineRoomInstance,
    playerId: string,
    card: 'SUCCESS' | 'FAIL'
  ): void {
    const { publicState, secretState } = instance;
    const { gameState, room } = publicState;

    if (room.status !== 'QUEST_EXECUTION' || !gameState.activeProposal) {
      throw new Error('No hay una gesta en ejecución.');
    }

    if (!gameState.activeProposal.teamIds.includes(playerId)) {
      throw new Error('No formas parte del equipo asignado a esta gesta.');
    }

    if (secretState.currentQuestCardBuffer[playerId]) {
      throw new Error('Ya has enviado tu carta para esta gesta.');
    }

    const assignment = secretState.assignments[playerId];
    if (!assignment) {
      throw new Error('Asignación de rol no encontrada.');
    }

    if (assignment.alignment === 'GOOD' && card === 'FAIL') {
      throw new Error('Como miembro del Bien, estás obligado a apoyar el Éxito de la gesta.');
    }

    if (card !== 'SUCCESS' && card !== 'FAIL') {
      throw new Error('Carta de gesta inválida.');
    }

    secretState.currentQuestCardBuffer[playerId] = card;
    gameState.activeProposal.questVotesSubmittedCount = Object.keys(
      secretState.currentQuestCardBuffer
    ).length;

    if (
      gameState.activeProposal.questVotesSubmittedCount <
      gameState.activeProposal.teamIds.length
    ) {
      return;
    }

    const rawCards = Object.values(secretState.currentQuestCardBuffer);
    const shuffledCards = this.fisherYatesShuffle(rawCards);
    secretState.currentQuestCardBuffer = {};

    const successes = shuffledCards.filter((c) => c === 'SUCCESS').length;
    const fails = shuffledCards.filter((c) => c === 'FAIL').length;

    const activeQuest = gameState.quests.find(
      (q) => q.index === gameState.activeProposal!.questIndex
    );
    if (!activeQuest) {
      throw new Error('Gesta activa no encontrada al resolver.');
    }

    const questFailed = activeQuest.requiresTwoFails ? fails >= 2 : fails >= 1;
    const passed = !questFailed;

    activeQuest.status = passed ? 'SUCCESS' : 'FAIL';
    activeQuest.results = { successes, fails };
    gameState.completedQuestsCount += 1;
    gameState.activeProposal.lastShuffledCards = shuffledCards;

    const lastHistoryEntry = gameState.history[gameState.history.length - 1];
    if (lastHistoryEntry && lastHistoryEntry.approved) {
      lastHistoryEntry.questOutcome = {
        successes,
        fails,
        passed,
      };
    }

    room.status = 'QUEST_REVEAL';
  }

  /**
   * Avanza desde QUEST_REVEAL tras completarse la animación de volteo de cartas.
   */
  public static finishQuestReveal(instance: EngineRoomInstance): void {
    const { publicState } = instance;
    const { gameState, players, room } = publicState;

    if (room.status !== 'QUEST_REVEAL') {
      return;
    }

    const totalFails = gameState.quests.filter((q) => q.status === 'FAIL').length;
    const totalSuccesses = gameState.quests.filter((q) => q.status === 'SUCCESS').length;

    if (totalFails >= 3) {
      this.triggerGameOver(instance, 'EVIL', 'THREE_QUESTS_FAILED');
      return;
    }

    if (totalSuccesses >= 3) {
      room.status = 'ASSASSINATION';
      return;
    }

    const completed = gameState.completedQuestsCount;
    const shouldTriggerLady =
      room.config.rules.ladyOfTheLake &&
      (completed === 2 || completed === 3 || completed === 4) &&
      gameState.ladyOfTheLakeHolderId !== null;

    if (shouldTriggerLady) {
      const hasEligibleTarget = players.some(
        (p) => p.id !== gameState.ladyOfTheLakeHolderId && !p.investigatedByLady
      );
      if (hasEligibleTarget) {
        room.status = 'LADY_OF_THE_LAKE';
        return;
      }
    }

    gameState.leaderIndex = (gameState.leaderIndex + 1) % players.length;
    this.enterTeamSelection(instance);
  }

  /**
   * Ejecuta la investigación de la Dama del Lago.
   */
  public static useLadyOfTheLake(
    instance: EngineRoomInstance,
    holderId: string,
    targetPlayerId: string
  ): { targetId: string; alignment: Alignment } {
    const { publicState, secretState } = instance;
    const { gameState, players, room } = publicState;

    if (room.status !== 'LADY_OF_THE_LAKE') {
      throw new Error('No es momento de usar la Dama del Lago.');
    }

    if (gameState.ladyOfTheLakeHolderId !== holderId) {
      throw new Error('No posees la ficha de la Dama del Lago.');
    }

    if (holderId === targetPlayerId) {
      throw new Error('No puedes investigarte a ti mismo.');
    }

    const targetPlayer = players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) {
      throw new Error('Jugador objetivo no encontrado.');
    }

    if (targetPlayer.investigatedByLady) {
      throw new Error('Este jugador ya ha tenido la Dama del Lago y no puede ser investigado.');
    }

    const targetAssignment = secretState.assignments[targetPlayerId];
    if (!targetAssignment) {
      throw new Error('Rol del objetivo no encontrado.');
    }

    targetPlayer.investigatedByLady = true;
    gameState.ladyOfTheLakeHolderId = targetPlayerId;

    const revealRecord = {
      targetId: targetPlayerId,
      alignment: targetAssignment.alignment,
    };

    if (!secretState.ladyInvestigationHistory[holderId]) {
      secretState.ladyInvestigationHistory[holderId] = [];
    }
    secretState.ladyInvestigationHistory[holderId].push(revealRecord);

    gameState.leaderIndex = (gameState.leaderIndex + 1) % players.length;
    this.enterTeamSelection(instance);

    return revealRecord;
  }

  /**
   * Fase final ASSASSINATION: El Asesino dispara sobre un jugador.
   */
  public static assassinateTarget(
    instance: EngineRoomInstance,
    shooterId: string,
    targetPlayerId: string
  ): void {
    const { publicState, secretState } = instance;
    const { players, room } = publicState;

    if (room.status !== 'ASSASSINATION') {
      throw new Error('La partida no está en fase de asesinato.');
    }

    const shooterAssignment = secretState.assignments[shooterId];
    if (!shooterAssignment || shooterAssignment.role !== 'ASSASSIN') {
      throw new Error('Solo el Asesino puede ejecutar el disparo final.');
    }

    const targetPlayer = players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) {
      throw new Error('Objetivo inválido.');
    }

    const targetAssignment = secretState.assignments[targetPlayerId];
    if (!targetAssignment) {
      throw new Error('Rol del objetivo no encontrado.');
    }

    if (targetAssignment.role === 'MERLIN') {
      this.triggerGameOver(instance, 'EVIL', 'MERLIN_ASSASSINATED', targetPlayerId);
    } else {
      this.triggerGameOver(instance, 'GOOD', 'QUESTS_COMPLETED_MERLIN_SURVIVED', targetPlayerId);
    }
  }

  /**
   * Finaliza la partida y libera por primera vez el diccionario completo de roles al estado público.
   */
  private static triggerGameOver(
    instance: EngineRoomInstance,
    winningAlignment: 'GOOD' | 'EVIL',
    reason: NonNullable<PublicRoomState['gameState']['winner']>['reason'],
    assassinatedPlayerId?: string
  ): void {
    const { publicState, secretState } = instance;

    publicState.room.status = 'GAME_OVER';
    publicState.gameState.winner = {
      alignment: winningAlignment,
      reason,
      assassinatedPlayerId,
      revealedRoles: { ...secretState.assignments },
    };
  }

  /**
   * Reinicia la sala al estado LOBBY conservando jugadores y configuración.
   */
  public static returnToLobby(instance: EngineRoomInstance, requesterId: string): void {
    const { publicState, secretState } = instance;

    if (publicState.room.hostId !== requesterId) {
      throw new Error('Solo el anfitrión puede volver al lobby.');
    }

    publicState.room.status = 'LOBBY';
    publicState.players.forEach((p) => {
      p.isReady = false;
      p.investigatedByLady = false;
    });

    secretState.assignments = {};
    secretState.currentTeamVoteBuffer = {};
    secretState.currentQuestCardBuffer = {};
    secretState.ladyInvestigationHistory = {};

    publicState.gameState = {
      currentQuestNumber: 1,
      completedQuestsCount: 0,
      leaderIndex: 0,
      rejectionTrack: 0,
      ladyOfTheLakeHolderId: null,
      activeProposal: null,
      quests: this.buildQuestSlots(publicState.players.length),
      history: [],
      winner: null,
    };
  }
}