"use strict";
/* Headless verification harness — uses the SAME functions as docs/app.js.
   Run: node tools/verify.js
   Read-only + eth_call simulation only. No transaction is ever sent. */
const fs = require("fs");
const path = require("path");
const app = require("../docs/app.js");

const RICH = "0xe737aA0794bDE19e445c3D98F369f1ddCC9a53B9";   // standing allowance 968,800 HAWK (2026-11-18)
const SPENT = "0xF348c89C6E0123B9184c0dA5F2874b467D2db4b0";  // burned everything; allowance 0

function idsOf(html) {
  const out = new Set();
  const re = /id="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) out.add(m[1]);
  return out;
}

(async () => {
  let failures = 0;
  const check = (name, ok, detail) => {
    console.log((ok ? "PASS" : "FAIL") + " " + name + (detail ? " — " + detail : ""));
    if (!ok) failures++;
  };

  /* --- unit: amount parsing / rounding / preview math --- */
  const W = 10n ** 18n;
  check("parse 10000", app.parseAmountToWei("10000") === 10000n * W);
  check("parse 1.5", app.parseAmountToWei("1.5") === 15n * (W / 10n));
  check("parse rejects abc", app.parseAmountToWei("abc") === null);
  check("parse rejects 19 decimals", app.parseAmountToWei("0.0000000000000000001") === null);
  check("roundDown 150 -> 100", app.roundDownToHundred(150n * W) === 100n * W);
  check("roundDown 250500.7 -> 250500", app.roundDownToHundred(app.parseAmountToWei("250500.7")) === 250500n * W);
  check("roundDown 99 -> 0", app.roundDownToHundred(99n * W) === 0n);
  check("phoenixForBurn 10000 HAWK -> 100", app.phoenixForBurn(10000n * W) === 100n);
  check("formatToken", app.formatToken(1832994n * W + W / 2n, 2) === "1,832,994.5");

  /* --- unit: calldata shapes --- */
  const ap = app.approveData(100n * W);
  check("approve calldata", ap.startsWith("0x095ea7b3") && ap.slice(10, 74).endsWith(app.PHX.slice(2).toLowerCase()) && BigInt("0x" + ap.slice(74)) === 100n * W, ap.slice(0, 20) + "…");
  const bd = app.burnData(100n * W);
  check("burnToMint calldata", bd.startsWith("0x05737aae") && BigInt("0x" + bd.slice(10)) === 100n * W);

  /* --- static: every id app.js touches exists in both pages --- */
  const appSrc = fs.readFileSync(path.join(__dirname, "../docs/app.js"), "utf8");
  const used = new Set();
  for (const m of appSrc.matchAll(/\$\("([A-Za-z0-9]+)"\)/g)) used.add(m[1]);
  for (const f of ["en.html", "ja.html"]) {
    const ids = idsOf(fs.readFileSync(path.join(__dirname, "../docs", f), "utf8"));
    const missing = [...used].filter((id) => !ids.has(id));
    check(f + " has all ids used by app.js", missing.length === 0, missing.length ? "missing: " + missing.join(",") : used.size + " ids");
  }

  /* --- live reads --- */
  const stats = await app.getStats();
  console.log("stats: HAWK burned so far =", app.formatToken(stats.hawkBurned, 2), "| PHOENIX supply =", app.formatToken(stats.phxSupply, 2));
  check("stats readable", stats.hawkBurned > 0n && stats.phxSupply > 0n);

  const rich = await app.getBalances(RICH);
  const richAllow = await app.getAllowance(RICH);
  console.log("sample", RICH, "HAWK =", app.formatToken(rich.hawk, 2), "PHOENIX =", app.formatToken(rich.phx, 2), "QOM =", app.formatToken(rich.qom, 4), "allowance =", app.formatToken(richAllow, 0));
  check("sample HAWK balance > 100", rich.hawk > 100n * W);
  check("sample allowance >= 100 HAWK", richAllow >= 100n * W);

  const spent = await app.getBalances(SPENT);
  const spentAllow = await app.getAllowance(SPENT);
  check("spent burner balance 0 / allowance 0", spent.hawk === 0n && spentAllow === 0n,
    "bal=" + app.formatToken(spent.hawk, 0) + " allow=" + app.formatToken(spentAllow, 0));

  /* --- live simulations (eth_call, nothing is sent) --- */
  const okSim = await app.simulateBurn(RICH, 100n * W);
  check("simulate burnToMint(100) from allowance holder succeeds", okSim === "0x", JSON.stringify(okSim));
  let revertMsg = "";
  try { await app.simulateBurn(SPENT, 100n * W); } catch (e) { revertMsg = e.message || ""; }
  check("simulate burnToMint(100) without allowance reverts", /insufficient allowance/i.test(revertMsg), revertMsg);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : "\n" + failures + " CHECK(S) FAILED");
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
