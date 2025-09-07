declare module 'agenda' {
  type Processor<T extends JobAttributesData> =
    ((job: Job<T>) => Promise<void>) |
    ((job: Job<T>, done: () => void) => void);
}
