/**
 * 字段选择器组件
 * 通用的字段选择弹窗，支持搜索和按类型筛选
 */

import React, { useState, useMemo } from 'react';
import { Modal, Select, Input, Tag } from '@douyinfe/semi-ui';
import { IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import './FieldSelector.css';

interface FieldSelectorProps {
  visible: boolean;
  fields: IFieldMeta[];
  selectedFieldId?: string;
  onSelect: (fieldId: string, fieldMeta: IFieldMeta) => void;
  onCancel: () => void;
  title?: string;
  filterTypes?: FieldType[]; // 可选：只显示特定类型的字段
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  visible,
  fields,
  selectedFieldId,
  onSelect,
  onCancel,
  title = '选择字段',
  filterTypes
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<FieldType | 'all'>('all');
  const [tempSelectedFieldId, setTempSelectedFieldId] = useState<string | undefined>(selectedFieldId);

  // 字段类型名称映射
  const getFieldTypeName = (type: FieldType): string => {
    const typeNames: Record<number, string> = {
      1: '文本',
      2: '数字',
      3: '单选',
      4: '多选',
      5: '日期',
      7: '复选框',
      11: '人员',
      13: '电话',
      15: '超链接',
      17: '附件',
      18: '关联',
      19: '公式',
      20: '双向关联',
      21: '地理位置',
      22: '群组',
      23: '创建时间',
      1001: '创建人',
      1002: '修改时间',
      1003: '修改人'
    };
    return typeNames[type] || `类型${type}`;
  };

  // 字段类型颜色
  const getFieldTypeColor = (type: FieldType): 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'pink' | 'red' | 'yellow' | 'violet' | 'grey' => {
    const colorMap: Record<number, 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'pink' | 'red' | 'yellow' | 'violet' | 'grey'> = {
      1: 'blue',
      2: 'green',
      3: 'orange',
      4: 'purple',
      5: 'cyan',
      7: 'pink',
      11: 'red',
      17: 'yellow',
      18: 'violet'
    };
    return colorMap[type] || 'grey';
  };

  // 过滤后的字段列表
  const filteredFields = useMemo(() => {
    let result = fields;

    // 按类型筛选
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter(f => filterTypes.includes(f.type));
    }

    // 按选中类型筛选
    if (selectedType !== 'all') {
      result = result.filter(f => f.type === selectedType);
    }

    // 按搜索文本筛选
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(lowerSearch) ||
        getFieldTypeName(f.type).toLowerCase().includes(lowerSearch)
      );
    }

    return result;
  }, [fields, filterTypes, selectedType, searchText]);

  // 获取所有可用的字段类型
  const availableTypes = useMemo(() => {
    const types = new Set<FieldType>();
    const fieldsToCheck = filterTypes && filterTypes.length > 0 
      ? fields.filter(f => filterTypes.includes(f.type))
      : fields;
    
    fieldsToCheck.forEach(f => types.add(f.type));
    return Array.from(types).sort((a, b) => a - b);
  }, [fields, filterTypes]);

  const handleConfirm = () => {
    if (tempSelectedFieldId) {
      const field = fields.find(f => f.id === tempSelectedFieldId);
      if (field) {
        onSelect(tempSelectedFieldId, field);
      }
    }
  };

  const handleCancel = () => {
    setTempSelectedFieldId(selectedFieldId);
    setSearchText('');
    setSelectedType('all');
    onCancel();
  };

  return (
    <Modal
      title={title}
      visible={visible}
      onOk={handleConfirm}
      onCancel={handleCancel}
      width={700}
      okButtonProps={{ disabled: !tempSelectedFieldId }}
    >
      <div className="field-selector">
        {/* 搜索框 */}
        <div className="field-selector-search">
          <Input
            placeholder="搜索字段名称或类型..."
            value={searchText}
            onChange={setSearchText}
            showClear
          />
        </div>

        {/* 类型筛选 */}
        <div className="field-selector-filter">
          <span className="filter-label">字段类型：</span>
          <Select
            value={selectedType}
            onChange={(value) => setSelectedType(value as FieldType | 'all')}
            style={{ width: 200 }}
          >
            <Select.Option value="all">全部类型</Select.Option>
            {availableTypes.map(type => (
              <Select.Option key={type} value={type}>
                {getFieldTypeName(type)}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* 字段列表 */}
        <div className="field-selector-list">
          {filteredFields.length === 0 ? (
            <div className="field-selector-empty">
              没有找到匹配的字段
            </div>
          ) : (
            filteredFields.map(field => (
              <div
                key={field.id}
                className={`field-selector-item ${tempSelectedFieldId === field.id ? 'selected' : ''}`}
                onClick={() => setTempSelectedFieldId(field.id)}
              >
                <div className="field-item-content">
                  <span className="field-item-name">{field.name}</span>
                  <Tag color={getFieldTypeColor(field.type)} size="small">
                    {getFieldTypeName(field.type)}
                  </Tag>
                </div>
                {tempSelectedFieldId === field.id && (
                  <div className="field-item-check">✓</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 统计信息 */}
        <div className="field-selector-footer">
          <span className="footer-text">
            共 {filteredFields.length} 个字段
            {searchText && ` · 搜索"${searchText}"`}
            {selectedType !== 'all' && ` · ${getFieldTypeName(selectedType as FieldType)}`}
          </span>
        </div>
      </div>
    </Modal>
  );
};

