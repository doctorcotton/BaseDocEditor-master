/**
 * 循环区域筛选条件配置对话框
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Button } from '@douyinfe/semi-ui';
import { IFieldMeta } from '@lark-base-open/js-sdk';
import { FilterCondition } from '../../types/template';
import './LoopAreaFilter.css';

interface LoopAreaFilterProps {
  visible: boolean;
  fields: IFieldMeta[];
  filter?: FilterCondition;
  onConfirm: (filter: FilterCondition) => void;
  onCancel: () => void;
}

export const LoopAreaFilter: React.FC<LoopAreaFilterProps> = ({
  visible,
  fields,
  filter,
  onConfirm,
  onCancel
}) => {
  // 优先使用 fieldId，如果没有则从 fieldPath 查找对应的 fieldId（兼容旧数据）
  const getInitialFieldId = () => {
    if (filter?.fieldId) {
      return filter.fieldId;
    }
    if (filter?.fieldPath) {
      const field = fields.find(f => f.name === filter.fieldPath);
      return field?.id || '';
    }
    return '';
  };

  const [fieldId, setFieldId] = useState(getInitialFieldId());
  const [operator, setOperator] = useState<FilterCondition['operator']>(
    filter?.operator || 'equals'
  );
  const [value, setValue] = useState(filter?.value || '');

  useEffect(() => {
    if (filter) {
      const id = filter.fieldId || (filter.fieldPath ? fields.find(f => f.name === filter.fieldPath)?.id : '') || '';
      setFieldId(id);
      setOperator(filter.operator);
      setValue(filter.value);
    } else {
      setFieldId('');
      setOperator('equals');
      setValue('');
    }
  }, [filter, visible, fields]);

  const handleConfirm = () => {
    if (!fieldId) {
      return;
    }

    onConfirm({
      fieldId,
      operator,
      value
    });
  };

  // 构建字段选项（使用 fieldId）
  const fieldOptions = fields.map(field => ({
    label: `${field.name} (${getFieldTypeName(field.type)})`,
    value: field.id,
        type: field.type
  }));

  return (
    <Modal
      title="循环区域数据筛选"
      visible={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      width={600}
      okButtonProps={{ disabled: !fieldId }}
    >
      <div className="loop-area-filter">
        <div className="filter-description">
          <p>设置循环字段的筛选条件</p>
          <p className="filter-hint">
            符合以下条件的数据行将显示在此循环区域中
          </p>
        </div>

        <Form className="filter-form">
          <Form.Select
            field="fieldId"
            label="字段"
            initValue={fieldId}
            onChange={(val) => setFieldId(val as string)}
            placeholder="选择字段"
            filter
            style={{ width: '100%' }}
          >
            {fieldOptions.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="operator"
            label="操作符"
            initValue={operator}
            onChange={(val) => setOperator(val as FilterCondition['operator'])}
            style={{ width: '100%' }}
          >
            <Select.Option value="equals">等于</Select.Option>
            <Select.Option value="notEquals">不等于</Select.Option>
            <Select.Option value="contains">包含</Select.Option>
            <Select.Option value="notContains">不包含</Select.Option>
          </Form.Select>

          <Form.Input
            field="value"
            label="值"
            initValue={value}
            onChange={(val) => setValue(val as string)}
            placeholder="输入筛选值"
          />
        </Form>
      </div>
    </Modal>
  );
};

/**
 * 获取字段类型名称
 */
function getFieldTypeName(type: number): string {
  const typeNames: Record<number, string> = {
    1: '文本',
    2: '数字',
    3: '单选',
    4: '多选',
    5: '日期',
    7: '复选框',
    11: '人员',
    13: '电话',
    15: 'URL',
    17: '附件',
    18: '单项关联',
    21: '双向关联'
  };
  return typeNames[type] || '未知';
}

