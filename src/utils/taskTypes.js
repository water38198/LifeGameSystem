export const typeConfigs = [
  { id: 'Daily',  label: '日常', textClass: 'text-tier-daily',  borderClass: 'border-tier-daily',  hoverBgClass: 'hover:bg-tier-daily' },
  { id: 'Normal', label: '普通', textClass: 'text-tier-normal', borderClass: 'border-tier-normal', hoverBgClass: 'hover:bg-tier-normal' },
  { id: 'Rare',   label: '稀有', textClass: 'text-tier-rare',   borderClass: 'border-tier-rare',   hoverBgClass: 'hover:bg-tier-rare' },
  { id: 'Epic',   label: '史詩', textClass: 'text-tier-epic',   borderClass: 'border-tier-epic',   hoverBgClass: 'hover:bg-tier-epic' },
  { id: 'Legend', label: '傳奇', textClass: 'text-tier-legend', borderClass: 'border-tier-legend', hoverBgClass: 'hover:bg-tier-legend' },
];

export const getTypeConfig = (typeStr) => {
  if (!typeStr) return typeConfigs[0];
  return typeConfigs.find(c => c.id.toLowerCase() === typeStr.toLowerCase()) || typeConfigs[0];
};
