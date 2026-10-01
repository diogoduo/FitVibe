import { navyBodyFatPct, type NavyInput } from '../body-fat';

const empty = { neckCm: null, waistCm: null, abdomenCm: null, hipsCm: null };

describe('navyBodyFatPct', () => {
  it('homem: pescoço, abdômen e altura', () => {
    const input: NavyInput = { ...empty, sex: 'male', heightCm: 178, neckCm: 38, abdomenCm: 85 };
    expect(navyBodyFatPct(input)).toBe(16.4);
  });

  it('homem sem abdômen usa a cintura', () => {
    const input: NavyInput = { ...empty, sex: 'male', heightCm: 180, neckCm: 40, waistCm: 90 };
    expect(navyBodyFatPct(input)).toBe(18.4);
  });

  it('mulher: pescoço, cintura, quadril e altura', () => {
    const input: NavyInput = {
      ...empty,
      sex: 'female',
      heightCm: 165,
      neckCm: 32,
      waistCm: 70,
      hipsCm: 95,
    };
    expect(navyBodyFatPct(input)).toBe(24.9);
  });

  it('sem as medidas necessárias ou com medida impossível, não estima', () => {
    expect(navyBodyFatPct({ ...empty, sex: 'male', heightCm: 178, neckCm: 38 })).toBeNull();
    expect(
      navyBodyFatPct({ ...empty, sex: 'female', heightCm: 165, neckCm: 32, waistCm: 70 }),
    ).toBeNull();
    expect(
      navyBodyFatPct({ ...empty, sex: 'male', heightCm: 178, neckCm: 85, abdomenCm: 38 }),
    ).toBeNull();
  });
});
