<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const { skills, userStats, isProcessing } = storeToRefs(store);
const { unlockSkill } = store;

const emit = defineEmits(['toast']);

const confirmTarget = ref(null);

const BONUS_DISPLAY = {
  EXP_BOOST:       { label: 'EXP ×1.1',             cls: 'text-epic-red border-epic-red/40 bg-epic-red/10' },
  EXP_FLAT:        { label: '+10 EXP／次',            cls: 'text-epic-red border-epic-red/40 bg-epic-red/10' },
  CHAIN_REACTION:  { label: 'EXP ×1.1（當日第5個起）', cls: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  LONG_TERM:       { label: 'EXP ×1.1（連擊≥14天）',  cls: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  SELF_CONTROL:    { label: '節制消費 額外 85折',       cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  ABUNDANCE:       { label: '金幣≥500 每任務 +5 Gold', cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  TRAINING_MILESTONE: { label: '每15次訓練 +15 Gold',  cls: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10' },
  DIVERSITY:       { label: '3種稀有度 每任務 +3 Gold', cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  STREAK_BOOST:    { label: 'EXP ×1.15（連擊≥7天）', cls: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  COLLECTOR_BONUS: { label: 'EXP ×1.05（≥3技能）',   cls: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  WEEKEND_BONUS:   { label: 'EXP+Gold ×1.25（週末）', cls: 'text-purple-400 border-purple-400/40 bg-purple-400/10' },
  GOLD_BOOST:      { label: 'Gold ×1.2',             cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  GOLD_FLAT:       { label: '+2 Gold／次',            cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  FULL_DAILY:      { label: '全勤 +30 Gold',           cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  MILESTONE_GOLD:  { label: '每25任務 +50 Gold',      cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  FORTUNE_WHEEL:   { label: '每日金幣轉盤',            cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  DISCOUNT_10:     { label: '商店 9折',               cls: 'text-tier-legend border-tier-legend/40 bg-tier-legend/10' },
  LUCKY_STRIKE:    { label: '10% 爆擊 ×2',           cls: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  CRIT_BOOST:      { label: '爆擊率 → 15%',          cls: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  LEVELUP_SP:      { label: '升級 +1能力點',          cls: 'text-tier-rare border-tier-rare/40 bg-tier-rare/10' },
  MILESTONE_SP:    { label: '每20任務 +1點',          cls: 'text-tier-rare border-tier-rare/40 bg-tier-rare/10' },
  SKILL_DISCOUNT:  { label: '解鎖技能 -1點',          cls: 'text-tier-rare border-tier-rare/40 bg-tier-rare/10' },
  TRAINING_EXP:    { label: '+5 EXP（訓練場）',       cls: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10' },
  TRAINING_BOOST:  { label: '訓練獎勵上限 ×2',        cls: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10' },
};

const unlockedBonuses = computed(() =>
  skills.value
    .filter(s => s.Is_Unlocked && BONUS_DISPLAY[s.Effect_Type])
    .map(s => ({ ...BONUS_DISPLAY[s.Effect_Type], key: s.Skill_ID }))
);

const handleConfirmUnlock = async () => {
  const skill = confirmTarget.value;
  confirmTarget.value = null;
  await handleUnlockSkill(skill);
};

const handleUnlockSkill = async (skill) => {
  const result = await unlockSkill(skill);
  emit('toast', result?.success
    ? `成功覺醒技能：【${skill.Name}】！力量湧現了。`
    : (result?.error || '能力點數不足或解鎖失敗。'));
};
</script>

<template>
  <div class="p-6">
    <h2 class="text-lg font-serif text-tier-epic tracking-wide mb-5">被動技能樹</h2>

    <!-- Active bonus summary -->
    <div v-if="unlockedBonuses.length > 0" class="bg-stone-50 border-2 border-stone-500 sketch-panel p-4 mb-5">
      <p class="text-xs text-stone-400 uppercase tracking-wider mb-3">目前加成效果</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="bonus in unlockedBonuses" :key="bonus.key"
              :class="['text-xs px-2.5 py-1 sketch-sm border whitespace-nowrap', bonus.cls]">
          {{ bonus.label }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="skill in skills" :key="skill.Skill_ID"
           :class="['p-5 sketch-panel border-2 transition-all duration-300 flex flex-col justify-between min-h-[140px]',
                    skill.Is_Unlocked
                      ? 'bg-white border-tier-epic'
                      : 'bg-fantasy-panel border-stone-500']">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 :class="['font-serif font-bold text-sm', skill.Is_Unlocked ? 'text-stone-900' : 'text-stone-400']">{{ skill.Name }}</h4>
            <span v-if="skill.Is_Unlocked" class="text-xs bg-tier-epic/20 text-tier-epic px-2 py-0.5 sketch-sm border border-tier-epic/50 shrink-0 ml-2">已覺醒</span>
            <span v-else class="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 sketch-sm border-[1.5px] border-stone-400 shrink-0 ml-2">未解鎖</span>
          </div>
          <p class="text-sm text-stone-500 mb-4 leading-relaxed">{{ skill.Description }}</p>
        </div>
        <button
          v-if="!skill.Is_Unlocked"
          @click="confirmTarget = skill"
          :disabled="isProcessing || parseInt(userStats?.Stat_Points || 0) < parseInt(skill.Cost || 0)"
          class="w-full py-1.5 bg-transparent border-2 border-tier-rare text-tier-rare hover:bg-tier-rare hover:text-white transition-colors sketch-btn text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tier-rare flex justify-center items-center gap-2"
        >
          <span>解鎖</span><span class="font-bold">{{ skill.Cost }} 點</span>
        </button>
      </div>
      <div v-if="skills.length === 0" class="col-span-full text-center text-stone-400 py-10 text-sm">尚未發掘任何技能...</div>
    </div>

    <!-- Unlock confirm modal -->
    <Teleport to="body">
      <div v-if="confirmTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-6 max-w-xs w-full text-center">
          <p class="text-stone-900 font-serif mb-1">確定解鎖技能？</p>
          <p class="text-stone-800 text-sm font-medium mb-1">【{{ confirmTarget.Name }}】</p>
          <p class="text-stone-500 text-xs mb-2 leading-relaxed">{{ confirmTarget.Description }}</p>
          <p class="text-stone-500 text-xs mb-5">消耗 <span class="text-tier-rare font-bold">{{ confirmTarget.Cost }} 能力點</span></p>
          <div class="flex justify-center gap-3">
            <button @click="confirmTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleConfirmUnlock" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-tier-rare hover:bg-blue-500 text-white sketch-btn transition-colors disabled:opacity-50">確認解鎖</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
