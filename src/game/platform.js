var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { DEFAULT_BET, STARTING_BALANCE } from "./config.js";
import { generateBuyPass, generateFeatureEnd, generateSpin } from "./gameMath.js";
import { randomSeed } from "./rng.js";
import { storage } from "./storage.js";
class VirtualCasinoAdapter {
  constructor() {
    // This adapter generates local virtual-demo outcomes in the browser.
    // A future server provider can implement the same methods authoritatively.
    __publicField(this, "authoritative", false);
    __publicField(this, "mode", "local-demo");
    __publicField(this, "wallet");
    this.wallet = storage.get("hnphr.wallet", { balance: STARTING_BALANCE, bet: DEFAULT_BET });
    if (!Number.isFinite(this.wallet.balance) || this.wallet.balance < 0) this.wallet.balance = STARTING_BALANCE;
  }
  getBalance() {
    return this.wallet.balance;
  }
  getBet() {
    return this.wallet.bet;
  }
  setBet(value) {
    this.wallet.bet = value;
    this.save();
  }
  async debit(amount) {
    if (amount <= 0 || this.wallet.balance + 1e-8 < amount) throw new Error("INSUFFICIENT_BALANCE");
    this.wallet.balance = Math.round((this.wallet.balance - amount) * 100) / 100;
    this.save();
    return this.wallet.balance;
  }
  async credit(amount) {
    this.wallet.balance = Math.round((this.wallet.balance + amount) * 100) / 100;
    this.save();
    return this.wallet.balance;
  }
  async resetBalance() {
    this.wallet.balance = STARTING_BALANCE;
    this.save();
    return this.wallet.balance;
  }
  createSeed() {
    return randomSeed();
  }
  initial(request) {
    return generateSpin({ ...request, seed: request.seed || this.createSeed() });
  }
  async spin(request) {
    return generateSpin({ ...request, seed: request.seed || this.createSeed() });
  }
  async buyPass(request) {
    return generateBuyPass({ ...request, seed: request.seed || randomSeed() });
  }
  async featureEnd(request) {
    return generateFeatureEnd({ ...request, seed: request.seed || randomSeed() });
  }
  save() {
    storage.set("hnphr.wallet", this.wallet);
  }
}
export {
  VirtualCasinoAdapter
};
