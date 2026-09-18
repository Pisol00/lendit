

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return Bun.password.verify(password, hashedPassword);
}
