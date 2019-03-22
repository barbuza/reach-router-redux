export type LensLike<T, U> = {
  get: () => (target: T) => U;
  set: (value: U) => (target: T) => T;
}
