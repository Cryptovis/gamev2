import { useState } from 'react';
import { fuelGuidance } from '../../engine/systems/fuelGuidance';
import { useWorldView } from '../../store/useWorldView';
import { EnergyPanel } from './EnergyPanel';
import { LocaleText } from '../../i18n/localeText';
import { IndustrialPanel } from './IndustrialPanel';
import type { CountryState, EquipmentType } from '../../domain/game';
import { EQUIPMENT_CATALOG, EQUIPMENT_TYPES } from '../../data/equipmentCatalog';
import { militaryFactoryCapacity, strategicReserveScore } from '../../engine/systems/production';
import { ArtilleryIcon, FuelIcon, IndustryIcon, JetIcon, PersonnelIcon, ShipIcon, SteelIcon, TankIcon } from '../icons/GameIcons';
import { SectionMenu } from '../windows/SectionMenu';
import { CommandArt } from '../icons/CommandArt';
import { NuclearIcon } from './NuclearCommandWindow';

function EquipmentGlyph({ type }: { type: EquipmentType }) {
  if (type === 'infantry_equipment') return <PersonnelIcon size={22} />;
  if (type === 'artillery') return <ArtilleryIcon size={22} />;
  if (type === 'armor') return <TankIcon size={22} />;
  if (type === 'fighters') return <JetIcon size={22} />;
  if (type === 'naval') return <ShipIcon size={22} />;
  return <IndustryIcon size={22} />;
}

const fmt = (v: number) =>
  v >= 1_000_000
    ? (v / 1_000_000).toFixed(1) + 'M'
    : v >= 1000
    ? (v / 1000).toFixed(1) + 'K'
    : v >= 100
    ? Math.round(v).toLocaleString()
    : v.toFixed(v < 10 ? 1 : 0);

export function MilitaryHardwareView({ country, onOpenNuclear }: { country: CountryState; onOpenNuclear?: () => void }) {
  const state = useWorldView();
  const production = state.production[country.id];
  const isPlayer = country.id === state.playerCountryId;
  if (!production) return <div className="production-empty"><LocaleText value={"Production intelligence unavailable."} /></div>;

  const capacity = militaryFactoryCapacity(country, production);
  const assigned = EQUIPMENT_TYPES.reduce((sum, t) => sum + production.lines[t].factories, 0);
  const reserveScore = strategicReserveScore(state, country.id);
  const bottleneck = production.bottleneck === 'none' ? 'CLEAR' : production.bottleneck.toUpperCase();
  const fuel = isPlayer ? fuelGuidance(state) : null;
  const nucProg = state.world.nuclear?.programs[country.id];

  return (
    <div className="military-hardware-view">
      {fuel && (fuel.low || fuel.declining || fuel.oilDeclining) && (
        <aside className="production-fuel-guidance">
          <strong><LocaleText value={fuel.low ? 'Refined fuel reserves low' : fuel.declining ? 'Refined fuel consumption exceeds production' : 'Crude oil consumption exceeds production'} /></strong>
          <button onClick={() => state.routeWorkspace({ kind: 'fuel-help', targetCountryId: state.playerCountryId })}><LocaleText value="How to get Fuel?" /></button>
        </aside>
      )}

      <section className="production-hero">
        <div className="production-hero-title">
          <IndustryIcon size={28} />
          <span>
            <small><LocaleText value={"NATIONAL INDUSTRIAL COMMAND"} /></small>
            <strong><LocaleText value={"Production & Equipment"} /></strong>
            <em><LocaleText value={isPlayer ? 'Allocate military industry and reinforce active forces.' : 'Observed production estimate based on known industrial capacity.'} /></em>
          </span>
        </div>
        <div className="production-kpis">
          <span><small><LocaleText value={"MIL. FACTORIES"} /></small><strong><LocaleText value={assigned} /><LocaleText value={"/"} /><LocaleText value={capacity} /></strong></span>
          <span><small><LocaleText value={"THROUGHPUT"} /></small><strong className={production.throughput < 70 ? 'negative' : 'positive'}><LocaleText value={production.throughput.toFixed(0)} /><LocaleText value={"%"} /></strong></span>
          <span><small><LocaleText value={"RESERVE SCORE"} /></small><strong><LocaleText value={reserveScore.toFixed(0)} /></strong></span>
          <span><small><LocaleText value={"BOTTLENECK"} /></small><strong className={production.bottleneck === 'none' ? 'positive' : 'negative'}><LocaleText value={bottleneck} /></strong></span>
        </div>
        {isPlayer && (
          <label className="military-share-control">
            <span><b><LocaleText value={"Military factory allocation"} /></b><small><LocaleText value={production.militaryFactoryShare} /><LocaleText value={"% of usable factory capacity"} /></small></span>
            <input type="range" min="25" max="80" step="1" value={production.militaryFactoryShare} onChange={e => state.setMilitaryFactoryShare(Number(e.target.value))} />
            <strong><LocaleText value={production.militaryFactoryShare} /><LocaleText value={"%"} /></strong>
          </label>
        )}
      </section>

      {nucProg && (
        <div className="nuclear-production-strip">
          <div className="nuclear-strip-info">
            <NuclearIcon size={22} />
            <div>
              <strong><LocaleText value="Strategic Nuclear Deterrent" /></strong>
              <small><LocaleText value={`Warheads: ${nucProg.warheads ?? 0} · ICBM: ${nucProg.delivery?.icbm ?? 0} · SSBN: ${nucProg.delivery?.ssbn ?? 0}`} /></small>
            </div>
          </div>
          {onOpenNuclear && (
            <button className="nuclear-shortcut-button" onClick={onOpenNuclear}>
              <LocaleText value="Open Nuclear Command" />
            </button>
          )}
        </div>
      )}

      <div className="production-input-strip">
        <span><SteelIcon size={16} /><i><small><LocaleText value={"STEEL / DAY"} /></small><strong><LocaleText value={production.lastInputUse.steel.toFixed(2)} /></strong></i></span>
        <span><FuelIcon size={16} /><i><small><LocaleText value={"FUEL / DAY"} /></small><strong><LocaleText value={production.lastInputUse.fuel.toFixed(2)} /></strong></i></span>
        <span><IndustryIcon size={16} /><i><small><LocaleText value={"POWER / DAY"} /></small><strong><LocaleText value={production.lastInputUse.electricity.toFixed(2)} /></strong></i></span>
        <span><i><small><LocaleText value={"TREASURY / DAY"} /></small><strong><LocaleText value={'$' + production.lastInputUse.treasury.toFixed(3) + 'B'} /></strong></i></span>
      </div>

      <div className="subhead"><LocaleText value={"Strategic equipment stockpiles"} /></div>
      <div className="equipment-stock-grid">
        {EQUIPMENT_TYPES.map(type => {
          const def = EQUIPMENT_CATALOG[type];
          const line = production.lines[type];
          const canDeploy = isPlayer && production.stockpile[type] >= def.deployPack;
          return (
            <article key={type} className="equipment-stock-card">
              <header>
                <span><EquipmentGlyph type={type} /></span>
                <div><small><LocaleText value={def.shortLabel} /></small><strong><LocaleText value={def.label} /></strong></div>
              </header>
              <div className="equipment-stock-number"><LocaleText value={fmt(production.stockpile[type])} /></div>
              <div className="equipment-stock-flow">
                <span><LocaleText value={"+"} /><LocaleText value={fmt(production.lastDailyOutput[type])} /><LocaleText value={"/day"} /></span>
                <span><LocaleText value={line.factories} /><LocaleText value={" factories"} /></span>
              </div>
              {isPlayer && (
                <button disabled={!canDeploy} onClick={() => state.deployEquipment(type)}>
                  <LocaleText value={"DEPLOY "} /><small><LocaleText value={def.deployPack.toLocaleString()} /><LocaleText value={" units"} /></small>
                </button>
              )}
            </article>
          );
        })}
      </div>

      <div className="subhead"><LocaleText value={"Production lines"} /></div>
      <div className="production-lines">
        {EQUIPMENT_TYPES.map(type => {
          const def = EQUIPMENT_CATALOG[type];
          const line = production.lines[type];
          return (
            <article key={type} className="production-line-card">
              <div className="production-line-identity">
                <span><EquipmentGlyph type={type} /></span>
                <div><strong><LocaleText value={def.label} /></strong><small><LocaleText value={def.description} /></small></div>
              </div>
              <div className="production-line-eff">
                <span><small><LocaleText value={"EFFICIENCY"} /></small><strong><LocaleText value={line.efficiency.toFixed(0)} /><LocaleText value={"%"} /></strong></span>
                <i><b style={{ width: line.efficiency + '%' }} /></i>
              </div>
              <div className="production-line-output">
                <small><LocaleText value={"OUTPUT"} /></small><strong><LocaleText value={fmt(line.lastOutput)} /><LocaleText value={"/d"} /></strong>
              </div>
              <div className="production-line-factories">
                {isPlayer && <button disabled={line.factories <= 0} onClick={() => state.setProductionFactories(type, line.factories - 1)}><LocaleText value={"−"} /></button>}
                <span><small><LocaleText value={"FACTORIES"} /></small><strong><LocaleText value={line.factories} /></strong></span>
                {isPlayer && <button disabled={assigned >= capacity} onClick={() => state.setProductionFactories(type, line.factories + 1)}><LocaleText value={"+"} /></button>}
              </div>
              <div className="production-line-inputs">
                <span><LocaleText value={"STEEL "} /><LocaleText value={(def.inputs.steel * line.factories).toFixed(2)} /></span>
                {def.inputs.fuel > 0 && <span><LocaleText value={"FUEL "} /><LocaleText value={(def.inputs.fuel * line.factories).toFixed(2)} /></span>}
                <span><LocaleText value={"POWER "} /><LocaleText value={(def.inputs.electricity * line.factories).toFixed(2)} /></span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function ProductionPanel({ country }: { country: CountryState }) {
  const [section, setSection] = useState<'military' | 'industry' | 'energy'>('military');

  return (
    <div className="production-panel">
      <SectionMenu
        items={[
          { id: 'military', label: 'Military Hardware', icon: <CommandArt kind="military" /> },
          { id: 'industry', label: 'Industry & Civilian', icon: <CommandArt kind="production" /> },
          { id: 'energy', label: 'Energy & Power', icon: <CommandArt kind="economy" /> },
        ]}
        selected={section}
        onSelect={id => setSection(id as 'military' | 'industry' | 'energy')}
        contentId="production-section-content"
        label="Production sections"
      />
      <div id="production-section-content">
        {section === 'military' && <MilitaryHardwareView country={country} />}
        {section === 'industry' && <IndustrialPanel country={country} />}
        {section === 'energy' && <EnergyPanel country={country} />}
      </div>
    </div>
  );
}
