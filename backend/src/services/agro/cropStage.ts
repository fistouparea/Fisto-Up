import { CROP_CALENDARS, GENERAL_TASKS, STAGES, STAGE_NAMES, type StageId } from '../../data/cropCalendar.js';
import type { CropId } from '../../types/diagnosis.js';
import { daysBetween } from '../../utils/dates.js';

export interface CropStageInfo {
  crop: CropId;
  daysSinceSowing: number;
  /** null once the crop is past its total duration (harvested). */
  stage: StageId | null;
  stageName: string | null;
  /** Timeline for the calendar screen, in order. */
  timeline: { stage: StageId; name: string; startDay: number; current: boolean; done: boolean }[];
  /** "आज का काम" for the current stage. */
  tasks: string[];
}

export function getCropStage(crop: CropId, sowingDate: string, today: string): CropStageInfo {
  const calendar = CROP_CALENDARS[crop];
  const daysSinceSowing = Math.max(0, daysBetween(sowingDate, today));
  const finished = daysSinceSowing > calendar.totalDays;
  const stage = finished ? null : currentStage(calendar.starts, daysSinceSowing);
  const currentIndex = stage ? STAGES.indexOf(stage) : STAGES.length;

  return {
    crop,
    daysSinceSowing,
    stage,
    stageName: stage ? STAGE_NAMES[stage] : null,
    timeline: STAGES.map((id, index) => ({
      stage: id,
      name: STAGE_NAMES[id],
      startDay: calendar.starts[id],
      current: id === stage,
      done: index < currentIndex,
    })),
    tasks: stage ? [...(calendar.tasks[stage] ?? []), ...GENERAL_TASKS[stage]] : [],
  };
}

/** The last stage whose start day has been reached. */
function currentStage(starts: Record<StageId, number>, day: number): StageId {
  let result: StageId = 'sowing';
  for (const stage of STAGES) {
    if (starts[stage] <= day) result = stage;
  }
  return result;
}
