import { validate as uuidValidate } from 'uuid';

export function isValidUUID(str: string): boolean {
  return uuidValidate(str);
}

