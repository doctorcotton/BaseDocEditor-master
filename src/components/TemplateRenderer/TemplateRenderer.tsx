/**
 * 模板渲染器
 * 根据模板渲染文档（流式布局）
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { Template, TemplateElement } from '../../types/template';
import { IRecord, IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import { LoopAreaRenderer } from './LoopAreaRenderer';
import { TableRenderer } from './TableRenderer';
import { formatFieldValue, isFieldEditable } from '../../utils/fieldFormatter';
import { FieldEditor } from '../FieldEditor';
import './TemplateRenderer.css';

interface TemplateRendererProps {
  template: Template;
  record: IRecord;
  fields: IFieldMeta[];
  table: any; // ITable
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
  onFieldChange?: (fieldId: string, newValue: any, oldValue: any) => void;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  record,
  fields,
  table,
  onComment,
  commentStats,
  onFieldChange
}) => {
  // 异步加载字段值（用于字段元素）
  const [fieldValues, setFieldValues] = useState<Map<string, any>>(new Map());
  // 正在编辑的字段ID
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  // 编辑中的值
  const [editingValue, setEditingValue] = useState<any>(null);
  // 编辑开始时的初始显示文本（用于比较是否有变化）
  const [initialEditingText, setInitialEditingText] = useState<string>('');
  // 编辑区域的引用
  const editingFieldRef = useRef<HTMLDivElement | null>(null);

  // 异步加载字段值
  useEffect(() => {
    if (!table || !record) {
      return;
    }

    const loadFieldValues = async () => {
      const valueMap = new Map<string, any>();
      
      // 收集所有需要加载的字段ID（从字段元素中）
      const fieldIdsToLoad = new Set<string>();
      template.elements.forEach((element: TemplateElement) => {
        if (element.type === 'field') {
          const config = element.config as any;
          if (config.fieldId) {
            fieldIdsToLoad.add(config.fieldId);
          }
        }
      });

      // 批量加载字段值
      try {
        for (const fieldId of fieldIdsToLoad) {
          try {
            // 先从 record.fields 读取，如果没有则使用 getCellValue
            let value = record.fields?.[fieldId];
            if (value === undefined && table) {
              value = await table.getCellValue(fieldId, record.recordId);
            }
            valueMap.set(fieldId, value);
          } catch (error) {
            console.error(`[TemplateRenderer] 加载字段值失败: ${fieldId}`, error);
            valueMap.set(fieldId, null);
          }
        }
      } catch (error) {
        console.error('[TemplateRenderer] 批量加载字段值失败:', error);
      }
      
      setFieldValues(valueMap);
    };

    loadFieldValues();
  }, [table, record?.recordId, template.elements]);

  // 自动保存并退出编辑
  const handleSaveAndExit = useCallback(() => {
    if (editingFieldId && onFieldChange && editingValue !== null) {
      const field = fields.find(f => f.id === editingFieldId);
      if (field) {
        // 获取旧值（用于回调）
        const oldValue = fieldValues.get(editingFieldId);
        const finalOldValue = oldValue !== undefined ? oldValue : record.fields[editingFieldId];
        const newValue = editingValue;
        
        // 比较显示文本，只有真正改变时才调用变更回调
        // 注意：editingValue 是字符串，initialEditingText 也是字符串，直接比较
        const hasChanged = String(newValue || '').trim() !== String(initialEditingText || '').trim();
        
        if (hasChanged) {
          console.log('[TemplateRenderer] 字段值已改变，触发更新', { 
            fieldId: editingFieldId, 
            initialText: initialEditingText,
            newValue 
          });
          // 调用变更回调
          onFieldChange(editingFieldId, newValue, finalOldValue);
          
          // 更新本地值
          setFieldValues(prev => {
            const next = new Map(prev);
            next.set(editingFieldId, newValue);
            return next;
          });
        } else {
          console.log('[TemplateRenderer] 字段值未改变，跳过更新', { 
            fieldId: editingFieldId, 
            value: newValue 
          });
        }
      }
    }
    setEditingFieldId(null);
    setEditingValue(null);
    setInitialEditingText('');
  }, [editingFieldId, editingValue, initialEditingText, onFieldChange, fields, record, fieldValues]);

  // 处理点击外部区域退出编辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingFieldId && editingFieldRef.current && !editingFieldRef.current.contains(event.target as Node)) {
        // 点击外部区域，自动保存并退出编辑
        handleSaveAndExit();
      }
    };

    if (editingFieldId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingFieldId, handleSaveAndExit]);

  // 渲染单个元素
  const renderElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    switch (element.type) {
      case 'text':
        return renderTextElement(element, context);
      case 'field':
        return renderFieldElement(element, context);
      case 'loop':
        return renderLoopElement(element, context);
      case 'table':
        return renderTableElement(element, context);
      case 'image':
        return renderImageElement(element, context);
      case 'link':
        return renderLinkElement(element, context);
      default:
        return null;
    }
  };

  // 渲染文本元素
  const renderTextElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const style: React.CSSProperties = {
      fontSize: config.fontSize || 14,
      fontWeight: config.fontWeight || 'normal',
      color: config.color || '#000000',
      textAlign: config.align || 'left'
    };

    return (
      <div
        key={element.id}
        className="template-element template-text"
        style={style}
      >
        {config.content || ''}
      </div>
    );
  };

  // 渲染字段元素
  const renderFieldElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const fieldId = config.fieldId;
    
    // 只使用 fieldId 查找字段
    if (!fieldId) {
      return (
        <div key={element.id} className="template-element template-field">
          <span className="field-empty">未选择字段</span>
        </div>
      );
    }

    const field = context.fields.find(f => f.id === fieldId);
    if (!field) {
      return (
        <div key={element.id} className="template-element template-field">
          <span className="field-empty">字段未找到: {fieldId}</span>
        </div>
      );
    }
    
    const fieldResult = {
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.type,
      fieldMeta: field,
      isLinked: false
    };

    // 获取字段值：优先使用异步加载的值，如果没有则使用 record.fields
    let value = fieldValues.get(fieldResult.fieldId);
    if (value === undefined) {
      value = context.record.fields[fieldResult.fieldId];
    }
    const displayValue = formatFieldValue(value, fieldResult.fieldType);

    // 获取评论统计
    const stats = commentStats?.get(`${context.record.recordId}:${fieldResult.fieldId}`);
    const hasComments = stats && stats.total > 0;

    // 判断是否可编辑
    const editable = isFieldEditable(fieldResult.fieldType);
    const isEditing = editingFieldId === fieldResult.fieldId;
    const currentEditingValue = isEditing ? editingValue : value;

    // 处理开始编辑（双击）
    const handleStartEdit = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      console.log('[TemplateRenderer] 双击编辑触发', { 
        fieldId: fieldResult.fieldId, 
        fieldName: fieldResult.fieldName,
        editable, 
        hasOnFieldChange: !!onFieldChange,
        value,
        displayValue
      });
      if (editable && onFieldChange) {
        console.log('[TemplateRenderer] 进入编辑模式', { fieldId: fieldResult.fieldId, displayValue });
        setEditingFieldId(fieldResult.fieldId);
        setEditingValue(displayValue); // 使用格式化后的显示值作为编辑初始值
        setInitialEditingText(displayValue || ''); // 保存初始显示文本用于比较
      } else {
        console.warn('[TemplateRenderer] 无法进入编辑模式', { editable, hasOnFieldChange: !!onFieldChange });
      }
    };

    // 处理值变化
    const handleValueChange = (newValue: any) => {
      setEditingValue(newValue);
    };

    // 如果是标题元素（id为'title'），使用特殊样式，拼接"原料品质标准"
    const isTitle = element.id === 'title';
    
    if (isTitle) {
      const titleText = displayValue ? `${displayValue} 原料品质标准` : '未命名记录 原料品质标准';
      return (
        <div
          key={element.id}
          className="template-element template-field template-title"
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 20
          }}
        >
          {titleText}
        </div>
      );
    }

    // 特殊处理：致敏物质信息字段为空时显示"无"，且不显示字段名称标签
    const isEmptyValue = !displayValue || displayValue.trim() === '';
    const emptyDisplayText = fieldResult.fieldId === 'fldNL9B304' ? '无' : '空';
    const isAllergenField = fieldResult.fieldId === 'fldNL9B304'; // 致敏物质信息字段不显示标签

    return (
      <div
        key={element.id}
        ref={isEditing ? editingFieldRef : null}
        className={`template-element template-field ${editable ? 'field-editable' : ''} ${isEditing ? 'field-editing' : ''}`}
        style={{ cursor: editable && !isEditing ? 'pointer' : 'default' }}
        onDoubleClick={(e) => {
          console.log('[TemplateRenderer] onDoubleClick 事件', { 
            fieldId: fieldResult.fieldId, 
            isEditing, 
            editable 
          });
          // 如果已经在编辑模式，不处理双击
          if (!isEditing && editable) {
            e.stopPropagation();
            handleStartEdit(e);
          } else if (!isEditing && !editable) {
            // 双击不可编辑字段时显示提示
            e.stopPropagation();
            Toast.warning('系统关联字段，不可编辑，或联系管理员');
          }
        }}
      >
        {isEditing ? (
          <div className="field-editor-wrapper">
            {!isAllergenField && <span className="field-label">{fieldResult.fieldName}:</span>}
            <FieldEditor
              type={fieldResult.fieldType}
              value={currentEditingValue}
              onChange={handleValueChange}
              onBlur={handleSaveAndExit}
              fieldMeta={fieldResult.fieldMeta}
            />
          </div>
        ) : (
          <>
            <div 
              className="field-content"
              title={editable ? '双击编辑' : ''}
              style={{ userSelect: 'none' }}
            >
              {!isAllergenField && <span className="field-label">{fieldResult.fieldName}:</span>}
              <span className="field-value">{isEmptyValue ? <span className="field-empty">{emptyDisplayText}</span> : displayValue}</span>
            </div>
            {hasComments && onComment && (
              <div
                className="field-comment-badge"
                onClick={() => onComment(context.record.recordId, fieldResult.fieldId)}
                title={`${stats.total} 条评论，${stats.unresolved} 条未解决`}
              >
                💬 {stats.total}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // 渲染循环元素
  const renderLoopElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    
    // 如果 fieldId 为空，尝试自动查找关联字段
    let fieldId = config.fieldId;
    if (!fieldId) {
      // 尝试通过字段名称查找关联字段（关联到原料标准明细表）
      const linkField = context.fields.find(f => {
        // 查找关联字段类型（18=单项关联，21=双向关联）
        if (f.type === 18 || f.type === 21) {
          // 如果字段名称包含"标准明细"或"明细"，或者 fieldName 配置了名称
          const fieldName = config.fieldName || '';
          if (fieldName) {
            return f.name === fieldName;
          }
          // 默认查找包含"标准明细"的字段
          return f.name.includes('标准明细') || f.name.includes('明细');
        }
        return false;
      });
      
      if (linkField) {
        fieldId = linkField.id;
        // 更新配置（但不保存，只是临时使用）
        config.fieldId = fieldId;
      }
    }
    
    if (!fieldId) {
      return (
        <div key={element.id} className="template-element template-loop">
          <div className="loop-empty">未配置关联字段（请选择关联到"原料标准明细"表的字段）</div>
        </div>
      );
    }

    return (
      <LoopAreaRenderer
        key={element.id}
        element={element}
        record={context.record}
        fields={context.fields}
        table={table}
        onComment={onComment}
        commentStats={commentStats}
        onFieldChange={onFieldChange}
      />
    );
  };

  // 渲染表格元素
  const renderTableElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    
    if (!config.columns || config.columns.length === 0) {
      return (
        <div key={element.id} className="template-element template-table">
          <div className="table-empty">未配置表格列</div>
        </div>
      );
    }
    
    return (
      <TableRenderer
        key={element.id}
        element={element}
        record={context.record}
        fields={context.fields}
        table={table}
        onComment={onComment}
        commentStats={commentStats}
        onFieldChange={onFieldChange}
      />
    );
  };

  // 渲染图片元素
  const renderImageElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const fieldId = config.fieldId;
    
    if (!fieldId) {
      return (
        <div key={element.id} className="template-element template-image">
          <div className="image-placeholder">未选择附件字段</div>
        </div>
      );
    }

    const attachments = context.record.fields[fieldId];
    if (!attachments || (Array.isArray(attachments) && attachments.length === 0)) {
      return (
        <div key={element.id} className="template-element template-image">
          <div className="image-placeholder">无图片</div>
        </div>
      );
    }

    const imageList = Array.isArray(attachments) ? attachments : [attachments];
    const firstImage = imageList[0];

    return (
      <div
        key={element.id}
        className="template-element template-image"
        style={{
          width: config.width || 200,
          height: config.height || 200
        }}
      >
        {firstImage.url ? (
          <img
            src={firstImage.url}
            alt={firstImage.name || '图片'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div className="image-placeholder">图片加载中...</div>
        )}
      </div>
    );
  };

  // 渲染链接元素
  const renderLinkElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const fieldId = config.fieldId;
    
    if (!fieldId) {
      return (
        <div key={element.id} className="template-element template-link">
          <span className="link-empty">未选择字段</span>
        </div>
      );
    }

    const value = context.record.fields[fieldId];
    const url = typeof value === 'string' ? value : value?.url || '';
    const linkText = config.text || url || '链接';

    if (!url) {
      return (
        <div key={element.id} className="template-element template-link">
          <span className="link-empty">无链接</span>
        </div>
      );
    }

    return (
      <div
        key={element.id}
        className="template-element template-link"
      >
        <a href={url} target="_blank" rel="noopener noreferrer">
          {linkText}
        </a>
      </div>
    );
  };

  const pageWidth = template.styles?.pageWidth || 794;
  const pageHeight = template.styles?.pageHeight || 1123;

  return (
    <div className="template-renderer-wrapper">
      <div 
        className="template-renderer"
        style={{
          width: pageWidth,
          minHeight: pageHeight
        }}
      >
        <div className="template-content-flow">
          {template.elements.length === 0 ? (
            <div className="template-empty">
              <p>模板为空，请在编辑模式下添加元素</p>
            </div>
          ) : (
            template.elements.map(element => {
          return renderElement(element, { record, fields });
            })
          )}
        </div>
      </div>
    </div>
  );
};
