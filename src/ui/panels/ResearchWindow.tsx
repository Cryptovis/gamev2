import { useState } from 'react';
import { useWorldView } from '../../store/useWorldView';
import { CommandWindow } from './CommandWindow';
import { ReviewDialog } from './ReviewDialog';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { TECHNOLOGY_TREE, technologyById } from '../../data/technologyTree';
import { researchCapacity, researchPreview, researchProjectPreview } from '../../engine/systems/technology';
import type { TechnologyCategory } from '../../domain/game';
import { AssetThumbnail } from '../icons/AssetThumbnail';
import { ResearchIcon, DiplomacyIcon, EconomyIcon, IntelligenceIcon, SocietyIcon } from '../icons/GameIcons';

function ResearchArt({category, technologyId}: {category: TechnologyCategory; technologyId: string}) {
 const assets: Record<string,string> = {'ind-refining':'fuel','ind-metallurgy':'steel','ind-engines':'engines','ind-electronics':'electronics','ind-extraction':'rare_earths','energy-water':'water','energy-nuclear':'uranium','mil-flight-school':'fighters'};
 if (assets[technologyId]) return <AssetThumbnail asset={assets[technologyId]} size={64}/>;
 if (category === 'industry') return <AssetThumbnail asset="factory" size={64}/>;
 if (category === 'military') return <AssetThumbnail asset="tanks" size={64}/>;
 if (category === 'energy') return <AssetThumbnail asset="electricity" size={64}/>;
 const Icon = category === 'diplomacy' ? DiplomacyIcon : category === 'economy' ? EconomyIcon : category === 'intelligence' ? IntelligenceIcon : category === 'society' ? SocietyIcon : ResearchIcon;
 return <Icon size={48}/>;
}

export function ResearchWindow() {
 const s = useWorldView(), c = s.countries[s.playerCountryId];
 const [branch, setBranch] = useState<TechnologyCategory>('industry');
 const [review, setReview] = useState<string | null>(null);
 const [cancel, setCancel] = useState(false);
 const categories: Array<[TechnologyCategory, string]> = [['industry','Industry'],['military','Military'],['energy','Energy'],['economy','Economy'],['education','Education'],['diplomacy','Diplomacy'],['intelligence','Intelligence'],['society','Society']];
 const nodes = TECHNOLOGY_TREE.filter(n => n.category === branch).sort((a,b) => a.tier - b.tier);
 const selected = review ? technologyById[review] : null;
 const preview = selected ? researchPreview(s,c.id,selected.id) : null;
 const project = c.technology.project, projectView = researchProjectPreview(s,c.id);
 return <CommandWindow wide kicker="NATIONAL RESEARCH" title="Research & Technology Tree" onClose={s.closeWorkspace}>
  <div className="research-dashboard">
   <section className="research-overview">
    <div className="research-overview-art" aria-hidden="true"><ResearchIcon size={56}/></div>
    <div><small><LocaleText value="Research points saved"/></small><strong data-testid="research-points">{c.technology.researchPoints.toFixed(2)} <abbr title={translateLive('Research points')}>RP</abbr></strong><p><LocaleText value="Spend points to start a project. The discovery unlocks when the work is done."/></p></div>
    <div className="research-throughput"><small><LocaleText value="Research capacity / day"/></small><strong>{researchCapacity(s,c.id).toFixed(2)}</strong><p><LocaleText value="Work per day, not points earned. Universities and institutes speed up projects."/></p></div>
   </section>
   {project && projectView ? <section className="research-active">
    <div><small><LocaleText value="RESEARCH IN PROGRESS"/></small><h3><LocaleText value={technologyById[project.technologyId].name}/></h3></div>
    <div><progress aria-label={translateLive('Research progress')} max={100} value={projectView.progress}/><p>{projectView.progress.toFixed(0)}% · {projectView.remainingDays} <LocaleText value="days remaining"/></p></div>
    <button onClick={() => setCancel(true)}><LocaleText value="Cancel research / refund"/></button>
   </section> : <p className="research-idle"><LocaleText value="No active project. Choose a discovery below. One project can run at a time."/></p>}
   <div className="tree-branches" role="group" aria-label={translateLive('Research branches')}>{categories.map(([id,label]) => <button key={id} aria-pressed={branch===id} className={branch===id?'active':''} onClick={() => setBranch(id)}><LocaleText value={label}/></button>)}</div>
   <div className="research-card-grid">{nodes.map(n => {
    const view = researchPreview(s,c.id,n.id)!;
    const active = project?.technologyId === n.id;
    const status = view.complete ? 'COMPLETE' : active ? 'RESEARCH IN PROGRESS' : view.allowed ? 'AVAILABLE' : 'LOCKED';
    return <article key={n.id} data-technology={n.id} className={'research-card '+(view.complete?'complete':view.allowed?'available':'locked')}>
     <header><div className="research-card-art" aria-hidden="true"><ResearchArt category={n.category} technologyId={n.id}/></div><div><small><LocaleText value={status}/></small><h3><LocaleText value={n.name}/></h3></div></header>
     <p className="research-description"><LocaleText value={n.description}/></p>
     <dl><div><dt><LocaleText value="Research cost"/></dt><dd>{view.cost} RP</dd></div><div><dt><LocaleText value="Estimated duration"/></dt><dd>{view.duration} <LocaleText value="days"/></dd></div></dl>
     {!view.complete && !active && <div className="research-requirements"><p><LocaleText value={view.reason ?? 'Ready to research.'}/></p>{view.missingPoints>0&&<strong><LocaleText value="Points still needed"/>: {view.missingPoints.toFixed(2)} RP</strong>}</div>}
     {n.prerequisites.length>0&&<div className="research-prerequisites"><small><LocaleText value="Required discoveries"/></small>{n.prerequisites.map(id => <button key={id} onClick={() => {setBranch(technologyById[id].category);setReview(id);}}><span aria-hidden="true">{c.technology.unlocked.includes(id)?'✓':'↗'}</span> <LocaleText value={technologyById[id].name}/></button>)}</div>}
     <button className="research-review" onClick={() => setReview(n.id)}><LocaleText value="Review research"/></button>
    </article>;
   })}</div>
  </div>
  {selected&&preview&&<ReviewDialog title={selected.name} summary={selected.description} metrics={[
   ['Research points saved',`${preview.points.toFixed(2)} RP`],['Research cost',`${preview.cost} RP`],['Points still needed',`${preview.missingPoints.toFixed(2)} RP`],['Estimated duration',`${preview.duration} ${translateLive('days')}`],['Research capacity / day',preview.capacity.toFixed(2)],
  ]} warnings={[...(preview.reason?[preview.reason]:[]),...preview.missingPrerequisites.map(id => technologyById[id].name),'Research points are paid upfront. Cancellation refunds 80% of unfinished work; completed research cannot be cancelled.']} allowed={preview.allowed} onCancel={() => setReview(null)} onConfirm={commandId => {s.unlockTechnology(selected.id,commandId);setReview(null);}}/>}
  {cancel&&project&&projectView&&<ReviewDialog title="Cancel research?" summary="Research points are paid upfront. Cancellation refunds 80% of unfinished work; completed research cannot be cancelled." metrics={[["Refund",`${projectView.refund.toFixed(2)} RP`]]} onCancel={() => setCancel(false)} onConfirm={commandId => {s.cancelResearch(commandId);setCancel(false);}}/>}
 </CommandWindow>;
}
