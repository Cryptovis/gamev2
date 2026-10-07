import type { CountryState } from '../../domain/game';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const hasTech=(country:CountryState,id:string)=>country.technology.unlocked.includes(id);

export function processIndustry(country: CountryState,boost=1): CountryState {
  const util = country.industry.utilization/100;
  const refiningBonus = hasTech(country,'ind-refining') ? 1.25 : 1;
  const metallurgyBonus = hasTech(country,'ind-metallurgy') ? 1.2 : 1;
  const automationBonus = hasTech(country,'ind-automation') ? 1.18 : 1;
  const gridBonus = hasTech(country,'energy-grid') ? 1.22 : 1;
  const nuclearBonus = hasTech(country,'energy-nuclear') ? 1.18 : 1;

  const oilUse = Math.min(country.resources.oil, country.industry.refineries * 0.055 * util);
  const ironUse = Math.min(country.resources.iron, country.industry.factories * 0.022 * util * automationBonus);
  const uraniumUse = hasTech(country,'energy-nuclear') ? Math.min(country.resources.uranium, 0.003 * Math.max(1,country.industry.powerCapacity/40)) : 0;

  const fuelGain = oilUse * 0.9 * refiningBonus*boost;
  const steelGain = ironUse * 0.86 * metallurgyBonus*boost;
  const electricityGain = (country.industry.powerCapacity * 0.018 * util * gridBonus) + uraniumUse * 24 * nuclearBonus;
  const electricityUse = country.industry.factories * 0.012 * util + (country.demographics.population/1_000_000) * 0.004;

  return {
    ...country,
    resources: {
      ...country.resources,
      oil: Math.max(0,country.resources.oil-oilUse),
      iron: Math.max(0,country.resources.iron-ironUse),
      uranium: Math.max(0,country.resources.uranium-uraniumUse),
    },
    processedResources: {
      fuel: clamp(country.processedResources.fuel + fuelGain,0,1500),
      steel: clamp(country.processedResources.steel + steelGain,0,1500),
      electricity: clamp(country.processedResources.electricity + electricityGain - electricityUse,0,1500),
    },
  };
}
