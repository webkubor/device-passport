/**
 * Zero-Contradiction Hardware Matrix for Device Passport.
 *
 * Guarantees 100% mathematical and physical consistency across:
 * - OS platform & platformVersion (compliant with Chromium Client-Hints freeze specs)
 * - CPU architecture & hardware concurrency
 * - Screen resolution, available dimensions, and Device Pixel Ratio (Retina vs Standard)
 * - WebGL unmasked vendor and renderer strings (ANGLE Apple M-series vs Direct3D NVIDIA/AMD/Intel)
 */

import type {
  HardwareProfile,
  OperatingSystemProfile,
  SupportedPlatform,
  SupportedArchitecture,
} from '../types/index.js';

export interface DeviceMatrixPreset {
  id: string;
  name: string;
  deviceType: 'laptop' | 'desktop';
  os: OperatingSystemProfile;
  hardware: HardwareProfile;
}

/**
 * Curated zero-contradiction macOS presets.
 * Note: Under W3C User-Agent Client Hints and Chromium specs:
 * - macOS arm64 reports sec-ch-ua-arch="arm", platformVersion="14.6.1" or "15.0.0"
 * - WebGL renderer uses ANGLE OpenGL / Metal with Apple M-series
 * - Screens are Retina with dpr: 2
 */
export const MACOS_PRESETS: DeviceMatrixPreset[] = [
  {
    id: 'mac-m3-pro-mbp14',
    name: 'MacBook Pro 14" (Apple M3 Pro)',
    deviceType: 'laptop',
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '15.0.0', // macOS Sequoia
      release: 'Sequoia',
      architecture: 'arm',
    },
    hardware: {
      screen: {
        width: 1512,
        height: 982,
        availWidth: 1512,
        availHeight: 945, // Top notch & menu bar
        dpr: 2,
        colorDepth: 30,
        pixelDepth: 30,
      },
      cpu: {
        architecture: 'arm',
        concurrency: 12,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 18,
      },
      gpu: {
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M3 Pro, OpenGL 4.1)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'mac-m2-air13',
    name: 'MacBook Air 13" (Apple M2)',
    deviceType: 'laptop',
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '14.6.1', // macOS Sonoma
      release: 'Sonoma',
      architecture: 'arm',
    },
    hardware: {
      screen: {
        width: 1440,
        height: 900,
        availWidth: 1440,
        availHeight: 875,
        dpr: 2,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'arm',
        concurrency: 8,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'mac-m2-max-mbp16',
    name: 'MacBook Pro 16" (Apple M2 Max)',
    deviceType: 'laptop',
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '14.6.1',
      release: 'Sonoma',
      architecture: 'arm',
    },
    hardware: {
      screen: {
        width: 1728,
        height: 1117,
        availWidth: 1728,
        availHeight: 1080,
        dpr: 2,
        colorDepth: 30,
        pixelDepth: 30,
      },
      cpu: {
        architecture: 'arm',
        concurrency: 12,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 32,
      },
      gpu: {
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M2 Max, OpenGL 4.1)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'mac-m3-imac24',
    name: 'iMac 24" (Apple M3)',
    deviceType: 'desktop',
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '15.0.0',
      release: 'Sequoia',
      architecture: 'arm',
    },
    hardware: {
      screen: {
        width: 2240,
        height: 1260,
        availWidth: 2240,
        availHeight: 1235,
        dpr: 2,
        colorDepth: 30,
        pixelDepth: 30,
      },
      cpu: {
        architecture: 'arm',
        concurrency: 8,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M3, OpenGL 4.1)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'mac-m2-studio-display',
    name: 'Mac Studio (Apple M2 Max, Studio Display)',
    deviceType: 'desktop',
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '15.0.0',
      release: 'Sequoia',
      architecture: 'arm',
    },
    hardware: {
      screen: {
        width: 2560,
        height: 1440,
        availWidth: 2560,
        availHeight: 1415,
        dpr: 2,
        colorDepth: 30,
        pixelDepth: 30,
      },
      cpu: {
        architecture: 'arm',
        concurrency: 12,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 32,
      },
      gpu: {
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, Apple M2 Max, OpenGL 4.1)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'mac-intel-mbp13',
    name: 'MacBook Pro 13" (Intel Core i5)',
    deviceType: 'laptop',
    os: {
      name: 'macOS',
      platform: 'macOS',
      version: '14.6.1',
      release: 'Sonoma',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 1440,
        height: 900,
        availWidth: 1440,
        availHeight: 875,
        dpr: 2,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 8,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 645, OpenGL 4.1)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
];

/**
 * Curated zero-contradiction Windows presets.
 * Note: Under Chromium Client-Hints specifications:
 * - Windows 11 platformVersion is "15.0.0" (or 13.0.0+)
 * - Windows 10 platformVersion is "10.0.0"
 * - Architecture is "x86" with bitness "64"
 * - GPU renderers use Direct3D11 ANGLE backend
 */
export const WINDOWS_PRESETS: DeviceMatrixPreset[] = [
  {
    id: 'win11-rtx3060-desktop',
    name: 'Windows 11 Desktop (NVIDIA RTX 3060)',
    deviceType: 'desktop',
    os: {
      name: 'Windows',
      platform: 'Windows',
      version: '15.0.0', // Windows 11
      release: 'Windows 11',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040, // 40px taskbar
        dpr: 1,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 12,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'win11-rtx4070-laptop',
    name: 'Windows 11 Laptop (NVIDIA RTX 4070, 2K 125%)',
    deviceType: 'laptop',
    os: {
      name: 'Windows',
      platform: 'Windows',
      version: '15.0.0',
      release: 'Windows 11',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 2560,
        height: 1440,
        availWidth: 2560,
        availHeight: 1400,
        dpr: 1.25,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 16,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 32,
      },
      gpu: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'win10-gtx1660s-desktop',
    name: 'Windows 10 Desktop (NVIDIA GTX 1660 SUPER)',
    deviceType: 'desktop',
    os: {
      name: 'Windows',
      platform: 'Windows',
      version: '10.0.0', // Windows 10
      release: 'Windows 10',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        dpr: 1,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 8,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'win10-rx6700xt-desktop',
    name: 'Windows 10 Workstation (AMD Radeon RX 6700 XT)',
    deviceType: 'desktop',
    os: {
      name: 'Windows',
      platform: 'Windows',
      version: '10.0.0',
      release: 'Windows 10',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 2560,
        height: 1440,
        availWidth: 2560,
        availHeight: 1400,
        dpr: 1,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 16,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 32,
      },
      gpu: {
        vendor: 'Google Inc. (AMD)',
        renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'win11-iris-xe-laptop',
    name: 'Windows 11 Ultrabook (Intel Iris Xe)',
    deviceType: 'laptop',
    os: {
      name: 'Windows',
      platform: 'Windows',
      version: '15.0.0',
      release: 'Windows 11',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1032,
        dpr: 1.25,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 8,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 16,
      },
      gpu: {
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
  {
    id: 'win11-rtx4080-4k',
    name: 'Windows 11 High-End 4K (NVIDIA RTX 4080)',
    deviceType: 'desktop',
    os: {
      name: 'Windows',
      platform: 'Windows',
      version: '15.0.0',
      release: 'Windows 11',
      architecture: 'x86',
    },
    hardware: {
      screen: {
        width: 3840,
        height: 2160,
        availWidth: 3840,
        availHeight: 2112,
        dpr: 1.5,
        colorDepth: 24,
        pixelDepth: 24,
      },
      cpu: {
        architecture: 'x86',
        concurrency: 24,
      },
      memory: {
        deviceMemory: 8,
        physicalMemoryGB: 32,
      },
      gpu: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11)',
        webglVendor: 'WebKit',
        webglRenderer: 'WebKit WebGL',
      },
    },
  },
];

export const ALL_PRESETS: DeviceMatrixPreset[] = [
  ...MACOS_PRESETS,
  ...WINDOWS_PRESETS,
];

/**
 * Filter presets based on OS, architecture or device type.
 */
export function getHardwarePresets(filters?: {
  platform?: SupportedPlatform;
  architecture?: SupportedArchitecture;
  deviceType?: 'laptop' | 'desktop';
}): DeviceMatrixPreset[] {
  let list = ALL_PRESETS;
  if (!filters) return list;

  if (filters.platform) {
    list = list.filter((p) => p.os.platform === filters.platform);
  }
  if (filters.architecture) {
    list = list.filter((p) => p.os.architecture === filters.architecture);
  }
  if (filters.deviceType) {
    list = list.filter((p) => p.deviceType === filters.deviceType);
  }
  return list;
}

/**
 * Validate that a hardware configuration has ZERO contradictions.
 * Returns a list of contradiction error descriptions (empty if 100% valid).
 */
export function validateHardwareContradictions(
  os: OperatingSystemProfile,
  hardware: HardwareProfile
): string[] {
  const errors: string[] = [];

  // 1. OS vs GPU Rendering Pipeline Check
  if (os.platform === 'macOS') {
    if (hardware.gpu.renderer.includes('Direct3D')) {
      errors.push('macOS cannot use Direct3D graphics backend');
    }
    if (os.architecture === 'arm') {
      if (!hardware.gpu.renderer.includes('Apple M')) {
        errors.push(`ARM macOS must use Apple Silicon M-series GPU, got: ${hardware.gpu.renderer}`);
      }
      if (hardware.gpu.renderer.includes('NVIDIA') || hardware.gpu.renderer.includes('AMD')) {
        errors.push('Apple Silicon Mac cannot have discrete NVIDIA or AMD GPU');
      }
    } else if (os.architecture === 'x86') {
      if (hardware.gpu.renderer.includes('Apple M')) {
        errors.push('Intel x86 Mac cannot have Apple Silicon M-series GPU');
      }
    }
    // Retina screen check
    if (hardware.screen.dpr !== 2) {
      errors.push(`Modern macOS profiles must be Retina (dpr: 2), got: ${hardware.screen.dpr}`);
    }
  } else if (os.platform === 'Windows') {
    if (hardware.gpu.renderer.includes('Apple M')) {
      errors.push('Windows cannot use Apple Silicon GPU');
    }
    if (os.architecture === 'x86' && !hardware.gpu.renderer.includes('Direct3D')) {
      errors.push('Windows x86 ANGLE backend should use Direct3D11');
    }
    // Windows platform version check
    if (os.version !== '15.0.0' && os.version !== '10.0.0') {
      errors.push(`Windows platform version must be 15.0.0 (Win11) or 10.0.0 (Win10), got: ${os.version}`);
    }
  }

  // 2. Screen Dimensions Sanity Check
  if (hardware.screen.availWidth > hardware.screen.width) {
    errors.push('screen.availWidth cannot be greater than screen.width');
  }
  if (hardware.screen.availHeight > hardware.screen.height) {
    errors.push('screen.availHeight cannot be greater than screen.height');
  }
  if (hardware.screen.width <= 0 || hardware.screen.height <= 0) {
    errors.push('Screen dimensions must be strictly positive');
  }

  // 3. CPU and Memory Checks
  if (hardware.cpu.concurrency < 2 || hardware.cpu.concurrency > 64) {
    errors.push(`Unrealistic hardware concurrency: ${hardware.cpu.concurrency}`);
  }
  if (hardware.cpu.architecture !== os.architecture) {
    errors.push(
      `CPU architecture (${hardware.cpu.architecture}) does not match OS architecture (${os.architecture})`
    );
  }
  if (hardware.memory.deviceMemory <= 0 || hardware.memory.deviceMemory > 128) {
    errors.push(`Invalid deviceMemory: ${hardware.memory.deviceMemory}`);
  }

  return errors;
}
