export type ColorToken =
  | 'background'
  | 'surface'
  | 'surface-2'
  | 'line'
  | 'fg'
  | 'fg-muted'
  | 'primary'
  | 'on-primary'
  | 'success'
  | 'warning'
  | 'danger';

export type ColorSchemeName = 'dark' | 'light';

export declare const palette: Record<ColorSchemeName, Record<ColorToken, string>>;

export declare function toRgbChannels(hex: string): string;
