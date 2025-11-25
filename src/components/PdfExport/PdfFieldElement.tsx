/**
 * PDF字段元素组件
 * 渲染字段值，支持富文本和超链接
 */

import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { TemplateElement } from '../../types/template';
import { pdfStyles } from './pdfStyles';
import { parseRichText } from '../../utils/pdfDataMapper';
import { PdfRichText } from './PdfRichText';
import { formatFieldValue } from '../../utils/fieldFormatter';

interface PdfFieldElementProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
}

export const PdfFieldElement: React.FC<PdfFieldElementProps> = ({ 
  element, 
  record, 
  fields 
}) => {
  const config = element.config as any;
  const fieldId = config.fieldId;
  
  if (!fieldId) {
    return (
      <Text style={pdfStyles.emptyValue}>未选择字段</Text>
    );
  }

  const field = fields.find(f => f.id === fieldId);
  if (!field) {
    return (
      <Text style={pdfStyles.emptyValue}>字段未找到: {fieldId}</Text>
    );
  }
  
  const value = record.fields[fieldId];
  const displayValue = formatFieldValue(value, field.type);
  
  // 特殊处理：标题元素（id为'title'）
  const isTitle = element.id === 'title';
  
  if (isTitle) {
    // 拼接版本号构建标题
    const VERSION_FIELD_ID = 'fldL7m1ZTN';
    const versionRawValue = record.fields?.[VERSION_FIELD_ID];
    const versionField = fields.find(f => f.id === VERSION_FIELD_ID);
    const versionText = versionField ? formatFieldValue(versionRawValue, versionField.type) : '';
    const baseTitle = displayValue || '未命名记录';
    const suffix = versionText ? `原料品质标准-${versionText}` : '原料品质标准';
    const titleText = `${baseTitle} ${suffix}`;
    
    return (
      <Text style={pdfStyles.title}>
        {titleText}
      </Text>
    );
  }
  
  // 特殊处理：致敏物质信息字段为空时显示"无"
  const isAllergenField = fieldId === 'fldNL9B304';
  const isEmptyValue = !displayValue || displayValue.trim() === '';
  const emptyDisplayText = isAllergenField ? '无' : '空';
  
  // 解析富文本（提取链接）
  const richTextSegments = parseRichText(value, field.type);
  
  // 如果字段为空
  if (isEmptyValue) {
    return (
      <View style={pdfStyles.field}>
        {!isAllergenField && (
          <Text style={pdfStyles.fieldLabel}>{field.name}：</Text>
        )}
        <Text style={pdfStyles.emptyValue}>{emptyDisplayText}</Text>
      </View>
    );
  }
  
  // 正常字段显示（不显示致敏物质的标签）
  return (
    <View style={pdfStyles.field}>
      {!isAllergenField && (
        <Text style={pdfStyles.fieldLabel}>{field.name}：</Text>
      )}
      <PdfRichText segments={richTextSegments} style={pdfStyles.fieldValue} />
    </View>
  );
};

