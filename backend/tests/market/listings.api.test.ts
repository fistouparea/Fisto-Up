import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors/AppError.js';
import { ListingPhotoModel } from '../../src/modules/listings/listing.model.js';
import { toDraft } from '../../src/modules/listings/listing.service.js';
import { bajraListingDraft, createFakeProvider, JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, loginCoordinator, readySeller, registerAs, sellerProfile } from './marketHelpers.js';

useTestDatabase();

type Agent = Awaited<ReturnType<typeof registerAs>>['agent'];

function postDraft(agent: Agent, text: string, image: Buffer = JPEG_BYTES) {
  return agent.post('/api/market/listings/draft').field('text', text).attach('image', image, { filename: 'p.jpg', contentType: 'image/jpeg' });
}

function uploadPhoto(agent: Agent) {
  return agent.post('/api/market/photos').attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
}

const listingBody = {
  category: 'crop',
  product: 'bajra',
  title: { hi: 'साफ़ बाजरा – 10 क्विंटल', en: 'Clean Bajra – 10 quintal' },
  description: { hi: 'सूखा बाजरा', en: 'Dry bajra' },
  unit: 'quintal',
  quantity: 10,
  pricePerUnitPaise: 2_500_00,
};

describe('Snap & List draft', () => {
  it('turns photo + spoken words into a draft, sending the AI only the photo and the words', async () => {
    const ai = createFakeProvider();
    const app = createMarketTestApp({}, { aiProvider: ai });
    const { agent } = await readySeller(app);

    const res = await postDraft(agent, 'मेरे पास दस क्विंटल बाजरा है, पच्चीस सौ रुपये क्विंटल, फोन 98290 12345');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      draft: { category: 'crop', product: 'bajra', quantity: 10, unit: 'quintal', pricePerUnitPaise: 250_000 },
    });
    expect(res.body.photoId).toMatch(/^[0-9a-f]{24}$/);

    const input = ai.draftListing.mock.calls[0]?.[0];
    expect(Object.keys(input ?? {}).sort()).toEqual(['image', 'mimeType', 'sellerText']);
    expect(input?.sellerText).not.toContain('98290');
    expect(input?.sellerText).toContain('[नंबर]');
    expect(JSON.stringify(input?.sellerText)).not.toContain(sellerProfile.name);
  });

  it('asks for another photo when the photo does not show the product, and does not keep it', async () => {
    const ai = createFakeProvider(undefined, undefined, {
      draftListing: { ...bajraListingDraft, photo_matches_product: false, photo_problem: 'बाजरे की बोरी की फोटो लें।' },
    });
    const app = createMarketTestApp({}, { aiProvider: ai });
    const { agent } = await readySeller(app);

    const res = await postDraft(agent, 'दस क्विंटल बाजरा');
    expect(res.body).toEqual({ status: 'retake', reason: 'बाजरे की बोरी की फोटो लें।' });
    expect(await ListingPhotoModel.countDocuments()).toBe(0);
  });

  it('passes on AI failures so the app can let the seller fill the form by hand', async () => {
    const ai = createFakeProvider(undefined, undefined, { draftListing: new AppError('AI_ERROR') });
    const { agent } = await readySeller(createMarketTestApp({}, { aiProvider: ai }));
    const res = await postDraft(agent, 'बाजरा');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_ERROR');
  });

  it('refuses a file that is not an image', async () => {
    const { agent } = await readySeller(createMarketTestApp());
    const res = await postDraft(agent, 'बाजरा', Buffer.from('%PDF-1.4 not an image'));
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });

  it('only sellers and coordinators can use it', async () => {
    const app = createMarketTestApp();
    expect((await postDraft((await registerAs(app, 'buyer')).agent, 'x')).status).toBe(403);
    expect((await request(app).post('/api/market/listings/draft').set('X-Requested-With', 'agriai')).status).toBe(401);
    expect((await postDraft((await loginCoordinator(app)).agent, 'बाजरा')).status).toBe(200);
  });
});

describe('cleaning up the AI draft', () => {
  it('turns 2.5 quintal into 250 kg and the price per quintal into a price per kg', () => {
    const draft = toDraft({ ...bajraListingDraft, quantity: 2.5, unit: 'quintal', price_per_unit_rupees: 2500 });
    expect(draft).toMatchObject({ quantity: 250, unit: 'kg', pricePerUnitPaise: 2_500 });
  });

  it('drops a unit the product does not allow, and with it the price', () => {
    const draft = toDraft({ ...bajraListingDraft, unit: 'piece' });
    expect(draft).toMatchObject({ unit: null, pricePerUnitPaise: null, quantity: 10 });
  });

  it('keeps unknown quantity and price empty instead of guessing', () => {
    const draft = toDraft({ ...bajraListingDraft, quantity: null, price_per_unit_rupees: null, title_hi: '', title_en: '' });
    expect(draft).toMatchObject({ quantity: null, pricePerUnitPaise: null, title: { hi: 'बाजरा', en: 'Bajra (Pearl millet)' } });
  });
});

describe('creating listings', () => {
  it('saves the listing with its photo; a pending seller’s listing stays hidden', async () => {
    const app = createMarketTestApp();
    const { agent } = await readySeller(app, { verified: false });
    const photoId = (await uploadPhoto(agent)).body.photoId as string;

    const res = await agent.post('/api/market/listings').send({ ...listingBody, photoIds: [photoId] });
    expect(res.status).toBe(201);
    expect(res.body.listing).toMatchObject({
      product: 'bajra',
      quantityAvailable: 10,
      pricePerUnitPaise: 250_000,
      minOrderQty: 1,
      status: 'active',
      visible: false,
      photoUrls: [`/api/market/photos/${photoId}`],
    });
    expect(await ListingPhotoModel.findById(photoId).lean()).toMatchObject({ attached: true });
  });

  it('is visible to buyers once the seller is verified', async () => {
    const { agent } = await readySeller(createMarketTestApp());
    const res = await agent.post('/api/market/listings').send(listingBody);
    expect(res.body.listing.visible).toBe(true);
  });

  it('needs village, UPI ID and pickup place first', async () => {
    const { agent } = await registerAs(createMarketTestApp(), 'seller');
    const res = await agent.post('/api/market/listings').send(listingBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELLER_PROFILE_MISSING');
  });

  it("refuses another seller's photo", async () => {
    const app = createMarketTestApp();
    const other = await readySeller(app);
    const photoId = (await uploadPhoto(other.agent)).body.photoId as string;
    const { agent } = await readySeller(app);

    const res = await agent.post('/api/market/listings').send({ ...listingBody, photoIds: [photoId] });
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it.each([
    ['a unit the product does not use', { unit: 'piece' }],
    ['a product from the other category', { category: 'shg' }],
    ['a minimum order above the quantity', { minOrderQty: 11 }],
    ['a price in fractions of paise', { pricePerUnitPaise: 2500.5 }],
    ['a negative quantity', { quantity: -1 }],
    ['zero quantity', { quantity: 0 }],
  ])('rejects %s', async (_label, override) => {
    const { agent } = await readySeller(createMarketTestApp());
    const res = await agent.post('/api/market/listings').send({ ...listingBody, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('keeps an FSSAI number only for food products', async () => {
    const { agent } = await readySeller(createMarketTestApp());
    const shg = { category: 'shg', unit: 'pack', quantity: 20, pricePerUnitPaise: 120_00, fssaiNumber: '12345678901234' };
    const achar = await agent.post('/api/market/listings').send({ ...shg, product: 'achar', title: { hi: 'आम का अचार' } });
    const craft = await agent.post('/api/market/listings').send({ ...shg, product: 'handicraft', title: { hi: 'दरी' } });
    expect(achar.body.listing.fssaiNumber).toBe('12345678901234');
    expect(craft.body.listing).not.toHaveProperty('fssaiNumber');
  });

  it('only sellers can create listings in their own name here (coordinators use assisted listing)', async () => {
    const app = createMarketTestApp();
    expect((await (await registerAs(app, 'buyer')).agent.post('/api/market/listings').send(listingBody)).status).toBe(403);
    expect((await (await loginCoordinator(app)).agent.post('/api/market/listings').send(listingBody)).status).toBe(403);
  });
});

describe('मेरी बिक्री: editing listings', () => {
  async function sellerWithListing() {
    const app = createMarketTestApp();
    const seller = await readySeller(app);
    const created = await seller.agent.post('/api/market/listings').send(listingBody);
    return { app, seller, id: created.body.listing.id as string };
  }

  it('changes price and quantity, pauses and reopens', async () => {
    const { seller, id } = await sellerWithListing();
    const edited = await seller.agent.patch(`/api/market/listings/${id}`).send({ pricePerUnitPaise: 2_600_00, quantityAvailable: 8 });
    expect(edited.body.listing).toMatchObject({ pricePerUnitPaise: 260_000, quantityAvailable: 8, status: 'active' });

    const paused = await seller.agent.patch(`/api/market/listings/${id}`).send({ status: 'paused' });
    expect(paused.body.listing).toMatchObject({ status: 'paused', visible: false });

    const reopened = await seller.agent.patch(`/api/market/listings/${id}`).send({ status: 'active' });
    expect(reopened.body.listing.visible).toBe(true);
  });

  it('no stock left always means sold out; adding stock reopens the listing', async () => {
    const { seller, id } = await sellerWithListing();
    const empty = await seller.agent.patch(`/api/market/listings/${id}`).send({ quantityAvailable: 0, status: 'active' });
    expect(empty.body.listing.status).toBe('sold_out');

    const restocked = await seller.agent.patch(`/api/market/listings/${id}`).send({ quantityAvailable: 5 });
    expect(restocked.body.listing).toMatchObject({ status: 'active', quantityAvailable: 5 });
  });

  it("a seller cannot edit another seller's listing; a coordinator can", async () => {
    const { app, id } = await sellerWithListing();
    const other = await readySeller(app);
    expect((await other.agent.patch(`/api/market/listings/${id}`).send({ status: 'paused' })).status).toBe(403);

    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.patch(`/api/market/listings/${id}`).send({ status: 'paused' })).status).toBe(200);
  });

  it('lists only my own listings, newest first', async () => {
    const { app, seller } = await sellerWithListing();
    await seller.agent.post('/api/market/listings').send({ ...listingBody, product: 'guar', title: { hi: 'ग्वार' } });
    await (await readySeller(app)).agent.post('/api/market/listings').send(listingBody);

    const mine = await seller.agent.get('/api/market/my/listings');
    expect(mine.body.items.map((item: { product: string }) => item.product)).toEqual(['guar', 'bajra']);
  });
});

describe('listing photos', () => {
  it('a saved photo is public; an unused upload is visible only to its uploader', async () => {
    const app = createMarketTestApp();
    const { agent } = await readySeller(app);
    const unused = (await uploadPhoto(agent)).body.photoId as string;
    const used = (await uploadPhoto(agent)).body.photoId as string;
    await agent.post('/api/market/listings').send({ ...listingBody, photoIds: [used] });

    const publicPhoto = await request(app).get(`/api/market/photos/${used}`);
    expect(publicPhoto.status).toBe(200);
    expect(publicPhoto.headers['content-type']).toBe('image/jpeg');
    expect(publicPhoto.headers['cache-control']).toContain('immutable');

    expect((await request(app).get(`/api/market/photos/${unused}`)).status).toBe(404);
    expect((await agent.get(`/api/market/photos/${unused}`)).status).toBe(200);
  });
});
