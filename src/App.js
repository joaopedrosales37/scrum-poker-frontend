import React, { useState } from 'react';
import PokerTable from './components/PokerTable';

function App() {
  const [inGame, setInGame] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  if (inGame && roomId && username) {
    return <PokerTable roomId={roomId} username={username} onLeave={() => setInGame(false)} />;
  }

  const history = JSON.parse(localStorage.getItem('poker_history') || '[]');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row items-center justify-center p-6 gap-6">
      
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-sm shadow-xl">
        <h1 className="text-2xl font-black text-center text-emerald-400 mb-6">⚡ SCRUM POKER</h1>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">ID da Sala</label>
            <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-400 mt-1" placeholder="Ex: squad-alfa" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Seu Nickname</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-400 mt-1" placeholder="Ex: Bob_Dev" />
          </div>
          <button onClick={() => { if(roomId && username) setInGame(true); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold p-3 rounded-xl transition-all shadow-md active:scale-95">
            Entrar na Mesa
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/60 w-full max-w-xs flex flex-col h-[360px]">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3">🏠 Histórico de Sessões</h2>
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center mt-12">Seus históricos de estimativas aparecerão aqui.</p>
          ) : (
            history.map((session) => (
              <button key={session.id} onClick={() => { setRoomId(session.roomId); setInGame(false); }} className="w-full text-left bg-slate-900/60 hover:bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs transition-all">
                <div>
                  <div className="font-semibold text-emerald-400 truncate max-w-[140px]">{session.roomId}</div>
                  <div className="text-[10px] text-slate-500">{session.date}</div>
                </div>
                <div className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Reentrar</div>
              </button>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
