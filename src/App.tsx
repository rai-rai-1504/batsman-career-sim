import React, { useEffect, useState } from 'react';
import { useCareerStore } from './state/careerStore';
import { useMatchStore } from './state/matchStore';
import { TitleScreen } from './components/TitleScreen';
import { PlayerCreation } from './components/PlayerCreation';
import { TeamSelect } from './components/TeamSelect';
import { CareerHub } from './components/CareerHub';
import { NetsPractice } from './components/NetsPractice';
import { MatchView } from './components/match/MatchView';
import { Player } from './types';
import { soundManager } from './audio/soundManager';

type ScreenState = 'title' | 'player_create' | 'team_select' | 'career_hub' | 'nets_practice' | 'live_match';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('title');
  const [hasSavedCareer, setHasSavedCareer] = useState<boolean>(false);

  const {
    player,
    playerTeamId,
    teams,
    fixtures,
    initFromStorage,
    createPlayer,
    selectTeam,
    startNewCareer,
    resetAll,
    settings,
  } = useCareerStore();

  const { initializeMatch, resetMatch } = useMatchStore();

  useEffect(() => {
    try {
      const loaded = initFromStorage();
      setHasSavedCareer(loaded);
      soundManager.setSoundEnabled(settings?.soundEnabled ?? true);
    } catch (e) {
      console.error('Error initializing career state:', e);
    }
  }, []);

  const handleStartNewCareer = () => {
    try {
      startNewCareer();
    } catch (e) {
      console.warn('startNewCareer error:', e);
    }
    setCurrentScreen('player_create');
  };

  const handleContinueCareer = () => {
    if (player && playerTeamId) {
      setCurrentScreen('career_hub');
    } else {
      setCurrentScreen('player_create');
    }
  };

  const handlePlayerCreated = (playerData: {
    name: string;
    avatarId: string;
    batColor: string;
    position: Player['battingPosition'];
  }) => {
    createPlayer(playerData.name, playerData.avatarId, playerData.batColor, playerData.position);
    setCurrentScreen('team_select');
  };

  const handleTeamConfirmed = (teamId: string) => {
    selectTeam(teamId);
    setHasSavedCareer(true);
    setCurrentScreen('career_hub');
  };

  const handlePlayMatch = (fixtureId: string) => {
    if (!player || !playerTeamId) return;

    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return;

    initializeMatch(fixture, player, playerTeamId, teams);
    setCurrentScreen('live_match');
  };

  const handleExitMatch = () => {
    resetMatch();
    setCurrentScreen('career_hub');
  };

  const handleResetCareer = () => {
    resetAll();
    setHasSavedCareer(false);
    setCurrentScreen('title');
  };

  return (
    <div className="w-full min-h-screen bg-[#0B1220] text-[#F5F7FA]">
      {currentScreen === 'title' && (
        <TitleScreen
          onNewCareer={handleStartNewCareer}
          onContinue={handleContinueCareer}
          onNetsPractice={() => setCurrentScreen('nets_practice')}
          hasSavedCareer={hasSavedCareer}
        />
      )}

      {currentScreen === 'player_create' && (
        <PlayerCreation
          onBack={() => setCurrentScreen('title')}
          onNext={handlePlayerCreated}
        />
      )}

      {currentScreen === 'team_select' && (
        <TeamSelect
          teams={teams}
          onBack={() => setCurrentScreen('player_create')}
          onConfirmTeam={handleTeamConfirmed}
        />
      )}

      {currentScreen === 'career_hub' && (
        <CareerHub
          onPlayMatch={handlePlayMatch}
          onOpenNets={() => setCurrentScreen('nets_practice')}
          onResetCareer={handleResetCareer}
        />
      )}

      {currentScreen === 'nets_practice' && (
        <NetsPractice
          onBack={() => {
            if (player && playerTeamId) {
              setCurrentScreen('career_hub');
            } else {
              setCurrentScreen('title');
            }
          }}
        />
      )}

      {currentScreen === 'live_match' && (
        <MatchView onExitMatch={handleExitMatch} />
      )}
    </div>
  );
};

export default App;
