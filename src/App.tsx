import { useEffect, useState } from 'react';
import { actionIds, chooseApproach, createGame, startCase, type ActionId } from './core/game';
import { parseLocalAction } from './core/parser';
import { loadGame, saveGame } from './storage/save';

const labels: Record<ActionId, string> = { event_misdelivered_medical_case: '误投的药箱', event_sealed_warehouse_ledger: '封锁仓库的账册', event_night_whistle: '夜航哨声' };

function App() {
  const [game, setGame] = useState(() => createGame());
  const [started, setStarted] = useState(false);
  const [freeText, setFreeText] = useState(''); const [parserMessage, setParserMessage] = useState('');
  useEffect(() => { void loadGame().then((saved) => { if (saved) { setGame(saved); setStarted(true); setParserMessage('已恢复本地存档。'); } }); }, []);
  const update = (next: typeof game) => { setGame(next); void saveGame(next); };
  const begin = (action: ActionId) => update(startCase(game, action));
  const resolve = (action: ActionId, approach: 'safe' | 'risky') => update(chooseApproach(game, action, approach));
  const submitFreeAction = () => { const parsed = parseLocalAction(freeText, game); setParserMessage(parsed.message); if (parsed.action) begin(parsed.action); };
  const latest = game.log.at(-1);
  const resolved = actionIds.find((id) => game.state.clues[{ event_misdelivered_medical_case: 'clue_misdelivered_case', event_sealed_warehouse_ledger: 'clue_warehouse_ledger', event_night_whistle: 'clue_night_whistle' }[id]] !== undefined);
  return <main className="shell"><h1>Mistweave of Fates</h1><p className="location">灰雾织命 · <span>瓦伦港，灰炉药房</span> · 第 {game.state.worldTime.worldDay} 日</p>
    {!started ? <button type="button" className="start" onClick={() => setStarted(true)}>开始调查</button> : <section><h2>可调查事件</h2>{actionIds.map((id) => game.caseStates[id].stage === 'available' ? <button key={id} type="button" className="case" onClick={() => begin(id)}>接触：{labels[id]}</button> : game.caseStates[id].stage === 'approach' ? <div key={id}><h3>{labels[id]}</h3><button type="button" className="case" onClick={() => resolve(id, 'safe')}>谨慎调查（15 分钟）</button><button type="button" className="case" onClick={() => resolve(id, 'risky')}>冒险调查（30 分钟，可能违法）</button></div> : null)}</section>}
    <p>理智 {game.state.characters.char_player.derived.sanity.current} · 灵性 {game.state.characters.char_player.derived.spirituality.current} · 污染 {game.state.characters.char_player.derived.pollution} · 警方关注 {game.legalAttention}</p>
    {latest && <section className="log"><p>判定：已提交事件 #{latest.eventCursor}</p><p>线索：{labels[resolved ?? 'event_misdelivered_medical_case']}</p></section>}
    {started && <section><label htmlFor="free-action">自由行动</label><input id="free-action" value={freeText} onChange={(event) => setFreeText(event.target.value)} /><button type="button" onClick={submitFreeAction}>尝试行动</button>{parserMessage && <p>{parserMessage}</p>}</section>}
  </main>;
}

export default App;
