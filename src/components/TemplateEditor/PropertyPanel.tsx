/**
 * 属性面板
 * 右侧编辑选中元素属性的面板
 */

import React, { useState } from 'react';
import { Input, InputNumber, Select, Switch, Button, Form, Tag } from '@douyinfe/semi-ui';
import { TemplateElement } from '../../types/template';
import { FieldSelector } from '../FieldSelector/FieldSelector';
import './TemplateEditor.css';

interface PropertyPanelProps {
  element: TemplateElement;
  fields: any[];
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onOpenTableEditor?: () => void;
  onOpenLoopFilter?: () => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  element,
  fields,
  onUpdate,
  onOpenTableEditor,
  onOpenLoopFilter
}) => {
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [fieldSelectorContext, setFieldSelectorContext] = useState<'field' | 'loop' | null>(null);

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      config: {
        ...element.config,
        [key]: value
      }
    });
  };

  const handlePositionChange = (key: 'x' | 'y', value: number) => {
    onUpdate({
      position: {
        ...element.position,
        [key]: value
      }
    });
  };

  const handleOpenFieldSelector = (context: 'field' | 'loop') => {
    setFieldSelectorContext(context);
    setShowFieldSelector(true);
  };

  const handleFieldSelect = (fieldId: string, fieldMeta: any) => {
    if (fieldSelectorContext === 'field') {
      handleConfigChange('fieldId', fieldId);
      handleConfigChange('fieldPath', fieldMeta.name);
    } else if (fieldSelectorContext === 'loop') {
      handleConfigChange('fieldId', fieldId);
      handleConfigChange('fieldName', fieldMeta.name);
    }
    setShowFieldSelector(false);
    setFieldSelectorContext(null);
  };

  // 渲染通用属性
  const renderCommonProperties = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>位置 X</label>
        <InputNumber
          value={element.position.x}
          onChange={(value) => handlePositionChange('x', Number(value))}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>位置 Y</label>
        <InputNumber
          value={element.position.y}
          onChange={(value) => handlePositionChange('y', Number(value))}
          style={{ width: '100%' }}
        />
      </div>
    </>
  );

  // 根据元素类型渲染不同的属性
  const renderTypeSpecificProperties = () => {
    switch (element.type) {
      case 'text':
        return (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>文本内容</label>
              <Input
                value={(element.config as any).content || ''}
                onChange={(value) => handleConfigChange('content', value)}
                type="textarea"
                rows={4}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>字号</label>
              <InputNumber
                value={(element.config as any).fontSize || 14}
                onChange={(value) => handleConfigChange('fontSize', value)}
                min={8}
                max={72}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>字体粗细</label>
              <Select
                value={(element.config as any).fontWeight || 'normal'}
                onChange={(value) => handleConfigChange('fontWeight', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="normal">正常</Select.Option>
                <Select.Option value="bold">粗体</Select.Option>
              </Select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>对齐方式</label>
              <Select
                value={(element.config as any).align || 'left'}
                onChange={(value) => handleConfigChange('align', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="left">左对齐</Select.Option>
                <Select.Option value="center">居中</Select.Option>
                <Select.Option value="right">右对齐</Select.Option>
              </Select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>颜色</label>
              <Input
                value={(element.config as any).color || '#000000'}
                onChange={(value) => handleConfigChange('color', value)}
                type="color"
                style={{ width: '100%' }}
              />
            </div>
          </>
        );

      case 'field':
        const selectedField = fields.find(f => f.id === (element.config as any).fieldId);
        return (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>选择字段</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  onClick={() => handleOpenFieldSelector('field')}
                  style={{ flex: 1 }}
                >
                  {selectedField ? selectedField.name : '点击选择字段'}
                </Button>
                {selectedField && (
                  <Tag color="blue">{getFieldTypeName(selectedField.type)}</Tag>
                )}
              </div>
              {selectedField && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  已选择: {selectedField.name}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>格式化（可选）</label>
              <Input
                value={(element.config as any).format || ''}
                onChange={(value) => handleConfigChange('format', value)}
                placeholder="如: YYYY-MM-DD"
              />
            </div>
          </>
        );

      case 'loop':
        const selectedLoopField = fields.find(f => f.id === (element.config as any).fieldId);
        return (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>关联字段（数据源）</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  onClick={() => handleOpenFieldSelector('loop')}
                  style={{ flex: 1 }}
                >
                  {selectedLoopField ? selectedLoopField.name : '点击选择关联字段'}
                </Button>
                {selectedLoopField && (
                  <Tag color="purple">{getFieldTypeName(selectedLoopField.type)}</Tag>
                )}
              </div>
              {selectedLoopField && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  已选择: {selectedLoopField.name}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>筛选条件</label>
              <Button
                onClick={onOpenLoopFilter}
                disabled={!selectedLoopField}
                style={{ width: '100%' }}
              >
                配置筛选条件
              </Button>
            </div>
          </>
        );

      case 'table':
        return (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>表格配置</label>
              <Button
                onClick={onOpenTableEditor}
                style={{ width: '100%' }}
              >
                配置表格列
              </Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="property-panel">
      <div className="property-panel-header">
        <h3>属性设置</h3>
      </div>
      <div className="property-panel-content">
        {renderCommonProperties()}
        {renderTypeSpecificProperties()}
      </div>

      {/* 字段选择器弹窗 */}
      <FieldSelector
        visible={showFieldSelector}
        fields={fields}
        selectedFieldId={
          fieldSelectorContext === 'field' 
            ? (element.config as any).fieldId 
            : fieldSelectorContext === 'loop'
            ? (element.config as any).fieldId
            : undefined
        }
        onSelect={handleFieldSelect}
        onCancel={() => {
          setShowFieldSelector(false);
          setFieldSelectorContext(null);
        }}
        title={fieldSelectorContext === 'field' ? '选择字段' : '选择关联字段'}
        filterTypes={fieldSelectorContext === 'loop' ? [18, 20] : undefined}
      />
    </div>
  );
};


