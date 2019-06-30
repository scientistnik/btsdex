let addresses = [],
  curIndex = Infinity;

export const setServers = servers => {
  addresses = servers instanceof Array ? servers.filter(s => s) : [servers];
};

export const getServers = () => addresses;
export const currServer = () => addresses[curIndex];

export const nextServer = () => {
  curIndex++;
  if (curIndex >= addresses.length) curIndex = 0;

  return addresses[curIndex];
};
