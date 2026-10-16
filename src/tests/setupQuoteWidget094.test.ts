import {describe,expect,it} from 'vitest';

const sources=import.meta.glob<string>(['../ui/panels/CampaignSetup.tsx'],{query:'?raw',import:'default',eager:true});
const setup=Object.values(sources)[0];

describe('CampaignSetup leadership quote',()=>{
  it('shows the compact wisdom widget for the setup screen with the chosen country ideology',()=>{
    expect(setup).toContain('<LeadershipWisdomWidget variant="compact"');
    expect(setup).toMatch(/screen:'setup'/);
    expect(setup).toMatch(/ideology:selected\.society\.ideology/);
  });
  it('no longer keeps its own quote state or storage',()=>{
    expect(setup).not.toContain('trp-last-leadership-quote');
    expect(setup).not.toContain('nextLeadershipQuote');
    expect(setup).not.toContain('wizard-leadership-quote');
  });
});
