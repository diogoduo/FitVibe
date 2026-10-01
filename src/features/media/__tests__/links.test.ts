import { linkLabel, normalizeUrl } from '../links';

describe('links de mídia', () => {
  it('aceita link com ou sem https e recusa o que não é endereço', () => {
    expect(normalizeUrl(' https://youtu.be/abc ')).toBe('https://youtu.be/abc');
    expect(normalizeUrl('youtu.be/abc')).toBe('https://youtu.be/abc');
    expect(normalizeUrl('http://site.com/x?y=1')).toBe('http://site.com/x?y=1');
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('não é link')).toBeNull();
    expect(normalizeUrl('abc')).toBeNull();
  });

  it('dá nome aos sites conhecidos e usa o domínio nos outros', () => {
    expect(linkLabel('https://www.youtube.com/watch?v=1')).toBe('YouTube');
    expect(linkLabel('https://youtu.be/1')).toBe('YouTube');
    expect(linkLabel('https://www.instagram.com/reel/1')).toBe('Instagram');
    expect(linkLabel('https://www.exrx.net/WeightExercises')).toBe('exrx.net');
  });
});
