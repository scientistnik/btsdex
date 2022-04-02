const defaultConfig = {
  name: "BitShares",
  coreAsset: "BTS",
  addressPrefix: "BTS",
  expireInSecs: 15,
  expireInSecsProposal: 24 * 60 * 60,
  reviewInSecsCommittee: 24 * 60 * 60,
  chainId: "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8",
};

let networks = [
    defaultConfig,
    {
      name: "TestNet",
      coreAsset: "TEST",
      addressPrefix: "TEST",
      expireInSecs: 15,
      expireInSecsProposal: 24 * 60 * 60,
      reviewInSecsCommittee: 24 * 60 * 60,
      chainId:
        "39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447",
    },
  ],
  current = null;

export const addConfig = config =>
  networks.push({ ...defaultConfig, ...config });

export const setConfig = chainId =>
  (current = networks.find(net => net.chainId === chainId));

export const getConfig = () => current;
