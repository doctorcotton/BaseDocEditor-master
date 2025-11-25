/**
 * PDF字体注册
 * 注册中文字体以支持PDF中的中文显示
 */

import { Font } from '@react-pdf/renderer';

// 注册 Noto Sans SC 中文字体
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { 
      src: '/fonts/NotoSansSC-Regular.otf', 
      fontWeight: 400  // normal
    },
    { 
      src: '/fonts/NotoSansSC-Bold.otf', 
      fontWeight: 700  // bold
    },
  ]
});

// 导出字体家族名称供其他模块使用
export const CHINESE_FONT_FAMILY = 'Noto Sans SC';

