import {expect,type Page} from '@playwright/test';
import type {GameState} from '../../src/domain/game';

type Language=GameState['playerProfile']['language'];

/** The landing screen once boot has finished (session and save lookup done). */
export async function landingReady(page:Page){
  await expect(page.getByTestId('landing-root')).toHaveAttribute('data-screen','landing');
}

/**
 * Starts a new campaign as a guest, with no credentials and no maths question, and waits for the setup wizard.
 * With no save the hero button is "Play now" (or "New campaign" for a signed-in profile) and starts the wizard itself;
 * with a save it is "Continue", so the separate "New campaign" link is used instead.
 */
export async function enterAsGuest(page:Page){
  await landingReady(page);
  const hero=page.getByTestId('landing-hero');
  if((await hero.getAttribute('data-action'))!=='continue')await hero.click();
  else await page.getByTestId('landing-new-campaign').click();
  await expect(page.locator('.campaign-wizard')).toBeVisible();
}

/** Continues the newest save: waits for the Continue hero, clicks it and waits for the loading screen to hand over to the game. */
export async function continueCampaign(page:Page){
  await landingReady(page);
  const hero=page.getByTestId('landing-hero');
  await expect(hero).toHaveAttribute('data-action','continue');
  await hero.click();
  await expect(page.getByTestId('landing-root')).toHaveCount(0,{timeout:15_000});
}

/** Picks a language in the landing dock. */
export async function chooseLanguage(page:Page,language:Language){
  await page.getByTestId(`dock-language-${language}`).click();
  await expect(page.getByTestId('landing-root')).toHaveAttribute('lang',language);
}
