import * as anchor from "@zetamarkets/anchor";
import { BN } from "@zetamarkets/anchor";
import {
  ConfirmOptions,
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { Connection as ConnectionZstd } from "zeta-solana-web3";
import { allAssets } from "./assets";
import { Asset } from "./constants";
import { objectEquals } from "./utils";
import { CrossMarginAccount, MarginAccount } from "./program-types";
import { Network, types, utils } from ".";
import * as constants from "./constants";

/**
 * Wallet interface for objects that can be used to sign provider transactions.
 */
export interface Wallet {
  signTransaction(
    tx: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction>;
  signAllTransactions(
    txs: Transaction[] | VersionedTransaction[]
  ): Promise<Transaction[] | VersionedTransaction[]>;
  publicKey: PublicKey;
}

export class DummyWallet implements Wallet {
  constructor() {}

  async signTransaction(
    _tx: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> {
    throw Error("Not supported by dummy wallet!");
  }

  async signAllTransactions(
    _txs: Transaction[] | VersionedTransaction[]
  ): Promise<Transaction[] | VersionedTransaction[]> {
    throw Error("Not supported by dummy wallet!");
  }

  get publicKey(): PublicKey {
    throw Error("Not supported by dummy wallet!");
  }
}

export enum OrderType {
  LIMIT,
  POSTONLY,
  FILLORKILL,
  IMMEDIATEORCANCEL,
  POSTONLYSLIDE,
}

export function toProgramOrderType(orderType: OrderType) {
  if (orderType == OrderType.LIMIT) return { limit: {} };
  if (orderType == OrderType.POSTONLY) return { postOnly: {} };
  if (orderType == OrderType.FILLORKILL) return { fillOrKill: {} };
  if (orderType == OrderType.IMMEDIATEORCANCEL)
    return { immediateOrCancel: {} };
  if (orderType == OrderType.POSTONLYSLIDE) return { postOnlySlide: {} };
}

export function fromProgramOrderType(orderType: any): OrderType {
  if (objectEquals(orderType, { limit: {} })) return OrderType.LIMIT;
  if (objectEquals(orderType, { postOnly: {} })) return OrderType.POSTONLY;
  if (objectEquals(orderType, { fillOrKill: {} })) return OrderType.FILLORKILL;
  if (objectEquals(orderType, { immediateOrCancel: {} }))
    return OrderType.IMMEDIATEORCANCEL;
  if (objectEquals(orderType, { postOnlySlide: {} }))
    return OrderType.POSTONLYSLIDE;
}

export enum Side {
  BID,
  ASK,
}

export enum TriggerDirection {
  UNINITIALIZED,
  LESSTHANOREQUAL,
  GREATERTHANOREQUAL,
}

export enum UserCallbackType {
  POLLUPDATE,
  MARGINACCOUNTCHANGE,
  SPREADACCOUNTCHANGE,
  CROSSMARGINACCOUNTCHANGE,
}

export function toProgramSide(side: Side) {
  if (side == Side.BID) return { bid: {} };
  if (side == Side.ASK) return { ask: {} };
  throw Error("Invalid side");
}

export function fromProgramSide(side: any): Side {
  if (objectEquals(side, { bid: {} })) {
    return Side.BID;
  }
  if (objectEquals(side, { ask: {} })) {
    return Side.ASK;
  }
  throw Error("Invalid program side!");
}

export function toProgramTriggerDirection(triggerDirection: TriggerDirection) {
  if (triggerDirection == TriggerDirection.UNINITIALIZED)
    return { uninitialized: {} };
  if (triggerDirection == TriggerDirection.LESSTHANOREQUAL)
    return { lessThanOrEqual: {} };
  if (triggerDirection == TriggerDirection.GREATERTHANOREQUAL)
    return { greaterThanOrEqual: {} };
  throw Error("Invalid triggerDirection");
}

export function fromProgramTriggerDirection(
  triggerDirection: any
): TriggerDirection {
  if (objectEquals(triggerDirection, { uninitialized: {} })) {
    return TriggerDirection.UNINITIALIZED;
  }
  if (objectEquals(triggerDirection, { lessThanOrEqual: {} })) {
    return TriggerDirection.LESSTHANOREQUAL;
  }
  if (objectEquals(triggerDirection, { greaterThanOrEqual: {} })) {
    return TriggerDirection.GREATERTHANOREQUAL;
  }
  throw Error("Invalid program triggerDirection!");
}

export enum Kind {
  UNINITIALIZED = "uninitialized",
  CALL = "call",
  PUT = "put",
  FUTURE = "future",
  PERP = "perp",
}

export function toProductKind(kind: Object): Kind {
  if (Object.keys(kind).includes(Kind.CALL)) return Kind.CALL;
  if (Object.keys(kind).includes(Kind.PUT)) return Kind.PUT;
  if (Object.keys(kind).includes(Kind.FUTURE)) return Kind.FUTURE;
  if (Object.keys(kind).includes(Kind.PERP)) return Kind.PERP;
  // We don't expect uninitialized.
  throw Error("Invalid product type");
}

export interface LiquidityCheckInfo {
  validLiquidity: boolean;
  avgPrice: number;
  worstPrice: number;
}

export interface Order {
  marketIndex: number;
  market: PublicKey;
  price: number;
  size: number;
  side: Side;
  // Just an identifier, shouldn't be shown to users.
  orderId: BN;
  // Open orders account that owns the order.
  owner: PublicKey;
  // Client order id.
  clientOrderId: BN;
  tifOffset: number;
  asset: Asset;
}

export interface TriggerOrder {
  orderPrice: number;
  triggerPrice: number | null;
  size: number;
  creationTs: number;
  triggerDirection: TriggerDirection | null;
  triggerTimestamp: anchor.BN | null;
  side: Side;
  asset: Asset;
  orderType: OrderType;
  reduceOnly: boolean;
  triggerOrderBit: number;
}

export function orderEquals(
  a: Order,
  b: Order,
  cmpOrderId: boolean = false
): boolean {
  let orderIdMatch = true;
  if (cmpOrderId) {
    orderIdMatch = a.orderId.eq(b.orderId);
  }

  return (
    a.marketIndex === b.marketIndex &&
    a.market.equals(b.market) &&
    a.price === b.price &&
    a.size === b.size &&
    a.side === b.side &&
    a.tifOffset === b.tifOffset &&
    a.asset === b.asset &&
    orderIdMatch
  );
}

export interface Position {
  marketIndex: number;
  market: PublicKey;
  size: number;
  costOfTrades: number;
  asset: Asset;
}

export function positionEquals(a: Position, b: Position): boolean {
  return (
    a.marketIndex === b.marketIndex &&
    a.market.equals(b.market) &&
    a.size === b.size &&
    a.costOfTrades === b.costOfTrades
  );
}

export interface Level {
  price: number;
  size: number;
}

export interface DepthOrderbook {
  bids: Level[];
  asks: Level[];
}

export interface TopLevel {
  bid: Level | null;
  ask: Level | null;
}

export enum MarginType {
  /**
   * Margin for orders.
   */
  INITIAL = "initial",
  /**
   * Margin for positions.
   */
  MAINTENANCE = "maintenance",
}

export interface MarginRequirement {
  initialLong: number;
  initialShort: number;
  maintenanceLong: number;
  maintenanceShort: number;
}

export interface MarginAccountState {
  balance: number;
  equity: number;
  initialMargin: number;
  initialMarginSkipConcession: number;
  maintenanceMargin: number;
  unrealizedPnl: number;
  unpaidFunding: number;
  availableBalanceInitial: number;
  availableBalanceMaintenance: number;
  availableBalanceWithdrawable: number;
}

export interface AssetRiskState {
  initialMargin: number;
  initialMarginSkipConcession: number;
  maintenanceMargin: number;
  maintenanceMarginIncludingOrders: number;
  unrealizedPnl: number;
  unpaidFunding: number;
}

export interface CrossMarginAccountState {
  balance: number;
  equity: number;
  availableBalanceInitial: number;
  availableBalanceMaintenance: number;
  availableBalanceMaintenanceIncludingOrders: number;
  availableBalanceWithdrawable: number;
  assetState: Map<Asset, AssetRiskState>;
  initialMarginTotal: number;
  initalMarginSkipConcessionTotal: number;
  maintenanceMarginTotal: number;
  maintenanceMarginIncludingOrdersTotal: number;
  unrealizedPnlTotal: number;
  unpaidFundingTotal: number;
}

export interface CancelArgs {
  asset: Asset;
  market: PublicKey;
  orderId: anchor.BN;
  cancelSide: Side;
}

export interface MarginParams {
  futureMarginInitial: number;
  futureMarginMaintenance: number;
}

export enum ProgramAccountType {
  CrossMarginAccount = "CrossMarginAccount",
  MarginAccount = "MarginAccount",
  SpreadAccount = "SpreadAccount",
  ZetaGroup = "ZetaGroup",
  Greeks = "Greeks",
  PerpSyncQueue = "PerpSyncQueue",
}

export interface ClockData {
  timestamp: number;
  slot: number;
}

export enum MovementType {
  LOCK = 1,
  UNLOCK = 2,
}

export function toProgramMovementType(movementType: MovementType) {
  if (movementType == MovementType.LOCK) return { lock: {} };
  if (movementType == MovementType.UNLOCK) return { unlock: {} };
  throw Error("Invalid movement type");
}

export enum TreasuryMovementType {
  TO_TREASURY_FROM_INSURANCE = 1,
  TO_INSURANCE_FROM_TREASURY = 2,
  TO_TREASURY_FROM_REFERRALS_REWARDS = 3,
  TO_REFERRALS_REWARDS_FROM_TREASURY = 4,
}

export function toProgramTreasuryMovementType(
  treasuryMovementType: TreasuryMovementType
) {
  if (treasuryMovementType == TreasuryMovementType.TO_TREASURY_FROM_INSURANCE)
    return { toTreasuryFromInsurance: {} };
  if (treasuryMovementType == TreasuryMovementType.TO_INSURANCE_FROM_TREASURY)
    return { toInsuranceFromTreasury: {} };
  if (
    treasuryMovementType ==
    TreasuryMovementType.TO_TREASURY_FROM_REFERRALS_REWARDS
  )
    return { toTreasuryFromReferralsRewards: {} };
  if (
    treasuryMovementType ==
    TreasuryMovementType.TO_REFERRALS_REWARDS_FROM_TREASURY
  )
    return { toReferralsRewardsFromTreasury: {} };
  throw Error("Invalid treasury movement type");
}

export type MarketIdentifier = number | PublicKey;

export enum MarginAccountType {
  NORMAL = 0,
  MARKET_MAKER = 1,
}

export function fromProgramMarginAccountType(
  accountType: any
): MarginAccountType {
  if (objectEquals(accountType, { normal: {} })) {
    return MarginAccountType.NORMAL;
  }
  if (objectEquals(accountType, { marketMaker: {} })) {
    return MarginAccountType.MARKET_MAKER;
  }
  throw Error("Invalid margin account type");
}

export function isMarketMaker(account: CrossMarginAccount | MarginAccount) {
  return (
    fromProgramMarginAccountType(account.accountType) ==
    MarginAccountType.MARKET_MAKER
  );
}

export enum OrderCompleteType {
  CANCEL = 0,
  FILL = 1,
  BOOTED = 2,
}

export function fromProgramOrderCompleteType(
  orderCompleteType: any
): OrderCompleteType {
  if (objectEquals(orderCompleteType, { cancel: {} })) {
    return OrderCompleteType.CANCEL;
  }
  if (objectEquals(orderCompleteType, { fill: {} })) {
    return OrderCompleteType.FILL;
  }
  if (objectEquals(orderCompleteType, { booted: {} })) {
    return OrderCompleteType.BOOTED;
  }
  throw Error("Invalid order complete type");
}

export interface OrderOptions {
  tifOptions: TIFOptions;
  orderType?: types.OrderType;
  reduceOnly?: boolean;
  clientOrderId?: number;
  tag?: string;
  blockhash?: { blockhash: string; lastValidBlockHeight: number };
}

export interface TriggerOrderOptions {
  orderType?: types.OrderType;
  reduceOnly?: boolean;
  tag?: string;
  blockhash?: { blockhash: string; lastValidBlockHeight: number };
}

export function getDefaultTriggerDirection(side: Side): TriggerDirection {
  return side == Side.BID
    ? TriggerDirection.LESSTHANOREQUAL
    : TriggerDirection.GREATERTHANOREQUAL;
}

export function defaultTriggerOrderOptions(): TriggerOrderOptions {
  return {
    orderType: OrderType.FILLORKILL,
    reduceOnly: true,
    tag: constants.DEFAULT_ORDER_TAG,
    blockhash: undefined,
  };
}

/**
 * Only set one of these options
 * @field expiryOffset  seconds in future that the order will expire. Set to undefined to disable TIF.
 * @field expiryTs      timestamp that the order will expire. Set to undefined to disable TIF.
 */
export interface TIFOptions {
  expiryOffset?: number | undefined;
  expiryTs?: number | undefined;
}

export function defaultOrderOptions(): OrderOptions {
  return {
    tifOptions: {
      expiryOffset: undefined,
      expiryTs: undefined,
    },
    orderType: OrderType.LIMIT,
    reduceOnly: false,
    clientOrderId: 0,
    tag: constants.DEFAULT_ORDER_TAG,
    blockhash: undefined,
  };
}

export interface LoadExchangeConfig {
  network: Network;
  connection: Connection;
  orderbookConnection?: Connection | ConnectionZstd;
  orderbookAssetSubscriptionOverride?: Asset[];
  opts: ConfirmOptions;
  throttleMs: number;
  loadFromStore: boolean;
}

export function defaultLoadExchangeConfig(
  network: Network,
  connection: Connection,
  opts: ConfirmOptions = utils.defaultCommitment(),
  throttleMs = 0,
  loadFromStore = false,
  orderbookConnection: Connection = undefined,
  orderbookAssetSubscriptionOverride: Asset[] = undefined
): LoadExchangeConfig {
  return {
    network,
    connection,
    orderbookConnection,
    orderbookAssetSubscriptionOverride,
    opts,
    throttleMs,
    loadFromStore,
  };
}

export interface ExecutionInfo {
  asset: Asset;
  price: number;
  size: number;
  isTaker: boolean;
}
