export const alwaysAllowed = {
  read: {skipAuth: {Always: true}} as const,
  delete: {skipAuth: {Always: true}} as const,
  create: {skipAuth: {Always: true}} as const,
  modify: {skipAuth: {Always: true}} as const
}
