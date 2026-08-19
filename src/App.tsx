import { useEffect, useState } from 'react';
import { useAbility, type AbilityCharge } from './core/abilities';
import { advanceTrack, attemptAscension, prepareRitual } from './core/ascension';
import {
  actionIds,
  addCharacter,
  activeCharacter,
  chooseApproach,
  createGame,
  startCase,
  type ActionId,
  type Game,
  type PathwayId,
} from './core/game';
import { parseLocalAction } from './core/parser';
import type { Occupation } from './core/profile';
import { loadGame, saveGame } from './storage/save';

const actionLabels: Record<ActionId, string> = {
  event_misdelivered_medical_case: '误投的药箱',
  event_sealed_warehouse_ledger: '封锁仓库的账册',
  event_night_whistle: '夜航哨声',
};
const clueIds: Record<ActionId, string> = {
  event_misdelivered_medical_case: 'clue_misdelivered_case',
  event_sealed_warehouse_ledger: 'clue_warehouse_ledger',
  event_night_whistle: 'clue_night_whistle',
};
const occupationLabels: Record<Occupation, string> = {
  apothecary: '药房学徒', reporter: '记者', detective: '警探', dockworker: '码头工人',
};
const pathwayDetails: Record<PathwayId, { label: string; ability: string }> = {
  observer: { label: '观察者', ability: '痕迹感知' },
  hound: { label: '猎犬', ability: '危险追迹' },
};
const outcomeLabels = {
  success: '成功', costly_success: '带代价成功', failure: '失败', catastrophic_failure: '灾难失败',
} as const;

function App() {
  const [game, setGame] = useState<Game>(() => createGame());
  const [started, setStarted] = useState(false);
  const [occupation, setOccupation] = useState<Occupation>('apothecary');
  const [intent, setIntent] = useState('');
  const [freeText, setFreeText] = useState('');
  const [parserMessage, setParserMessage] = useState('');
  const [confirmPathway, setConfirmPathway] = useState<PathwayId | null>(null);
  const [abilityCharge, setAbilityCharge] = useState<AbilityCharge>(1);

  useEffect(() => {
    let mounted = true;
    void loadGame().then((saved) => {
      if (mounted && saved) {
        setGame(saved);
        setStarted(true);
        setParserMessage('已恢复本地存档。');
      }
    });
    return () => { mounted = false; };
  }, []);

  const update = (next: Game) => {
    setGame(next);
    void saveGame(next);
  };
  const character = activeCharacter(game);
  const begin = (action: ActionId) => update(startCase(game, action));
  const resolve = (action: ActionId, approach: 'safe' | 'risky') => update(chooseApproach(game, action, approach));
  const submitFreeAction = () => {
    const parsed = parseLocalAction(freeText, game);
    setParserMessage(parsed.message);
    if (parsed.action) begin(parsed.action);
  };
  const createNewCharacter = () => {
    if (!intent.trim()) return;
    update(addCharacter(game, occupation, intent.trim()));
    setIntent('');
  };
  const trustPathway = (pathway: PathwayId) => update(advanceTrack(game, pathway));
  const preparePathway = (pathway: PathwayId, approach: 'safe' | 'risky') => update(prepareRitual(game, pathway, approach));
  const confirmAscension = (pathway: PathwayId) => {
    update(attemptAscension(game, pathway, `ascension:${game.state.worldSeed}:${pathway}:${game.state.eventCursor}`));
    setConfirmPathway(null);
  };
  const activateAbility = (pathway: PathwayId) => {
    update(useAbility(game, pathway, abilityCharge, `${game.state.worldSeed}:${game.state.eventCursor}:ability:${pathway}`));
  };

  const latest = game.log.at(-1);
  const resolved = actionIds.find((id) => game.state.clues[clueIds[id]] !== undefined);
  const canCreate = game.profile.characters.length < game.profile.slotLimit && !character;
  const canProgressPathways = character !== undefined && character.pathwayState === null;

  return <main className="shell">
    <header className="masthead">
      <p className="eyebrow">瓦伦港调查局 · 私人档案</p>
      <h1>Mistweave of Fates</h1>
      <p className="location">灰雾织命 · <span>瓦伦港，灰炉药房</span> · 第 {game.state.worldTime.worldDay} 日</p>
    </header>

    {!started && <button type="button" className="start" onClick={() => setStarted(true)}>开始调查</button>}

    {started && <>
      <section className="panel profile-panel" aria-labelledby="profile-title">
        <div className="panel-heading"><h2 id="profile-title">角色档案</h2><span>槽位 {game.profile.characters.length}/{game.profile.slotLimit}</span></div>
        <div className="card-grid">
          {game.profile.characters.map((entry) => <article className={`character-card ${entry.status}`} key={entry.characterId}>
            <h3>{occupationLabels[entry.occupationId as Occupation]} · {entry.status === 'deceased' ? '已永久失效' : '活动'}</h3>
            <p>{entry.initialIntent}</p>
            <p>生命 {entry.derived.hp.current}/{entry.derived.hp.max} · 理智 {entry.derived.sanity.current}/{entry.derived.sanity.max}</p>
            <p>灵性 {entry.derived.spirituality.current}/{entry.derived.spirituality.max} · 污染 {entry.derived.pollution}</p>
            {entry.status === 'deceased' && <button type="button" disabled>角色卡已永久失效</button>}
          </article>)}
        </div>
        {canCreate && <div className="creation-form">
          <h2>创建角色卡</h2>
          <label htmlFor="occupation">初始职业</label>
          <select id="occupation" value={occupation} onChange={(event) => setOccupation(event.target.value as Occupation)}>
            {(Object.entries(occupationLabels) as [Occupation, string][]).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <label htmlFor="intent">初始意愿</label>
          <input id="intent" value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="你为何踏入灰雾？" />
          <button type="button" onClick={createNewCharacter} disabled={!intent.trim()}>创建角色</button>
        </div>}
      </section>

      {character && <section className="panel" aria-labelledby="cases-title">
        <div className="panel-heading"><h2 id="cases-title">可调查事件</h2><span>警方关注 {game.legalAttention}</span></div>
        <div className="action-grid">
          {actionIds.map((id) => game.caseStates[id].stage === 'available'
            ? <button key={id} type="button" className="case" onClick={() => begin(id)}>接触：{actionLabels[id]}</button>
            : game.caseStates[id].stage === 'approach'
              ? <article className="case-choice" key={id}><h3>{actionLabels[id]}</h3><button type="button" className="case" onClick={() => resolve(id, 'safe')}>谨慎调查（15 分钟）</button><button type="button" className="case danger" onClick={() => resolve(id, 'risky')}>冒险调查（30 分钟，可能违法）</button></article>
              : null)}
        </div>
      </section>}

      {(game.meaningfulEventCount >= 3 || Object.values(game.pathwayTracks).some((track) => track.state !== 'hidden')) && <section className="panel" aria-labelledby="pathways-title">
        <div className="panel-heading"><h2 id="pathways-title">灰雾路径</h2><span>可并行调查，服药后锁定一条</span></div>
        <div className="pathway-grid">
          {(['observer', 'hound'] as const).map((pathway) => {
            const track = game.pathwayTracks[pathway];
            const details = pathwayDetails[pathway];
            return <article className={`pathway-card ${track.state}`} key={pathway}>
              <p className="eyebrow">线索顺序 {track.hintOrder ?? '—'}</p>
              <h3>{details.label}</h3>
              <p>轨道：{track.state}</p>
              {track.state === 'hinted' && canProgressPathways && <button type="button" onClick={() => trustPathway(pathway)}>调查{details.label}线索</button>}
              {(track.state === 'trusted' || track.state === 'prepared') && <div className="risk-preview">
                <p>能力方向：{details.ability}</p>
                <p>不可逆改变：角色将锁定所选路径，并承受身体与灵魂改变。</p>
                <p>风险：仪式与服药存在失控或死亡风险。</p>
              </div>}
              {track.state === 'trusted' && canProgressPathways && <div className="button-row">
                <button type="button" onClick={() => preparePathway(pathway, 'safe')}>安全准备{details.label}仪式</button>
                <button type="button" className="danger" onClick={() => preparePathway(pathway, 'risky')}>冒险准备{details.label}仪式</button>
              </div>}
              {track.preparation && <p>{track.preparation.materialId === 'stabilized_aether_salts' ? '稳定以太盐' : '未许可雾质馏出物'} · 准备质量 {track.preparation.quality}</p>}
              {track.state === 'prepared' && canProgressPathways && <button type="button" className="danger" onClick={() => setConfirmPathway(pathway)}>准备服药：{details.label}</button>}
              {track.ascension && <p className="result">晋升结果：{outcomeLabels[track.ascension.outcome]}（D100 {track.ascension.roll}）</p>}
              {track.state === 'ascended' && character?.pathwayState === pathway && <div className="ability-panel">
                <label htmlFor={`charge-${pathway}`}>能力加注</label>
                <select id={`charge-${pathway}`} value={abilityCharge} onChange={(event) => setAbilityCharge(Number(event.target.value) as AbilityCharge)}>
                  <option value={1}>1 点</option><option value={2}>2 点</option><option value={3}>3 点</option>
                </select>
                <button type="button" onClick={() => activateAbility(pathway)} disabled={character.derived.spirituality.current < abilityCharge}>使用{details.ability}</button>
              </div>}
            </article>;
          })}
        </div>
      </section>}

      {latest && <section className="panel log"><h2>事件记录</h2><p>判定：已提交事件 #{latest.eventCursor}</p>{resolved && <p>线索：{actionLabels[resolved]}</p>}</section>}

      {character && <section className="panel free-action"><label htmlFor="free-action">自由行动</label><div className="button-row"><input id="free-action" value={freeText} onChange={(event) => setFreeText(event.target.value)} /><button type="button" onClick={submitFreeAction}>尝试行动</button></div>{parserMessage && <p>{parserMessage}</p>}</section>}
    </>}

    {confirmPathway && <div className="modal-backdrop"><div role="dialog" aria-modal="true" aria-label={`${pathwayDetails[confirmPathway].label}服药确认`} className="modal">
      <h2>不可逆服药确认</h2>
      <p>你已知晓能力方向、身心改变，以及失控或永久死亡风险。</p>
      <div className="button-row"><button type="button" onClick={() => setConfirmPathway(null)}>返回准备</button><button type="button" className="danger" onClick={() => confirmAscension(confirmPathway)}>确认服药并承担风险</button></div>
    </div></div>}
  </main>;
}

export default App;
