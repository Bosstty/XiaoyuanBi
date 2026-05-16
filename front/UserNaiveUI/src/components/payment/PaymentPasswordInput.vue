<template>
    <div
        class="pin-input"
        :class="{ 'is-disabled': disabled, 'is-dark': appStore.isDark }"
        @click="focus"
    >
        <div
            v-for="index in 6"
            :key="index"
            class="pin-input__cell"
            :class="{ 'is-filled': Boolean(innerValue[index - 1]) }"
        >
            {{ innerValue[index - 1] ? '•' : '' }}
        </div>
        <input
            ref="inputRef"
            :value="innerValue"
            class="pin-input__native"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            :disabled="disabled"
            @input="handleInput"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useAppStore } from '@/stores';

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        disabled?: boolean;
        autofocus?: boolean;
    }>(),
    {
        modelValue: '',
        disabled: false,
        autofocus: false,
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const appStore = useAppStore();
const inputRef = ref<HTMLInputElement | null>(null);
const innerValue = computed(() => String(props.modelValue || '').replace(/\D/g, '').slice(0, 6));

const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const sanitized = target.value.replace(/\D/g, '').slice(0, 6);
    target.value = sanitized;
    emit('update:modelValue', sanitized);
};

const focus = () => {
    if (props.disabled) return;
    inputRef.value?.focus();
};

watch(
    () => props.autofocus,
    async value => {
        if (!value) return;
        await nextTick();
        focus();
    },
    { immediate: true }
);

defineExpose({ focus });
</script>

<style scoped>
.pin-input {
    position: relative;
    display: grid;
    width: 100%;
    grid-template-columns: repeat(6, minmax(44px, 1fr));
    gap: 10px;
    align-items: stretch;
}

.pin-input.is-disabled {
    opacity: 0.6;
}

.pin-input__cell {
    min-width: 0;
    height: 52px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #0f172a;
}

.pin-input.is-dark .pin-input__cell {
    border-color: rgba(71, 85, 105, 0.8);
    background: rgba(15, 23, 42, 0.72);
    color: #f8fafc;
}

.pin-input__cell.is-filled {
    border-color: rgba(59, 130, 246, 0.4);
}

.pin-input.is-dark .pin-input__cell.is-filled {
    border-color: rgba(96, 165, 250, 0.72);
}

.pin-input__native {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}
</style>
