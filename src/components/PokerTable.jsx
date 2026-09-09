import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs/lib/stomp';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://scrum-poker-backend-kgf7.onrender.com';

const DECKS = {
  FIBONACCI: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '☕', '?'],
  TSHIRT: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '☕', '?'],
  MANDAYS: ['0.5', '1', '2', '3', '4', '5', '8', '10', '☕', '?'],
  WORKHOURS: ['0.5', '1', '2', '3', '4', '5', '8', '10', '☕', '?']
};

const calculateStatistics = (votesMap) => {
  const voteValues = Object.values(votesMap)
    .filter((vote) => vote !== '' && vote !== '?' && vote !== '☕')
    .map((vote) => parseFloat(vote));

  if (voteValues.length === 0) return { average: 0, total: 0 };

  const sum = voteValues.reduce((accumulator, current) => accumulator + current, 0);
  return { average: (sum / voteValues.length).toFixed(1), total: voteValues.length };
};

export default function PokerTable({ roomId, username, onLeave }) {
  const [votes, setVotes] = useState({});
  const [avatars, setAvatars] = useState({});
  const [isRevealed, setIsRevealed] = useState(false);
  const [roomMaster, setRoomMaster] = useState(null);
  const [deckType, setDeckType] = useState('FIBONACCI');
  const [myVote, setMyVote] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [customTime, setCustomTime] = useState('');
  const stompClientRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const sendMessage = (payload) => {
    if (stompClientRef.current) {
      stompClientRef.current.send(`/app/poker/${roomId}`, {}, JSON.stringify(payload));
    }
  };

  useEffect(() => {
    const socket = new SockJS(BACKEND_URL);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;
    
    stompClient.heartbeat.outgoing = 10000;
    stompClient.heartbeat.incoming = 10000;

    stompClient.connect({}, () => {
      stompClientRef.current = stompClient;
      stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
        const state = JSON.parse(message.body);
        setVotes(state.votes || {});
        setAvatars(state.avatars || {});
        setIsRevealed(state.isRevealed || false);
        setRoomMaster(state.roomMaster || null);
        setDeckType(state.deckType || 'FIBONACCI');

        if (state.lastAction === 'RESET' || state.lastAction === 'CHANGE_DECK') {
          setMyVote(null);
          setTimeLeft(0);
          clearInterval(timerIntervalRef.current);
        }

        if (state.lastAction === 'START_TIMER') {
          clearInterval(timerIntervalRef.current);
          setTimeLeft(state.timerDuration);
          timerIntervalRef.current = setInterval(() => {
            setTimeLeft((previousTime) => {
              if (previousTime <= 1) {
                clearInterval(timerIntervalRef.current);
                return 0;
              }
              return previousTime - 1;
            });
          }, 1000);
        }
      });

      sendMessage({ action: 'JOIN', username, roomId });
    });

    return () => {
      if (stompClientRef.current) stompClientRef.current.disconnect();
      clearInterval(timerIntervalRef.current);
    };
  }, [roomId, username]);

  useEffect(() => {
    if (isRevealed && Object.keys(votes).length > 0) {
      const stats = calculateStatistics(votes);
      const history = JSON.parse(localStorage.getItem('poker_history') || '[]');
      const newSession = {
        id: Date.now(),
        roomId,
        date: new Date().toLocaleDateString(),
        average: stats.average,
        totalVotes: stats.total,
        deckType
      };

      if (!history.some((session) => session.roomId === roomId && session.average === stats.average && Date.now() - session.id < 4000)) {
        localStorage.setItem('poker_history', JSON.stringify([newSession, ...history].slice(0, 15)));
      }
    }
  }, [isRevealed, votes, roomId, deckType]);

  const isScrumMaster = username === roomMaster;
  const currentDeck = DECKS[deckType] || DECKS.FIBONACCI;
  const stats = calculateStatistics(votes);

  const renderHistoryList = () => {
    const localHistory = JSON.parse(localStorage.getItem('poker_history') || '[]');

    if (localHistory.length === 0) {
      return <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma sessão gravada neste navegador.</p>;
    }

    return localHistory.map((session) => (
      <div key={session.id} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
        <div>
          <div className="font-semibold text-slate-300 max-w-[120px] truncate">{session.roomId}</div>
          <div className="text-[10px] text-slate-500">{session.date} • {session.deckType}</div>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-1 rounded-lg text-sm">{session.average}</div>
      </div>
    ));
  };

  const renderActivePlayers = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
      {Object.entries(votes).map(([user, vote]) => {
        const hasVoted = vote !== '';
        const cardStatusClass = isRevealed
          ? 'bg-white text-slate-900 border-white'
          : hasVoted
            ? 'bg-emerald-500 text-slate-950 border-emerald-300'
            : 'bg-slate-700 text-slate-100 border-slate-600';

        return (
          <div key={user} className="flex flex-col items-center justify-center">
            <div className="text-3xl mb-1 filter drop-shadow-md">{avatars[user] || '👤'}</div>
            <div className={`w-14 h-20 rounded-xl border-2 flex items-center justify-center font-bold text-xl shadow-md ${cardStatusClass}`}>
              {isRevealed ? vote : (hasVoted ? '🃏' : '⏳')}
            </div>
            <span className="text-[11px] font-bold mt-1.5 bg-slate-950/80 px-2.5 py-0.5 rounded-full text-slate-300 max-w-[90px] truncate shadow-sm">
              {user === username ? 'Você' : user}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderClickableCards = () => currentDeck.map((card) => {
    const selectedClass = myVote === card
      ? 'bg-amber-400 text-slate-900 border-amber-300 ring-4 ring-amber-400/20 -translate-y-2'
      : 'bg-slate-700 text-slate-100 border-slate-600';

    return (
      <button
        key={card}
        disabled={isRevealed}
        onClick={() => {
          setMyVote(card);
          sendMessage({ action: 'VOTE', username, vote: card, roomId });
        }}
        className={`w-12 h-20 min-w-[48px] rounded-xl font-bold text-lg border-2 transition-all duration-200 flex items-center justify-center shadow-md transform hover:-translate-y-4 disabled:opacity-50 disabled:hover:translate-y-0 ${selectedClass}`}
      >
        {card}
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-emerald-400">⚡ Scrum Poker Table</h1>
          <p className="text-sm text-slate-400">Sala: <span className="font-mono font-bold text-slate-200">{roomId}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft > 0 && <div className="bg-amber-500/20 border border-amber-500 text-amber-400 font-mono font-bold px-3 py-1 rounded-lg animate-pulse text-sm">⏱️ Encerrando em: {timeLeft}s</div>}
          <div className="bg-slate-800 px-4 py-2 rounded-full text-sm font-medium border border-slate-700">👑 Mestre: <span className="text-emerald-400 font-bold">{roomMaster || '...'}</span></div>
          <button onClick={onLeave} className="text-xs bg-slate-800 hover:bg-rose-600/30 hover:text-rose-400 border border-slate-700 px-3 py-2 rounded-xl transition-all">Sair</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center gap-6 my-6">
        {isRevealed ? (
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Média dos Votos</p>
            <div className="text-4xl font-black text-white">{stats.average}</div>
            <p className="text-xs text-slate-400">{stats.total} respostas</p>
            {isScrumMaster && <button onClick={() => sendMessage({ action: 'RESET', roomId })} className="mt-3 bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-bold">🔄 Nova Rodada</button>}
          </div>
        ) : isScrumMaster ? (
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 w-full max-w-xs">
            <div className="flex gap-2 mb-3">
              <button onClick={() => sendMessage({ action: 'REVEAL', roomId })} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex-1">👁️ Revelar</button>
              <button onClick={() => sendMessage({ action: 'RESET', roomId })} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold">🔄 Limpar</button>
            </div>
            <select value={deckType} onChange={(event) => sendMessage({ action: 'CHANGE_DECK', deckType: event.target.value, roomId })} className="bg-slate-800 border border-slate-700 text-white rounded-xl p-2 text-xs font-semibold w-full">
              <option value="FIBONACCI">🃏 Fibonacci Clássico</option>
              <option value="TSHIRT">👕 Tamanho Camisa</option>
              <option value="MANDAYS">⏱️ Mandays (Dias)</option>
              <option value="WORKHOURS">⏱️ Work Hours (Horas)</option>
            </select>
            <div className="flex gap-1 mt-3">
              {[15, 30, 45, 60].map((duration) => <button key={duration} onClick={() => sendMessage({ action: 'START_TIMER', duration, roomId })} className="bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-[10px] py-1 rounded font-bold flex-1">{duration === 60 ? '1m' : `${duration}s`}</button>)}
            </div>
            <div className="flex gap-1 mt-2">
              <input type="number" placeholder="Custom (s)" value={customTime} onChange={(event) => setCustomTime(event.target.value)} className="bg-slate-800 text-white text-xs p-1.5 rounded-lg border border-slate-700 w-full" />
              <button onClick={() => customTime && sendMessage({ action: 'START_TIMER', duration: parseInt(customTime, 10), roomId })} className="bg-amber-500 text-slate-950 font-bold px-2 text-xs rounded-lg">Ir</button>
            </div>
          </div>
        ) : <p className="text-xs text-slate-400 italic">O Scrum Master está gerenciando a rodada.</p>}

        {renderActivePlayers()}
        <section className="w-full max-w-2xl">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Seu Baralho ({deckType})</h2>
          <div className="flex flex-wrap justify-center gap-3">{renderClickableCards()}</div>
        </section>
        <section className="w-full max-w-md">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">🕒 Rodadas Recentes</h2>
          <div className="space-y-2">{renderHistoryList()}</div>
        </section>
      </main>
    </div>
  );
}
