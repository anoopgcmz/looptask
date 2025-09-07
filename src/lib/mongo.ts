export type MetaField<T extends string> = { $meta: T };

export const meta = <T extends string>(value: T): MetaField<T> => ({ $meta: value });
