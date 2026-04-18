import React, { useState } from 'react';
import { Download, Trash2, Copy, Plus, Grid3X3, FileArchive } from 'lucide-react';
import { useQRStore } from '../stores/qrStore';
import { generateQRCode, generateBatchQRCodes, downloadQRCode } from '../utils/qrGenerator';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const QRGenerator: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [useSpecialFormat, setUseSpecialFormat] = useState(false);
  const { qrCodes, isGenerating, addQRCode, addBatchQRCodes, removeQRCode, clearAllQRCodes, setIsGenerating } = useQRStore();

  const handleGenerateSingle = async () => {
    if (!inputText.trim()) {
      toast.error('请输入要生成二维码的文本');
      return;
    }

    try {
      setIsGenerating(true);
      const { dataUrl, label } = await generateQRCode(inputText.trim(), { useSpecialFormat });
      addQRCode(inputText.trim(), dataUrl, label);
      setInputText('');
      toast.success('二维码生成成功！');
    } catch (error) {
      toast.error('生成二维码失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!batchInput.trim()) {
      toast.error('请输入要生成二维码的文本，每行一个');
      return;
    }

    const texts = batchInput
      .split('\n')
      .map(text => text.trim())
      .filter(text => text.length > 0);

    if (texts.length === 0) {
      toast.error('请输入有效的文本内容');
      return;
    }

    try {
      setIsGenerating(true);
      const results = await generateBatchQRCodes(texts, { useSpecialFormat });
      const items = texts.map((text, index) => ({
        text,
        dataUrl: results[index].dataUrl,
        label: results[index].label,
      }));
      addBatchQRCodes(items);
      setBatchInput('');
      toast.success(`成功生成 ${texts.length} 个二维码！`);
    } catch (error) {
      toast.error('批量生成二维码失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (dataUrl: string, text: string) => {
    const filename = `qrcode-${text.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.png`;
    downloadQRCode(dataUrl, filename);
    toast.success('二维码已下载');
  };

  const handleBatchDownload = async () => {
    if (qrCodes.length === 0) {
      toast.error('没有可以下载的二维码');
      return;
    }

    try {
      toast.info('正在打包下载...');
      const zip = new JSZip();
      
      qrCodes.forEach((qr, index) => {
        const base64Data = qr.dataUrl.replace(/^data:image\/png;base64,/, '');
        const realIndex = qrCodes.length - index; // 因为新生成的插在数组前面，这里把它倒序还原为1, 2, 3...或者直接用原本在生成时的顺序，不过为了简单，这里直接用序号即可
        const safeName = qr.label 
          ? `${realIndex}_${qr.label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`
          : `qrcode-${realIndex}`;
        zip.file(`${safeName}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `qrcodes-batch-${Date.now()}.zip`);
      toast.success('批量下载成功！');
    } catch (error) {
      console.error('Batch download error:', error);
      toast.error('批量打包失败，请重试');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('文本已复制到剪贴板');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      if (isBatchMode) {
        handleGenerateBatch();
      } else {
        handleGenerateSingle();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">二维码生成器</h1>
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isBatchMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            {isBatchMode ? '单个模式' : '批量模式'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
            <input
              type="checkbox"
              id="specialFormat"
              checked={useSpecialFormat}
              onChange={(e) => setUseSpecialFormat(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="specialFormat" className="text-sm font-medium cursor-pointer">
              特定格式解析 (提取 '----' 分隔的前两段为底部文字，第三段及以后为二维码内容)
            </label>
          </div>

          {isBatchMode ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                批量输入（每行一个文本）
              </label>
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请输入要生成二维码的文本，每行一个...&#10;例如：&#10;文本1&#10;文本2&#10;文本3"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  当前行数: {batchInput.split('\n').filter(text => text.trim()).length}
                </span>
                <button
                  onClick={handleGenerateBatch}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      批量生成
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                输入文本
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="请输入要生成二维码的文本..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleGenerateSingle}
                  disabled={isGenerating || !inputText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  生成
                </button>
              </div>
            </div>
          )}
        </div>

        {qrCodes.length > 0 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              共 {qrCodes.length} 个二维码
            </span>
            <div className="flex items-center gap-3">
              {qrCodes.length > 1 && (
                <button
                  onClick={handleBatchDownload}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 text-sm rounded-lg transition-colors font-medium"
                >
                  <FileArchive className="w-4 h-4" />
                  批量下载ZIP
                </button>
              )}
              <button
                onClick={clearAllQRCodes}
                className="flex items-center gap-2 px-3 py-1 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                清空全部
              </button>
            </div>
          </div>
        )}
      </div>

      {qrCodes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qrCode) => (
            <div key={qrCode.id} className="bg-white rounded-lg shadow-lg p-4 space-y-3">
              <div className="flex justify-center bg-gray-50 rounded-lg p-2">
                <img
                  src={qrCode.dataUrl}
                  alt={`QR Code: ${qrCode.text}`}
                  className="w-full max-w-[200px] object-contain border border-gray-200 rounded-lg bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 break-all line-clamp-2" title={qrCode.text}>
                  {qrCode.label ? (
                    <span className="font-semibold text-gray-800 block mb-1">{qrCode.label}</span>
                  ) : (
                    qrCode.text
                  )}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(qrCode.dataUrl, qrCode.text)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    <Download className="w-3 h-3" />
                    下载
                  </button>
                  
                  <button
                    onClick={() => handleCopyText(qrCode.text)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </button>
                  
                  <button
                    onClick={() => removeQRCode(qrCode.id)}
                    className="flex items-center justify-center px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QRGenerator;