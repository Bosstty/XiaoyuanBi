import type { FormItemRule } from 'naive-ui';

export type FormOptionValue = string | number;
export type FormFieldValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | FormOptionValue[]
    | [number, number]
    | number[]
    | [string, string];

export interface ListAction {
    key: string;
    label: string;
    type?: 'primary' | 'success' | 'warning' | 'error' | 'default';
    size?: 'tiny' | 'small' | 'medium' | 'large';
    disabled?: boolean;
    handler?: (action: ListAction, item: ListItem, index: number) => void;
}

export interface ListItem {
    id?: string | number;
    title: string;
    description?: string;
    titleLarge?: boolean;
    icon?: unknown;
    iconSize?: number;
    iconColor?: string;
    iconClass?: string;
    extra?: string;
    showArrow?: boolean;
    clickable?: boolean;
    disabled?: boolean;
    actions?: ListAction[];
    [key: string]: unknown;
}

export interface FormField {
    key: string;
    type:
        | 'input'
        | 'number'
        | 'select'
        | 'switch'
        | 'date'
        | 'time'
        | 'radio'
        | 'checkbox'
        | 'slider'
        | 'rate'
        | 'textarea'
        | 'section'
        | 'group';
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    rule?: FormItemRule | FormItemRule[];
    options?: Array<{ label: string; value: FormOptionValue; disabled?: boolean }>;
    fields?: FormField[];
    title?: string;
    description?: string;
    defaultValue?: FormFieldValue;
    props?: Record<string, any>;
    validator?: (value: FormFieldValue) => boolean | string;
}
