declare module 'fuzzball' {
  export interface FuzzballOptions {
    force_ascii?: boolean;
    full_process?: boolean;
    returnObjects?: boolean;
  }

  export function ratio(str1: string, str2: string, options?: FuzzballOptions): number;
  export function token_set_ratio(str1: string, str2: string, options?: FuzzballOptions): number;
  export function WRatio(str1: string, str2: string, options?: FuzzballOptions): number;
}