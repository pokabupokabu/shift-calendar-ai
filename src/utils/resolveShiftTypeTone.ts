import { SHIFT_TYPE_ICON_PRESETS } from '@/constants/shiftTypeIcons';
import type { IconBadgeTone } from '@/constants/theme';
import type { Workplace } from '@/models';

/** Resolves a calendar event's badge color from its workplace + shift type name, falling back to 'blue' when either can't be found (renamed/deleted shift type, unknown workplace). */
export function resolveShiftTypeTone(
  workplaces: Workplace[],
  workplaceId: string | undefined,
  shiftTypeName: string | undefined,
): IconBadgeTone {
  const workplace = workplaces.find((w) => w.id === workplaceId);
  const shiftType = workplace?.shiftTypes.find((t) => t.name === shiftTypeName);
  const preset = shiftType?.icon
    ? SHIFT_TYPE_ICON_PRESETS.find((p) => p.key === shiftType.icon)
    : undefined;
  return preset?.tone ?? 'blue';
}
