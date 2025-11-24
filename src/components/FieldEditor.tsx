/**
 * 字段编辑器组件
 */

import React from 'react';
import { Input, InputNumber, DatePicker, Select, Checkbox, Button } from '@douyinfe/semi-ui';
import { FieldType } from '@lark-base-open/js-sdk';
import { FieldEditorProps } from '../types';
import dayjs from 'dayjs';

export const FieldEditor: React.FC<FieldEditorProps> = ({
  type,
  value,
  onChange,
  onSave,
  onCancel,
  fieldMeta
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // 根据字段类型渲染不同的编辑器
  const renderEditor = () => {
    switch (type) {
      case FieldType.Text:
        return (
          <Input
            value={value || ''}
            onChange={(val) => onChange(val)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="输入文本..."
          />
        );

      case FieldType.Number:
      case FieldType.Currency:
      case FieldType.Progress:
        return (
          <InputNumber
            value={value}
            onChange={(val) => onChange(val)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ width: '100%' }}
          />
        );

      case FieldType.DateTime:
        return (
          <DatePicker
            value={value ? dayjs(value).toDate() : undefined}
            onChange={(date) => {
              if (date && typeof date !== 'string' && !Array.isArray(date)) {
                onChange((date as Date).getTime());
              } else {
                onChange(null);
              }
            }}
            type="dateTime"
            autoFocus
            style={{ width: '100%' }}
          />
        );

      case FieldType.SingleSelect:
        const singleOptions = (fieldMeta?.property as any)?.options || [];
        return (
          <Select
            value={value?.id || value}
            onChange={(val) => {
              const option = singleOptions.find((opt: any) => opt.id === val);
              onChange(option || val);
            }}
            autoFocus
            style={{ width: '100%' }}
          >
            {singleOptions.map((opt: any) => (
              <Select.Option key={opt.id} value={opt.id}>
                {opt.name || opt.text}
              </Select.Option>
            ))}
          </Select>
        );

      case FieldType.MultiSelect:
        const multiOptions = (fieldMeta?.property as any)?.options || [];
        return (
          <Select
            multiple
            value={Array.isArray(value) ? value.map((v: any) => v.id || v) : []}
            onChange={(vals) => {
              const valArray = Array.isArray(vals) ? vals : [vals];
              const selected = valArray.map(val => 
                multiOptions.find((opt: any) => opt.id === val) || val
              );
              onChange(selected);
            }}
            autoFocus
            style={{ width: '100%' }}
          >
            {multiOptions.map((opt: any) => (
              <Select.Option key={opt.id} value={opt.id}>
                {opt.name || opt.text}
              </Select.Option>
            ))}
          </Select>
        );

      case FieldType.Checkbox:
        return (
          <Checkbox
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            autoFocus
          >
            {value ? '已选中' : '未选中'}
          </Checkbox>
        );

      default:
        return (
          <Input
            value={String(value || '')}
            onChange={(val) => onChange(val)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="输入内容..."
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {renderEditor()}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button size="small" onClick={onCancel}>
          取消
        </Button>
        <Button size="small" type="primary" onClick={onSave}>
          保存
        </Button>
      </div>
    </div>
  );
};

