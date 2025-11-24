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
  const [fieldPath, setFieldPath] = useState(filter?.fieldPath || '');
  const [operator, setOperator] = useState<FilterCondition['operator']>(
    filter?.operator || 'equals'
  );
  const [value, setValue] = useState(filter?.value || '');

  useEffect(() => {
    if (filter) {
      setFieldPath(filter.fieldPath);
      setOperator(filter.operator);
      setValue(filter.value);
    } else {
      setFieldPath('');
      setOperator('equals');
      setValue('');
    }
  }, [filter, visible]);

  const handleConfirm = () => {
    if (!fieldPath) {
      return;
    }

    onConfirm({
      fieldPath,
      operator,
      value
    });
  };

  // 构建字段树（支持关联字段）
  const buildFieldTree = (fields: IFieldMeta[]): Array<{ label: string; value: string; type: number }> => {
    const result: Array<{ label: string; value: string; type: number }> = [];
    
    fields.forEach(field => {
      // 添加当前字段
      result.push({
        label: field.name,
        value: field.name,
        type: field.type
      });

      // 如果是关联字段，可以添加关联表的字段（这里简化处理）
      if (field.type === 18 || field.type === 21) { // SingleLink or DuplexLink
        // 关联字段的嵌套字段可以通过 fieldPath 格式访问
        // 例如: "关联字段.嵌套字段"
        // 这里暂时不展开，用户可以直接输入路径
      }
    });

    return result;
  };

  const fieldOptions = buildFieldTree(fields);

  return (
    <Modal
      title="循环区域数据筛选"
      visible={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      width={600}
      okButtonProps={{ disabled: !fieldPath }}
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
            label="字段"
            value={fieldPath}
            onChange={setFieldPath}
            placeholder="选择字段"
            filter
            showSearch
            style={{ width: '100%' }}
          >
            {fieldOptions.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label} ({getFieldTypeName(option.type)})
              </Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            label="操作符"
            value={operator}
            onChange={(val) => setOperator(val as FilterCondition['operator'])}
            style={{ width: '100%' }}
          >
            <Select.Option value="equals">等于</Select.Option>
            <Select.Option value="notEquals">不等于</Select.Option>
            <Select.Option value="contains">包含</Select.Option>
            <Select.Option value="notContains">不包含</Select.Option>
          </Form.Select>

          <Form.Input
            label="值"
            value={value}
            onChange={setValue}
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

