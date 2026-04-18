import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  useSpecialFormat?: boolean;
  index?: number; // 增加序号选项
}

// 解析特殊格式：通过多个破折号进行分割，提取前两段为底部文字，第三段及之后为二维码实际内容
export const parseSpecialFormat = (text: string): { label: string; qrContent: string } | null => {
  const parts = text.split(/-{3,}/);
  if (parts.length >= 3) {
    return {
      label: `${parts[0].trim()} ${parts[1].trim()}`,
      qrContent: parts.slice(2).join('----').trim()
    };
  }
  return null;
};

export const generateQRCode = async (
  text: string,
  options: QRCodeOptions = {}
): Promise<{ dataUrl: string; label: string | null }> => {
  try {
    // 增加基础尺寸，使生成的二维码更加高清（800px）
    const baseWidth = options.width || 800;
    const qrOptions = {
      width: baseWidth,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    };

    let label: string | null = null;
    let contentToEncode = text;

    if (options.useSpecialFormat) {
      const parsed = parseSpecialFormat(text);
      if (parsed) {
        label = parsed.label;
        contentToEncode = parsed.qrContent;
      }
    }

    const qrCanvas = await QRCode.toCanvas(contentToEncode, qrOptions);
    
    // 如果没有特殊标签需要绘制，直接返回原始二维码
    if (!label) {
      return { dataUrl: qrCanvas.toDataURL('image/png'), label: null };
    }

    // 否则我们需要创建一个新的 Canvas，把二维码和文字一起画进去
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // 按照基础宽度的比例动态计算边距，以保持排版协调
    const paddingTop = Math.floor(baseWidth * 0.1); // 顶部留出 10% 空间放序号
    const paddingBottom = Math.floor(baseWidth * 0.15); // 底部留出 15% 空间放大字
    
    canvas.width = qrCanvas.width;
    canvas.height = qrCanvas.height + paddingBottom + paddingTop;

    // 填充白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 将二维码画上去，往下挪，留出顶部空间
    ctx.drawImage(qrCanvas, 0, paddingTop);

    // 绘制底部文字：动态字号，防止裁剪
    let fontSize = Math.floor(baseWidth * 0.055); // 默认字号，大概 44px
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    
    // 智能缩放：如果文字宽度超过了画布宽度（左右各留20px边距），则缩小字号
    const maxWidth = canvas.width - 40;
    while (ctx.measureText(label).width > maxWidth && fontSize > 12) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    }

    ctx.fillStyle = '#FF0000'; // 红色
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, paddingTop + qrCanvas.height + (paddingBottom / 2));

    // 绘制左上角的序号
    const indexNumber = options.index !== undefined ? options.index : 1;
    const indexFontSize = Math.floor(baseWidth * 0.06); // 序号稍微大一点
    ctx.font = `bold ${indexFontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#000000'; // 黑色序号
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`#${indexNumber}`, 20, 20); // 左上角边距 20px

    return { dataUrl: canvas.toDataURL('image/png'), label };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateQRCodeCanvas = async (
  text: string,
  options: QRCodeOptions = {}
): Promise<HTMLCanvasElement> => {
  try {
    const canvas = document.createElement('canvas');
    const qrOptions = {
      width: options.width || 256,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    };

    await QRCode.toCanvas(canvas, text, qrOptions);
    return canvas;
  } catch (error) {
    console.error('Error generating QR code canvas:', error);
    throw new Error('Failed to generate QR code canvas');
  }
};

export const downloadQRCode = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateBatchQRCodes = async (
  texts: string[],
  options: QRCodeOptions = {}
): Promise<{ dataUrl: string; label: string | null }[]> => {
  const promises = texts.map((text, idx) => generateQRCode(text, { ...options, index: idx + 1 }));
  return Promise.all(promises);
};