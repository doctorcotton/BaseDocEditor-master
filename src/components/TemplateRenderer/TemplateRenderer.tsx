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
  onLinkedFieldChange?: (linkedTable: any, recordId: string, fieldId: string, newValue: any, oldValue: any) => void;
  refreshKey?: number; // 用于触发数据刷新
  zoomLevel?: number; // 缩放比例（从父组件传入）
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  record,
  fields,
  table,
  onComment,
  commentStats,
  onFieldChange,
  onLinkedFieldChange,
  refreshKey = 0,
  zoomLevel = 100
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
      
      // 收集所有需要加载的字段ID（从字段元素和链接元素中）
      const fieldIdsToLoad = new Set<string>();
      template.elements.forEach((element: TemplateElement) => {
        const config = element.config as any;
        // 处理字段元素
        if (element.type === 'field' && config.fieldId) {
          fieldIdsToLoad.add(config.fieldId);
        }
        // 处理链接元素
        if (element.type === 'link' && config.fieldId) {
          fieldIdsToLoad.add(config.fieldId);
        }
        // 处理图片元素
        if (element.type === 'image' && config.fieldId) {
          fieldIdsToLoad.add(config.fieldId);
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
  }, [table, record?.recordId, template.elements, refreshKey]);

  // 自动保存并退出编辑
  const handleSaveAndExit = useCallback(() => {
    if (editingFieldId && onFieldChange && editingValue !== null) {
      const field = fields.find(f => f.id === editingFieldId);
      if (field) {
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
          // 调用变更回调 - 注意：oldValue 使用显示文本，这样撤销时可以正确恢复
          onFieldChange(editingFieldId, newValue, initialEditingText);
          
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
            fontSize: 22,
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

    // 检查是否是 URL 字段，提取链接
    const isUrlField = fieldResult.fieldType === FieldType.Url;
    const extractUrlLink = (val: any): string | null => {
      if (!val) return null;
      if (Array.isArray(val)) {
        const first = val[0];
        if (typeof first === 'string' && first.startsWith('http')) return first;
        if (first && typeof first === 'object') return first.link || first.url || null;
        return null;
      }
      if (typeof val === 'string' && val.startsWith('http')) return val;
      if (typeof val === 'object') return val.link || val.url || null;
      return null;
    };
    const urlLink = isUrlField ? extractUrlLink(value) : null;

    // 检查文本字段中是否包含富文本超链接
    // 飞书文本字段中的超链接格式可能有多种：
    // 1. [{type: 'url', text: '链接文字', link: 'https://...'}]
    // 2. [{type: 'text', text: '普通文字'}, {type: 'url', text: '链接', link: '...'}]
    // 3. 直接包含 http:// 或 https:// 的字符串
    const hasRichTextLinks = (val: any): boolean => {
      if (!val) return false;
      // 检查字符串中是否包含 URL
      if (typeof val === 'string') {
        return /https?:\/\/[^\s]+/.test(val);
      }
      if (!Array.isArray(val)) return false;
      return val.some(v => {
        if (!v) return false;
        // 对象格式的超链接
        if (typeof v === 'object' && v.type === 'url' && v.link) return true;
        // 检查对象中是否有 link 属性
        if (typeof v === 'object' && v.link) return true;
        // 检查文本内容中是否包含 URL
        if (typeof v === 'string' && /https?:\/\/[^\s]+/.test(v)) return true;
        if (typeof v === 'object' && v.text && /https?:\/\/[^\s]+/.test(v.text)) return true;
        return false;
      });
    };

    // 渲染富文本内容（支持超链接）
    const renderRichText = (val: any): React.ReactNode => {
      if (!val) return '';
      
      // 如果是字符串，检查是否包含 URL 并渲染
      if (typeof val === 'string') {
        return renderTextWithLinks(val);
      }
      
      if (!Array.isArray(val)) {
        return String(val || '');
      }
      
      return val.map((item, index) => {
        if (!item) return null;
        
        // 字符串类型：检查是否包含 URL
        if (typeof item === 'string') {
          return <span key={index}>{renderTextWithLinks(item)}</span>;
        }
        
        if (typeof item !== 'object') {
          return <span key={index}>{String(item || '')}</span>;
        }
        
        // 超链接类型（type: 'url'）
        if (item.type === 'url' && item.link) {
          return (
            <a
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="field-value-link"
              onClick={(e) => e.stopPropagation()}
              title={item.link}
            >
              {item.text || item.link}
            </a>
          );
        }
        
        // 对象中直接包含 link 属性
        if (item.link) {
          return (
            <a
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="field-value-link"
              onClick={(e) => e.stopPropagation()}
              title={item.link}
            >
              {item.text || item.name || item.link}
            </a>
          );
        }
        
        // 普通文本对象：检查文本内容是否包含 URL
        const textContent = item.text || item.name || item.value || '';
        if (textContent && /https?:\/\/[^\s]+/.test(textContent)) {
          return <span key={index}>{renderTextWithLinks(textContent)}</span>;
        }
        
        return <span key={index}>{textContent}</span>;
      });
    };
    
    // 将文本中的 URL 转换为可点击链接
    const renderTextWithLinks = (text: string): React.ReactNode => {
      if (!text) return '';
      
      // 匹配 URL 的正则表达式
      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
      const parts = text.split(urlRegex);
      
      if (parts.length === 1) {
        return text; // 没有 URL，直接返回文本
      }
      
      return parts.map((part, index) => {
        if (urlRegex.test(part)) {
          // 重置正则表达式的 lastIndex
          urlRegex.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="field-value-link"
              onClick={(e) => e.stopPropagation()}
              title={part}
            >
              {part}
            </a>
          );
        }
        return part;
      });
    };

    const hasLinks = hasRichTextLinks(value);

    // 渲染字段值内容
    const renderFieldValue = () => {
      if (isEmptyValue) {
        return <span className="field-empty">{emptyDisplayText}</span>;
      }
      // URL 字段渲染为可点击链接
      if (isUrlField && urlLink) {
        return (
          <a 
            href={urlLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="field-value-link"
            onClick={(e) => e.stopPropagation()}
            title={urlLink}
          >
            {displayValue}
          </a>
        );
      }
      // 文本字段中包含超链接，使用富文本渲染
      if (hasLinks) {
        return renderRichText(value);
      }
      return displayValue;
    };

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
              title={editable ? '双击编辑' : (urlLink || '')}
              style={{ userSelect: 'none' }}
            >
              {!isAllergenField && <span className="field-label">{fieldResult.fieldName}:</span>}
              <span className="field-value">{renderFieldValue()}</span>
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
          // 默认查找包含"标准明细"或"原材料标准明细"的字段
          return f.name.includes('标准明细') || f.name.includes('明细') || f.name.includes('原材料');
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
        onLinkedFieldChange={onLinkedFieldChange}
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
        refreshKey={refreshKey}
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

    // 优先使用异步加载的值
    let value = fieldValues.get(fieldId);
    if (value === undefined) {
      value = context.record.fields[fieldId];
    }
    
    console.log('[renderLinkElement] 字段值:', { fieldId, value });

    // 解析链接列表
    // 飞书的字段可能返回多种格式:
    // 1. 字符串: "https://xxx"
    // 2. 对象: { link: "https://xxx", text: "文档名称" }
    // 3. 数组: [{ link: "https://xxx", text: "文档名称" }]
    // 4. mention 数组: [{ type: "mention", text: "文档名称", link: "https://xxx" }]
    
    interface LinkItem {
      url: string;
      text: string;
    }
    
    const links: LinkItem[] = [];

    if (Array.isArray(value)) {
      // 数组格式，处理所有链接
      value.forEach((item: any) => {
        if (typeof item === 'string') {
          if (item.startsWith('http')) {
            links.push({ url: item, text: item });
          }
        } else if (item && typeof item === 'object') {
          const url = item.link || item.url || '';
          const text = item.text || item.name || url;
          if (url) {
            links.push({ url, text });
          }
        }
      });
    } else if (typeof value === 'string') {
      if (value.startsWith('http')) {
        links.push({ url: value, text: value });
      }
    } else if (value && typeof value === 'object') {
      const url = value.link || value.url || '';
      const text = value.text || value.name || url;
      if (url) {
        links.push({ url, text });
      }
    }

    console.log('[renderLinkElement] 解析到的链接:', links);

    if (links.length === 0) {
      return (
        <div key={element.id} className="template-element template-link">
          <span className="link-empty">无链接</span>
        </div>
      );
    }

    // 如果只有一个链接
    if (links.length === 1) {
      const link = links[0];
      const displayText = config.text || link.text || '链接';
      return (
        <div
          key={element.id}
          className="template-element template-link"
        >
          <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
            {displayText}
          </a>
        </div>
      );
    }

    // 多个链接，显示为列表
    return (
      <div
        key={element.id}
        className="template-element template-link template-link-list"
      >
        {links.map((link, index) => (
          <div key={index} className="link-item">
            <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
              {link.text || '链接'}
            </a>
          </div>
        ))}
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
          minHeight: pageHeight,
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top center'
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
