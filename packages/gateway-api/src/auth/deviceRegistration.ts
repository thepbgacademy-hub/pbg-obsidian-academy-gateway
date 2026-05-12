export interface DeviceRegistrationInput {
  studentId: string;
  vaultId: string;
  deviceFingerprint: string;
  pluginVersion: string;
}

export interface RegisteredDevice {
  deviceId: string;
  vaultId: string;
  status: "active";
}

export interface DeviceRegistrationService {
  registerDevice(input: DeviceRegistrationInput): Promise<RegisteredDevice>;
}
