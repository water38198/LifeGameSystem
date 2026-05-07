<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const { skills, userStats, isProcessing } = storeToRefs(store);
const { unlockSkill } = store;

const emit = defineEmits(['toast']);

const confirmTarget = ref(null);

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
          @click="confirmTarget = skill"
          :disabled="isProcessing || parseInt(userStats?.Stat_Points || 0) < parseInt(skill.Cost || 0)"
          class="w-full py-1.5 bg-transparent border border-tier-rare text-tier-rare hover:bg-tier-rare hover:text-white transition-colors rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tier-rare flex justify-center items-center gap-2"
        >
          <span>解鎖</span><span class="font-bold">{{ skill.Cost }} 點</span>
        </button>
      </div>
      <div v-if="skills.length === 0" class="col-span-full text-center text-gray-500 py-10 text-sm">尚未發掘任何技能...</div>
    </div>

    <!-- Unlock confirm modal -->
    <Teleport to="body">
      <div v-if="confirmTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg p-6 max-w-xs w-full text-center">
          <p class="text-white font-serif mb-1">確定解鎖技能？</p>
          <p class="text-gray-100 text-sm font-medium mb-1">【{{ confirmTarget.Name }}】</p>
          <p class="text-gray-400 text-xs mb-2 leading-relaxed">{{ confirmTarget.Description }}</p>
          <p class="text-gray-400 text-xs mb-5">消耗 <span class="text-tier-rare font-bold">{{ confirmTarget.Cost }} 能力點</span></p>
          <div class="flex justify-center gap-3">
            <button @click="confirmTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleConfirmUnlock" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-tier-rare hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50">確認解鎖</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
