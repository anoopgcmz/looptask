import type { ClientSession } from 'mongoose';

type Operation<T> = (session: ClientSession | null) => Promise<T>;

const TRANSACTION_UNSUPPORTED_CODES = new Set([20, 112, 251, 303]);

function isTransactionNotSupported(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('transactions are not supported') ||
      message.includes('transaction numbers are only allowed on a replica set member or mongos')
    ) {
      return true;
    }
  }

  if (!error || typeof error !== 'object') return false;

  const err = error as { code?: number | string; codeName?: string; message?: string };
  if (err.code !== undefined) {
    const numericCode = typeof err.code === 'number' ? err.code : Number(err.code);
    if (Number.isFinite(numericCode) && TRANSACTION_UNSUPPORTED_CODES.has(numericCode)) {
      return true;
    }
  }

  if (typeof err.codeName === 'string') {
    const normalized = err.codeName.toLowerCase();
    if (normalized === 'illegaloperation') {
      return true;
    }
  }

  if (typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    if (
      message.includes('transactions are not supported') ||
      message.includes('transaction numbers are only allowed on a replica set member or mongos')
    ) {
      return true;
    }
  }

  return false;
}

export async function runWithOptionalTransaction<T>(
  session: ClientSession,
  operation: Operation<T>
): Promise<T> {
  try {
    let hasResult = false;
    let result: T;
    await session.withTransaction(async () => {
      result = await operation(session);
      hasResult = true;
    });
    return hasResult ? result! : (undefined as T);
  } catch (error) {
    if (isTransactionNotSupported(error)) {
      return operation(null);
    }
    throw error;
  }
}

