export function calculateLevelData(totalExp) {
  let level = 1;
  let requiredExp = 1000;
  let expForNextLevel = 1000;

  while (totalExp >= requiredExp) {
    level++;
    expForNextLevel = level * 1000;
    requiredExp += expForNextLevel;
  }

  const currentLevelBaseExp = requiredExp - expForNextLevel;
  return {
    level,
    progressExp: totalExp - currentLevelBaseExp,
    nextLevelExp: expForNextLevel,
    totalExp
  };
}
