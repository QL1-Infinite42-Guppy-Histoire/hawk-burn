# HAWK バーンサイト

QL1 上の HAWK をバーン（焼却）して、**100 : 1** で PHOENIX を受け取るための
初心者向け静的サイトです。

- 使うのは **QL1 上にすでにある PHOENIX コントラクト** の `burnToMint` です。
  このサイトのために **新しいコントラクトは作っていません**（デプロイもしていません）。
- 100 : 1 のレートは、そのコントラクト自体のルールです。サイト側では変更できません。
- バーンした HAWK は消滅し、**二度と戻りません**。

専門用語は画面に出さず、日常の言葉だけで案内します。スマホ（Android）での利用を前提に、
大きなボタンと読みやすいカード型レイアウトにしています。背景には不死鳥（フェニックス）の
モチーフをインライン SVG で描いています（外部画像不使用）。

公開ページは `docs/` 配下です（言語ゲート `index.html` → 英語が既定、`ja.html` が日本語）。

## バーンの仕組み（コントラクトの実動作）

1. サイトは、あなたの HAWK 残高と PHOENIX コントラクトへの許可量（allowance）を読みます。
2. 許可が足りない場合、先に `approve`（PHOENIX コントラクトがあなたの HAWK を使えるようにする許可）を送ります。
3. 続けて PHOENIX コントラクトの `burnToMint(量)` を呼びます。コントラクトがあなたの HAWK を
   バーン用アドレス `0x000000000000000000000000000000000000dEaD` へ送って消滅させ、
   代わりに **量 ÷ 100** の PHOENIX をあなた宛てに発行します。
4. 量は送信前に **100 HAWK 単位に切り下げ** ます。端数はウォレットに残り、バーンされません。

実在のバーン取引で検証済みです（例: 1,000,000 HAWK → 10,000 PHOENIX、500,000 HAWK → 5,000 PHOENIX、
どちらもきっかり 100 : 1）。

## コントラクト（QL1、EVM チェーンID 766）

| 対象 | アドレス |
|---|---|
| PHOENIX（既存。`burnToMint` を持つ） | `0xDFe660C5a29c8AADF1daA096543D249135e1938A` |
| HAWK（QL1、18 decimals、素の ERC-20） | `0xbC85F14059d60458b614052b4a84734E463878cc` |
| バーン先（dead アドレス） | `0x000000000000000000000000000000000000dEaD` |

- エクスプローラー: https://scan.qom.network
- RPC（読み取り）: https://evm-rpc-ql1.mschihuahua.org

## 技術メモ

- **ライブラリ不使用**: 素の JavaScript + `fetch` + `window.ethereum` のみ。calldata は手組み、ビルド工程なし。
- **送信フロー**: allowance を読み、不足時のみ `approve(量ちょうど)` → `burnToMint(量)`。
  ガスは `eth_estimateGas` の実測 + 20% バッファ（失敗時は固定値にフォールバック）。
- **全体統計**: バーン済み HAWK = dead アドレスの HAWK 残高、発行済み PHOENIX = PHOENIX の総供給量を
  ウォレット接続なしでライブ表示します。
- **チェーン切替**: 766 でない場合は `wallet_switchEthereumChain`、未登録（4902）なら
  `wallet_addEthereumChain` で QL1 を追加します。拒否（4001）はエラー表示ではなく、やさしい案内にします。
- 秘密鍵・復旧フレーズを扱うことは一切ありません。

### 検証（2026-11-18、ローカル実測）

`tools/verify.js` が `docs/app.js` と**同じ**関数を Node から実行し、実チェーンで確認しました:

- 全体: バーン済み HAWK **219,729,688.54**（dead アドレス残高）/ PHOENIX 総供給 **355,628.52**
- `0xe737…53B9`: HAWK **1,832,994.73** / PHOENIX **314** / allowance **968,800**
  → `burnToMint(100 HAWK)` の eth_call シミュレーション **成功**
- `0xF348…2db4b0`（バーン実績のあるアドレス、現在残高・許可とも 0）:
  同シミュレーションは `ERC20: insufficient allowance` で **revert**（許可が前提であることを確認）
- 金額処理の単体確認: 150 → 100 への切り下げ、10,000 HAWK → 100 PHOENIX の換算、
  approve / burnToMint の calldata 往復

実際のバーン取引は送信していません（検証は読み取り + シミュレーションのみ）。
**サイトからの実際のバーンは、利用者による最初の1回が最終確認になります。**

## ローカルで動かす

```sh
cd docs && python3 -m http.server 8000
# http://localhost:8000/ を開く（index.html が言語ゲート）
```

検証ハーネス:

```sh
node tools/verify.js
```

## English summary

A beginner-friendly static site to burn HAWK on QL1 (chain ID 766) and receive
PHOENIX at exactly 100 : 1. It uses the **existing** PHOENIX token contract
(`0xDFe660C5a29c8AADF1daA096543D249135e1938A`) and its `burnToMint(uint256)`
function — **no new contract was created or deployed for this site**, and the
100 : 1 rate is that contract's own rule. Flow: the site reads your HAWK
balance and allowance; if the allowance is short it sends `approve` for the
exact amount first, then `burnToMint`. The contract destroys the HAWK by
transferring it to `0x0000…dEaD` and mints amount ÷ 100 PHOENIX to you.
Amounts are rounded **down** to a multiple of 100 HAWK before sending, so no
remainder is ever burned. Burned HAWK is destroyed and can never be returned.
Vanilla JS only, no libraries, no build step. Verified against the live chain
on 2026-11-18 with `tools/verify.js` (read-only + eth_call simulation; no burn
was sent — the first real burn from the site is the user's end-to-end check).
MIT license.
