import { describe, expect, it } from 'vitest';
import { CROP_CALENDARS, GENERAL_TASKS, STAGES } from '../src/data/cropCalendar.js';
import { getCropStage } from '../src/services/agro/cropStage.js';
import { addDays } from '../src/utils/dates.js';
import { CROPS } from '../src/types/diagnosis.js';

const TODAY = '2026-11-10';
const sownDaysAgo = (days: number) => addDays(TODAY, -days);

describe('getCropStage', () => {
  it.each([
    [0, 'sowing'],
    [2, 'sowing'],
    [3, 'germination'],
    [10, 'germination'],
    [11, 'vegetative'],
    [50, 'vegetative'],
    [51, 'flowering'],
    [76, 'grainFilling'],
    [116, 'harvest'],
    [135, 'harvest'],
  ])('chana sown %i days ago is in stage %s', (days, stage) => {
    expect(getCropStage('chana', sownDaysAgo(days), TODAY).stage).toBe(stage);
  });

  it('has no stage once the crop is past its total duration', () => {
    const info = getCropStage('moong', sownDaysAgo(CROP_CALENDARS.moong.totalDays + 1), TODAY);
    expect(info.stage).toBeNull();
    expect(info.tasks).toEqual([]);
    expect(info.timeline.every((step) => step.done)).toBe(true);
  });

  it('marks earlier stages done and the current one active', () => {
    const info = getCropStage('gehun', sownDaysAgo(30), TODAY);
    expect(info.stage).toBe('vegetative');
    expect(info.stageName).toBe('बढ़वार');
    expect(info.timeline.map((step) => [step.stage, step.done, step.current])).toEqual([
      ['sowing', true, false],
      ['germination', true, false],
      ['vegetative', false, true],
      ['flowering', false, false],
      ['grainFilling', false, false],
      ['harvest', false, false],
    ]);
  });

  it('lists crop-specific tasks first, then the general ones', () => {
    const info = getCropStage('gehun', sownDaysAgo(22), TODAY);
    expect(info.tasks[0]).toContain('पहली सिंचाई');
    expect(info.tasks).toEqual(expect.arrayContaining(GENERAL_TASKS.vegetative));
  });

  it('treats a sowing date in the future as day 0', () => {
    expect(getCropStage('bajra', addDays(TODAY, 2), TODAY)).toMatchObject({ daysSinceSowing: 0, stage: 'sowing' });
  });

  it('has a valid calendar for every crop (stages in order, inside the total duration)', () => {
    for (const crop of Object.keys(CROPS) as (keyof typeof CROPS)[]) {
      const starts = STAGES.map((stage) => CROP_CALENDARS[crop].starts[stage]);
      expect(starts[0]).toBe(0);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
      expect(new Set(starts).size).toBe(starts.length);
      expect(CROP_CALENDARS[crop].totalDays).toBeGreaterThan(starts.at(-1) ?? 0);
    }
  });
});
