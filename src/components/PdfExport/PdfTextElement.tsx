/**
 * PDF文本元素组件
 * 渲染固定文本
 */

import React from 'react';
import { Text } from '@react-pdf/renderer';
import { TemplateElement } from '../../types/template';
import { pdfStyles } from './pdfStyles';

interface PdfTextElementProps {
  element: TemplateElement;
}

export const PdfTextElement: React.FC<PdfTextElementProps> = ({ element }) => {
  const config = element.config as any;
  
  // 转换 fontWeight: 'normal' -> 400, 'bold' -> 700
  const fontWeightMap: Record<string, number> = {
    'normal': 400,
    'bold': 700,
  };
  const fontWeight = typeof config.fontWeight === 'string' 
    ? fontWeightMap[config.fontWeight] || 400
    : config.fontWeight || 400;
  
  const style = {
    ...pdfStyles.text,
    fontSize: config.fontSize || 10,
    fontWeight,
    color: config.color || '#000000',
    textAlign: config.align || 'left',
  };

  return (
    <Text style={style}>
      {config.content || ''}
    </Text>
  );
};

