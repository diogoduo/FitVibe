import { formatClock, formatSet, formatWorkoutDuration } from '../format';

describe('formatação do treino', () => {
  it('série curta no jeito de cada tipo de carga', () => {
    expect(formatSet({ load: 32.5, reps: 8 }, 'kg')).toBe('32,5 × 8');
    expect(formatSet({ load: 6, reps: 8 }, 'plates')).toBe('6 pl × 8');
    expect(formatSet({ load: 10, reps: 8 }, 'bodyweight')).toBe('+10 × 8');
    expect(formatSet({ load: null, reps: 12 }, 'bodyweight')).toBe('12 reps');
    expect(formatSet({ load: null, reps: null, durationSec: 900 }, 'time')).toBe('15 min');
  });

  it('relógio do descanso e duração do treino', () => {
    expect(formatClock(95)).toBe('1:35');
    expect(formatClock(-3)).toBe('0:00');
    const start = new Date(2026, 9, 1, 18, 0);
    expect(formatWorkoutDuration(start, new Date(2026, 9, 1, 18, 58))).toBe('58 min');
    expect(formatWorkoutDuration(start, new Date(2026, 9, 1, 19, 12))).toBe('1 h 12 min');
  });
});
