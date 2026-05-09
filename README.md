# Elder Anxiety Daily

老年焦慮文獻日報 · Late-Life Anxiety Daily Research Report

每日自動從 PubMed 抓取最新老年焦慮 (Late-Life Anxiety / Geriatric Anxiety) 相關文獻，經 Zhipu AI 分析摘要後生成報告，部署至 GitHub Pages。

## 網站

https://u8901006.github.io/elder-anxiety/

## 技術架構

- **文獻來源**: PubMed E-utilities API
- **AI 分析**: Zhipu GLM-5-Turbo (fallback: GLM-4.7 → GLM-4.7-Flash)
- **部署**: GitHub Actions + GitHub Pages
- **排程**: 每日 GMT+8 23:35

## 搜尋範圍

涵蓋 70+ 期刊，包括：
- 老年精神醫學核心期刊
- 一般精神醫學與精神藥理學
- 臨床心理學與心理治療
- 神經科學與神經影像
- 老年醫學與老年學
- 社會科學與公共衛生
- 護理與長期照護

## 授權

文獻資料來自 PubMed (公共領域)。AI 摘要僅供參考，不構成醫療建議。
