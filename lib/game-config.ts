export type ProxLowNetConfig = {
  enabled: boolean;
  entryFee: number;
  payouts: {
    lowNet1st: number;
    lowNet2nd: number;
    lowNet3rd: number;
    lowGross: number;
    proxTotal: number;
  };
  proxHoleCount: number;
};

export type SkinsConfig = {
  enabled: boolean;
  entryFee: number;
  carryOver: boolean;
};

export type GameConfig = {
  proxLowNet: ProxLowNetConfig;
  skins: SkinsConfig;
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  proxLowNet: {
    enabled: true,
    entryFee: 15,
    payouts: {
      lowNet1st: 30,
      lowNet2nd: 20,
      lowNet3rd: 10,
      lowGross: 10,
      proxTotal: 30,
    },
    proxHoleCount: 4,
  },
  skins: {
    enabled: true,
    entryFee: 10,
    carryOver: true,
  },
};

export function getPayoutTotal(
  payouts: ProxLowNetConfig["payouts"]
): number {
  return (
    payouts.lowNet1st +
    payouts.lowNet2nd +
    payouts.lowNet3rd +
    payouts.lowGross +
    payouts.proxTotal
  );
}
