export function userMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';

  if (code === 'auth/email-already-in-use') return 'Ese correo ya está registrado.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'El correo o la contraseña no son correctos.';
  }
  if (code === 'auth/invalid-email') return 'Escribe un correo electrónico válido.';
  if (code === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
  if (message === 'PROFILE_NOT_FOUND') return 'La cuenta no tiene un perfil configurado. Contacta al administrador.';
  if (message === 'ORDER_CANNOT_BE_CANCELLED') return 'Solo puedes cancelar pedidos que aún están pendientes.';
  if (message === 'INVALID_STATUS_TRANSITION') return 'Ese cambio de estado no está permitido.';

  return fallback;
}
