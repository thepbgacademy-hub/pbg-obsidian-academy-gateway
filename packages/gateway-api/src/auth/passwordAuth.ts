export interface AuthenticatedStudent {
  studentId: string;
  displayName: string;
  tier: string;
  standingGood: boolean;
  creditBalance: number;
}

export interface PasswordAuthInput {
  username: string;
  password: string;
}

export interface PasswordAuthService {
  authenticate(input: PasswordAuthInput): Promise<AuthenticatedStudent | null>;
}
