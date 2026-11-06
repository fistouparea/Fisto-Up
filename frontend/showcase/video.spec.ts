import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cropLabels } from '../src/strings/hi';
import { hiAdmin } from '../src/strings/hiAdmin';
import { hiF } from '../src/strings/hiFeatures';
import { closeOrderAlerts, hi, loggedIn, orderIdFrom, PHONES } from '../e2e/fixtures';

/**
 * Records the backup demo video clips against the offline demo (recorded real AI answers, demo data).
 * Each clip is one phone; its Hindi captions (with times) go next to it as JSON for make_video.py.
 * Logins happen off camera. Speech input cannot be recorded in a headless browser: the voice clip uses a
 * stand-in for the browser's speech recognition that "hears" a fixed sentence (said in the caption file).
 */
const OUT = fileURLToPath(new URL('../../showcase/3-video/clips/', import.meta.url));
const PHOTOS = fileURLToPath(new URL('../../backend/demo/photos/', import.meta.url));
const SEED = fileURLToPath(new URL('../../backend/seed-assets/', import.meta.url));
const SIZE = { width: 360, height: 780 };
const SELL_TEXT = 'दस क्विंटल बाजरा, पच्चीस सौ रुपये क्विंटल';

interface Clip {
  context: BrowserContext;
  page: Page;
  caption: (text: string) => void;
  pause: (ms: number) => Promise<void>;
  save: () => Promise<void>;
}

/** A recorded phone, already logged in (when `phone` is given) off camera. */
async function clip(browser: Browser, name: string, phone?: string, init?: () => void): Promise<Clip> {
  let storageState: Awaited<ReturnType<BrowserContext['storageState']>> | undefined;
  if (phone) {
    const offCamera = await loggedIn(browser, phone);
    storageState = await offCamera.context.storageState();
    await offCamera.context.close();
  }
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'hi-IN',
    timezoneId: 'Asia/Kolkata',
    serviceWorkers: 'block',
    reducedMotion: 'no-preference',
    recordVideo: { dir: `${OUT}raw-${name}`, size: SIZE },
    ...(storageState && { storageState }),
  });
  if (init) await context.addInitScript(init);
  await context.addInitScript(() => localStorage.setItem('agriai.consent.accepted', localStorage.getItem('agriai.consent.accepted') ?? '1'));
  const started = Date.now();
  const page = await context.newPage();
  await closeOrderAlerts(page);
  const captions: { t: number; text: string }[] = [];
  return {
    context,
    page,
    caption: (text) => captions.push({ t: (Date.now() - started) / 1000, text }),
    pause: (ms) => page.waitForTimeout(ms),
    save: async () => {
      const video = page.video();
      captions.push({ t: (Date.now() - started) / 1000, text: '' });
      await context.close();
      if (video) {
        await video.saveAs(`${OUT}${name}.webm`);
        await video.delete();
      }
      writeFileSync(`${OUT}${name}.json`, `${JSON.stringify(captions, null, 2)}\n`);
    },
  };
}

/** Scrolls smoothly, like a finger, so viewers can read. */
async function glide(page: Page, distance: number, steps = 12): Promise<void> {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(90);
  }
}

const main = (page: Page, name: string) => page.getByRole('main').getByRole('button', { name, exact: true });

test('backup demo video clips', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });

  // 1. Photo check with a real recorded AI answer, a follow-up question, and the "not clear" refusal.
  const farmer = await clip(browser, '1-diagnosis', PHONES.household);
  const f = farmer.page;
  await f.goto('/#/check');
  farmer.caption('किसान फसल चुनता है – सरसों');
  await farmer.pause(1500);
  await f.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.sarson.hindi}`) }).click();
  await farmer.pause(1200);
  farmer.caption('बीमार पत्ते की फोटो लेता है');
  await f.locator('input[type=file]').first().setInputFiles(`${PHOTOS}sarson-white-rust.jpg`);
  await farmer.pause(2000);
  await f.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  farmer.caption('AI जाँच करता है (असली AI का पहले रिकॉर्ड किया जवाब)');
  await expect(f.getByText(hi.sections.problem).first()).toBeVisible();
  await f.waitForFunction(() => document.querySelectorAll('[data-rht-toaster] [role="status"]').length === 0, undefined, { timeout: 10_000 });
  farmer.caption('आसान हिंदी में: समस्या, कारण, देसी उपाय');
  await farmer.pause(2500);
  await glide(f, 700);
  await farmer.pause(2500);
  farmer.caption('दवाई सिर्फ़ generic नाम से, सावधानी के साथ। प्रतिबंधित दवाई कभी नहीं।');
  await glide(f, 700);
  await farmer.pause(2500);
  farmer.caption('हर जवाब: पक्का करने के लिए नज़दीकी कृषि विज्ञान केंद्र (KVK) से सलाह लें');
  await f.getByText(hi.kvkAdvice).first().scrollIntoViewIfNeeded();
  await farmer.pause(3000);
  farmer.caption('आगे सवाल पूछ सकते हैं – जैसे “ये दवाई कब डालूँ?”');
  await f.getByRole('button', { name: hi.chat.suggestions[0] }).scrollIntoViewIfNeeded();
  await farmer.pause(1200);
  await f.getByRole('button', { name: hi.chat.suggestions[0] }).click();
  await expect(f.getByText(/सुबह|शाम/).first()).toBeVisible();
  await glide(f, 300, 6);
  await farmer.pause(3500);
  farmer.caption('फोटो में पौधा न हो या साफ़ न हो – ऐप अंदाज़ा नहीं लगाता');
  // The result screen's own "नई जाँच करें" button starts a fresh check.
  await f.getByRole('button', { name: hi.newCheck, exact: true }).click();
  await f.getByRole('group', { name: hi.steps.crop }).getByRole('button', { name: new RegExp(`^${cropLabels.bajra.hindi}`) }).click();
  await f.locator('input[type=file]').first().setInputFiles(`${SEED}handicraft.jpg`);
  await farmer.pause(1000);
  await f.getByRole('button', { name: hi.checkPhoto, exact: true }).click();
  await expect(f.getByText(hi.unclearPhoto).first()).toBeVisible();
  await farmer.pause(3500);
  await farmer.save();

  // 2. Voice → weather → water advice (recorded real forecast).
  const voice = await clip(browser, '2-weather-water', PHONES.household, () => {
    // Stand-in for the browser's speech recognition (a headless browser has no microphone): "hears" one sentence.
    class DemoRecognition {
      lang = 'hi-IN';
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: 'मौसम बताओ' }]] });
          this.onend?.();
        }, 1800);
      }
      abort() {
        this.onend?.();
      }
      stop() {
        this.onend?.();
      }
    }
    Object.assign(window, { SpeechRecognition: DemoRecognition, webkitSpeechRecognition: DemoRecognition });
  });
  const v = voice.page;
  await v.goto('/#/');
  voice.caption('होम: नाम, आज का मौसम और खेत की चेतावनी');
  await voice.pause(3500);
  voice.caption('पढ़ना ज़रूरी नहीं – पीला माइक दबाकर बोलें: “मौसम बताओ”');
  await voice.pause(1500);
  await v.getByRole('button', { name: hi.voiceMode.button }).click();
  await expect(v).toHaveURL(/#\/weather/);
  voice.caption('मौसम: 7 दिन का पूर्वानुमान और चेतावनी (गर्मी, पाला, बारिश, सूखा)');
  await voice.pause(3000);
  await glide(v, 600);
  await voice.pause(2500);
  voice.caption('पानी की सलाह: फसल की अवस्था और मौसम के हिसाब से – पहले मिट्टी देखें');
  await v.goto('/#/water');
  await voice.pause(3500);
  await glide(v, 500);
  await voice.pause(3000);
  await voice.save();

  // 3. Selling: photo + spoken words → AI fills the form → buyer orders → delivery tracking.
  const seller = await clip(browser, '3a-sell', PHONES.ramesh);
  const s = seller.page;
  await s.goto('/#/sell/new');
  seller.caption('विक्रेता: बेचने वाले माल की फोटो');
  await seller.pause(1500);
  await s.locator('input[type=file]').first().setInputFiles(`${SEED}bajra.jpg`);
  await seller.pause(1500);
  seller.caption('बोलकर बताएँ: क्या, कितना, किस भाव में');
  await s.locator('#sell-text').pressSequentially(SELL_TEXT, { delay: 45 });
  await seller.pause(800);
  await main(s, hi.sell.next).click();
  await expect(main(s, hi.sell.confirm)).toBeVisible();
  seller.caption('AI फ़ॉर्म भर देता है – विक्रेता जाँचकर पक्का करता है');
  await seller.pause(2500);
  await glide(s, 600);
  await seller.pause(2000);
  await main(s, hi.sell.confirm).click();
  await expect(s.getByText(hi.sell.doneTitle).first()).toBeVisible();
  seller.caption('माल बाज़ार में दिखने लगा');
  await seller.pause(2500);
  await seller.save();

  const buyer = await clip(browser, '3b-order', PHONES.hotel);
  const b = buyer.page;
  await b.goto('/#/market');
  buyer.caption('खरीदार (होटल) बाज़ार में बाजरा खोजता है');
  await b.getByPlaceholder(hi.market.searchPlaceholder).pressSequentially('बाजरा', { delay: 80 });
  await b.getByPlaceholder(hi.market.searchPlaceholder).press('Enter');
  await buyer.pause(2000);
  await b.getByRole('link', { name: /बाजरा – 10 क्विंटल/ }).first().click();
  await buyer.pause(2500);
  buyer.caption('घर पर डिलीवरी का ऑर्डर – पैसे सीधे किसान को (UPI या नकद)');
  await main(b, hi.orders.placeTitle).click();
  await b.getByRole('button', { name: hi.orders.delivery }).click();
  await b.getByLabel(hi.orders.address).fill('स्टेशन रोड, चूरू');
  await buyer.pause(1500);
  await main(b, hi.orders.send).click();
  await expect(b).toHaveURL(/#\/orders\//);
  const orderId = orderIdFrom(b);
  const ref = (await b.locator('strong.tracking-wider').first().textContent())?.trim() ?? '';
  await buyer.pause(2500);
  await buyer.save();

  // Off camera: the seller accepts and sends it out; the coordinator assigns a delivery person and makes the link.
  const sellerOff = await loggedIn(browser, PHONES.ramesh);
  await sellerOff.page.goto(`/#/orders/${orderId}`);
  await sellerOff.page.reload();
  for (const step of [hi.orders.actions.accepted, hi.orders.actions.ready, hi.orders.actions.out_for_delivery]) await main(sellerOff.page, step).click();
  const coordinatorOff = await loggedIn(browser, PHONES.coordinator);
  await coordinatorOff.page.goto('/#/admin/orders');
  const card = coordinatorOff.page.locator('article', { hasText: ref }).first();
  await card.getByRole('button', { name: hiAdmin.assignDelivery }).click();
  await card.getByLabel(hiAdmin.deliveryName).fill('सुरेश');
  await card.getByLabel(hiAdmin.deliveryPhone).fill('9876500011');
  await card.getByRole('button', { name: hi.save, exact: true }).click();
  const linkCard = coordinatorOff.page.locator('article', { hasText: ref }).first();
  await linkCard.getByRole('button', { name: hiF.delivery.makeLink }).click();
  const link = (await linkCard.locator('p.break-all').textContent())?.trim() ?? '';
  expect(link, `delivery link for ${ref}`).toMatch(/#\/delivery\//);
  await sellerOff.context.close();
  await coordinatorOff.context.close();

  const delivery = await clip(browser, '3c-delivery');
  const d = delivery.page;
  await d.goto(`/${link.slice(link.indexOf('#'))}`);
  delivery.caption('डिलीवरी वाला: बिना लॉगिन, संयोजक का भेजा लिंक, तीन बड़े बटन');
  await delivery.pause(3000);
  await main(d, hiF.delivery.buttons.picked).click();
  await delivery.pause(1500);
  await main(d, hiF.delivery.buttons.on_the_way).click();
  await delivery.pause(1500);
  await main(d, hiF.delivery.buttons.delivered).click();
  await expect(d.getByText(hiF.delivery.thanks)).toBeVisible();
  delivery.caption('पहुँचा दिया – लिंक अपने आप बंद');
  await delivery.pause(2500);
  await delivery.save();

  const timeline = await clip(browser, '3d-timeline', PHONES.hotel);
  const t = timeline.page;
  await t.goto(`/#/orders/${orderId}`);
  await expect(t.getByRole('heading', { name: hiF.delivery.timeline })).toBeVisible();
  await t.getByRole('heading', { name: hiF.delivery.timeline }).scrollIntoViewIfNeeded();
  timeline.caption('खरीदार को हर कदम दिखता है – सामान कहाँ तक पहुँचा');
  await timeline.pause(4000);
  await timeline.save();

  // 4. Coordinator (SHG didi) panel and the pilot dashboard.
  const coordinator = await clip(browser, '4-coordinator', PHONES.coordinator);
  const c = coordinator.page;
  await c.goto('/#/admin');
  coordinator.caption('SHG दीदी (संयोजक) का पैनल: विक्रेता, ऑर्डर, शिकायत, मंडी गाड़ी');
  await coordinator.pause(3500);
  await c.goto('/#/admin/pilot');
  coordinator.caption('पायलट डैशबोर्ड: सिर्फ़ गिनती – किसी किसान का नाम या नंबर नहीं');
  await coordinator.pause(3000);
  await glide(c, 900);
  await coordinator.pause(3000);
  await c.goto('/#/admin/complaints');
  coordinator.caption('शिकायत कतार: 48 घंटे में जवाब, दोनों पक्षों को फ़ैसला दिखता है');
  await coordinator.pause(3500);
  await c.goto('/#/admin/trips');
  coordinator.caption('साथ में मंडी: एक गाड़ी, कई किसान, भाड़ा बँटता है');
  await coordinator.pause(3500);
  await coordinator.save();
});
