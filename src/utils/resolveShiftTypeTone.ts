import type { LucideIcon } from 'lucide-react-native';

import { resolveShiftTypePreset, type ShiftTypeIconPreset } from '@/constants/shiftTypeIcons';
import type { IconBadgeTone } from '@/constants/theme';
import type { Workplace } from '@/models';

/**
 * 勤務先＋シフト種別名から、マイカスタム（`src/app/(tabs)/template.tsx`）と同じ規則
 * （`resolveShiftTypePreset`）でアイコンと色のプリセットを引く。
 * 勤務先やシフト種別が見つからない（名前の変更・削除、種別なしの勤務）ときは `undefined`。
 */
function findShiftTypePreset(
  workplaces: Workplace[],
  workplaceId: string | undefined,
  shiftTypeName: string | undefined,
): ShiftTypeIconPreset | undefined {
  if (!shiftTypeName) return undefined;
  const workplace = workplaces.find((w) => w.id === workplaceId);
  if (!workplace) return undefined;
  const index = workplace.shiftTypes.findIndex((t) => t.name === shiftTypeName);
  if (index < 0) return undefined;
  return resolveShiftTypePreset(workplace.shiftTypes[index].icon, index);
}

/** Resolves a calendar event's badge color from its workplace + shift type name (same rule as the マイカスタム tab), falling back to 'blue' when either can't be found (renamed/deleted shift type, unknown workplace). */
export function resolveShiftTypeTone(
  workplaces: Workplace[],
  workplaceId: string | undefined,
  shiftTypeName: string | undefined,
): IconBadgeTone {
  return findShiftTypePreset(workplaces, workplaceId, shiftTypeName)?.tone ?? 'blue';
}

/** 同じ規則でシフト種別のアイコンを返す。見つからなければ `undefined`（呼び出し側でカレンダーの絵などにする）。 */
export function resolveShiftTypeIcon(
  workplaces: Workplace[],
  workplaceId: string | undefined,
  shiftTypeName: string | undefined,
): LucideIcon | undefined {
  return findShiftTypePreset(workplaces, workplaceId, shiftTypeName)?.Icon;
}
