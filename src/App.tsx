import { useEffect, useState } from 'react';
import type { AbilityCharge } from './core/abilities';
import { acquireMaterial, advanceTrack, attemptAscension, prepareRitual, recoverPathway } from './core/ascension';
import {
  actionIds,
  addCharacter,
  activeCharacter,
  createGame,
  startCase,
  submitInvestigation,
  submitInvestigationWithAbility,
  type ActionId,
  type Game,
  type PathwayId,
} from './core/game';
import { parseLocalAction } from './core/parser';
import type { Occupation } from './core/profile';
import { loadGame, saveGame } from './storage/save';
import { recoverResource, switchCharacter } from './core/recovery';
import { projectScene } from './core/view-model';
import { occupationLens, pathwayLens } from './content/lenses';
import V04App from './V04App';

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
  const [productMode, setProductMode] = useState<'legacy' | 'v04'>('legacy');
  const [game, setGame] = useState<Game>(() => createGame());
  const [started, setStarted] = useState(false);
  const [occupation, setOccupation] = useState<Occupation>('apothecary');
  const [intent, setIntent] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'nonbinary' | ''>('');
  const [showCreationForm, setShowCreationForm] = useState(false);
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
  const resolve = (action: ActionId, approach: 'safe' | 'risky') => update(submitInvestigation(game, action, approach, `case:${game.state.worldSeed}:${action}:${game.state.eventCursor}`).game);
  const resolveWithAbility = (action: ActionId, approach: 'safe' | 'risky', pathway: PathwayId) => update(submitInvestigationWithAbility(game, action, approach, pathway, abilityCharge, `case:${game.state.worldSeed}:${action}:${approach}:${pathway}:${abilityCharge}:${game.state.eventCursor}`).game);
  const activeCase = actionIds.find((id) => game.caseStates[id].stage === 'approach');
  const submitFreeAction = () => {
    const parsed = parseLocalAction(freeText, game);
    setParserMessage(parsed.message);
    if (parsed.action && activeCase === parsed.action) resolve(parsed.action, 'safe');
    else if (parsed.action && !activeCase) begin(parsed.action);
    else if (parsed.action) setParserMessage('当前任务已进入调查阶段；请使用当前任务的谨慎、冒险或能力选项。');
    setFreeText('');
  };
  const createNewCharacter = () => {
    if (!intent.trim() || !characterName.trim() || !gender) return;
    update(addCharacter(game, occupation, intent.trim(), { name: characterName.trim(), gender }));
    setIntent('');
    setCharacterName('');
    setGender('');
    setShowCreationForm(false);
  };
  const trustPathway = (pathway: PathwayId) => update(advanceTrack(game, pathway));
  const preparePathway = (pathway: PathwayId, approach: 'safe' | 'risky') => update(prepareRitual(game, pathway, approach));
  const acquirePathwayMaterial = (pathway: PathwayId, approach: 'safe' | 'risky') => update(acquireMaterial(game, pathway, approach));
  const confirmAscension = (pathway: PathwayId) => {
    update(attemptAscension(game, pathway, `ascension:${game.state.worldSeed}:${pathway}:${game.state.eventCursor}`));
    setConfirmPathway(null);
  };

  const latest = game.log.at(-1);
  const resolved = actionIds.find((id) => game.state.clues[clueIds[id]] !== undefined);
  const canCreate = game.profile.characters.length < game.profile.slotLimit;
  const canProgressPathways = character !== undefined && character.pathwayState === null && game.recoveryState === 'normal';
  const scene = projectScene(game);

  if (productMode === 'v04') return <V04App onBack={() => setProductMode('legacy')} />;

  return <main className="shell">
    <header className="masthead">
      <p className="eyebrow">瓦伦港调查局 · 私人档案</p>
      <h1>Mistweave of Fates</h1>
      <p className="location">灰雾织命 · <span>瓦伦港，灰炉药房</span> · 第 {game.state.worldTime.worldDay} 日</p>
    </header>

    {!started && <div className="start-menu"><button type="button" className="start" onClick={() => setStarted(true)}>开始调查</button><button type="button" onClick={() => setProductMode('v04')}>进入 V0.4 平行廷根封闭切片</button></div>}

    {started && <>
      <section className="panel profile-panel" aria-labelledby="profile-title">
        <div className="panel-heading"><h2 id="profile-title">角色档案</h2><span>槽位 {game.profile.characters.length}/{game.profile.slotLimit}</span></div>
        <div className="card-grid">
          {game.profile.characters.map((entry) => <article className={`character-card ${entry.status}`} key={entry.characterId}>
            <h3>{entry.name} · {occupationLabels[entry.occupationId as Occupation]} · {entry.status === 'deceased' ? '已永久失效' : entry.characterId === game.profile.activeCharacterId ? '活动' : '可切换'}</h3>
            <p>性别：{entry.gender === 'unspecified' ? '未指定' : entry.gender}</p>
            <p>{entry.initialIntent}</p>
            <p>生命 {entry.derived.hp.current}/{entry.derived.hp.max} · 理智 {entry.derived.sanity.current}/{entry.derived.sanity.max}</p>
            <p>灵性 {entry.derived.spirituality.current}/{entry.derived.spirituality.max} · 污染 {entry.derived.pollution}</p>
            {entry.status === 'deceased' && <button type="button" disabled>角色卡已永久失效</button>}
            {entry.status === 'retired' && <button type="button" onClick={() => update(switchCharacter(game, entry.characterId))}>切换为活动角色</button>}
          </article>)}
        </div>
        {canCreate && character && !showCreationForm && <button type="button" onClick={() => setShowCreationForm(true)}>创建新角色卡</button>}
        {canCreate && (!character || showCreationForm) && <div className="creation-form">
          <h2>创建角色卡</h2>
          <label htmlFor="character-name">姓名</label>
          <input id="character-name" value={characterName} onChange={(event) => setCharacterName(event.target.value)} placeholder="角色姓名" />
          <label htmlFor="gender">性别</label>
          <select id="gender" value={gender} onChange={(event) => setGender(event.target.value as typeof gender)}><option value="" disabled>请选择性别</option><option value="female">女性</option><option value="male">男性</option><option value="nonbinary">非二元</option></select>
          <label htmlFor="occupation">初始职业</label>
          <select id="occupation" value={occupation} onChange={(event) => setOccupation(event.target.value as Occupation)}>
            {(Object.entries(occupationLabels) as [Occupation, string][]).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <label htmlFor="intent">初始意愿</label>
          <input id="intent" value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="你为何踏入灰雾？" />
          <button type="button" onClick={createNewCharacter} disabled={!intent.trim() || !characterName.trim() || !gender}>创建角色</button>
        </div>}
      </section>

      {character && <section className="panel" aria-labelledby="cases-title">
        <div className="panel-heading"><h2 id="cases-title">可调查事件</h2><span>警方关注 {game.legalAttention}</span></div>
        <p className="lens-summary">职业透镜：{occupationLabels[character.occupationId as Occupation]} · 可用来源 {occupationLens(character.occupationId as Occupation).allowedSourceIds.length} 个 · 优先方法 {occupationLens(character.occupationId as Occupation).preferredMethodIds.join('、')}</p>
        <p className="lens-summary">透镜参考：观察者（{Object.entries(pathwayLens('observer').methodModifiers).map(([method, modifier]) => `${method} ${modifier > 0 ? '+' : ''}${modifier}`).join('，')}） · 猎犬（{Object.entries(pathwayLens('hound').methodModifiers).map(([method, modifier]) => `${method} ${modifier > 0 ? '+' : ''}${modifier}`).join('，')}）</p>
        <div className="action-grid">
          {actionIds.map((id) => game.caseStates[id].stage === 'available'
            ? <button key={id} type="button" className="case" onClick={() => begin(id)}>接触：{actionLabels[id]}</button>
            : game.caseStates[id].stage === 'approach'
              ? <article className="case-choice" key={id}><h3>{actionLabels[id]}</h3><button type="button" className="case" onClick={() => resolve(id, 'safe')}>谨慎调查（15 分钟）</button><button type="button" className="case danger" onClick={() => resolve(id, 'risky')}>冒险调查（30 分钟，可能违法）</button>{(['observer', 'hound'] as const).map((pathway) => game.pathwayTracks[pathway].state === 'ascended' && character?.pathwayState === pathway && character.derived.spirituality.current >= abilityCharge ? <div className="ability-choice" key={pathway}><label htmlFor={`ability-charge-${id}-${pathway}`}>{pathwayDetails[pathway].ability}加注</label><select id={`ability-charge-${id}-${pathway}`} value={abilityCharge} onChange={(event) => setAbilityCharge(Number(event.target.value) as AbilityCharge)}><option value={1}>1 点</option><option value={2}>2 点</option><option value={3}>3 点</option></select><button type="button" className="case" onClick={() => resolveWithAbility(id, 'safe', pathway)}>使用{pathwayDetails[pathway].ability}并调查</button></div> : null)}<label htmlFor={`free-action-${id}`}>当前任务自由行动</label><div className="button-row"><input id={`free-action-${id}`} value={activeCase === id ? freeText : ''} onChange={(event) => setFreeText(event.target.value)} /><button type="button" onClick={submitFreeAction}>提交任务行动</button></div>{parserMessage && <p>{parserMessage}</p>}</article>
              : null)}
        </div>
        {latest && latest.eventType !== 'character_created' && <div className="inline-feedback" aria-live="polite"><strong>即时行动反馈</strong><p>{scene.feedback.message}</p>{latest.randomEvidence.length > 0 && <p>判定证据：{latest.randomEvidence.join(' · ')}</p>}</div>}
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
              <p className="lens-summary">路径透镜：{Object.entries(pathwayLens(pathway).methodModifiers).map(([method, modifier]) => `${method} ${modifier > 0 ? '+' : ''}${modifier}`).join('，')}</p>
              {track.state === 'hinted' && canProgressPathways && <button type="button" onClick={() => trustPathway(pathway)}>调查{details.label}线索</button>}
              {(track.state === 'trusted' || track.state === 'prepared' || track.state === 'restricted') && <div className="risk-preview">
                <p>能力方向：{details.ability}</p>
                <p>不可逆改变：角色将锁定所选路径，并承受身体与灵魂改变。</p>
                <p>风险：仪式与服药存在失控或死亡风险。</p>
              </div>}
              {track.state === 'trusted' && canProgressPathways && <>
                {!game.materials.some((material) => material.pathway === pathway && !material.consumed) && <div className="button-row">
                  <button type="button" onClick={() => acquirePathwayMaterial(pathway, 'safe')}>获取安全材料（2 银币）</button>
                  <button type="button" className="danger" onClick={() => acquirePathwayMaterial(pathway, 'risky')}>冒险获取材料</button>
                </div>}
                {game.materials.some((material) => material.pathway === pathway && !material.consumed && material.risk === 'low') && <button type="button" onClick={() => preparePathway(pathway, 'safe')}>安全准备{details.label}仪式</button>}
                {game.materials.some((material) => material.pathway === pathway && !material.consumed && material.risk === 'high') && <button type="button" className="danger" onClick={() => preparePathway(pathway, 'risky')}>冒险准备{details.label}仪式</button>}
              </>}
              {track.preparation && <p>{track.preparation.materialId === 'stabilized_aether_salts' ? '稳定以太盐' : '未许可雾质馏出物'} · 准备质量 {track.preparation.quality}</p>}
              {track.state === 'prepared' && canProgressPathways && <button type="button" className="danger" onClick={() => setConfirmPathway(pathway)}>准备服药：{details.label}</button>}
              {track.state === 'restricted' && track.ascension?.outcome === 'failure' && <button type="button" onClick={() => update(recoverPathway(game, pathway))}>休整并恢复该路径</button>}
              {track.ascension && <p className="result">晋升结果：{outcomeLabels[track.ascension.outcome]}（D100 {track.ascension.roll}）</p>}
              {track.state === 'ascended' && character?.pathwayState === pathway && <p>能力将在具体任务调查选项中出现。</p>}
            </article>;
          })}
        </div>
      </section>}

      {latest && <section className="panel log"><h2>行动反馈</h2><p>{scene.feedback.message}</p><p>判定：已提交事件 #{latest.eventCursor}</p>{latest.randomEvidence.length > 0 && <p>证据：{latest.randomEvidence.join(' · ')}</p>}{resolved && <p>线索：{actionLabels[resolved]}</p>}{character && (character.derived.hp.current === 0 || character.derived.sanity.current === 0) && <button type="button" onClick={() => update(recoverResource(game, 'rest'))}>休整并恢复资源</button>}</section>}

      {character && !activeCase && <section className="panel free-action"><label htmlFor="free-action">自由行动</label><div className="button-row"><input id="free-action" value={freeText} onChange={(event) => setFreeText(event.target.value)} /><button type="button" onClick={submitFreeAction}>尝试行动</button></div>{parserMessage && <p>{parserMessage}</p>}</section>}
      <section className="panel navigation"><button type="button" onClick={() => setStarted(false)}>返回主菜单</button><button type="button" onClick={() => setProductMode('v04')}>进入 V0.4 平行廷根封闭切片</button>{character && activeCase && <button type="button" onClick={() => update(recoverResource(game, 'leave_case'))}>退出当前流程</button>}</section>
    </>}

    {confirmPathway && <div className="modal-backdrop"><div role="dialog" aria-modal="true" aria-label={`${pathwayDetails[confirmPathway].label}服药确认`} className="modal">
      <h2>不可逆服药确认</h2>
      <p>你已知晓能力方向、身心改变，以及失控或永久死亡风险。</p>
      <div className="button-row"><button type="button" onClick={() => setConfirmPathway(null)}>返回准备</button><button type="button" className="danger" onClick={() => confirmAscension(confirmPathway)}>确认服药并承担风险</button></div>
    </div></div>}
  </main>;
}

export default App;
