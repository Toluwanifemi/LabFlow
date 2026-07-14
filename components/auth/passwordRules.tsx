export function PasswordRules({ password, focused }: { password: string; focused: boolean }) {
  if (!focused || !password) return null;
  return (
    <ul style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', listStyle: 'disc' }}>
      {!/[A-Z]/.test(password) && <li>Must include an uppercase letter</li>}
      {/[A-Z]/.test(password) && !/[a-z]/.test(password) && <li>Must include a lowercase letter</li>}
      {/[A-Z]/.test(password) && /[a-z]/.test(password) && !/[0-9]/.test(password) && <li>Must include a number</li>}
      {/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && password.length < 8 && <li>Minimum of 8 characters</li>}
    </ul>
  );
}

export function validatePassword(password: string): string {
  if (!password) return 'This field cannot be empty';
  if (!/[A-Z]/.test(password)) return 'Must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Must include a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Must include a number.';
  if (password.length < 8) return 'Minimum of 8 characters.';
  return '';
}
