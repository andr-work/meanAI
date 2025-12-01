# meanAI <img src="chrome-extension\public\meanAI.png" width="20">

## 概要
- 分からない単語やフレーズ、テキストなどを'英語'で説明するChrome拡張です。

## 使い方
- 文字を選択すると右下にアイコンが表示され、それをクリックすることで説明が表示されます。

- 文字を選択後、右クリックをして'選択したテキストを簡単に説明'を選択することでも説明が表示されます。

## 使用技術
- [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite): Next.jsとViteを使用したchrome拡張機能開発のテンプレートです。

- [build-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis?hl=en): chromeブラウザ上で動作するGemini Nanoを呼び出すAPIです。meanAIではprompt APIを使用しています。