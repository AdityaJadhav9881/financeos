import { registerPlugin } from '@capacitor/core';

export interface StoragePermissionPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
}

const StoragePermission = registerPlugin<StoragePermissionPlugin>('StoragePermission');

export default StoragePermission;
