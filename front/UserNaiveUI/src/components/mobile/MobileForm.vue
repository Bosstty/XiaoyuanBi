<template>
    <div class="mobile-form">
        <NForm
            ref="formRef"
            :model="formModel"
            :rules="formRules"
            :label-placement="labelPlacement"
            :label-width="labelWidth"
            :show-require-mark="showRequireMark"
            :disabled="disabled"
            @submit="handleSubmit"
        >
            <div
                v-for="field in fields"
                :key="field.key"
                class="form-field"
                :class="{
                    'field-group': field.type === 'group',
                    'field-section': field.type === 'section',
                }"
            >
                <!-- 分组标题 -->
                <div v-if="field.type === 'section'" class="section-header">
                    <h3 class="section-title">{{ field.title }}</h3>
                    <p v-if="field.description" class="section-description">
                        {{ field.description }}
                    </p>
                </div>

                <!-- 分组容器 -->
                <MobileCard
                    v-else-if="field.type === 'group'"
                    :padding="'0'"
                    :shadow="'small'"
                    class="field-group-card"
                >
                    <div
                        v-for="(groupField, groupIndex) in field.fields || []"
                        :key="groupField.key"
                        class="group-field"
                        :class="{ 'has-divider': groupIndex < (field.fields?.length ?? 0) - 1 }"
                    >
                        <component
                            :is="getFieldComponent(groupField)"
                            v-bind="getFieldProps(groupField)"
                            :value="getModelValue(groupField.key)"
                            @update:value="handleFieldChange(groupField, $event as FormFieldValue)"
                        />
                    </div>
                </MobileCard>

                <!-- 普通表单项 -->
                <NFormItem
                    v-else
                    :path="field.key"
                    :label="field.label"
                    :rule="field.rule"
                    :show-require-mark="field.required"
                    class="mobile-form-item"
                >
                    <component
                        :is="getFieldComponent(field)"
                        v-bind="getFieldProps(field)"
                        :value="getModelValue(field.key)"
                        @update:value="handleFieldChange(field, $event as FormFieldValue)"
                    />
                </NFormItem>
            </div>

            <!-- 表单按钮 -->
            <div v-if="showButtons" class="form-buttons">
                <NButton
                    v-if="showResetButton"
                    :size="buttonSize"
                    :disabled="disabled || loading"
                    @click="handleReset"
                >
                    {{ resetButtonText }}
                </NButton>

                <NButton
                    :type="submitButtonType"
                    :size="buttonSize"
                    :loading="loading"
                    :disabled="disabled"
                    attr-type="submit"
                    class="submit-button"
                >
                    {{ submitButtonText }}
                </NButton>
            </div>
        </NForm>
    </div>
</template>

<script setup lang="ts">
import { h, ref, reactive, computed, watch } from 'vue';
import {
    NForm,
    NFormItem,
    NInput,
    NInputNumber,
    NSelect,
    NSwitch,
    NDatePicker,
    NTimePicker,
    NRadioGroup,
    NRadio,
    NCheckboxGroup,
    NCheckbox,
    NSlider,
    NRate,
    NButton,
} from 'naive-ui';
import type { FormInst, FormValidationError, FormItemRule, FormRules } from 'naive-ui';
import MobileCard from './MobileCard.vue';
import { useAppStore } from '@/stores';
import type { FormField, FormFieldValue } from './types';

interface Props {
    fields: FormField[];
    modelValue?: Record<string, FormFieldValue>;
    labelPlacement?: 'left' | 'top';
    labelWidth?: string | number;
    showRequireMark?: boolean;
    showButtons?: boolean;
    showResetButton?: boolean;
    submitButtonText?: string;
    resetButtonText?: string;
    submitButtonType?: 'primary' | 'success' | 'warning' | 'error' | 'default';
    buttonSize?: 'tiny' | 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    fields: () => [],
    modelValue: () => ({}),
    labelPlacement: 'top',
    labelWidth: 'auto',
    showRequireMark: false,
    showButtons: true,
    showResetButton: false,
    submitButtonText: '提交',
    resetButtonText: '重置',
    submitButtonType: 'primary',
    buttonSize: 'large',
    disabled: false,
    loading: false,
});

const emit = defineEmits<{
    'update:modelValue': [value: Record<string, FormFieldValue>];
    submit: [value: Record<string, FormFieldValue>];
    reset: [];
    fieldChange: [field: FormField, value: FormFieldValue];
    validate: [errors: Array<FormValidationError> | undefined];
}>();

const appStore = useAppStore();
const formRef = ref<FormInst>();

// 表单数据模型
const formModel = reactive<Record<string, FormFieldValue>>({});

// 表单验证规则
const formRules = computed<FormRules>(() => {
    const rules: FormRules = {};

    const processFields = (fields: FormField[]) => {
        fields.forEach(field => {
            if (field.type === 'group' && field.fields) {
                processFields(field.fields);
            } else if (field.type !== 'section') {
                const fieldRules: FormItemRule[] = [];

                if (field.required) {
                    fieldRules.push({
                        required: true,
                        message: `请${field.type === 'select' ? '选择' : '输入'}${field.label}`,
                        trigger: field.type === 'select' ? 'change' : 'blur',
                    });
                }

                if (field.rule) {
                    if (Array.isArray(field.rule)) {
                        fieldRules.push(...field.rule);
                    } else {
                        fieldRules.push(field.rule);
                    }
                }

                if (field.validator) {
                    fieldRules.push({
                        validator: (_rule: FormItemRule, value: FormFieldValue) => {
                            const result = field.validator!(value);
                            if (typeof result === 'string') {
                                return new Error(result);
                            }
                            return result;
                        },
                        trigger: 'blur',
                    });
                }

                if (fieldRules.length > 0) {
                    rules[field.key] = fieldRules;
                }
            }
        });
    };

    processFields(props.fields);
    return rules;
});

// 初始化表单数据
const initFormModel = () => {
    const processFields = (fields: FormField[]) => {
        fields.forEach(field => {
            if (field.type === 'group' && field.fields) {
                processFields(field.fields);
            } else if (field.type !== 'section') {
                if (props.modelValue[field.key] !== undefined) {
                    formModel[field.key] = props.modelValue[field.key];
                } else if (field.defaultValue !== undefined) {
                    formModel[field.key] = field.defaultValue;
                } else {
                    // 设置默认值
                    switch (field.type) {
                        case 'input':
                        case 'textarea':
                            formModel[field.key] = '';
                            break;
                        case 'number':
                            formModel[field.key] = 0;
                            break;
                        case 'switch':
                            formModel[field.key] = false;
                            break;
                        case 'checkbox':
                            formModel[field.key] = [];
                            break;
                        case 'rate':
                            formModel[field.key] = 0;
                            break;
                        case 'slider':
                            formModel[field.key] = 0;
                            break;
                        default:
                            formModel[field.key] = null;
                    }
                }
            }
        });
    };

    processFields(props.fields);
};

// 获取字段组件
const getFieldComponent = (field: FormField) => {
    switch (field.type) {
        case 'number':
            return NInputNumber;
        case 'select':
            return NSelect;
        case 'switch':
            return NSwitch;
        case 'date':
            return NDatePicker;
        case 'time':
            return NTimePicker;
        case 'radio':
            return NRadioGroup;
        case 'checkbox':
            return NCheckboxGroup;
        case 'slider':
            return NSlider;
        case 'rate':
            return NRate;
        case 'input':
        case 'textarea':
        case 'section':
        case 'group':
        default:
            return NInput;
    }
};

// 获取字段属性
const getFieldProps = (field: FormField): Record<string, any> => {
    const baseProps: Record<string, any> = {
        placeholder:
            field.placeholder || `请${field.type === 'select' ? '选择' : '输入'}${field.label}`,
        disabled: field.disabled || props.disabled,
        size: 'large',
        ...field.props,
    };

    // 特殊字段属性
    switch (field.type) {
        case 'textarea':
            return {
                ...baseProps,
                type: 'textarea',
                rows: 4,
                autosize: { minRows: 2, maxRows: 6 },
            };

        case 'select':
            return {
                ...baseProps,
                options: field.options || [],
                clearable: true,
            };

        case 'radio':
            return {
                ...baseProps,
                children: () =>
                    field.options?.map(option =>
                        h(
                            NRadio,
                            {
                                value: option.value,
                                disabled: option.disabled,
                            },
                            () => option.label
                        )
                    ),
            };

        case 'checkbox':
            return {
                ...baseProps,
                children: () =>
                    field.options?.map(option =>
                        h(
                            NCheckbox,
                            {
                                value: option.value,
                                disabled: option.disabled,
                            },
                            () => option.label
                        )
                    ),
            };

        case 'date':
            return {
                ...baseProps,
                type: 'date',
                clearable: true,
                format: 'yyyy-MM-dd',
            };

        case 'time':
            return {
                ...baseProps,
                clearable: true,
                format: 'HH:mm',
            };

        default:
            return baseProps;
    }
};

const getModelValue = (key: string) => {
    return formModel[key] as any;
};

// 字段值变化处理
const handleFieldChange = (field: FormField, value: FormFieldValue) => {
    formModel[field.key] = value;
    emit('update:modelValue', { ...formModel });
    emit('fieldChange', field, value);
};

// 表单提交
const handleSubmit = async (e: Event) => {
    e.preventDefault();

    try {
        await formRef.value?.validate();
        appStore.hapticFeedback('light');
        emit('submit', { ...formModel });
    } catch (errors) {
        appStore.hapticFeedback('medium');
        emit('validate', errors as Array<FormValidationError>);
    }
};

// 表单重置
const handleReset = () => {
    formRef.value?.restoreValidation();
    initFormModel();
    emit('update:modelValue', { ...formModel });
    emit('reset');
};

// 验证方法
const validate = async () => {
    try {
        await formRef.value?.validate();
        return true;
    } catch (errors) {
        return false;
    }
};

// 获取验证错误
const getValidationErrors = async () => {
    try {
        await formRef.value?.validate();
        return null;
    } catch (errors) {
        return errors as Array<FormValidationError>;
    }
};

// 监听外部 modelValue 变化
watch(
    () => props.modelValue,
    newValue => {
        Object.keys(newValue).forEach(key => {
            if (formModel[key] !== newValue[key]) {
                formModel[key] = newValue[key];
            }
        });
    },
    { deep: true }
);

// 初始化
initFormModel();

// 暴露方法
defineExpose({
    validate,
    getValidationErrors,
    reset: handleReset,
    formRef,
});
</script>

<style scoped>
.mobile-form {
    width: 100%;
}

.form-field {
    margin-bottom: 16px;
}

.form-field:last-child {
    margin-bottom: 0;
}

/* 分组样式 */
.field-section {
    margin-bottom: 24px;
}

.section-header {
    margin-bottom: 12px;
    padding: 0 4px;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
    line-height: 1.4;
}

.section-description {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0;
    line-height: 1.4;
}

.field-group-card {
    overflow: hidden;
}

.group-field {
    padding: 16px;
    position: relative;
}

.group-field.has-divider::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 16px;
    right: 16px;
    height: 0.5px;
    background: var(--n-border-color);
}

/* 表单项样式重写 */
.mobile-form :deep(.n-form-item-label) {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    padding-bottom: 8px;
}

.mobile-form :deep(.n-form-item-feedback-wrapper) {
    margin-top: 6px;
}

.mobile-form :deep(.n-form-item-feedback) {
    font-size: 13px;
    color: var(--n-error-color);
}

/* 输入组件样式重写 */
.mobile-form :deep(.n-input) {
    border-radius: 12px;
    font-size: 16px;
}

.mobile-form :deep(.n-input__input-el) {
    font-size: 16px;
}

.mobile-form :deep(.n-input-number) {
    border-radius: 12px;
}

.mobile-form :deep(.n-select) {
    border-radius: 12px;
}

.mobile-form :deep(.n-date-picker) {
    border-radius: 12px;
}

.mobile-form :deep(.n-time-picker) {
    border-radius: 12px;
}

/* 按钮区域 */
.form-buttons {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    padding: 0 4px;
}

.form-buttons .n-button {
    flex: 1;
    height: 50px;
    border-radius: 12px;
    font-size: 17px;
    font-weight: 600;
}

.submit-button {
    order: 2;
}

/* 移动端适配 */
@media (max-width: 375px) {
    .form-field {
        margin-bottom: 12px;
    }

    .section-title {
        font-size: 16px;
    }

    .group-field {
        padding: 12px;
    }

    .mobile-form :deep(.n-form-item-label) {
        font-size: 15px;
    }

    .form-buttons .n-button {
        height: 46px;
        font-size: 16px;
    }
}

/* 深色模式适配 */
.dark-theme .section-header {
    border-color: rgba(56, 56, 58, 1);
}

.light-theme .section-header {
    border-color: rgba(198, 198, 200, 1);
}
</style>
