<template>
  <div class="p-6">
    <h2 class="text-lg font-serif text-tier-epic tracking-wide mb-5">被動技能樹</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="skill in skills" :key="skill.Skill_ID"
           :class="['p-5 rounded border transition-all duration-300 flex flex-col justify-between min-h-[140px]',
                    skill.Is_Unlocked
                      ? 'bg-gray-800/80 border-tier-epic shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-fantasy-panel border-gray-700']">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 :class="['font-serif font-bold text-sm', skill.Is_Unlocked ? 'text-white' : 'text-gray-400']">{{ skill.Name }}</h4>
            <span v-if="skill.Is_Unlocked" class="text-xs bg-tier-epic/20 text-tier-epic px-2 py-0.5 rounded border border-tier-epic/50 shrink-0 ml-2">已覺醒</span>
            <span v-else class="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-700 shrink-0 ml-2">未解鎖</span>
          </div>
          <p class="text-xs text-gray-400 mb-4 leading-relaxed">{{ skill.Description }}</p>
        </div>
        <button
          v-if="!skill.Is_Unlocked"
          @click="handleUnlockSkill(skill)"
          :disabled="isProcessing || parseInt(userStats?.Stat_Points || 0) < parseInt(skill.Cost || 0)"
          class="w-full py-1.5 bg-transparent border border-tier-rare text-tier-rare hover:bg-tier-rare hover:text-white transition-colors rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tier-rare flex justify-center items-center gap-2"
        >
          <span>解鎖</span><span class="font-bold">{{ skill.Cost }} 點</span>
        </button>
      </div>
      <div v-if="skills.length === 0" class="col-span-full text-center text-gray-500 py-10 text-sm">尚未發掘任何技能...</div>
    </div>
  </div>
</template>

<script setup>
import { skills, userStats, isProcessing, unlockSkill } from '../services/googleAuth';

const emit = defineEmits(['toast']);

const handleUnlockSkill = async (skill) => {
  const result = await unlockSkill(skill);
  emit('toast', result?.success
    ? `成功覺醒技能：【${skill.Name}】！力量湧現了。`
    : (result?.error || '能力點數不足或解鎖失敗。'));
};
</script>
