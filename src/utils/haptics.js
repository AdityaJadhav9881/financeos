import { Capacitor } from '@capacitor/core';

let Haptics = null;
let ImpactStyle = null;

async function loadHaptics() {
  if (!Capacitor.isNativePlatform()) return false;
  if (Haptics) return true;
  try {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    return true;
  } catch {
    return false;
  }
}

export async function hapticLight() {
  if (!(await loadHaptics())) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticMedium() {
  if (!(await loadHaptics())) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function hapticError() {
  if (!(await loadHaptics())) return;
  try {
    await Haptics.notification({ type: 'ERROR' });
  } catch {}
}
