/**
 * 字段编辑器组件
 */

import React from 'react';
import { Input, InputNumber, DatePicker, Select, Checkbox, Button, TextArea } from '@douyinfe/semi-ui';
import { FieldType } from '@lark-base-open/js-sdk';
import { FieldEditorProps } from '../types';
import dayjs from 'dayjs';

export const FieldEditor: React.FC<FieldEditorProps> = ({
  type,
  value,
  onChange,
  onBlur,
  fieldMeta
}) => {
  // 判断文本是否为长文本（包含换行符或长度超过50个字符）
  const isLongText = (text: string | null | undefined): boolean => {
    if (!text) return false;
    const str = String(text);
    return str.includes('\n') || str.length > 50;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 对于 TextArea，Shift+Enter 换行，Enter 不做处理
    // 对于 Input，Enter 保存，Escape 退出
    if (e.key === 'Enter' && !e.shiftKey && type === FieldType.Text && !isLongText(value)) {
      // 短文本按 Enter 键时触发 onBlur（自动保存）
      e.preventDefault();
      onBlur?.();
    } else if (e.key === 'Escape') {
      // ESC 键退出编辑（不保存）
      e.preventDefault();
      onBlur?.();
    }
  };

  // 根据字段类型渲染不同的编辑器
  const renderEditor = () => {
    switch (type) {
      case FieldType.Text:
        // 根据内容长度和是否包含换行符决定使用 TextArea 还是 Input
        const shouldUseTextArea = isLongText(value);
        
        if (shouldUseTextArea) {
          return (
            <TextArea
              value={value || ''}
              onChange={(val) => onChange(val)}
              onKeyDown={handleKeyDown}
              onBlur={onBlur}
              autoFocus
              placeholder="输入文本..."
              autosize={{ minRows: 3, maxRows: 10 }}
              style={{ width: '100%' }}
            />
          );
        } else {
          return (
            <Input
              value={value || ''}
              onChange={(val) => onChange(val)}
              onKeyDown={handleKeyDown}
              onBlur={onBlur}
              autoFocus
              placeholder="输入文本..."
            />
          );
        }

      case FieldType.Number:
      case FieldType.Currency:
      case FieldType.Progress:
        return (
          <InputNumber
            value={value}
            onChange={(val) => onChange(val)}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
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
        // 默认情况也检查是否为长文本
        const defaultShouldUseTextArea = isLongText(value);
        
        if (defaultShouldUseTextArea) {
          return (
            <TextArea
              value={String(value || '')}
              onChange={(val) => onChange(val)}
              onKeyDown={handleKeyDown}
              onBlur={onBlur}
              autoFocus
              placeholder="输入内容..."
              autosize={{ minRows: 3, maxRows: 10 }}
              style={{ width: '100%' }}
            />
          );
        } else {
          return (
            <Input
              value={String(value || '')}
              onChange={(val) => onChange(val)}
              onKeyDown={handleKeyDown}
              onBlur={onBlur}
              autoFocus
              placeholder="输入内容..."
            />
          );
        }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {renderEditor()}
    </div>
  );
};

