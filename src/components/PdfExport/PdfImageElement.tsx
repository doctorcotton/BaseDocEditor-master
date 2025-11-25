/**
 * PDF图片元素组件
 * 从附件字段渲染图片
 */

import React from 'react';
import { Image, Text, View } from '@react-pdf/renderer';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { TemplateElement } from '../../types/template';
import { pdfStyles } from './pdfStyles';
import { getImageUrls } from '../../utils/pdfDataMapper';

interface PdfImageElementProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
}

export const PdfImageElement: React.FC<PdfImageElementProps> = ({ 
  element, 
  record 
}) => {
  const config = element.config as any;
  const fieldId = config.fieldId;
  
  if (!fieldId) {
    return (
      <Text style={pdfStyles.emptyValue}>未选择附件字段</Text>
    );
  }
  
  const value = record.fields[fieldId];
  const imageUrls = getImageUrls(value);
  
  if (imageUrls.length === 0) {
    return (
      <Text style={pdfStyles.emptyValue}>无图片</Text>
    );
  }
  
  // 渲染所有图片
  return (
    <View>
      {imageUrls.map((url, index) => (
        <Image 
          key={index} 
          src={url} 
          style={pdfStyles.image}
        />
      ))}
    </View>
  );
};

