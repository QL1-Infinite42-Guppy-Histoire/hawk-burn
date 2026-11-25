"use strict";
/* HAWK Burn — vanilla JS only. No web3 library.
   Burns QL1 HAWK into PHOENIX at 100 : 1 via the EXISTING PHOENIX
   contract's burnToMint(uint256). This site deploys no contract.
   Pure helpers + read logic are exported for the Node verification
   harness (see tools/verify.js) when run outside a browser. */

var HAWK = "0xbC85F14059d60458b614052b4a84734E463878cc";
var PHX = "0xDFe660C5a29c8AADF1daA096543D249135e1938A";
var ZERO = "0x0000000000000000000000000000000000000000";
/* burnToMint destroys HAWK by transferring it to 0x…dEaD (verified from
   real burn transactions on the explorer, 2026-11-18). */
var DEAD = "0x000000000000000000000000000000000000dEaD";
var CHAIN_ID_HEX = "0x2fe"; // 766 (QL1)
var RPCS = ["https://evm-rpc-ql1.mschihuahua.org"];
var EXPLORER = "https://scan.qom.network";

var SEL = {
  balanceOf: "0x70a08231",
  allowance: "0xdd62ed3e",
  approve: "0x095ea7b3",
  totalSupply: "0x18160ddd",
  burnToMint: "0x05737aae"
};

var WEI = 1000000000000000000n;          // 1 token in wei (18 decimals)
var HUNDRED_WEI = 100n * WEI;            // burn unit: 100 HAWK

/* ---------- i18n ---------- */
var I18N = {
  en: {
    pageTitle: "HAWK Burn 🔥",
    pageSub: "Burn HAWK on QL1 — receive PHOENIX, 100 : 1",
    howTitle: "How it works — 3 easy steps",
    step1: "Connect your wallet (the one that holds your HAWK)",
    step2: "Enter how much HAWK to burn (in lots of 100)",
    step3: "Confirm in your wallet — PHOENIX arrives right away",
    howNote: "For every 100 HAWK you burn, you receive 1 PHOENIX. Amounts are rounded down to a multiple of 100 before anything is sent — the small remainder stays in your wallet and is NOT burned.",
    contractNote: "This site uses the PHOENIX contract that already exists on QL1 (its “burnToMint” function). No new contract was made for this site, and the 100 : 1 rate is that contract's own rule.",
    contractLink: "See the PHOENIX contract",
    statsTitle: "Right now, for everyone",
    statBurnedLabel: "HAWK burned so far",
    statPhxLabel: "PHOENIX issued so far",
    statsNote: "These numbers are read live from the chain, so they are always up to date.",
    statsError: "Could not load the latest numbers. Please reload the page in a little while.",
    noWalletTitle: "You need a wallet app",
    noWalletText: "No wallet was found in this browser. Please install a wallet app such as MetaMask, then open this page inside that app's browser. Never share your recovery phrase or private key with anyone — this site will never ask for it.",
    noWalletLink: "Open this page in MetaMask",
    connectBtn: "Connect wallet",
    connectedTitle: "Wallet connected",
    disconnectBtn: "Disconnect",
    connecting: "Connecting…",
    noWalletFound: "No wallet was found. Please open this page inside a wallet app's browser (such as MetaMask or FoxWallet), then tap “Connect wallet” again.",
    connectNote: "Tap to connect. We only read your public address — we cannot move your money by connecting.",
    yourWalletLabel: "Your wallet",
    rescanBtn: "Check again",
    switchChainBtn: "Switch to QL1",
    hawkLine: "Your HAWK: {amount}",
    phxLine: "Your PHOENIX: {amount}",
    qomLine: "Your QOM (for network fees): {amount}",
    amountLabel: "HAWK to burn",
    receiveLabel: "You will receive",
    burnAmountLine: "Burning {amount} HAWK",
    burnBtn: "🔥 Burn HAWK",
    gasNote: "Burning needs a little QOM in your wallet to pay the network fee. Two confirmations may appear: first a one-time permission, then the burn itself.",
    safeTitle: "Please keep this safe",
    safe1: "Never enter your recovery phrase or private key anywhere. This site never asks for it.",
    safe2: "Burning cannot be undone. Burned HAWK is destroyed and can never be returned.",
    safe3: "The rate (100 HAWK → 1 PHOENIX) is the existing PHOENIX contract's rule. This site cannot change it.",
    contractLine: "PHOENIX: 0xDFe660C5a29c8AADF1daA096543D249135e1938A · HAWK: 0xbC85F14059d60458b614052b4a84734E463878cc · Chain: QL1 (766)",
    footerText: "Guppy's Guide — Don't Panic — a hitchhiker's toolbox for 42 Chain & QL1. A tool developed by the community; not an official QL1 site. Open source (MIT) — see GitHub. Amounts are read live from the chain.",
    connected: "Connected.",
    rejected: "You cancelled in your wallet. Nothing happened — tap Connect when you are ready.",
    rejectedTx: "You cancelled in your wallet. Nothing was burned.",
    wrongChain: "Your wallet is on a different network. Please switch to QL1.",
    switchOk: "Switched to QL1.",
    scanFailed: "We could not read the chain. Please check your connection and tap “Check again”.",
    invalidAmount: "Please enter a number, e.g. 10000.",
    insufficient: "You don't have that much HAWK.",
    needMin: "The smallest amount is 100 HAWK.",
    roundedNote: "Rounded down to {amount} HAWK (multiples of 100 only). The rest is not burned.",
    approvingStep: "Step 1 of 2: giving the PHOENIX contract permission to use your HAWK. Please confirm in your wallet.",
    waitingApprove: "Waiting for the permission to finish…",
    burningStep: "Step 2 of 2: burning your HAWK. Please confirm in your wallet.",
    burningStepSingle: "Burning your HAWK. Please confirm in your wallet.",
    waitingBurn: "Waiting for the burn to finish…",
    burnDone: "Done! You received {amount} PHOENIX.",
    txLink: "See the burn record",
    approveTxLink: "See the permission record",
    txFailed: "It did not go through. Nothing was burned. You can try again.",
    approveFailed: "The permission did not go through. Nothing was burned. You can try again."
  },
  ja: {
    pageTitle: "HAWK バーン 🔥",
    pageSub: "QL1でHAWKをバーンして PHOENIX を受け取る（100 : 1）",
    howTitle: "使い方はかんたん 3ステップ",
    step1: "ウォレットをつなぐ（HAWKが入っているウォレット）",
    step2: "バーンするHAWKの量を入れる（100枚単位）",
    step3: "ウォレットで確認するだけ — PHOENIXがすぐ届きます",
    howNote: "HAWKを100枚バーンするごとに、PHOENIXを1枚受け取れます。量は送信前に100の倍数へ切り下げます — 端数はウォレットに残り、バーンされません。",
    contractNote: "このサイトは、QL1上にすでにある PHOENIX コントラクト（その burnToMint という仕組み）を使います。このサイトのために新しいコントラクトは作っていません。100 : 1 のレートは、そのコントラクト自体のルールです。",
    contractLink: "PHOENIXコントラクトを見る",
    statsTitle: "いま全体では",
    statBurnedLabel: "これまでにバーンされた HAWK",
    statPhxLabel: "これまでに発行された PHOENIX",
    statsNote: "この数字はチェーンから直接読んでいるので、いつも最新の状態です。",
    statsError: "最新の数字を読み込めませんでした。少し待ってからページを開き直してください。",
    noWalletTitle: "ウォレットアプリが必要です",
    noWalletText: "このブラウザではウォレットが見つかりませんでした。MetaMask などのウォレットアプリを入れて、そのアプリの中のブラウザでこのページを開いてください。復旧フレーズや秘密鍵は絶対に誰にも教えないでください — このサイトが聞くことはありません。",
    noWalletLink: "MetaMaskでこのページを開く",
    connectBtn: "ウォレットをつなぐ",
    connectedTitle: "ウォレット接続中",
    disconnectBtn: "接続を解除",
    connecting: "接続中…",
    noWalletFound: "ウォレットが見つかりませんでした。MetaMaskやFoxWalletなどのウォレットアプリの中のブラウザでこのページを開いてから、もう一度「ウォレットをつなぐ」を押してください。",
    connectNote: "押すとつながります。あなたの公開アドレスを読むだけです — つなぐだけでお金が動くことはありません。",
    yourWalletLabel: "あなたのウォレット",
    rescanBtn: "もう一度調べる",
    switchChainBtn: "QL1に切り替える",
    hawkLine: "あなたの HAWK: {amount}",
    phxLine: "あなたの PHOENIX: {amount}",
    qomLine: "あなたの QOM（手数料用）: {amount}",
    amountLabel: "バーンする HAWK",
    receiveLabel: "受け取る量",
    burnAmountLine: "{amount} HAWK をバーンします",
    burnBtn: "🔥 HAWKをバーンする",
    gasNote: "バーンには、ネットワーク手数料としてウォレットに少しQOMが必要です。確認が2回出ることがあります（最初に許可、次にバーン本体）。",
    safeTitle: "安全のためのお願い",
    safe1: "復旧フレーズや秘密鍵は、どこにも入力しないでください。このサイトが聞くことは決してありません。",
    safe2: "バーンは取り消せません。バーンしたHAWKは消滅し、二度と戻りません。",
    safe3: "レート（100 HAWK → 1 PHOENIX）は、既存のPHOENIXコントラクトのルールです。このサイトでは変更できません。",
    contractLine: "PHOENIX: 0xDFe660C5a29c8AADF1daA096543D249135e1938A · HAWK: 0xbC85F14059d60458b614052b4a84734E463878cc · チェーン: QL1 (766)",
    footerText: "Guppy's Guide（グッピーズガイド）— あわてないで。42 Chain・QL1 のための道具箱。コミュニティによる開発の道具で、QL1の公式サイトではありません。オープンソース（MIT）— GitHubをご覧ください。表示はチェーンから直接読んでいます。",
    connected: "つながりました。",
    rejected: "ウォレットでキャンセルされました。何も起きていません — 準備ができたらもう一度つないでください。",
    rejectedTx: "ウォレットでキャンセルされました。何もバーンされていません。",
    wrongChain: "ウォレットが別のネットワークになっています。QL1に切り替えてください。",
    switchOk: "QL1に切り替えました。",
    scanFailed: "チェーンを読み込めませんでした。接続を確認して「もう一度調べる」を押してください。",
    invalidAmount: "数字を入れてください（例: 10000）。",
    insufficient: "HAWKが足りません。",
    needMin: "最小は100 HAWKです。",
    roundedNote: "{amount} HAWK に切り下げました（100枚単位のみ）。端数はバーンされません。",
    approvingStep: "ステップ 1/2: PHOENIXコントラクトがあなたのHAWKを使えるよう許可します。ウォレットで確認してください。",
    waitingApprove: "許可の完了を待っています…",
    burningStep: "ステップ 2/2: HAWKをバーンします。ウォレットで確認してください。",
    burningStepSingle: "HAWKをバーンします。ウォレットで確認してください。",
    waitingBurn: "バーンの完了を待っています…",
    burnDone: "できました！ {amount} PHOENIX を受け取りました。",
    txLink: "バーンの記録を見る",
    approveTxLink: "許可の記録を見る",
    txFailed: "完了しませんでした。何もバーンされていません。もう一度お試しください。",
    approveFailed: "許可が完了しませんでした。何もバーンされていません。もう一度お試しください。"
  }
};

/* ---------- pure helpers ---------- */
function pad32(hexNoPrefix) {
  var h = String(hexNoPrefix).replace(/^0x/i, "");
  while (h.length < 64) h = "0" + h;
  return h;
}
function encodeUint(v) { return pad32(BigInt(v).toString(16)); }
function encodeAddress(addr) { return pad32(addr.replace(/^0x/i, "").toLowerCase()); }
function callData(selector, encodedArgs) { return selector + (encodedArgs || ""); }
function decodeUint(hex) {
  if (!hex || hex === "0x") return null;
  try { return BigInt(hex); } catch (e) { return null; }
}
function commas(digits) {
  return String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
/* Format a wei BigInt as a human token amount (commas, up to maxFrac decimals). */
function formatToken(wei, maxFrac) {
  if (wei === null || wei === undefined) return "—";
  var w = BigInt(wei);
  var whole = w / WEI;
  var frac = w % WEI;
  var out = commas(whole.toString());
  if (maxFrac > 0 && frac > 0n) {
    var fs = frac.toString().padStart(18, "0").slice(0, maxFrac).replace(/0+$/, "");
    if (fs) out += "." + fs;
  }
  return out;
}
/* Parse a user-typed decimal token amount into wei (BigInt) or null. */
function parseAmountToWei(str) {
  if (typeof str !== "string") return null;
  var s = str.trim().replace(/,/g, "");
  if (!/^\d*(\.\d*)?$/.test(s) || !/\d/.test(s)) return null;
  var parts = s.split(".");
  var whole = parts[0] === "" ? "0" : parts[0];
  var frac = (parts[1] || "");
  if (frac.length > 18) return null;
  frac = (frac + "000000000000000000").slice(0, 18);
  try { return BigInt(whole) * WEI + BigInt(frac); } catch (e) { return null; }
}
/* Round a wei amount DOWN to a whole multiple of 100 tokens. */
function roundDownToHundred(wei) {
  var w = BigInt(wei);
  return (w / HUNDRED_WEI) * HUNDRED_WEI;
}
/* PHOENIX received for a (already rounded) burn amount, in whole tokens. */
function phoenixForBurn(roundedWei) {
  return BigInt(roundedWei) / HUNDRED_WEI;
}
function template(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] !== undefined ? String(vars[k]) : "{" + k + "}"; });
}

/* ---------- RPC (single calls, fallback across RPCS) ---------- */
function fetchFn() {
  if (typeof fetch !== "undefined") return fetch;
  throw new Error("fetch unavailable");
}
async function rpcRequest(method, params) {
  var f = fetchFn();
  var lastErr = null;
  for (var i = 0; i < RPCS.length; i++) {
    try {
      var res = await f(RPCS[i], {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
      });
      if (!res.ok) throw new Error("RPC HTTP " + res.status);
      var json = await res.json();
      if (json.error) {
        var err = new Error(json.error.message || "RPC error");
        err.rpcError = json.error;
        throw err;
      }
      return json.result;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("RPC failed");
}
async function ethCall(to, data, from) {
  var tx = { to: to, data: data };
  if (from) tx.from = from;
  return rpcRequest("eth_call", [tx, "latest"]);
}
async function readUint(to, data, from) {
  return decodeUint(await ethCall(to, data, from));
}
async function getTokenBalance(token, addr) {
  return readUint(token, callData(SEL.balanceOf, encodeAddress(addr)));
}
async function getAllowance(owner) {
  return readUint(HAWK, callData(SEL.allowance, encodeAddress(owner) + encodeAddress(PHX)));
}
async function getStats() {
  var burned = await getTokenBalance(HAWK, DEAD);
  var phxSupply = await readUint(PHX, callData(SEL.totalSupply));
  return { hawkBurned: burned, phxSupply: phxSupply };
}
async function getBalances(addr) {
  var hawk = await getTokenBalance(HAWK, addr);
  var phx = await getTokenBalance(PHX, addr);
  var qomHex = await rpcRequest("eth_getBalance", [addr, "latest"]);
  return { hawk: hawk, phx: phx, qom: decodeUint(qomHex) };
}
/* eth_call simulation of burnToMint — resolves "0x" on success,
   throws with .rpcError on revert. Used by the verify harness. */
async function simulateBurn(from, weiAmount) {
  return ethCall(PHX, callData(SEL.burnToMint, encodeUint(weiAmount)), from);
}
function approveData(amountWei) { return callData(SEL.approve, encodeAddress(PHX) + encodeUint(amountWei)); }
function burnData(amountWei) { return callData(SEL.burnToMint, encodeUint(amountWei)); }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    HAWK: HAWK, PHX: PHX, ZERO: ZERO, DEAD: DEAD, SEL: SEL, RPCS: RPCS, I18N: I18N,
    encodeUint: encodeUint, encodeAddress: encodeAddress, callData: callData,
    decodeUint: decodeUint, formatToken: formatToken, parseAmountToWei: parseAmountToWei,
    roundDownToHundred: roundDownToHundred, phoenixForBurn: phoenixForBurn,
    getTokenBalance: getTokenBalance, getAllowance: getAllowance,
    getStats: getStats, getBalances: getBalances, simulateBurn: simulateBurn,
    approveData: approveData, burnData: burnData
  };
}

/* ---------- browser UI ---------- */
if (typeof document !== "undefined" && typeof window !== "undefined") {
  (function () {
    var lang = document.documentElement.lang === "ja" ? "ja" : "en";
    var S = I18N[lang];
    function t(key, vars) { return template(S[key] || key, vars); }
    function $(id) { return document.getElementById(id); }

    var state = { address: null, hawk: null, phx: null, burning: false, provider: null, connecting: false, watching: false };

    function applyI18n() {
      document.title = lang === "ja" ? "HAWK バーン — HAWKをバーンしてPHOENIXを受け取る" : "HAWK Burn — burn HAWK, receive PHOENIX";
      var map = {
        pageTitle: "pageTitle", pageSub: "pageSub", howTitle: "howTitle",
        step1: "step1", step2: "step2", step3: "step3", howNote: "howNote",
        contractNote: "contractNote", contractLink: "contractLink",
        statsTitle: "statsTitle", statBurnedLabel: "statBurnedLabel", statPhxLabel: "statPhxLabel",
        statsNote: "statsNote", noWalletTitle: "noWalletTitle", noWalletText: "noWalletText", noWalletLink: "noWalletLink",
        connectBtn: "connectBtn", connectNote: "connectNote", yourWalletLabel: "yourWalletLabel",
        connectedTitle: "connectedTitle", disconnectBtn: "disconnectBtn", connectedBtn: "connectedTitle",
        rescanBtn: "rescanBtn", switchChainBtn: "switchChainBtn",
        amountLabel: "amountLabel", receiveLabel: "receiveLabel",
        burnBtn: "burnBtn", gasNote: "gasNote",
        safeTitle: "safeTitle", safe1: "safe1", safe2: "safe2", safe3: "safe3",
        contractLine: "contractLine", footerText: "footerText"
      };
      Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.textContent = S[map[id]]; });
      var inp = $("amountInput");
      if (inp) inp.placeholder = lang === "ja" ? "例: 10000" : "e.g. 10000";
    }

    var langSel = $("langSel");
    if (langSel) {
      langSel.value = lang;
      langSel.addEventListener("change", function () {
        try { localStorage.setItem("hawkburn_lang", langSel.value); } catch (e) {}
        location.href = (langSel.value === "ja" ? "ja.html" : "en.html") + location.search + location.hash;
      });
    }

    function setResult(el, msg, kind) {
      el.textContent = msg || "";
      el.className = "result" + (kind ? " " + kind : "");
    }
    function provider() { return state.provider || (typeof window.ethereum !== "undefined" && window.ethereum) || null; }
    function hasWallet() { return !!provider(); }

    /* Wallet providers are often injected AFTER page load (wallet in-app
       browsers), and modern wallets announce themselves via EIP-6963.
       Wait briefly for one instead of trusting a one-time load check. */
    function findProvider(waitMs) {
      var existing = provider();
      if (existing) return Promise.resolve(existing);
      return new Promise(function (resolve) {
        var done = false;
        function finish(p) {
          if (done) return; done = true;
          window.removeEventListener("eip6963:announceProvider", onAnnounce);
          window.removeEventListener("ethereum#initialized", onInit);
          resolve(p || provider());
        }
        function onAnnounce(e) {
          var p = e && e.detail && e.detail.provider;
          if (p && typeof p.request === "function") finish(p);
        }
        function onInit() { if (provider()) finish(provider()); }
        window.addEventListener("eip6963:announceProvider", onAnnounce);
        window.addEventListener("ethereum#initialized", onInit);
        try { window.dispatchEvent(new Event("eip6963:requestProvider")); } catch (e) {}
        var started = Date.now();
        (function poll() {
          if (done) return;
          if (provider()) return finish(provider());
          if (Date.now() - started >= waitMs) return finish(null);
          setTimeout(poll, 100);
        })();
      });
    }

    function watchProvider(eth) {
      if (!eth || state.watching || typeof eth.on !== "function") return;
      state.watching = true;
      eth.on("accountsChanged", function () { location.reload(); });
      eth.on("chainChanged", function () { location.reload(); });
    }

    async function loadStats() {
      try {
        var st = await getStats();
        $("statBurned").textContent = formatToken(st.hawkBurned, 0) + " HAWK";
        $("statPhx").textContent = formatToken(st.phxSupply, 0) + " PHOENIX";
      } catch (e) {
        setResult($("statsError"), S.statsError, "error");
      }
    }

    async function ensureChain() {
      var eth = provider();
      var current = await eth.request({ method: "eth_chainId" });
      if (current && current.toLowerCase() === CHAIN_ID_HEX) return true;
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
        return true;
      } catch (e) {
        if (e && e.code === 4902) {
          try {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: CHAIN_ID_HEX, chainName: "QL1",
                nativeCurrency: { name: "QOM", symbol: "QOM", decimals: 18 },
                rpcUrls: RPCS, blockExplorerUrls: [EXPLORER]
              }]
            });
            return true;
          } catch (e2) { return false; }
        }
        return false;
      }
    }

    function txLink(hash, label) {
      var a = document.createElement("a");
      a.href = EXPLORER + "/tx/" + hash;
      a.target = "_blank"; a.rel = "noopener";
      a.textContent = label;
      return a;
    }

    async function refreshBalances() {
      if (!state.address) return;
      try {
        var b = await getBalances(state.address);
        state.hawk = b.hawk; state.phx = b.phx;
        $("hawkLine").textContent = t("hawkLine", { amount: formatToken(b.hawk, 2) + " HAWK" });
        $("phxLine").textContent = t("phxLine", { amount: formatToken(b.phx, 2) + " PHOENIX" });
        $("qomLine").textContent = t("qomLine", { amount: formatToken(b.qom, 4) + " QOM" });
        updatePreview();
      } catch (e) {
        setResult($("connectResult"), S.scanFailed, "error");
      }
    }

    async function connect() {
      if (state.connecting) return;
      var result = $("connectResult");
      var btn = $("connectBtn");
      state.connecting = true;
      if (btn) { btn.disabled = true; btn.textContent = S.connecting; }
      try {
        var eth = await findProvider(2500);
        if (!eth) {
          /* Genuinely no provider at CLICK time (detection is never done
             at load): show the guidance as a notice inside the connect
             box, NEXT TO the Connect button. The button and its box stay
             visible — never hide or replace them on this path. */
          $("connectBox").hidden = false;
          $("noWalletPanel").hidden = false;
          setResult(result, S.noWalletFound, "error");
          return;
        }
        state.provider = eth;
        watchProvider(eth);
        var accounts = await eth.request({ method: "eth_requestAccounts" });
        if (!accounts || !accounts[0]) { setResult(result, S.scanFailed, "error"); return; }
        state.address = accounts[0];
        var ok = await ensureChain();
        if (!ok) {
          setResult(result, S.wrongChain, "error");
          $("switchChainBtn").hidden = false;
          return;
        }
        $("noWalletPanel").hidden = true;
        $("connectBox").hidden = true;
        $("accountBox").hidden = false;
        $("burnPanel").hidden = false;
        $("walletAddr").textContent = state.address;
        setResult(result, S.connected, "ok");
        refreshBalances();
      } catch (e) {
        if (e && e.code === 4001) setResult(result, S.rejected, "");
        else setResult(result, S.scanFailed, "error");
      } finally {
        state.connecting = false;
        if (btn) { btn.disabled = false; btn.textContent = S.connectBtn; }
      }
    }

    /* ----- amount / preview ----- */
    function currentRounded() {
      var parsed = parseAmountToWei($("amountInput").value);
      if (parsed === null) return { parsed: null, rounded: null };
      return { parsed: parsed, rounded: roundDownToHundred(parsed) };
    }
    function updatePreview() {
      var note = $("roundNote");
      var btn = $("burnBtn");
      var recv = $("receiveAmount");
      var burnLine = $("burnAmountLine");
      note.hidden = true; note.textContent = "";
      if (state.burning) { btn.disabled = true; return; }
      var c = currentRounded();
      if (c.parsed === null) {
        recv.textContent = "—"; burnLine.textContent = "";
        btn.disabled = true;
        if ($("amountInput").value.trim() !== "") { note.hidden = false; note.textContent = S.invalidAmount; }
        return;
      }
      if (state.hawk !== null && c.parsed > state.hawk) {
        recv.textContent = "—"; burnLine.textContent = "";
        note.hidden = false; note.textContent = S.insufficient;
        btn.disabled = true; return;
      }
      if (c.rounded === 0n) {
        recv.textContent = "0"; burnLine.textContent = "";
        note.hidden = false; note.textContent = S.needMin;
        btn.disabled = true; return;
      }
      if (c.rounded < c.parsed) {
        note.hidden = false;
        note.textContent = t("roundedNote", { amount: formatToken(c.rounded, 0) });
      }
      recv.textContent = formatToken(phoenixForBurn(c.rounded) * WEI, 0);
      burnLine.textContent = t("burnAmountLine", { amount: formatToken(c.rounded, 0) });
      btn.disabled = false;
    }
    function setAmountFromFraction(pct) {
      if (state.hawk === null) return;
      var target = (state.hawk * BigInt(pct)) / 100n;
      var inp = $("amountInput");
      inp.value = pct === 100 ? formatToken(target, 18).replace(/,/g, "") : formatToken(roundDownToHundred(target), 0).replace(/,/g, "");
      updatePreview();
    }

    /* ----- sending ----- */
    async function estimateGas(txParams, fallback) {
      try {
        var hex = await provider().request({ method: "eth_estimateGas", params: [txParams] });
        var est = BigInt(hex);
        var withBuf = (est * 120n) / 100n;
        return "0x" + withBuf.toString(16);
      } catch (e) { return "0x" + BigInt(fallback).toString(16); }
    }
    async function waitReceipt(hash) {
      for (var i = 0; i < 90; i++) {
        var r = await provider().request({ method: "eth_getTransactionReceipt", params: [hash] });
        if (r) return r;
        await new Promise(function (res) { setTimeout(res, 2000); });
      }
      return null;
    }
    async function sendTx(to, data, fallbackGas) {
      var txParams = { from: state.address, to: to, data: data };
      txParams.gas = await estimateGas(txParams, fallbackGas);
      return provider().request({ method: "eth_sendTransaction", params: [txParams] });
    }

    async function burn() {
      if (state.burning || !state.address) return;
      var c = currentRounded();
      if (c.rounded === null || c.rounded === 0n) return;
      var amount = c.rounded;
      var progress = $("burnProgress");
      var result = $("burnResult");
      result.innerHTML = ""; result.className = "result";
      state.burning = true; updatePreview();
      $("amountInput").disabled = true;
      var approveHash = null;
      try {
        var allowance = await getAllowance(state.address);
        if (allowance === null || allowance < amount) {
          progress.textContent = S.approvingStep;
          try {
            approveHash = await sendTx(HAWK, approveData(amount), 100000);
          } catch (e) {
            if (e && e.code === 4001) { setResult(result, S.rejectedTx, ""); }
            else setResult(result, S.approveFailed, "error");
            return;
          }
          progress.textContent = S.waitingApprove;
          var ar = await waitReceipt(approveHash);
          if (!ar || ar.status !== "0x1") { setResult(result, S.approveFailed, "error"); return; }
          progress.textContent = S.burningStep;
        } else {
          progress.textContent = S.burningStepSingle;
        }
        var burnHash;
        try {
          burnHash = await sendTx(PHX, burnData(amount), 400000);
        } catch (e) {
          if (e && e.code === 4001) { setResult(result, S.rejectedTx, ""); }
          else setResult(result, S.txFailed, "error");
          return;
        }
        progress.textContent = S.waitingBurn;
        var br = await waitReceipt(burnHash);
        if (!br || br.status !== "0x1") { setResult(result, S.txFailed, "error"); return; }
        progress.textContent = "";
        setResult(result, t("burnDone", { amount: formatToken(phoenixForBurn(amount) * WEI, 0) }), "ok");
        var links = document.createElement("div");
        links.appendChild(txLink(burnHash, S.txLink));
        if (approveHash) {
          links.appendChild(document.createTextNode(" · "));
          links.appendChild(txLink(approveHash, S.approveTxLink));
        }
        result.appendChild(links);
        $("amountInput").value = "";
        await refreshBalances();
        loadStats();
      } catch (e) {
        setResult(result, S.txFailed, "error");
      } finally {
        state.burning = false;
        $("amountInput").disabled = false;
        progress.textContent = "";
        updatePreview();
      }
    }

    /* ----- connected dialog / disconnect ----- */
    /* Tapping connect while connected opens a small dialog with a
       Disconnect choice instead of re-running the connect flow. The
       connect button itself is hidden once connected (connectBox), so
       the same handler is also wired to the account box's button. */
    function onConnectClick() {
      if (state.address) {
        $("connAddr").textContent = state.address;
        $("connDlg").showModal();
        return;
      }
      connect();
    }
    async function disconnect() {
      // Ask the wallet to revoke this site's account permission where it
      // supports it (MetaMask: wallet_revokePermissions); either way the
      // local state is cleared so the button returns to "Connect wallet".
      // This site persists no "was connected" localStorage state and has
      // no silent eth_accounts restore, so a reload cannot auto-reconnect
      // once the revoke has landed.
      try { await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch (e) {}
      state.address = null;
      state.hawk = null;
      state.phx = null;
      state.provider = null;
      state.connecting = false;
      var btn = $("connectBtn");
      if (btn) { btn.disabled = false; btn.textContent = S.connectBtn; }
      $("walletAddr").textContent = "—";
      $("hawkLine").textContent = "";
      $("phxLine").textContent = "";
      $("qomLine").textContent = "";
      setResult($("connectResult"), "", "");
      $("switchChainBtn").hidden = true;
      $("accountBox").hidden = true;
      $("burnPanel").hidden = true;
      $("connectBox").hidden = false;
      var inp2 = $("amountInput"); if (inp2) inp2.value = "";
      updatePreview();
      $("connDlg").close();
    }

    /* ----- wiring ----- */
    applyI18n();
    loadStats();
    var cb = $("connectBtn"); if (cb) cb.addEventListener("click", onConnectClick);
    var ab = $("connectedBtn"); if (ab) ab.addEventListener("click", onConnectClick);
    var cc = $("connClose"); if (cc) cc.addEventListener("click", function () { $("connDlg").close(); });
    var db = $("disconnectBtn"); if (db) db.addEventListener("click", disconnect);
    var rb = $("rescanBtn"); if (rb) rb.addEventListener("click", refreshBalances);
    var sb = $("switchChainBtn");
    if (sb) sb.addEventListener("click", async function () {
      var ok = await ensureChain();
      if (ok) { sb.hidden = true; setResult($("connectResult"), S.switchOk, "ok"); refreshBalances(); }
      else setResult($("connectResult"), S.wrongChain, "error");
    });
    var inp = $("amountInput"); if (inp) inp.addEventListener("input", updatePreview);
    ["chip25", "chip50", "chip75", "chipMax"].forEach(function (id, i) {
      var el = $(id);
      if (el) el.addEventListener("click", function () { setAmountFromFraction([25, 50, 75, 100][i]); });
    });
    var bb = $("burnBtn"); if (bb) bb.addEventListener("click", burn);
    if (provider()) watchProvider(provider());
    updatePreview();
  })();
}
